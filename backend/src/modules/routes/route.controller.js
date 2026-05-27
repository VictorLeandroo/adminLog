const service = require('./route.service');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  res.json(await service.listRoutes(req.user));
});

const active = asyncHandler(async (req, res) => {
  res.json(await service.getActiveRoute(req.user.id));
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

module.exports = { list, active, start, create, finish, reportError, review, remove, freightPdf };
