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

export interface UsageData {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  resetsAt: string | null;
  fiveHourResetsAt: string | null;
  dataSource: 'api' | 'cache' | 'none';
  stale: boolean;
  error: string | null;
}

interface UsageApiResponse {
  five_hour?: { utilization?: number; resets_at?: string };
  seven_day?: { utilization?: number; resets_at?: string };
}

interface DailyModelTokenEntry {
  date: string;
  tokensByModel: Record<string, number>;
}

interface StatsCacheJson {
  dailyModelTokens?: DailyModelTokenEntry[];
}

// Rough estimate: treat 1 million tokens/day as 100% utilization for cache fallback.
const DAILY_TOKEN_BASELINE = 1_000_000;

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const STATS_CACHE_PATH = path.join(os.homedir(), '.claude', 'stats-cache.json');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function readAccessToken(): string | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function readAccessTokenWithRetry(): string | null {
  const token = readAccessToken();
  if (token !== null) return token;
  // EBUSY retry on Windows — small delay then retry once
  try {
    const start = Date.now();
    while (Date.now() - start < 50) { /* busy wait ~50ms */ }
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
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

function fallbackToCache(): UsageData {
  try {
    const raw = fs.readFileSync(STATS_CACHE_PATH, 'utf8');
    const cache: StatsCacheJson = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Try today's entry first, then fall back to the most recent entry
    const entries = cache.dailyModelTokens ?? [];
    const todayEntry = entries.find((e) => e.date === today);
    const bestEntry = todayEntry ?? entries.sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!bestEntry) {
      return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'cache', stale: true, error: 'No cache data available' };
    }

    const totalTokens = Object.values(bestEntry.tokensByModel).reduce((a, b) => a + b, 0);
    const utilization = Math.min(100, (totalTokens / DAILY_TOKEN_BASELINE) * 100);
    const isStale = !todayEntry; // stale if we had to use an older entry

    console.log(`[usage-tracker] cache fallback: date=${bestEntry.date}, tokens=${totalTokens}, util=${utilization.toFixed(1)}%, stale=${isStale}`);

    return {
      weeklyUtilization: utilization,
      fiveHourUtilization: null,
      resetsAt: null, fiveHourResetsAt: null,
      dataSource: 'cache',
      stale: isStale,
      error: null,
    };
  } catch {
    return {
      weeklyUtilization: null,
      fiveHourUtilization: null,
      resetsAt: null, fiveHourResetsAt: null,
      dataSource: 'none',
      stale: true,
      error: 'Cache unavailable',
    };
  }
}

async function fetchUsage(token: string): Promise<UsageData> {
  const result = await httpsGet('https://api.anthropic.com/api/oauth/usage', token);
  console.log(`[usage-tracker] API response: status=${result.status}, body=${result.body.slice(0, 200)}`);

  if (result.status === 200) {
    const json: UsageApiResponse = JSON.parse(result.body);
    return {
      weeklyUtilization: json.seven_day?.utilization ?? null,
      fiveHourUtilization: json.five_hour?.utilization ?? null,
      resetsAt: json.seven_day?.resets_at ?? null,
      fiveHourResetsAt: json.five_hour?.resets_at ?? null,
      dataSource: 'api',
      stale: false,
      error: null,
    };
  }

  if (result.status === 401) {
    return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, error: '401' };
  }

  if (result.status === 429) {
    return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, error: '429' };
  }

  return { weeklyUtilization: null, fiveHourUtilization: null, resetsAt: null, fiveHourResetsAt: null, dataSource: 'none', stale: true, error: `HTTP ${result.status}` };
}

async function fetchOnce(token: string): Promise<UsageData> {
  try {
    const data = await fetchUsage(token);
    if (data.error === null) return data;
    // Any API error → immediate cache fallback (no slow retries blocking UI)
    console.log(`[usage-tracker] API error (${data.error}), falling back to cache`);
    return fallbackToCache();
  } catch (err) {
    console.log(`[usage-tracker] Network error: ${err instanceof Error ? err.message : err}, falling back to cache`);
    return fallbackToCache();
  }
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
    error: null,
  };
  private timer: ReturnType<typeof setInterval> | null = null;

  onUpdate(callback: UpdateCallback): void {
    this.callbacks.push(callback);
  }

  getCurrentState(): UsageData {
    return this.currentState;
  }

  start(): void {
    // Fetch immediately on start
    void this.poll();
    this.timer = setInterval(() => { void this.poll(); }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    const data = await this.doPoll();
    this.currentState = data;
    for (const cb of this.callbacks) {
      cb(data);
    }
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
          error: 'NO_CREDENTIALS',
        };
      }
      result = await fetchOnce(token);
      if (result.error === '401') {
        return fallbackToCache();
      }
    }

    return result;
  }
}
