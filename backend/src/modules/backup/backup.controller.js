const service = require('./backup.service');
const asyncHandler = require('../../utils/asyncHandler');

const createEmergencyBackup = asyncHandler(async (req, res) => {
  const backup = await service.createEmergencyBackup(req.user);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="adminlog-emergency-backup-${stamp}.json"`);
  res.json(backup);
});

module.exports = {
  createEmergencyBackup,
};
