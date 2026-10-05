function errorHandler(error, _req, res, _next) {
  if (error.code === 'P2002'
    && (error.meta?.modelName === 'RouteInvoice'
      || String(error.meta?.target || '').includes('RouteInvoice_number_key')
      || (Array.isArray(error.meta?.target) && error.meta.target.includes('number')))) {
    return res.status(409).json({
      message: 'Uma das notas fiscais já está cadastrada. Não é permitido repetir o número na mesma rota ou em outras rotas.',
    });
  }

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
