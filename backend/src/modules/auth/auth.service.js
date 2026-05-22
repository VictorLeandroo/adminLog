const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { UserRole } = require('@prisma/client');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'DRIVER']).default('DRIVER'),
});

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'DRIVER']).default('DRIVER'),
  active: z.boolean().default(true),
});

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function login(input) {
  const data = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.active) {
    throw new AppError('Email ou senha invalidos', 401);
  }

  const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Email ou senha invalidos', 401);
  }

  return {
    token: signToken(user),
    user: publicUser(user),
  };
}

async function register(input) {
  const data = registerSchema.parse(input);

  const exists = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (exists) {
    throw new AppError('Email ja cadastrado', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: UserRole[data.role],
    },
  });

  return {
    token: signToken(user),
    user: publicUser(user),
  };
}

async function listDrivers() {
  return prisma.user.findMany({
    where: {
      role: UserRole.DRIVER,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });
}

async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  });
}

async function createUser(input) {
  const data = userSchema.extend({
    password: z.string().min(6),
  }).parse(input);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError('Email ja cadastrado', 409);

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: UserRole[data.role],
      active: data.active,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function updateUser(id, input) {
  const data = userSchema.partial().parse(input);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Usuario nao encontrado', 404);

  if (data.email && data.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('Email ja cadastrado', 409);
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  return prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role ? UserRole[data.role] : undefined,
      active: data.active,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function resetPassword(id, input) {
  const schema = z.object({ password: z.string().min(6) });
  const data = schema.parse(input);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Usuario nao encontrado', 404);

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  });
}

module.exports = {
  login,
  register,
  listDrivers,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
};
