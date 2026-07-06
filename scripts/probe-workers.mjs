#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const full = process.argv.includes('--full');
const DEFAULT_TIMEOUT_MS = 45_000;

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

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function requireUrl(config, key, fallback) {
  const value = config[key] || fallback;
  if (!value) throw new Error(`${key} is not configured.`);
  return value;
}

function attemptSummary(attempts) {
  if (!Array.isArray(attempts)) return 'none';
  return attempts
    .map((attempt) => `${attempt.provider}/${attempt.model}/${attempt.status}${attempt.httpStatus ? `:${attempt.httpStatus}` : ''}`)
    .join(' | ');
}

async function getHealth(name, url) {
  const start = Date.now();
  const response = await fetchWithTimeout(url, {}, 15_000);
  const body = await readJson(response);
  const latency = Date.now() - start;
  console.log(`${name} GET ${response.status} (${latency}ms)`);
  console.log(JSON.stringify(body, null, 2));
  return body;
}

async function probeQwen(url) {
  const start = Date.now();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_tokens: 16,
      temperature: 0,
    }),
  }, 120_000);
  const body = await readJson(response);
  const latency = Date.now() - start;
  const metadata = body._sakura;
  console.log(`Qwen POST ${response.status} (${latency}ms)`);
  if (metadata) {
    console.log(`provider=${metadata.providerUsed || 'none'} model=${metadata.modelUsed || 'none'} quota=${metadata.quotaStatus}`);
    console.log(`attempts=${attemptSummary(metadata.waterfallAttempts)}`);
  } else {
    console.log(JSON.stringify(body, null, 2));
  }
}

async function probeFlux(url) {
  const start = Date.now();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: 'small pink sakura flower app icon on transparent-looking clean background',
      negativePrompt: 'text, watermark, logo',
      num_steps: 4,
    }),
  }, 180_000);
  const body = await readJson(response);
  const latency = Date.now() - start;
  console.log(`Flux POST ${response.status} (${latency}ms) image=${typeof body.image === 'string' && body.image.startsWith('data:image/')}`);
  if (!response.ok) console.log(JSON.stringify(body, null, 2));
}

async function probeMinimax(url, health, config) {
  const apiKey = config.MINIMAX_API_KEY;
  if (!health?.byok && !apiKey) {
    console.log('Minimax POST skipped: no server-side MINIMAX_API_KEY and no local MINIMAX_API_KEY for BYOK.');
    return;
  }

  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers['x-minimax-api-key'] = apiKey;
  const start = Date.now();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'short soft success chime for an IDE',
      is_instrumental: true,
      format: 'mp3',
      sample_rate: 32000,
    }),
  }, 180_000);
  const body = await readJson(response);
  const latency = Date.now() - start;
  console.log(`Minimax POST ${response.status} (${latency}ms) audio=${typeof body.audio === 'string' && body.audio.startsWith('data:audio/')}`);
  if (!response.ok) console.log(JSON.stringify(body, null, 2));
}

async function main() {
  const config = loadConfig();
  const qwenUrl = requireUrl(config, 'VITE_QWEN_WORKER_URL', 'https://qwen-coder-worker.alexdevriesxing.workers.dev/');
  const fluxUrl = requireUrl(config, 'VITE_FLUX_WORKER_URL', 'https://flux-image-worker.alexdevriesxing.workers.dev/');
  const minimaxUrl = requireUrl(config, 'VITE_MINIMAX_MUSIC_WORKER_URL', 'https://minimax-music-worker.alexdevriesxing.workers.dev/');

  console.log(`Provider mode: ${config.VITE_AI_PROVIDER_MODE || 'mock'}`);
  const qwenHealth = await getHealth('Qwen', qwenUrl);
  const fluxHealth = await getHealth('Flux', fluxUrl);
  const minimaxHealth = await getHealth('Minimax', minimaxUrl);

  console.log('\nLive probes:');
  try {
    await probeQwen(qwenUrl);
  } catch (error) {
    console.log(`Qwen POST failed: ${error instanceof Error ? error.message : error}`);
  }
  if (full) {
    try {
      await probeFlux(fluxUrl, fluxHealth);
    } catch (error) {
      console.log(`Flux POST failed: ${error instanceof Error ? error.message : error}`);
    }
    try {
      await probeMinimax(minimaxUrl, minimaxHealth, config);
    } catch (error) {
      console.log(`Minimax POST failed: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    console.log('Flux/Minimax POST probes skipped. Re-run with -- --full to generate media.');
  }

  if (!qwenHealth?.providers?.find?.((provider) => provider.name === 'openrouter')?.configured) {
    console.log('\nOpenRouter is not configured on the deployed Qwen worker; Cloudflare Workers AI will be the only LLM route.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
