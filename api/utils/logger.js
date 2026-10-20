const winston = require('winston');
const path = require('path');

// Asegurarnos de que la carpeta 'logs' exista (Winston la crea, pero es buena práctica)
const logDir = path.join(__dirname, '../logs');

// Configuración profesional de Winston
const logger = winston.createLogger({
  level: 'info', // Nivel mínimo de registro (info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Guarda el stack trace de los errores
    winston.format.json() // Formato legible por máquinas (JSON)
  ),
  defaultMeta: { service: 'sisifo-api' },
  transports: [
    // 1. Archivo exclusivo para ERRORES (fácil de filtrar)
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // 2. Archivo con TODA la actividad (info, warn, error)
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ]
});

// Si estamos en desarrollo, también mostramos los logs en la consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;