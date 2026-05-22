const { Router } = require('express');

const controller = require('./auth.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const router = Router();

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', authenticate, controller.me);
router.get('/drivers', authenticate, requireRole('ADMIN'), controller.listDrivers);
router.get('/users', authenticate, requireRole('ADMIN'), controller.listUsers);
router.post('/users', authenticate, requireRole('ADMIN'), controller.createUser);
router.put('/users/:id', authenticate, requireRole('ADMIN'), controller.updateUser);
router.patch('/users/:id/password', authenticate, requireRole('ADMIN'), controller.resetPassword);

module.exports = router;
