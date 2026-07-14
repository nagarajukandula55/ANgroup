import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import Store from 'electron-store';

const store = new Store<{ apiBaseUrl?: string }>();
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0a0a0f',
    title: 'ANgroup Social',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Persisted API base URL (the deployed ANgroup instance this app talks to)
// lives in electron-store, not localStorage, so it survives independently
// of the renderer's cookie-backed session and is easy to reset from a
// settings screen without wiping auth.
ipcMain.handle('config:get-api-base-url', () => store.get('apiBaseUrl') || '');
ipcMain.handle('config:set-api-base-url', (_e, url: string) => {
  store.set('apiBaseUrl', url);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
