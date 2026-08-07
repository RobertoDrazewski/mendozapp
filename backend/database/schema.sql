-- ============================================
-- MENDOZAPP - Schema MySQL (Railway)
-- ============================================

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comercios y bodegas adheridos (pagan suscripción)
CREATE TABLE IF NOT EXISTS comercios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  tipo ENUM('bodega','restaurante','comercio','hotel','turismo_aventura','otro') NOT NULL DEFAULT 'comercio',
  descripcion_es TEXT,
  descripcion_en TEXT,
  descripcion_pt TEXT,
  direccion VARCHAR(255),
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  telefono VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(150),
  sitio_web VARCHAR(255),
  instagram VARCHAR(150),
  foto_url VARCHAR(500),
  google_maps_link VARCHAR(500),
  horario_texto VARCHAR(255),
  destacado BOOLEAN DEFAULT FALSE,

  -- Estado de suscripción (Mercado Pago)
  estado ENUM('activo','inactivo','pendiente','moroso') NOT NULL DEFAULT 'pendiente',
  mp_subscription_id VARCHAR(150),          -- preapproval_id de Mercado Pago
  mp_payer_email VARCHAR(150),
  plan VARCHAR(50) DEFAULT 'estandar',      -- estandar, destacado, etc.
  fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE,
  aviso_vencimiento_enviado BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Log histórico de pagos/eventos de Mercado Pago (auditoría)
CREATE TABLE IF NOT EXISTS suscripciones_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comercio_id INT NOT NULL,
  mp_payment_id VARCHAR(150),
  tipo_evento VARCHAR(100),      -- payment.created, subscription.cancelled, etc.
  estado VARCHAR(50),
  monto DECIMAL(10,2),
  raw_payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comercio_id) REFERENCES comercios(id) ON DELETE CASCADE
);

-- Espacios públicos: monumentos, plazas, sitios históricos (gratis, no pagan)
CREATE TABLE IF NOT EXISTS pois (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('monumento','plaza','historia','mirador','museo','iglesia','otro') NOT NULL,
  icono VARCHAR(10) DEFAULT '📍',
  nombre_es VARCHAR(200) NOT NULL,
  nombre_en VARCHAR(200),
  nombre_pt VARCHAR(200),
  sub_es VARCHAR(255),
  sub_en VARCHAR(255),
  sub_pt VARCHAR(255),
  historia_es TEXT,
  historia_en TEXT,
  historia_pt TEXT,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  google_maps_link VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banners promocionales controlados desde el admin (cerrables por el usuario)
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  texto_es VARCHAR(255) NOT NULL,
  texto_en VARCHAR(255),
  texto_pt VARCHAR(255),
  link VARCHAR(500),
  color_fondo VARCHAR(20) DEFAULT '#6B1E3C',
  activo BOOLEAN DEFAULT TRUE,
  fecha_inicio DATE,
  fecha_fin DATE,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de mensajes del chat IA (opcional, para mejorar respuestas con el tiempo)
CREATE TABLE IF NOT EXISTS chat_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100),
  pregunta TEXT,
  respuesta TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comercios_estado ON comercios(estado);
CREATE INDEX idx_comercios_tipo ON comercios(tipo);
CREATE INDEX idx_pois_tipo ON pois(tipo);
CREATE INDEX idx_banners_activo ON banners(activo);
