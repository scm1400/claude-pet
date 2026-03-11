/**
 * UsageTracker — fetches Claude utilization data from the Anthropic OAuth usage API.
 *
 * API VERIFICATION NOTE (Task 0):
 * The endpoint GET https://api.anthropic.com/api/oauth/usage returned:
 *   {"type":"error","error":{"type":"authentication_error",
 *    "message":"OAuth authentication is currently not supported."}}
 * The token was valid but the endpoint does not yet support OAuth bearer tokens.
 * Implementation uses the ASSUMED interface below; verify when the API becomes available:
 *
 *   interface UsageApiResponse {
 *     five_hour?: { utilization?: number; resets_at?: string };
 *     seven_day?: { utilization?: number; resets_at?: string };
 *   }
 *
 * No Electron imports. Uses only Node built-ins: https, fs, os, path.
 */

import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

export interface UsageData {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  resetsAt: string | null;
  fiveHourResetsAt: string | null;
  dataSource: 'api' | 'jsonl' | 'none';
  stale: boolean;
  rateLimited: boolean;
  error: string | null;
}

interface UsageApiResponse {
  five_hour?: { utilization?: number; resets_at?: string };
  seven_day?: { utilization?: number; resets_at?: string };
}

/** Token counts extracted from a single JSONL assistant entry */
interface SessionTokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  timestamp: string; // ISO 8601
}

/** Aggregated token totals for a time window */
interface WindowTokenTotals {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
  total: number;
  entryCount: number;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

// ---------------------------------------------------------------------------
// Dynamic calibration: learn tokens-per-percent from successful API responses
// ---------------------------------------------------------------------------
interface CalibrationData {
  fiveHour: { tokensPerPercent: number; updatedAt: string } | null;
  sevenDay: { tokensPerPercent: number; updatedAt: string } | null;
}

const CALIBRATION_PATH = path.join(os.homedir(), '.claude', 'mama-calibration.json');
const CALIBRATION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadCalibration(): CalibrationData {
  try {
    const raw = fs.readFileSync(CALIBRATION_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { fiveHour: null, sevenDay: null };
  }
}

function saveCalibration(data: CalibrationData): void {
  try {
    fs.writeFileSync(CALIBRATION_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.log('[usage-tracker] Failed to save calibration:', err instanceof Error ? err.message : err);
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Called after a successful API response to learn the relationship between
 * JSONL token counts and API utilization percentages.
 */
function updateCalibration(apiData: UsageData): void {
  if (apiData.dataSource !== 'api') return;

  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const files = collectJsonlFiles();
  if (files.length === 0) return;

  const fiveHourEntries: SessionTokenUsage[] = [];
  const sevenDayEntries: SessionTokenUsage[] = [];

  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs < sevenDaysAgo) continue;
    } catch { continue; }

    const entries = parseJsonlTokenUsage(file, sevenDaysAgo);
    for (const entry of entries) {
      const entryTime = new Date(entry.timestamp).getTime();
      sevenDayEntries.push(entry);
      if (entryTime >= fiveHoursAgo) {
        fiveHourEntries.push(entry);
      }
    }
  }

  const cal = loadCalibration();
  const nowIso = new Date().toISOString();

  // Only calibrate if API returned meaningful utilization (> 1%) and we have tokens
  if (apiData.fiveHourUtilization && apiData.fiveHourUtilization > 1) {
    const tokens = aggregateTokens(fiveHourEntries).total;
    if (tokens > 0) {
      cal.fiveHour = { tokensPerPercent: tokens / apiData.fiveHourUtilization, updatedAt: nowIso };
    }
  }
  if (apiData.weeklyUtilization && apiData.weeklyUtilization > 1) {
    const tokens = aggregateTokens(sevenDayEntries).total;
    if (tokens > 0) {
      cal.sevenDay = { tokensPerPercent: tokens / apiData.weeklyUtilization, updatedAt: nowIso };
    }
  }

  saveCalibration(cal);
  console.log(`[usage-tracker] Calibration updated: 5h=${cal.fiveHour?.tokensPerPercent?.toFixed(0) ?? 'n/a'} tok/%, 7d=${cal.sevenDay?.tokensPerPercent?.toFixed(0) ?? 'n/a'} tok/%`);
}

// ---------------------------------------------------------------------------
// JSONL Session Parser — extract token usage from ~/.claude/projects/*/*.jsonl
// ---------------------------------------------------------------------------

function collectJsonlFiles(): string[] {
  try {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return [];
    const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(CLAUDE_PROJECTS_DIR, d.name));

    const files: string[] = [];
    for (const dir of projectDirs) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            files.push(path.join(dir, entry.name));
          }
        }
      } catch { /* skip unreadable dirs */ }
    }
    return files;
  } catch {
    return [];
  }
}

