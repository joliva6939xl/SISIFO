// Middleware global para manejar errores en el backend
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Error de validación de Sequelize/PostgreSQL
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.errors?.map(e => e.message) || err.message
    });
  }

  // Error de autenticación
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Credenciales inválidas o sesión expirada'
    });
  }

  // Error de recurso no encontrado
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Recurso no encontrado',
      message: err.message
    });
  }

  // Error genérico del servidor
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado'
  });
};

// Middleware para rutas no encontradas
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.path} no existe`
  });
};

module.exports = { errorHandler, notFoundHandler };