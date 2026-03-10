# Compact Widget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Claude Mama widget from a fixed 250x300 always-expanded window to a compact mini mode with hover/auto-expand and direct drag-to-move.

**Architecture:** The window stays at a fixed 200x250 transparent size. Mini/expanded states are pure CSS transitions — no window resizing. Hit-test based `setIgnoreMouseEvents` switching enables drag on the character area while keeping the rest click-through. Expansion direction is calculated from screen position.

**Tech Stack:** Electron 40, React 19, TypeScript, electron-store

**Spec:** `docs/superpowers/specs/2026-03-10-compact-widget-design.md`

---

## Chunk 1: IPC & Main Process Foundation

### Task 1: Add new IPC channels to types and preload

**Files:**
- Modify: `src/shared/types.ts` — add new IPC channel constants
- Modify: `src/main/preload.ts` — expose new channels
- Modify: `src/renderer/electron.d.ts` — add type declarations

- [ ] **Step 1: Add IPC channel constants**

In `src/shared/types.ts`, add to the `IPC_CHANNELS` const:

```typescript
SET_IGNORE_MOUSE: 'mama:set-ignore-mouse',
SAVE_POSITION: 'mama:save-position',
```

- [ ] **Step 2: Add preload bridge methods**

In `src/main/preload.ts`, add to the `CHANNELS` const:

```typescript
SET_IGNORE_MOUSE: 'mama:set-ignore-mouse',
SAVE_POSITION: 'mama:save-position',
```

Add to the `contextBridge.exposeInMainWorld` object:

```typescript
setIgnoreMouse: (ignore: boolean): void => {
  ipcRenderer.send(CHANNELS.SET_IGNORE_MOUSE, ignore);
},

savePosition: (x: number, y: number): void => {
  ipcRenderer.send(CHANNELS.SAVE_POSITION, x, y);
},
```

- [ ] **Step 3: Add TypeScript declarations**

In `src/renderer/electron.d.ts`, add to the `ElectronAPI` interface:

```typescript
setIgnoreMouse(ignore: boolean): void;
savePosition(x: number, y: number): void;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/main/preload.ts src/renderer/electron.d.ts
git commit -m "feat(ipc): add set-ignore-mouse and save-position channels"
```

### Task 2: Handle new IPC in main process

**Files:**
- Modify: `src/main/main.ts` — window size, position restore, IPC listeners
- Modify: `src/main/ipc-handlers.ts` — remove preset position logic, add new handlers

- [ ] **Step 1: Update window creation in main.ts**

In `createWindow()`, change window dimensions and position loading:

```typescript
const winWidth = 200;
const winHeight = 250;

// Restore saved position or default to bottom-right
const store = getStore();
const savedPos = (store as any).get('windowPosition', null) as { x: number; y: number } | null;

let x: number, y: number;
if (savedPos) {
  x = savedPos.x;
  y = savedPos.y;
} else {
  x = width - winWidth - 16;
  y = height - winHeight - 16;
}

const win = new BrowserWindow({
  width: winWidth,
  height: winHeight,
  x,
  y,
  // ... rest unchanged
});
```

- [ ] **Step 2: Add IPC listeners in main.ts**

After `registerIpcHandlers(win, collectionManager);`, add:

```typescript
ipcMain.on(IPC_CHANNELS.SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
  if (win && !win.isDestroyed()) {
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      win.setIgnoreMouseEvents(false);
    }
  }
});

ipcMain.on(IPC_CHANNELS.SAVE_POSITION, (_event, x: number, y: number) => {
  const store = getStore();
  (store as any).set('windowPosition', { x, y });
});
```

Import `IPC_CHANNELS` is already imported.

- [ ] **Step 3: Remove old applyPosition from ipc-handlers.ts**

