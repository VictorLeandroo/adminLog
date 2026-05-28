const service = require('./finance.service');
const asyncHandler = require('../../utils/asyncHandler');

const listExpenses = asyncHandler(async (req, res) => {
  res.json(await service.listExpenses(req.user, req.query));
});

const listRevenues = asyncHandler(async (req, res) => {
  res.json(await service.listRevenues(req.query));
});

const createRevenue = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createRevenue(req.user, req.body));
});

const updateRevenue = asyncHandler(async (req, res) => {
  res.json(await service.updateRevenue(req.params.id, req.body));
});

const removeRevenue = asyncHandler(async (req, res) => {
  await service.removeRevenue(req.params.id);
  res.status(204).send();
});

const createExpense = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createExpense(req.user, req.body));
});

const updateExpense = asyncHandler(async (req, res) => {
  res.json(await service.updateExpense(req.params.id, req.body));
});

const removeExpense = asyncHandler(async (req, res) => {
  await service.removeExpense(req.params.id);
  res.status(204).send();
});

const listStatementRequests = asyncHandler(async (_req, res) => {
  res.json(await service.listStatementRequests());
});

const createStatementRequest = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createStatementRequest(req.body));
});

const updateStatementRequest = asyncHandler(async (req, res) => {
  res.json(await service.updateStatementRequest(req.params.id, req.body));
});

module.exports = {
  listRevenues,
  createRevenue,
  updateRevenue,
  removeRevenue,
  listExpenses,
  createExpense,
  updateExpense,
  removeExpense,
  listStatementRequests,
  createStatementRequest,
  updateStatementRequest,
};
