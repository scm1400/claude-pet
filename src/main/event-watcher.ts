import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const EVENTS_DIR = path.join(os.homedir(), '.claude-pet');
const EVENTS_FILE = path.join(EVENTS_DIR, 'events.jsonl');

interface PetEvent {
  type: 'feed' | 'play' | 'pet';
  timestamp: string;
}

type EventCallback = (event: PetEvent) => void;

export class EventWatcher {
  private callback: EventCallback;
  private watcher: fs.FSWatcher | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastReadPosition: number = 0;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(callback: EventCallback) {
    this.callback = callback;
  }

  start(): void {
    // Ensure events directory exists
    fs.mkdirSync(EVENTS_DIR, { recursive: true });

    // Create events file if it doesn't exist
    if (!fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '');
    }

    // Record initial file size
    const stat = fs.statSync(EVENTS_FILE);
    this.lastReadPosition = stat.size;

    // Try fs.watch with debounce
    let watchFired = false;
    try {
      this.watcher = fs.watch(EVENTS_FILE, () => {
        watchFired = true;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          this.readNewEvents();
        }, 200);
      });

      // Test write to verify fs.watch works
      const testTimeout = setTimeout(() => {
        if (!watchFired) {
          // fs.watch didn't fire — fall back to polling
          if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
          }
          this.startPolling();
        }
      }, 2000);

      // Perform test write
      fs.appendFileSync(EVENTS_FILE, '');

      // If watcher errors out, fall back to polling
      this.watcher.on('error', () => {
        clearTimeout(testTimeout);
        if (this.watcher) {
          this.watcher.close();
          this.watcher = null;
        }
        this.startPolling();
      });
    } catch {
      // fs.watch not supported — fall back to polling
      this.startPolling();
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.readNewEvents();
    }, 3000);
  }

  private readNewEvents(): void {
    try {
      const stat = fs.statSync(EVENTS_FILE);

      // File was trimmed/truncated — reset position
      if (stat.size < this.lastReadPosition) {
        this.lastReadPosition = 0;
      }

      // No new data
      if (stat.size === this.lastReadPosition) {
        return;
      }

      // Read only the new portion of the file
      const fd = fs.openSync(EVENTS_FILE, 'r');
      const bufferSize = stat.size - this.lastReadPosition;
      const buffer = Buffer.alloc(bufferSize);
      fs.readSync(fd, buffer, 0, bufferSize, this.lastReadPosition);
      fs.closeSync(fd);

      this.lastReadPosition = stat.size;

      const newContent = buffer.toString('utf-8');
      const lines = newContent.split('\n').filter((line) => line.trim().length > 0);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.type === 'string' &&
            typeof parsed.timestamp === 'string' &&
            ['feed', 'play', 'pet'].includes(parsed.type)
          ) {
            this.callback(parsed as PetEvent);
          }
        } catch {
          // Invalid JSON line — skip silently
        }
      }
    } catch {
      // File read error — log but never throw
    }
  }
}
