const { Router } = require('express');

const controller = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', controller.getDashboard);

module.exports = router;
