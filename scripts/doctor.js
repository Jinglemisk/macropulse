#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const preflight = args.has('--preflight');

const failures = [];
const warnings = [];
const passes = [];

function pass(message) {
  passes.push(message);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  failures.push(message);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return env;
}

function hasRealValue(value) {
  if (!value) {
    return false;
  }

  return !/your_|_here|changeme|replace/i.test(value);
}

function resolveFromRoot(packageName) {
  return require.resolve(packageName, { paths: [rootDir] });
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) {
    fail(`Node ${process.versions.node} is installed. Macropulse needs Node 18 or newer.`);
    return;
  }
  pass(`Node ${process.versions.node}`);
}

function checkNodeDependencies() {
  const rootPackages = ['better-sqlite3', 'express', 'node-fetch', 'concurrently'];
  const frontendPackages = ['vite', 'react', 'react-dom'];

  for (const packageName of rootPackages) {
    try {
      resolveFromRoot(packageName);
    } catch {
      fail(`Root dependency "${packageName}" is missing. Run: npm install`);
      return;
    }
  }
  pass('Root npm dependencies are installed');

  const frontendDir = path.join(rootDir, 'frontend');
  for (const packageName of frontendPackages) {
    try {
      require.resolve(packageName, { paths: [frontendDir] });
    } catch {
      fail(`Frontend dependency "${packageName}" is missing. Run: npm --prefix frontend install`);
      return;
    }
  }
  pass('Frontend npm dependencies are installed');
}

function checkEnv() {
  const envPath = path.join(rootDir, '.env');
  const parsed = parseEnvFile(envPath);

  if (!parsed) {
    fail('.env is missing. Run: cp .env.example .env, then add your API keys.');
    return {};
  }

  pass('.env exists');

  const env = { ...process.env, ...parsed };
  for (const key of ['FMP_API_KEY', 'FRED_API_KEY']) {
    if (!hasRealValue(env[key])) {
      fail(`${key} is missing or still set to the placeholder value in .env.`);
    } else {
      pass(`${key} is configured`);
    }
  }

  if (!hasRealValue(env.OPENBB_FMP_API_KEY) && hasRealValue(env.FMP_API_KEY)) {
    warn('OPENBB_FMP_API_KEY is not set; the backend will derive it from FMP_API_KEY for Python provider calls.');
  }

  if (!hasRealValue(env.OPENBB_FRED_API_KEY) && hasRealValue(env.FRED_API_KEY)) {
    warn('OPENBB_FRED_API_KEY is not set; the backend will derive it from FRED_API_KEY if needed.');
  }

  return env;
}

function databasePath(env) {
  const configured = env.DATABASE_PATH || './data/stocks.db';
  return path.isAbsolute(configured) ? configured : path.resolve(rootDir, configured);
}

function checkDatabase(env) {
  let Database;
  try {
    Database = require(resolveFromRoot('better-sqlite3'));
  } catch {
    return;
  }

  const dbPath = databasePath(env);
  if (!fs.existsSync(dbPath)) {
    fail(`SQLite database is missing at ${path.relative(rootDir, dbPath)}. Run: npm run init-db`);
    return;
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    const macroCount = db.prepare('SELECT COUNT(*) AS count FROM macro_data').get().count;
    db.close();

    pass(`SQLite database exists at ${path.relative(rootDir, dbPath)}`);

    if (macroCount === 0) {
      fail('No macro rows are loaded. Run: npm run fetch-macro');
    } else {
      pass(`Macro data has ${macroCount} row${macroCount === 1 ? '' : 's'}`);
    }
  } catch (error) {
    fail(`Could not read SQLite database: ${error.message}`);
  }
}

function configuredPythonPath(env) {
  const configured = env.PYTHON_PATH || './venv/bin/python';
  return path.isAbsolute(configured) ? configured : path.resolve(rootDir, configured);
}

function checkPython(env) {
  const pythonPath = configuredPythonPath(env);

  if (!fs.existsSync(pythonPath)) {
    fail(`Python bridge is missing at ${path.relative(rootDir, pythonPath)}. Run: npm run setup`);
    return;
  }

  const result = spawnSync(pythonPath, ['-c', 'import openbb; print("ok")'], {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env,
      ...env,
      OPENBB_FMP_API_KEY: env.OPENBB_FMP_API_KEY || env.FMP_API_KEY || '',
      OPENBB_FRED_API_KEY: env.OPENBB_FRED_API_KEY || env.FRED_API_KEY || ''
    }
  });

  if (result.status === 0) {
    pass(`Python/OpenBB bridge works at ${path.relative(rootDir, pythonPath)}`);
    return;
  }

  const details = (result.stderr || result.stdout || '').trim();
  fail(`Python/OpenBB bridge is not ready. Run: npm run setup${details ? `\n  ${details.split('\n')[0]}` : ''}`);
}

function checkPort(port, label) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        const message = `${label} port ${port} is already in use. Stop the existing server or change the port.`;
        if (preflight) {
          fail(message);
        } else {
          warn(message);
        }
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        fail(`Cannot bind ${label} port ${port}: ${error.message}`);
      } else {
        warn(`Could not check ${label} port ${port}: ${error.message}`);
      }
      resolve();
    });
    server.once('listening', () => {
      server.close(() => {
        pass(`${label} port ${port} is available`);
        resolve();
      });
    });
    server.listen(port, 'localhost');
  });
}

async function main() {
  console.log(preflight ? 'Running Macropulse preflight...\n' : 'Running Macropulse doctor...\n');

  checkNodeVersion();
  checkNodeDependencies();
  const env = checkEnv();
  checkDatabase(env);
  checkPython(env);

  const backendPort = Number.parseInt(env.PORT || '8345', 10);
  await checkPort(backendPort, 'Backend');
  await checkPort(4949, 'Frontend');

  for (const message of passes) {
    console.log(`[ok] ${message}`);
  }

  for (const message of warnings) {
    console.warn(`[warn] ${message}`);
  }

  for (const message of failures) {
    console.error(`[fail] ${message}`);
  }

  if (failures.length > 0) {
    console.error('\nDoctor found blocking setup issues.');
    process.exit(1);
  }

  console.log('\nDoctor passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
