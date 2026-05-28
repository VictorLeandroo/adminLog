const service = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  res.json(result);
});

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  res.json({ user: await service.updateProfile(req.user.id, req.body) });
});

const listDrivers = asyncHandler(async (_req, res) => {
  res.json(await service.listDrivers());
});

const listUsers = asyncHandler(async (_req, res) => {
  res.json(await service.listUsers());
});

const createUser = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createUser(req.body));
});

const updateUser = asyncHandler(async (req, res) => {
  res.json(await service.updateUser(req.params.id, req.body));
});

const resetPassword = asyncHandler(async (req, res) => {
  res.json(await service.resetPassword(req.params.id, req.body));
});

module.exports = {
  login,
  register,
  me,
  updateMe,
  listDrivers,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
};
