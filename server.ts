import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("garage.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    garageName TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    userEmail TEXT,
    name TEXT,
    mobile TEXT,
    vn TEXT,
    make TEXT,
    model TEXT,
    date TEXT,
    km TEXT,
    dr TEXT,
    sdd TEXT,
    lob TEXT,
    lb TEXT,
    FOREIGN KEY(userEmail) REFERENCES users(email)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, garageName } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, garageName) VALUES (?, ?, ?)");
      stmt.run(email, hashedPassword, garageName);
      res.json({ success: true, user: { email, garageName } });
    } catch (error: any) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({ success: true, user: { email: user.email, garageName: user.garageName } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Vehicle Routes
  app.get("/api/vehicles", (req, res) => {
    const email = req.query.email as string;
    const vehicles = db.prepare("SELECT * FROM vehicles WHERE userEmail = ?").all(email);
    res.json(vehicles);
  });

  app.post("/api/vehicles", (req, res) => {
    const { userEmail, vehicle } = req.body;
    const stmt = db.prepare(`
      INSERT INTO vehicles (id, userEmail, name, mobile, vn, make, model, date, km, dr, sdd, lob, lb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      vehicle.id,
      userEmail,
      vehicle.name,
      vehicle.mobile,
      vehicle.vn,
      vehicle.make,
      vehicle.model,
      vehicle.date,
      vehicle.km,
      vehicle.dr,
      vehicle.sdd,
      vehicle.lob || null,
      vehicle.lb || null
    );
    res.json({ success: true });
  });

  app.put("/api/vehicles/:id", (req, res) => {
    const { id } = req.params;
    const { vehicle } = req.body;
    const stmt = db.prepare(`
      UPDATE vehicles 
      SET name = ?, mobile = ?, vn = ?, make = ?, model = ?, date = ?, km = ?, sdd = ?, lob = ?, lb = ?
      WHERE id = ?
    `);
    stmt.run(
      vehicle.name,
      vehicle.mobile,
      vehicle.vn,
      vehicle.make,
      vehicle.model,
      vehicle.date,
      vehicle.km,
      vehicle.sdd,
      vehicle.lob,
      vehicle.lb,
      id
    );
    res.json({ success: true });
  });

  app.delete("/api/vehicles/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
