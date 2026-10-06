-- ==========================================================
-- ESTRUCTURA Y DATOS DE PRUEBA COMPLETOS PARA LA IA - OCTO ERP
-- ==========================================================

CREATE DATABASE IF NOT EXISTS octo_db;
USE octo_db;

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100),
    telefono VARCHAR(20)
);

-- 2. Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5
);

-- 3. Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    total DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- 4. Tabla Detalle de Ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- 5. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'vendedor',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- DATOS DE PRUEBA PARA ANALÍTICA E IA
-- ==========================================================

-- Limpiar tablas si ya existían datos previos
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE detalle_ventas;
TRUNCATE TABLE ventas;
TRUNCATE TABLE productos;
TRUNCATE TABLE clientes;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- Insertar Clientes
INSERT INTO clientes (id, nombre, correo, telefono) VALUES
(1, 'Carlos Mendoza', 'carlos.mendoza@email.com', '555-0191'),
(2, 'Ana Gutiérrez', 'ana.gutierrez@email.com', '555-0192'),
(3, 'Roberto Gómez', 'roberto.gomez@email.com', '555-0193'),
(4, 'Lucía Fernández', 'lucia.f@email.com', '555-0194');

-- Insertar Productos (incluye productos con stock bajo para que la IA los detecte)
INSERT INTO productos (id, nombre, precio, stock, stock_minimo) VALUES
(1, 'Teclado Mecánico RGB', 45.00, 18, 5),
(2, 'Mouse Inalámbrico Ergonómico', 25.00, 2, 5), -- Stock bajo
(3, 'Monitor Gaming 24"', 180.00, 10, 3),
(4, 'Auriculares Bluetooth', 60.00, 1, 4), -- Stock bajo
(5, 'Silla Gamer Ergonómica', 210.00, 7, 2);

-- Insertar Usuarios
INSERT INTO usuarios (id, nombre, correo, password, rol) VALUES
(1, 'Admin Sistema', 'admin@octo.com', 'admin123', 'admin'),
(2, 'Vendedor Uno', 'vendedor@octo.com', 'vend123', 'vendedor');

-- Insertar Ventas Recientes
INSERT INTO ventas (id, cliente_id, total, fecha) VALUES
(1, 1, 70.00, NOW() - INTERVAL 10 DAY),
(2, 2, 180.00, NOW() - INTERVAL 5 DAY),
(3, 3, 270.00, NOW() - INTERVAL 2 DAY),
(4, 1, 25.00, NOW() - INTERVAL 1 DAY);

-- Insertar Detalle de Ventas
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES
(1, 1, 1, 45.00), -- Venta 1: 1 Teclado
(1, 2, 1, 25.00), -- Venta 1: 1 Mouse
(2, 3, 1, 180.00),-- Venta 2: 1 Monitor
(3, 5, 1, 210.00),-- Venta 3: 1 Silla
(3, 4, 1, 60.00), -- Venta 3: 1 Auricular
(4, 2, 1, 25.00); -- Venta 4: 1 Mouse