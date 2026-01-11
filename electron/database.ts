import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database;

export const initDB = () => {
  try {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }
    const dbPath = path.join(userData, 'habits.db');
    console.log("Opening Database at:", dbPath);

    db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL');

    // Init Schema
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

export const getHabits = () => {
  return db.prepare('SELECT * FROM habits ORDER BY created_at DESC').all();
};

export const addHabit = (name: string, type: string, color: string, targetValue?: number) => {
  console.log("Adding habit:", name);
  const stmt = db.prepare('INSERT INTO habits (name, type, color, target_value) VALUES (?, ?, ?, ?)');
  const info = stmt.run(name, type, color, targetValue || null);
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(info.lastInsertRowid);
};

export const updateHabit = (id: number, name: string, color: string, targetValue?: number) => {
  const stmt = db.prepare('UPDATE habits SET name = ?, color = ?, target_value = ? WHERE id = ?');
  stmt.run(name, color, targetValue || null, id);
  return { id };
};

export const deleteHabit = (id: number) => {
  db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  return { id };
};

export const getRecords = (startDate: string, endDate: string) => {
  return db.prepare('SELECT * FROM records WHERE date BETWEEN ? AND ?').all(startDate, endDate);
};

export const getAllRecords = () => {
  return db.prepare('SELECT * FROM records').all();
}

export const upsertRecord = (habitId: number, date: string, status: string, value?: number) => {
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
