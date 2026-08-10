const { Router } = require('express');

const controller = require('./backup.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/emergency', requireRole('ADMIN'), controller.createEmergencyBackup);

module.exports = router;