function parseJsonlTokenUsage(filePath: string, sinceMs: number): SessionTokenUsage[] {
  const results: SessionTokenUsage[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'assistant' || !entry.message?.usage) continue;
        const ts = entry.timestamp ?? entry.message?.timestamp;
        if (!ts) continue;
        const entryTime = new Date(ts).getTime();
        if (isNaN(entryTime) || entryTime < sinceMs) continue;

        const usage = entry.message.usage;
        results.push({
          input_tokens: usage.input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          timestamp: ts,
        });
      } catch { /* skip malformed lines */ }
    }
  } catch { /* skip unreadable files */ }
  return results;
}

function aggregateTokens(entries: SessionTokenUsage[]): WindowTokenTotals {
  let input = 0, cacheCreation = 0, cacheRead = 0, output = 0;
  for (const e of entries) {
    input += e.input_tokens;
    cacheCreation += e.cache_creation_input_tokens;
    cacheRead += e.cache_read_input_tokens;
    output += e.output_tokens;
  }
  // Rate limit utilization is based on compute cost, not raw token count.
  // cache_read tokens are ~10x cheaper, cache_creation ~25% cheaper than input.
  // Use weighted total: input + output fully, cache_creation at 0.25, cache_read at 0.1
  const weightedTotal = input + output
    + Math.round(cacheCreation * 0.25)
    + Math.round(cacheRead * 0.1);
  return {
    input, cacheCreation, cacheRead, output,
    total: weightedTotal,
    entryCount: entries.length,
  };
}

