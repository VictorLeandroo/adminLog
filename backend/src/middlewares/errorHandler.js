function errorHandler(error, _req, res, _next) {
  if (error.name === 'ZodError') {
    return res.status(400).json({
      message: 'Dados invalidos',
      errors: error.issues,
    });
  }

  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.message || 'Erro interno do servidor',
  });
}

module.exports = { errorHandler };
