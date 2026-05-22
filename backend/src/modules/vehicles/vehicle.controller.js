const service = require('./vehicle.service');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (_req, res) => {
  res.json(await service.listVehicles());
});

const mine = asyncHandler(async (req, res) => {
  res.json(await service.getDriverVehicle(req.user.id));
});

const getById = asyncHandler(async (req, res) => {
  res.json(await service.getVehicle(req.params.id));
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createVehicle(req.body));
});

const update = asyncHandler(async (req, res) => {
  res.json(await service.updateVehicle(req.params.id, req.body));
});

const assignDriver = asyncHandler(async (req, res) => {
  res.json(await service.assignDriver(req.params.id, req.body));
});

const unassignDriver = asyncHandler(async (req, res) => {
  res.json(await service.unassignDriver(req.params.id));
});

const remove = asyncHandler(async (req, res) => {
  await service.removeVehicle(req.params.id);
  res.status(204).send();
});

const createMaintenance = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createMaintenance(req.params.id, req.body));
});

const createDocument = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createDocument(req.params.id, req.body));
});

module.exports = {
  list,
  mine,
  getById,
  create,
  update,
  assignDriver,
  unassignDriver,
  remove,
  createMaintenance,
  createDocument,
};