In `src/main/ipc-handlers.ts`:
- Remove the `applyPosition()` function entirely
- Remove the `if (settings.position && mainWindow ...)` block from `SETTINGS_SET` handler
- Remove `position` from the store defaults (keep other defaults)

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/main.ts src/main/ipc-handlers.ts
git commit -m "feat(main): dynamic mouse events, position save/restore, remove presets"
```

## Chunk 2: Renderer Mini/Expand State

### Task 3: Create useWidgetMode hook

**Files:**
- Create: `src/renderer/hooks/useWidgetMode.ts`

This hook manages the mini/expanded state with hover and auto-expand logic.

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';

export type WidgetMode = 'mini' | 'expanded';
export type ExpandDirection = 'up' | 'down';

interface UseWidgetModeReturn {
  mode: WidgetMode;
  direction: ExpandDirection;
  onCharacterEnter: () => void;
  onCharacterLeave: () => void;
  triggerAutoExpand: () => void;
}

export function useWidgetMode(): UseWidgetModeReturn {
  const [mode, setMode] = useState<WidgetMode>('mini');
  const [direction, setDirection] = useState<ExpandDirection>('up');
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHovering = useRef(false);

  const cancelCollapse = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  const startCollapse = (delay: number) => {
    cancelCollapse();
    collapseTimer.current = setTimeout(() => {
      if (!isHovering.current) {
        setMode('mini');
      }
      collapseTimer.current = null;
    }, delay);
  };

  const computeDirection = useCallback((): ExpandDirection => {
    const screenH = window.screen.availHeight;
    const winY = window.screenY;
    const winH = window.outerHeight;
    return (winY + winH / 2) > (screenH / 2) ? 'up' : 'down';
  }, []);

  const onCharacterEnter = useCallback(() => {
    isHovering.current = true;
    cancelCollapse();
    setDirection(computeDirection());
    setMode('expanded');
  }, [computeDirection]);

  const onCharacterLeave = useCallback(() => {
    isHovering.current = false;
    startCollapse(1000);
  }, []);

  const triggerAutoExpand = useCallback(() => {
    setDirection(computeDirection());
    setMode('expanded');
    // Auto-collapse is handled by SpeechBubble's onComplete callback
  }, [computeDirection]);

  useEffect(() => {
    return () => {
      cancelCollapse();
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    };
  }, []);

  return { mode, direction, onCharacterEnter, onCharacterLeave, triggerAutoExpand };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.renderer.json --noEmit` (or just `npx tsc --noEmit`)
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/useWidgetMode.ts
git commit -m "feat(hook): add useWidgetMode for mini/expand state management"
```

### Task 4: Update App.tsx with mini/expand layout

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Integrate useWidgetMode and restructure MainView**

Replace the `MainView` function:

```typescript
import { useWidgetMode } from './hooks/useWidgetMode';
// ... existing imports

