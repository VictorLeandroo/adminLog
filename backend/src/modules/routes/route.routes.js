const { Router } = require('express');

const controller = require('./route.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/active', controller.active);
router.post('/', requireRole('ADMIN'), controller.create);
router.post('/start', requireRole('DRIVER'), controller.start);
router.patch('/:id/finish', requireRole('DRIVER', 'ADMIN'), controller.finish);
router.post('/:id/finish', requireRole('DRIVER', 'ADMIN'), controller.finish);
router.patch('/:id/request-correction', requireRole('DRIVER'), controller.reportError);
router.post('/:id/report-error', requireRole('DRIVER'), controller.reportError);
router.patch('/:id/review', requireRole('ADMIN'), controller.review);
router.put('/:id/review', requireRole('ADMIN'), controller.review);
router.delete('/:id', requireRole('ADMIN'), controller.remove);

module.exports = router;
