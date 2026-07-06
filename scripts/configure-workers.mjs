#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const includeAuth = process.argv.includes('--include-auth');
const dryRun = process.argv.includes('--dry-run');

const workerSecrets = [
  {
    label: 'Qwen coder worker',
    cwd: resolve(root, 'workers/qwen-coder-worker'),
    secrets: ['OPENROUTER_API_KEY'],
  },
  {
    label: 'Minimax music worker',
    cwd: resolve(root, 'workers/minimax-music-worker'),
    secrets: ['MINIMAX_API_KEY'],
  },
];

if (includeAuth) {
  for (const worker of workerSecrets) {
    worker.secrets.push('SAKURA_WORKER_AUTH_TOKEN');
  }
}

function parseDotEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadConfig() {
  const envPath = resolve(root, '.env');
  const fileValues = existsSync(envPath) ? parseDotEnv(readFileSync(envPath, 'utf8')) : {};
  return { ...fileValues, ...process.env };
}

function hasUsableValue(value) {
  if (!value || !String(value).trim()) return false;
  const normalized = String(value).trim().toLowerCase();
  return ![
    'changeme',
    'change-me',
    'your-key-here',
    'your-api-key',
    'your-base-url',
    'sk-xxxxxxxxxxxxx',
  ].includes(normalized);
}

function putSecret(cwd, key, value) {
  return new Promise((resolvePromise, reject) => {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npx, ['wrangler', 'secret', 'put', key], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(`wrangler secret put ${key} failed with exit code ${code}\n${stderr || stdout}`));
      }
    });

    child.stdin.write(`${value}\n`);
    child.stdin.end();
  });
}

async function main() {
  const config = loadConfig();
  const missing = [];
  const configured = [];

  console.log('Configuring Sakura Cloudflare Worker secrets from .env/shell.');
  console.log('Secret values are never printed.');

  for (const worker of workerSecrets) {
    if (!existsSync(worker.cwd)) {
      throw new Error(`Missing worker directory: ${worker.cwd}`);
    }

    for (const key of worker.secrets) {
      const value = config[key];
      if (!hasUsableValue(value)) {
        missing.push(`${worker.label}: ${key}`);
        continue;
      }

      if (dryRun) {
        configured.push(`${worker.label}: ${key} (dry run)`);
        continue;
      }

      process.stdout.write(`Setting ${key} on ${worker.label}... `);
      await putSecret(worker.cwd, key, value);
      configured.push(`${worker.label}: ${key}`);
      process.stdout.write('done\n');
    }
  }

  if (configured.length) {
    console.log('\nConfigured secrets:');
    for (const item of configured) console.log(`- ${item}`);
  }

  if (missing.length) {
    console.log('\nMissing or empty values, skipped:');
    for (const item of missing) console.log(`- ${item}`);
  }

  if (!includeAuth) {
    console.log('\nPrivate worker auth was not configured. Pass -- --include-auth only after the frontend is set up to send the token.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
