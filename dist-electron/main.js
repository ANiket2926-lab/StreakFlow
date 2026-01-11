import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
let db;
const initDB = () => {
  try {
    const userData = app.getPath("userData");
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }
    const dbPath = path.join(userData, "habits.db");
    console.log("Opening Database at:", dbPath);
    db = new Database(dbPath, { verbose: console.log });
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT NOT NULL,
        target_value REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        value REAL,
        FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_records_habit_date ON records(habit_id, date);
    `);
    console.log("Database initialized successfully.");
  } catch (e) {
    console.error("Failed to init database:", e);
    throw e;
  }
};
const getHabits = () => {
  return db.prepare("SELECT * FROM habits ORDER BY created_at DESC").all();
};
const addHabit = (name, type, color, targetValue) => {
  console.log("Adding habit:", name);
  const stmt = db.prepare("INSERT INTO habits (name, type, color, target_value) VALUES (?, ?, ?, ?)");
  const info = stmt.run(name, type, color, targetValue || null);
  return db.prepare("SELECT * FROM habits WHERE id = ?").get(info.lastInsertRowid);
};
const updateHabit = (id, name, color, targetValue) => {
  const stmt = db.prepare("UPDATE habits SET name = ?, color = ?, target_value = ? WHERE id = ?");
  stmt.run(name, color, targetValue || null, id);
  return { id };
};
const deleteHabit = (id) => {
  db.prepare("DELETE FROM habits WHERE id = ?").run(id);
  return { id };
};
const getRecords = (startDate, endDate) => {
  return db.prepare("SELECT * FROM records WHERE date BETWEEN ? AND ?").all(startDate, endDate);
};
const getAllRecords = () => {
  return db.prepare("SELECT * FROM records").all();
};
const upsertRecord = (habitId, date, status, value) => {
  console.log(`Upserting record: ${habitId} ${date} ${status}`);
  const stmt = db.prepare(`
    INSERT INTO records (habit_id, date, status, value)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET
      status = excluded.status,
      value = excluded.value
  `);
  stmt.run(habitId, date, status, value || null);
};
createRequire(import.meta.url);
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
});
console.log("Main process starting...");
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      // compiled from preload.ts
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: "#121212"
    // Dark background by default
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  initDB();
  ipcMain.handle("db:getHabits", () => getHabits());
  ipcMain.handle("db:addHabit", (_, { name, type, color, targetValue }) => addHabit(name, type, color, targetValue));
  ipcMain.handle("db:updateHabit", (_, { id, name, color, targetValue }) => updateHabit(id, name, color, targetValue));
  ipcMain.handle("db:deleteHabit", (_, { id }) => deleteHabit(id));
  ipcMain.handle("db:getRecords", (_, { start, end }) => getRecords(start, end));
  ipcMain.handle("db:upsertRecord", (_, { habitId, date, status, value }) => upsertRecord(habitId, date, status, value));
  ipcMain.handle("db:getAllRecords", () => getAllRecords());
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
