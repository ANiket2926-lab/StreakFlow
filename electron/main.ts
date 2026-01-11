import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as db from './database'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

console.log("Main process starting...");

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'), // compiled from preload.ts
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#121212', // Dark background by default
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  db.initDB();

  // IPC Handlers
  ipcMain.handle('db:getHabits', () => db.getHabits());
  ipcMain.handle('db:addHabit', (_, { name, type, color, targetValue }) =>
    db.addHabit(name, type, color, targetValue));
  ipcMain.handle('db:updateHabit', (_, { id, name, color, targetValue }) =>
    db.updateHabit(id, name, color, targetValue));
  ipcMain.handle('db:deleteHabit', (_, { id }) => db.deleteHabit(id));
  ipcMain.handle('db:getRecords', (_, { start, end }) => db.getRecords(start, end));
  ipcMain.handle('db:upsertRecord', (_, { habitId, date, status, value }) =>
    db.upsertRecord(habitId, date, status, value));
  ipcMain.handle('db:getAllRecords', () => db.getAllRecords());

  createWindow();
})