function MainView() {
  const mamaState = useMamaState();
  const { mode, direction, onCharacterEnter, onCharacterLeave, triggerAutoExpand } = useWidgetMode();
  const [locale, setLocale] = useState<Locale>('ko');
  const prevMessageRef = React.useRef<string>('');

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      if (s && (s as { locale?: Locale }).locale) {
        setLocale((s as { locale: Locale }).locale);
      }
    });
  }, []);

  const mood = mamaState?.mood ?? 'sleeping';
  const message = mamaState?.message ?? t(locale, 'loading_message');
  const utilizationPercent = mamaState?.utilizationPercent ?? 0;
  const fiveHourPercent = mamaState?.fiveHourPercent ?? null;
  const fiveHourResetsAt = mamaState?.fiveHourResetsAt ?? null;
  const dataSource = mamaState?.dataSource ?? 'none';

  // Auto-expand on message rotation
  useEffect(() => {
    if (message !== prevMessageRef.current) {
      prevMessageRef.current = message;
      if (mamaState) {
        triggerAutoExpand();
      }
    }
  }, [message, mamaState, triggerAutoExpand]);

  const isExpanded = mode === 'expanded';

  const handleBubbleComplete = () => {
    // After bubble fade-out, start collapse (if not hovering)
    // The 1s delay is in the useWidgetMode hook via onCharacterLeave
    onCharacterLeave();
  };

  // Build content order based on direction
  const bubble = isExpanded ? (
    <SpeechBubble message={message} mood={mood} onComplete={handleBubbleComplete} />
  ) : null;

  const character = (
    <Character
      expression={mood}
      onMouseEnter={onCharacterEnter}
      onMouseLeave={onCharacterLeave}
    />
  );

  const usageBars = dataSource === 'none' ? (
    <OfflineLabel locale={locale} />
  ) : isExpanded ? (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
      <WeeklyBar utilizationPercent={utilizationPercent} resetsAt={mamaState?.resetsAt ?? null} mood={mood} />
      {fiveHourPercent != null && (
        <FiveHourBar fiveHourPercent={fiveHourPercent} fiveHourResetsAt={fiveHourResetsAt} />
      )}
    </div>
  ) : (
    <MiniBar utilizationPercent={utilizationPercent} mood={mood} />
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: direction === 'up' ? 'flex-end' : 'flex-start',
      background: 'transparent',
      padding: '8px 0',
      transition: 'all 300ms ease',
    }}>
      {direction === 'up' ? (
        <>
          {bubble}
          {bubble && <div style={{ height: 6 }} />}
          {character}
          <div style={{ marginTop: 4 }}>{usageBars}</div>
        </>
      ) : (
        <>
          {character}
          <div style={{ marginTop: 4 }}>{usageBars}</div>
          {bubble && <div style={{ height: 6 }} />}
          {bubble}
        </>
      )}
    </div>
  );
}
```

Add `MiniBar` to the import from UsageIndicator (will be created in Task 6).
Add `onComplete` prop to SpeechBubble import (will be added in Task 5).

- [ ] **Step 2: Commit** (may have type errors until Tasks 5-6)

```bash
git add src/renderer/App.tsx
git commit -m "feat(ui): integrate mini/expand modes with direction-aware layout"
```

### Task 5: Update SpeechBubble with onComplete callback

**Files:**
- Modify: `src/renderer/components/SpeechBubble.tsx`

- [ ] **Step 1: Add onComplete prop**

Update the interface:

```typescript
interface SpeechBubbleProps {
  message: string;
  mood: string;
  onComplete?: () => void;
}
```

Update function signature:

```typescript
export function SpeechBubble({ message, mood, onComplete }: SpeechBubbleProps) {
```

In the auto-hide timeout (where it sets `setAnimState('out')`), call onComplete after fade-out:

```typescript
hideTimerRef.current = setTimeout(() => {
  setAnimState('out');
  setTimeout(() => {
    setVisible(false);
    onComplete?.();
  }, 400);
}, 4000);
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/SpeechBubble.tsx
git commit -m "feat(bubble): add onComplete callback for collapse trigger"
```

### Task 6: Add MiniBar component and update Character props

**Files:**
- Modify: `src/renderer/components/UsageIndicator.tsx` — add MiniBar export
- Modify: `src/renderer/components/Character.tsx` — reduce size, add mouse event props

- [ ] **Step 1: Add MiniBar to UsageIndicator.tsx**

Add at the end of the file, before the `styles` const:

```typescript
/** Compact single-line bar for mini mode */
export function MiniBar({ utilizationPercent, mood }: {
  utilizationPercent: number;
  mood: Expression;
}) {
  const clamped = clamp(utilizationPercent);
  const color = MOOD_COLORS[mood] ?? '#9ca3af';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(0, 0, 0, 0.65)',
      borderRadius: 6,
      padding: '3px 6px',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{
        width: 36,
        height: 5,
        background: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${clamped}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{
        fontSize: 9,
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 700,
        textShadow: '0 1px 3px rgba(0,0,0,1)',
      }}>
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Update Character.tsx**

Change dimensions and add mouse event props:

```typescript
const IMG_W = 60;
const IMG_H = 60;

interface CharacterProps {
  expression: Expression;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
```

Update the component to forward events and add drag region:

```typescript
export function Character({ expression, onMouseEnter, onMouseLeave }: CharacterProps) {
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: IMG_W,
    height: IMG_H,
    animation: MOOD_ANIMATIONS[expression],
    cursor: 'grab',
    WebkitAppRegion: 'drag' as any,
  };

  // ... imgStyle and auraStyle unchanged ...

  return (
    <div
      style={containerStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {auraStyle && <div style={auraStyle as CSSProperties} />}
      <img src={mamaPng} alt="Claude Mama" style={imgStyle} draggable={false} />
      <MoodOverlay expression={expression} />
    </div>
  );
}
```

Also scale down the MoodOverlay pixel sizes. Change `const px = 4;` to `const px = 2.5;` inside `MoodOverlay` to proportionally shrink overlays for the 60px character.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/UsageIndicator.tsx src/renderer/components/Character.tsx
git commit -m "feat(ui): add MiniBar, reduce character to 60px, add drag region"
```

## Chunk 3: Hit-Test Mouse Events & Drag Position

### Task 7: Implement hit-test pointer event switching

**Files:**
- Modify: `src/renderer/App.tsx` — add mousemove listener for hit-test

- [ ] **Step 1: Add hit-test logic to MainView**

The character element has `onMouseEnter`/`onMouseLeave` that call `setIgnoreMouse`. Add a global mousemove handler on the document to handle the transparent area:

```typescript
// Inside MainView, add:
const characterRef = React.useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    // Check if mouse is over the character area
    if (characterRef.current) {
      const rect = characterRef.current.getBoundingClientRect();
      const isOverCharacter =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      window.electronAPI.setIgnoreMouse(!isOverCharacter);
    }
  };

  document.addEventListener('mousemove', handleMouseMove);
  return () => document.removeEventListener('mousemove', handleMouseMove);
}, []);
```

Pass `characterRef` to the Character component:

```typescript
<Character
  ref={characterRef}
  expression={mood}
  onMouseEnter={onCharacterEnter}
  onMouseLeave={onCharacterLeave}
