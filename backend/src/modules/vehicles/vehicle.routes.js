const { Router } = require('express');

const controller = require('./vehicle.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', requireRole('ADMIN'), controller.list);
router.get('/my-vehicle', requireRole('DRIVER', 'ADMIN'), controller.mine);
router.get('/mine', requireRole('DRIVER', 'ADMIN'), controller.mine);
router.get('/:id', requireRole('ADMIN'), controller.getById);
router.post('/', requireRole('ADMIN'), controller.create);
router.put('/:id', requireRole('ADMIN'), controller.update);
router.patch('/:id/assign-driver', requireRole('ADMIN'), controller.assignDriver);
router.patch('/:id/unassign-driver', requireRole('ADMIN'), controller.unassignDriver);
router.delete('/:id', requireRole('ADMIN'), controller.remove);
router.post('/:id/maintenances', requireRole('ADMIN'), controller.createMaintenance);
router.post('/:id/documents', requireRole('ADMIN'), controller.createDocument);

module.exports = router;
