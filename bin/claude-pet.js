#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PET_DIR = path.join(os.homedir(), '.claude-pet');
const LOCK_FILE = path.join(PET_DIR, 'app.pid');

// Check if process with given PID is running
function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Check lock file for existing instance
if (fs.existsSync(LOCK_FILE)) {
  const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
  if (pid && isRunning(pid)) {
    // Already running — exit silently
    process.exit(0);
  }
}

// Launch Electron app
const electronPath = require('electron');
const appPath = path.join(__dirname, '..', 'dist', 'main', 'main', 'main.js');

const child = spawn(electronPath, [appPath], {
  stdio: 'ignore',
  detached: true,
});

// Write PID lock file
fs.mkdirSync(PET_DIR, { recursive: true });
fs.writeFileSync(LOCK_FILE, String(child.pid));

child.unref();
