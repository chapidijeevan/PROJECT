import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "better-sqlite3";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database Initialization
  const db = new sqlite3("aushiva.db");
  
  // Initialize Schema
  const schema = `
    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL, -- ADMIN, PHARMACIST, STAFF
      hospital_id INTEGER,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      batch_number TEXT,
      manufacturer TEXT,
      quantity INTEGER DEFAULT 0,
      expiry_date DATE,
      hospital_id INTEGER,
      is_excess BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
    );

    CREATE TABLE IF NOT EXISTS usage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER,
      quantity_used INTEGER,
      department TEXT,
      date_used DATE DEFAULT (date('now')),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );

    CREATE TABLE IF NOT EXISTS medicine_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER,
      requesting_hospital_id INTEGER,
      status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
      request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id),
      FOREIGN KEY (requesting_hospital_id) REFERENCES hospitals(id)
    );
  `;
  db.exec(schema);

  // Seed Data if empty
  const hospitalCount = db.prepare("SELECT COUNT(*) as count FROM hospitals").get() as { count: number };
  if (hospitalCount.count === 0) {
    db.prepare("INSERT INTO hospitals (name, location) VALUES (?, ?)").run("City General Hospital", "Downtown");
    db.prepare("INSERT INTO hospitals (name, location) VALUES (?, ?)").run("St. Mary Medical Center", "Uptown");
    db.prepare("INSERT INTO users (username, password, role, hospital_id) VALUES (?, ?, ?, ?)").run("admin", "admin123", "ADMIN", 1);
  }

  // API Routes
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", (req, res) => {
    const totalMedicines = db.prepare("SELECT COUNT(*) as count FROM medicines").get() as any;
    const expiringSoon = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date BETWEEN date('now') AND date('now', '+30 days')").get() as any;
    const expired = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date < date('now')").get() as any;
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE quantity < 10").get() as any;
    const excessStock = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE is_excess = 1").get() as any;
    
    res.json({
      totalMedicines: totalMedicines.count,
      expiringSoon: expiringSoon.count,
      expired: expired.count,
      lowStock: lowStock.count,
      excessStock: excessStock.count,
      totalHospitals: (db.prepare("SELECT COUNT(*) as count FROM hospitals").get() as any).count
    });
  });

  // Medicine CRUD
  app.get("/api/medicines", (req, res) => {
    const medicines = db.prepare("SELECT * FROM medicines ORDER BY created_at DESC").all();
    res.json(medicines);
  });

  app.get("/api/medicines/barcode/:barcode", (req, res) => {
    const medicine = db.prepare("SELECT * FROM medicines WHERE barcode = ?").get(req.params.barcode);
    if (medicine) {
      res.json(medicine);
    } else {
      res.status(404).json({ message: "Medicine not found" });
    }
  });

  app.post("/api/medicines", (req, res) => {
    const { name, barcode, batch_number, manufacturer, quantity, expiry_date, hospital_id } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO medicines (name, barcode, batch_number, manufacturer, quantity, expiry_date, hospital_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, barcode, batch_number, manufacturer, quantity, expiry_date, hospital_id || 1);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/medicines/:id", (req, res) => {
    const { quantity, is_excess } = req.body;
    db.prepare("UPDATE medicines SET quantity = ?, is_excess = ? WHERE id = ?").run(quantity, is_excess ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Usage Tracking
  app.post("/api/usage", (req, res) => {
    const { medicine_id, quantity_used, department } = req.body;
    db.transaction(() => {
      db.prepare("INSERT INTO usage_history (medicine_id, quantity_used, department) VALUES (?, ?, ?)").run(medicine_id, quantity_used, department);
      db.prepare("UPDATE medicines SET quantity = quantity - ? WHERE id = ?").run(quantity_used, medicine_id);
    })();
    res.json({ success: true });
  });

  // Demand Prediction
  app.get("/api/prediction", (req, res) => {
    const history = db.prepare(`
      SELECT m.name, SUM(uh.quantity_used) as total_used, COUNT(DISTINCT strftime('%Y-%m', uh.date_used)) as months
      FROM usage_history uh
      JOIN medicines m ON uh.medicine_id = m.id
      GROUP BY m.id
    `).all() as any[];
    
    const predictions = history.map(h => ({
      name: h.name,
      predictedDemand: Math.ceil((h.total_used / (h.months || 1)) * 1.2)
    }));
    
    res.json(predictions);
  });

  // Multi-Hospital Sharing
  app.get("/api/sharing/excess", (req, res) => {
    const excess = db.prepare(`
      SELECT m.*, h.name as hospital_name 
      FROM medicines m 
      JOIN hospitals h ON m.hospital_id = h.id 
      WHERE m.is_excess = 1
    `).all();
    res.json(excess);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AUSHIVA Server running on http://localhost:${PORT}`);
  });
}

startServer();
