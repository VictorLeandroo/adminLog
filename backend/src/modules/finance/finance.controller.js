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

const reviewExpense = asyncHandler(async (req, res) => {
  res.json(await service.reviewExpense(req.user, req.params.id, req.body));
});

const getSummary = asyncHandler(async (req, res) => {
  res.json(await service.getSummary(req.user, req.query));
});

const getCashFlow = asyncHandler(async (req, res) => {
  res.json(await service.getCashFlow(req.user, req.query));
});

const getDre = asyncHandler(async (req, res) => {
  res.json(await service.getDre(req.user, req.query));
});

const getVehicleDre = asyncHandler(async (req, res) => {
  res.json(await service.getVehicleDre(req.user, req.query));
});

const getFunds = asyncHandler(async (req, res) => {
  res.json(await service.getFunds(req.user, req.query));
});

const createFund = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createFund(req.body));
});

const updateFund = asyncHandler(async (req, res) => {
  res.json(await service.updateFund(req.params.id, req.body));
});

const createFundMovement = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createFundMovement(req.params.id, req.body));
});

const getSalarySettlements = asyncHandler(async (req, res) => {
  res.json(await service.getSalarySettlements(req.user, req.query));
});

const getInsights = asyncHandler(async (req, res) => {
  res.json(await service.getInsights(req.user, req.query));
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
  reviewExpense,
  removeExpense,
  getSummary,
  getCashFlow,
  getDre,
  getVehicleDre,
  getFunds,
  createFund,
  updateFund,
  createFundMovement,
  getSalarySettlements,
  getInsights,
  listStatementRequests,
  createStatementRequest,
  updateStatementRequest,
};
