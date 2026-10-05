const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const prisma = {
  vehicle: { findUnique() {} },
  route: { findFirst() {}, findUnique() {} },
  expense: { findMany() {} },
  $transaction() {},
};
const servicePath = require.resolve('../src/modules/routes/route.service');
const serviceRequire = createRequire(servicePath);
const serviceModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(servicePath, 'utf8'), {
  require: (name) => name === '../../lib/prisma' ? prisma : serviceRequire(name),
  module: serviceModule,
  __dirname: path.dirname(servicePath),
}, { filename: servicePath });
const service = serviceModule.exports;
const { validateInvoiceNumbers } = require('../src/modules/routes/invoiceValidation');
const { errorHandler } = require('../src/middlewares/errorHandler');

test('rejeita repetição na mesma lista antes de consultar o banco', async () => {
  await assert.rejects(validateInvoiceNumbers({}, ['123', '123']), {
    statusCode: 409, message: 'A nota fiscal 123 está repetida nesta rota.',
  });
});

test('rejeita nota de outra rota e informa o número', async () => {
  const client = { routeInvoice: { findFirst: async () => ({ number: '123' }) } };
  await assert.rejects(validateInvoiceNumbers(client, ['123'], 'rota-atual'), {
    statusCode: 409, message: 'A nota fiscal 123 já está cadastrada em outra rota.',
  });
});

test('edição desconsidera a própria rota na busca por conflito', async () => {
  const client = { routeInvoice: { findFirst: async ({ where }) => {
    assert.deepEqual(where, { number: { in: ['00123'] }, routeId: { not: 'rota-atual' } });
    return null;
  } } };
  await validateInvoiceNumbers(client, ['00123'], 'rota-atual');
});

test('lista vazia continua permitida', async () => {
  await validateInvoiceNumbers({}, []);
});

for (const action of ['createRoute', 'finishRoute', 'reviewRoute']) {
  test(`${action}: normaliza espaços e bloqueia duplicatas antes de alterar dados`, async (t) => {
    const route = { id: 'rota-atual', driverId: 'motorista', vehicleId: 'veiculo', initialKm: 10, vehicle: { currentKm: 10 } };
    t.mock.method(prisma.vehicle, 'findUnique', async () => ({ id: 'veiculo', driverId: 'motorista', currentKm: 10 }));
    t.mock.method(prisma.route, 'findFirst', async () => null);
    t.mock.method(prisma.route, 'findUnique', async () => route);
    t.mock.method(prisma.expense, 'findMany', async () => []);
    // Nenhuma escrita deve ocorrer antes da validação.
    t.mock.method(prisma, '$transaction', async (callback) => callback({}));
    const input = { vehicleId: 'veiculo', initialKm: 10, finalKm: 20, notas: [' 123 ', '123'] };
    const operation = action === 'createRoute' ? service.createRoute(input)
      : action === 'finishRoute' ? service.finishRoute({ id: 'motorista', role: 'DRIVER' }, route.id, input)
        : service.reviewRoute(route.id, input);
    await assert.rejects(operation, { statusCode: 409, message: 'A nota fiscal 123 está repetida nesta rota.' });
  });
}

test('conflito concorrente do índice único vira HTTP 409', () => {
  const response = {
    status(code) { assert.equal(code, 409); return this; },
    json(body) { assert.match(body.message, /notas fiscais já está cadastrada/); },
  };
  errorHandler({ code: 'P2002', meta: { modelName: 'RouteInvoice', target: ['number'] } }, {}, response);
});
