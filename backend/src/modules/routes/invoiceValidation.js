const AppError = require('../../utils/AppError');

async function validateInvoiceNumbers(client, numbers, routeId) {
  const seen = new Set();
  for (const number of numbers) {
    if (seen.has(number)) {
      throw new AppError(`A nota fiscal ${number} está repetida nesta rota.`, 409);
    }
    seen.add(number);
  }

  if (!numbers.length) return;

  const existing = await client.routeInvoice.findFirst({
    where: {
      number: { in: numbers },
      ...(routeId ? { routeId: { not: routeId } } : {}),
    },
    select: { number: true },
  });

  if (existing) {
    throw new AppError(`A nota fiscal ${existing.number} já está cadastrada em outra rota.`, 409);
  }
}

module.exports = { validateInvoiceNumbers };
