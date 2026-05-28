const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Token nao informado', 401);
  }

  const token = header.replace('Bearer ', '');
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    throw new AppError('Token invalido ou expirado', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, active: true, photoUrl: true, photoName: true },
  });

  if (!user || !user.active) {
    throw new AppError('Usuario nao autorizado', 401);
  }

  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Acesso negado', 403));
    }

    return next();
  };
}

module.exports = { authenticate, requireRole };
module.exports.authMiddleware = authenticate;
module.exports.roleMiddleware = requireRole;
