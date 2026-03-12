-- AUSHIVA MySQL Database Schema
-- Production Ready Script

CREATE DATABASE IF NOT EXISTS aushiva_db;
USE aushiva_db;

-- Hospitals Table
CREATE TABLE hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'PHARMACIST', 'STAFF') NOT NULL,
    hospital_id INT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

-- Medicines Table
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    batch_number VARCHAR(100),
    manufacturer VARCHAR(255),
    quantity INT DEFAULT 0,
    expiry_date DATE NOT NULL,
    hospital_id INT,
    is_excess BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_barcode (barcode),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Usage History Table
CREATE TABLE usage_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT,
    quantity_used INT NOT NULL,
    department VARCHAR(100),
    date_used DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

-- Medicine Requests Table (Multi-Hospital Sharing)
CREATE TABLE medicine_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT,
    requesting_hospital_id INT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (requesting_hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Seed Data
INSERT INTO hospitals (name, location) VALUES ('City General Hospital', 'Downtown');
INSERT INTO users (username, password, role, hospital_id) VALUES ('admin', '$2a$10$e0MYzXy...', 'ADMIN', 1);
