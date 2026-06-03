const { Router } = require('express');

const controller = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/executive', controller.getExecutiveDashboard);
router.get('/summary', controller.getSummary);
router.get('/vehicles-performance', controller.getVehiclesPerformance);
router.get('/alerts', controller.getAlerts);
router.get('/financial-boxes', controller.getFinancialBoxes);
router.get('/drivers-ranking', controller.getDriversRanking);
router.get('/insights', controller.getInsights);
router.get('/', controller.getDashboard);

module.exports = router;
