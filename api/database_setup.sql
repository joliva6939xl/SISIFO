-- ==========================================
-- SISIFO - Configuración inicial de base de datos
-- Sistema de Monitoreo Municipal
-- ==========================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    usuario VARCHAR(100) UNIQUE NOT NULL,
    dni VARCHAR(20),
    cargo VARCHAR(50) NOT NULL DEFAULT 'OPERADOR',
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    motivo_estado TEXT,
    otp_secret VARCHAR(100),
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reportes de monitoreo
CREATE TABLE IF NOT EXISTS reportes_monitoreo (
    id SERIAL PRIMARY KEY,
    id_incidencia VARCHAR(50) NOT NULL,
    etapa VARCHAR(50) NOT NULL,
    camara VARCHAR(100),
    zona VARCHAR(100),
    roper VARCHAR(100),
    categoria VARCHAR(100),
    incidencia VARCHAR(200),
    asunto TEXT,
    atendido VARCHAR(100),
    foto_video TEXT,
    operador VARCHAR(100),
    centro_trabajo VARCHAR(100),
    turno VARCHAR(50),
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de salas de chat
CREATE TABLE IF NOT EXISTS chats_salas (
    id_sala SERIAL PRIMARY KEY,
    nombre_sala VARCHAR(200) UNIQUE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'GLOBAL',
    creado_por VARCHAR(100),
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chats_mensajes (
    id_mensaje SERIAL PRIMARY KEY,
    id_sala INTEGER REFERENCES chats_salas(id_sala) ON DELETE CASCADE,
    remitente VARCHAR(100),
    contenido TEXT,
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cámaras
CREATE TABLE IF NOT EXISTS camaras (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200),
    macro_zona VARCHAR(100),
    sector VARCHAR(100)
);

-- Tabla de personal de campo
CREATE TABLE IF NOT EXISTS personal_campo (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200),
    categoria VARCHAR(100),
    grupo VARCHAR(100),
    tipo_entrada VARCHAR(100),
    estado BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- USUARIO INICIAL: CALL CENTER (ADMINISTRADOR)
-- Con OTP pre-configurado para Google Authenticator
-- ==========================================
INSERT INTO usuarios (nombre, apellido, usuario, dni, cargo, estado, otp_secret)
VALUES ('CALL', 'CENTER', 'ccenter', '1', 'ADMINISTRADOR', 'ACTIVO', 'JBSWY3DPEHPK3PXP')
ON CONFLICT (usuario) DO NOTHING;

-- ==========================================
-- DATOS DE EJEMPLO (pueden eliminarse en producción)
-- ==========================================
INSERT INTO camaras (codigo, nombre, macro_zona, sector) VALUES
('C-01', 'CAMARA NORTE 1', 'NORTE', 'SECTOR 1'),
('C-02', 'CAMARA SUR 1', 'SUR', 'SECTOR 1')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO personal_campo (codigo, nombre, categoria, grupo, tipo_entrada) VALUES
('P-001', 'JUAN PEREZ', 'SEGURIDAD', 'GRUPO A', 'FIJO'),
('P-002', 'MARIA LOPEZ', 'LIMPIEZA', 'GRUPO B', 'FIJO')
ON CONFLICT (codigo) DO NOTHING;

-- Sala de reportes por defecto
INSERT INTO chats_salas (nombre_sala, tipo, creado_por) VALUES
('REPORTE DE LLAMADAS :C', 'GLOBAL', 'SISTEMA')
ON CONFLICT (nombre_sala) DO NOTHING;