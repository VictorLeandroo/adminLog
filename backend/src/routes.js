const { Router } = require('express');

const authRoutes = require('./modules/auth/auth.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const routeRoutes = require('./modules/routes/route.routes');
const uploadRoutes = require('./modules/uploads/upload.routes');
const vehicleRoutes = require('./modules/vehicles/vehicle.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/routes', routeRoutes);
router.use('/finance', financeRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