function estimateUsageFromJsonl(): UsageData {
  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const files = collectJsonlFiles();
  if (files.length === 0) {
    console.log('[usage-tracker] JSONL fallback: no session files found');
    return noData('Rate limited', true);
  }

  const fiveHourEntries: SessionTokenUsage[] = [];
  const sevenDayEntries: SessionTokenUsage[] = [];

  for (const file of files) {
    // Quick filter: skip files older than 7 days by mtime
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs < sevenDaysAgo) continue;
    } catch { continue; }

    const entries = parseJsonlTokenUsage(file, sevenDaysAgo);
    for (const entry of entries) {
      const entryTime = new Date(entry.timestamp).getTime();
      sevenDayEntries.push(entry);
      if (entryTime >= fiveHoursAgo) {
        fiveHourEntries.push(entry);
      }
    }
  }

  if (sevenDayEntries.length === 0) {
    console.log('[usage-tracker] JSONL fallback: no entries in 7-day window');
    return noData('Rate limited', true);
  }

  const fiveHourTotals = aggregateTokens(fiveHourEntries);
  const sevenDayTotals = aggregateTokens(sevenDayEntries);

  const cal = loadCalibration();
  const calAge5h = cal.fiveHour ? Date.now() - new Date(cal.fiveHour.updatedAt).getTime() : Infinity;
  const calAge7d = cal.sevenDay ? Date.now() - new Date(cal.sevenDay.updatedAt).getTime() : Infinity;

  // Use calibration if available and fresh (< 24h), otherwise fall back to cache
  const has5hCal = cal.fiveHour && calAge5h < CALIBRATION_MAX_AGE_MS;
  const has7dCal = cal.sevenDay && calAge7d < CALIBRATION_MAX_AGE_MS;

  if (!has5hCal && !has7dCal) {
    console.log('[usage-tracker] JSONL fallback: no fresh calibration data');
    return noData('Rate limited', true);
  }

  const fiveHourUtil = has5hCal
    ? Math.min(100, fiveHourTotals.total / cal.fiveHour!.tokensPerPercent)
    : null;
  const weeklyUtil = has7dCal
    ? Math.min(100, sevenDayTotals.total / cal.sevenDay!.tokensPerPercent)
    : null;

  console.log(`[usage-tracker] JSONL fallback: 5h=${fiveHourTotals.total} tokens (${fiveHourUtil?.toFixed(1) ?? 'n/a'}%), 7d=${sevenDayTotals.total} tokens (${weeklyUtil?.toFixed(1) ?? 'n/a'}%)`);

  return {
    weeklyUtilization: weeklyUtil,
    fiveHourUtilization: fiveHourUtil,
    resetsAt: null,
    fiveHourResetsAt: null,
    dataSource: 'jsonl',
    stale: false,
    rateLimited: true,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Credential reading
// ---------------------------------------------------------------------------

function readAccessTokenFromFile(): string | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

// macOS Keychain — use absolute path to avoid PATH issues in packaged apps
const SECURITY_BIN = '/usr/bin/security';
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
let keychainCache: { token: string; readAt: number } | null = null;
const KEYCHAIN_CACHE_TTL_MS = 4 * 60 * 1000; // cache for 4 min (poll is every 5 min)

function readAccessTokenFromKeychain(): string | null {
  // Return cached value if fresh enough
  if (keychainCache && Date.now() - keychainCache.readAt < KEYCHAIN_CACHE_TTL_MS) {
    return keychainCache.token;
  }
  try {
    if (!fs.existsSync(SECURITY_BIN)) {
      console.log('[usage-tracker] security binary not found at', SECURITY_BIN);
      return null;
    }
    const raw = execSync(
      `${SECURITY_BIN} find-generic-password -s "${KEYCHAIN_SERVICE}" -w`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    const parsed = JSON.parse(raw);
    const token = parsed?.claudeAiOauth?.accessToken ?? null;
    if (token) {
      keychainCache = { token, readAt: Date.now() };
    }
    return token;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish between "not found" vs "keychain locked" vs other errors
    if (msg.includes('could not be found')) {
      console.log('[usage-tracker] Keychain: no Claude Code credentials entry found');
    } else if (msg.includes('User interaction is not allowed') || msg.includes('errSecInteractionNotAllowed')) {
      console.log('[usage-tracker] Keychain: locked or interaction not allowed (screen locked?)');
    } else {
      console.log('[usage-tracker] Keychain read failed:', msg.slice(0, 150));
    }
    return null;
  }
}

// Linux — try secret-tool (libsecret / GNOME Keyring / KDE Wallet)
function readAccessTokenFromSecretTool(): string | null {
  try {
    const raw = execSync(
      'secret-tool lookup service "Claude Code-credentials"',
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function readAccessToken(): string | null {
  // 1) Try credentials file (works on all platforms)
  const fromFile = readAccessTokenFromFile();
  if (fromFile) {
    console.log('[usage-tracker] Token source: credentials file');
    return fromFile;
  }
  // 2) macOS: Keychain
  if (process.platform === 'darwin') {
    const fromKeychain = readAccessTokenFromKeychain();
    if (fromKeychain) {
      console.log('[usage-tracker] Token source: macOS Keychain');
      return fromKeychain;
    }
  }
  // 3) Linux: secret-tool (libsecret)
  if (process.platform === 'linux') {
    const fromSecret = readAccessTokenFromSecretTool();
    if (fromSecret) {
      console.log('[usage-tracker] Token source: secret-tool (libsecret)');
      return fromSecret;
    }
  }
  console.log('[usage-tracker] No credentials found (tried: file' +
    (process.platform === 'darwin' ? ', keychain' : '') +
    (process.platform === 'linux' ? ', secret-tool' : '') + ')');
  return null;
}

function readAccessTokenWithRetry(): string | null {
  const token = readAccessToken();
  if (token !== null) return token;
  // EBUSY retry on Windows — small delay then retry once
  if (process.platform === 'win32') {
    try {
      const start = Date.now();
      while (Date.now() - start < 50) { /* busy wait ~50ms */ }
      return readAccessTokenFromFile();
    } catch {
      return null;
    }
  }
  return null;
}

function httpsGet(url: string, token: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'claude-code/2.0.32',
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });

    req.on('error', reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error('Request timed out'));
    });
    req.end();
  });
}

function noData(error: string, rateLimited = false): UsageData {
  return {
    weeklyUtilization: null,
    fiveHourUtilization: null,
    resetsAt: null, fiveHourResetsAt: null,
    dataSource: 'none',
    stale: true,
    rateLimited,
    error,
  };
}

