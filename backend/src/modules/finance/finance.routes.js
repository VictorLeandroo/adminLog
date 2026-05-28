const { Router } = require('express');

const controller = require('./finance.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/revenues', controller.listRevenues);
router.post('/revenues', requireRole('ADMIN', 'FINANCE'), controller.createRevenue);
router.put('/revenues/:id', requireRole('ADMIN', 'FINANCE'), controller.updateRevenue);
router.delete('/revenues/:id', requireRole('ADMIN', 'FINANCE'), controller.removeRevenue);

router.get('/expenses', controller.listExpenses);
router.post('/expenses', controller.createExpense);
router.put('/expenses/:id', requireRole('ADMIN', 'FINANCE'), controller.updateExpense);
router.delete('/expenses/:id', requireRole('ADMIN', 'FINANCE'), controller.removeExpense);

router.get('/statement-requests', requireRole('ADMIN', 'FINANCE'), controller.listStatementRequests);
router.post('/statement-requests', requireRole('ADMIN', 'FINANCE'), controller.createStatementRequest);
router.put('/statement-requests/:id', requireRole('ADMIN', 'FINANCE'), controller.updateStatementRequest);

module.exports = router;