/>
```

Update Character.tsx to accept a forwarded ref:

```typescript
import React, { CSSProperties, forwardRef } from 'react';

export const Character = forwardRef<HTMLDivElement, CharacterProps>(
  function Character({ expression, onMouseEnter, onMouseLeave }, ref) {
    // ... same implementation, but use ref on the outer div:
    return (
      <div
        ref={ref}
        style={containerStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* ... */}
      </div>
    );
  }
);
```

- [ ] **Step 2: Verify TypeScript compiles and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/Character.tsx
git commit -m "feat: hit-test based dynamic pointer event switching"
```

### Task 8: Save position on drag end

**Files:**
- Modify: `src/renderer/App.tsx` — add drag end detection

- [ ] **Step 1: Detect drag end and save position**

Electron's `-webkit-app-region: drag` handles the actual dragging. We detect when the window has moved by listening to the `mouseup` event after drag, then saving the new position:

In MainView, add:

```typescript
useEffect(() => {
  let lastX = window.screenX;
  let lastY = window.screenY;

  const checkPosition = () => {
    if (window.screenX !== lastX || window.screenY !== lastY) {
      lastX = window.screenX;
      lastY = window.screenY;
      window.electronAPI.savePosition(lastX, lastY);
    }
  };

  // Check position periodically during potential drag
  const interval = setInterval(checkPosition, 200);
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: save window position after drag via periodic check"
```

## Chunk 4: Settings Cleanup & Polish

### Task 9: Remove position dropdown from Settings

**Files:**
- Modify: `src/renderer/pages/Settings.tsx` — remove position UI
- Modify: `src/shared/i18n.ts` — keep i18n keys (harmless), no changes needed

- [ ] **Step 1: Remove position section from Settings.tsx**

Remove the `POSITIONS` const, `POS_KEYS` const, and the entire position card from the JSX (the `{/* Position */}` section). Remove `position` from the local state default.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pages/Settings.tsx
git commit -m "chore: remove position dropdown from Settings (replaced by drag)"
```

### Task 10: Add mini/expand CSS transitions

**Files:**
- Modify: `src/renderer/styles/styles.css` — add transition classes

- [ ] **Step 1: Add transition styles**

Append to `styles.css`:

```css
/* Mini/Expand transitions */
.widget-content {
  transition: opacity 300ms ease, transform 300ms ease;
}

.widget-content.mini {
  opacity: 1;
}

.widget-content.expanded {
  opacity: 1;
}

/* Bubble direction flip for downward expansion */
.bubble-down {
  transform: scaleY(-1);
}
.bubble-down > * {
  transform: scaleY(-1);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/styles/styles.css
git commit -m "style: add mini/expand transition CSS"
```

### Task 11: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: Successful

- [ ] **Step 3: Manual test in dev mode**

Run: `npm run dev`

Verify:
1. Widget starts in mini mode (small character + single bar)
2. Hover over character → expands with full bars
3. Move mouse away → collapses after ~1 second
4. Message rotation → auto-expands with speech bubble, then collapses
5. Drag character → window moves, position saved
6. Restart app → window appears at saved position
7. Widget at bottom of screen → bubble expands upward
8. Widget at top of screen → bubble expands downward

- [ ] **Step 4: Commit any fixes**