async function fetchUsage(token: string): Promise<UsageData> {
  const result = await httpsGet('https://api.anthropic.com/api/oauth/usage', token);
  console.log(`[usage-tracker] API response: status=${result.status}, body=${result.body.slice(0, 200)}`);

  if (result.status === 200) {
    const json: UsageApiResponse = JSON.parse(result.body);
    const apiData: UsageData = {
      weeklyUtilization: json.seven_day?.utilization ?? null,
      fiveHourUtilization: json.five_hour?.utilization ?? null,
      resetsAt: json.seven_day?.resets_at ?? null,
      fiveHourResetsAt: json.five_hour?.resets_at ?? null,
      dataSource: 'api',
      stale: false,
      rateLimited: false,
      error: null,
    };
    // Learn token-to-percent ratio for future JSONL fallback
    updateCalibration(apiData);
    return apiData;
  }

  if (result.status === 401) {
    return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, rateLimited: false, error: '401' };
  }

  if (result.status === 429) {
    return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, rateLimited: true, error: '429' };
  }

  return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, rateLimited: false, error: `HTTP ${result.status}` };
}

async function fetchOnce(token: string): Promise<UsageData> {
  try {
    const data = await fetchUsage(token);
    if (data.error === null) return data;

    // 429 (rate limited) → use JSONL session files for better accuracy
    if (data.rateLimited) {
      console.log('[usage-tracker] API 429, falling back to JSONL session parser');
      return estimateUsageFromJsonl();
    }

    // Other API errors → cache fallback
    console.log(`[usage-tracker] API error (${data.error}), no data available`);
    return noData('No data available');
  } catch (err) {
    console.log(`[usage-tracker] Network error: ${err instanceof Error ? err.message : err}, no data available`);
    return noData('No data available');
  }
}

const MAX_BACKOFF_ERR_MS = 15 * 60 * 1000; // 15 min cap for other errors

function addJitter(baseMs: number): number {
  const jitter = baseMs * 0.15;
  return baseMs + (Math.random() * 2 - 1) * jitter;
}

type UpdateCallback = (data: UsageData) => void;

export class UsageTracker {
  private callbacks: UpdateCallback[] = [];
  private currentState: UsageData = {
    weeklyUtilization: null,
    fiveHourUtilization: null,
    resetsAt: null, fiveHourResetsAt: null,
    dataSource: 'none',
    stale: false,
    rateLimited: false,
    error: null,
  };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoffLevel = 0;

  onUpdate(callback: UpdateCallback): void {
    this.callbacks.push(callback);
  }

  getCurrentState(): UsageData {
    return this.currentState;
  }

  start(): void {
    // Fetch immediately on start
    void this.poll();
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(rateLimited: boolean, hasError: boolean): void {
    let interval: number;
    if (rateLimited) {
      // Retry quickly (10s) to get a successful API response for calibration
      interval = 10_000;
      console.log(`[usage-tracker] Rate limited. Retrying in 10s`);
    } else if (hasError) {
      this.backoffLevel = Math.min(this.backoffLevel + 1, 2);
      const cap = MAX_BACKOFF_ERR_MS;
      interval = Math.min(POLL_INTERVAL_MS * Math.pow(2, this.backoffLevel), cap);
      console.log(`[usage-tracker] Error. Backoff level ${this.backoffLevel}, next poll in ${Math.round(interval / 1000)}s`);
    } else {
      this.backoffLevel = 0;
      interval = POLL_INTERVAL_MS;
    }

    const jittered = addJitter(interval);
    this.timer = setTimeout(() => { void this.poll(); }, jittered);
  }

  private async poll(): Promise<void> {
    const data = await this.doPoll();
    this.currentState = data;
    for (const cb of this.callbacks) {
      cb(data);
    }
    this.scheduleNext(data.rateLimited, data.error !== null && data.error !== 'NO_CREDENTIALS');
  }

  private async doPoll(): Promise<UsageData> {
    // Check for credentials
    let token = readAccessTokenWithRetry();
    if (!token) {
      return {
        weeklyUtilization: null,
        fiveHourUtilization: null,
        resetsAt: null, fiveHourResetsAt: null,
        dataSource: 'none',
        stale: false,
        rateLimited: false,
        error: 'NO_CREDENTIALS',
      };
    }

    let result = await fetchOnce(token);

    // On 401: re-read credentials (Claude Code may have refreshed them) and retry once
    if (result.error === '401') {
      token = readAccessTokenWithRetry();
      if (!token) {
        return {
          weeklyUtilization: null,
          fiveHourUtilization: null,
          resetsAt: null, fiveHourResetsAt: null,
          dataSource: 'none',
          stale: false,
          rateLimited: false,
          error: 'NO_CREDENTIALS',
        };
      }
      result = await fetchOnce(token);
      if (result.error === '401') {
        return noData('No data available');
      }
    }

    return result;
  }
}
