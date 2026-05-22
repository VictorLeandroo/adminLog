const service = require('./dashboard.service');
const asyncHandler = require('../../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  res.json(await service.getDashboard(req.user, req.query));
});

module.exports = { getDashboard };
