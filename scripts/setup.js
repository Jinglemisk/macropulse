#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  console.log(`\n> ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function commandWorks(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'ignore',
    shell: false
  });
  return result.status === 0;
}

function resolvePython() {
  const candidates = [];

  if (process.env.PYTHON) {
    candidates.push({ command: process.env.PYTHON, args: [] });
  }

  if (process.platform === 'win32') {
    candidates.push({ command: 'py', args: ['-3'] });
    candidates.push({ command: 'python', args: [] });
  } else {
    candidates.push({ command: 'python3', args: [] });
    candidates.push({ command: 'python', args: [] });
  }

  for (const candidate of candidates) {
    if (commandWorks(candidate.command, [...candidate.args, '--version'])) {
      return candidate;
    }
  }

  console.error('\nPython 3 was not found. Install Python 3.11+ and rerun npm run setup.');
  process.exit(1);
}

function venvPythonPath() {
  return process.platform === 'win32'
    ? path.join(rootDir, 'venv', 'Scripts', 'python.exe')
    : path.join(rootDir, 'venv', 'bin', 'python');
}

function ensureEnvFile() {
  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');

  if (fs.existsSync(envPath)) {
    console.log('\n.env already exists; leaving it unchanged.');
    return;
  }

  fs.copyFileSync(examplePath, envPath);
  console.log('\nCreated .env from .env.example.');
  console.log('Edit .env and add FMP_API_KEY + FRED_API_KEY before fetching macro data.');
}

console.log('Setting up Macropulse local dependencies...');

run(npmCmd, ['install']);
run(npmCmd, ['--prefix', 'frontend', 'install']);

const python = resolvePython();
const venvPython = venvPythonPath();

if (!fs.existsSync(venvPython)) {
  run(python.command, [...python.args, '-m', 'venv', 'venv']);
} else {
  console.log('\nPython virtual environment already exists; leaving it in place.');
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt']);

ensureEnvFile();
run(npmCmd, ['run', 'init-db']);

console.log('\nSetup complete.');
console.log('Next steps:');
console.log('1. Edit .env with real FMP_API_KEY and FRED_API_KEY values.');
console.log('2. Run: npm run doctor');
console.log('3. Run: npm run fetch-macro');
console.log('4. Run: npm run dev:all');
