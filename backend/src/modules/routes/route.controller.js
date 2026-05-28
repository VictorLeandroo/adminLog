const service = require('./route.service');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  res.json(await service.listRoutes(req.user));
});

const active = asyncHandler(async (req, res) => {
  res.json(await service.getActiveRoute(req.user.id));
});

const freightSettings = asyncHandler(async (_req, res) => {
  res.json(await service.getFreightSettings());
});

const updateFreightSettings = asyncHandler(async (req, res) => {
  res.json(await service.updateFreightSettings(req.body));
});

const start = asyncHandler(async (req, res) => {
  res.status(201).json(await service.startRoute(req.user, req.body));
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createRoute(req.body));
});

const finish = asyncHandler(async (req, res) => {
  res.json(await service.finishRoute(req.user, req.params.id, req.body));
});

const addDelivery = asyncHandler(async (req, res) => {
  res.json(await service.addDeliveryProgress(req.user, req.params.id, req.body));
});

const reportError = asyncHandler(async (req, res) => {
  res.json(await service.reportError(req.user, req.params.id, req.body));
});

const review = asyncHandler(async (req, res) => {
  res.json(await service.reviewRoute(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  await service.removeRoute(req.params.id);
  res.status(204).send();
});

const freightPdf = asyncHandler(async (req, res) => {
  const { buffer, filename, contentType } = await service.generateFreightPdf(req.query);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

const freightReport = asyncHandler(async (req, res) => {
  const html = await service.generateFreightHtml(req.query);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = {
  list,
  active,
  freightSettings,
  updateFreightSettings,
  start,
  create,
  finish,
  addDelivery,
  reportError,
  review,
  remove,
  freightPdf,
  freightReport,
};
