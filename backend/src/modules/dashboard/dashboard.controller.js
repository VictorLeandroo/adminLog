const service = require('./dashboard.service');
const asyncHandler = require('../../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  res.json(await service.getDashboard(req.user, req.query));
});

const getExecutiveDashboard = asyncHandler(async (req, res) => {
  res.json(await service.getExecutiveDashboard(req.user, req.query));
});

const getSummary = asyncHandler(async (req, res) => {
  res.json(await service.getSummary(req.user, req.query));
});

const getVehiclesPerformance = asyncHandler(async (req, res) => {
  res.json(await service.getVehiclesPerformance(req.user, req.query));
});

const getAlerts = asyncHandler(async (req, res) => {
  res.json(await service.getAlerts(req.user, req.query));
});

const getFinancialBoxes = asyncHandler(async (req, res) => {
  res.json(await service.getFinancialBoxes(req.user, req.query));
});

const getDriversRanking = asyncHandler(async (req, res) => {
  res.json(await service.getDriversRanking(req.user, req.query));
});

const getInsights = asyncHandler(async (req, res) => {
  res.json(await service.getInsights(req.user, req.query));
});

module.exports = {
  getDashboard,
  getExecutiveDashboard,
  getSummary,
  getVehiclesPerformance,
  getAlerts,
  getFinancialBoxes,
  getDriversRanking,
  getInsights,
};
