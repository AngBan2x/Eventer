CREATE TABLE IF NOT EXISTS espacios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    capacidad INT,
    eliminado BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    nombre VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    espacio VARCHAR(255) NOT NULL,
    responsable VARCHAR(255),
    tipo VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'pendiente',
    descripcion TEXT,
    nota_rechazo TEXT,
    eliminado BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asistencias (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT REFERENCES eventos(id),
    usuario_id BIGINT,
    fecha_registro TIMESTAMP DEFAULT NOW()
);