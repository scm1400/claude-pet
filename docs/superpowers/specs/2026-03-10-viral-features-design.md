# claude-mama Viral Features Design

**Date**: 2026-03-10
**Status**: Approved

## Goal

claude-mama 앱의 바이럴 확산을 위한 두 가지 핵심 기능 추가.

- **타겟 채널**: Twitter/X, Reddit
- **공유 동기**: 재미 (엄마 반응) + 유틸리티 (실용적 추천)
- **브랜딩**: 한국 엄마 특화 — "Korean Mom Simulator"
- **제약**: 서버 없음, 100% 클라이언트, 최소 소셜

---

## Feature 1: 엄마 성적표 카드 (Share Card)

### 개요

현재 엄마 상태를 예쁜 카드 이미지로 생성하여 클립보드에 복사. Twitter/Reddit에 바로 붙여넣기 가능.

### 카드 레이아웃 (~600x400px)

```
┌──────────────────────────────────┐
│  Claude Mama Report Card         │
│                                  │
│   [엄마 캐릭터]   이번 주 무드:    │
│   (현재 무드)     😤 분노         │
│                                  │
│   "옆집 아들은 Opus 다 썼다더라"   │
│                                  │
│   ████████░░  72% (7일)          │
│   ██░░░░░░░░  18% (5시간)        │
│                                  │
│   claude-mama · github.com/...   │
└──────────────────────────────────┘
```

### 기술 구현

- Electron `BrowserWindow({ show: false, offscreen: true })` → `webContents.capturePage()` → PNG
- 별도 HTML 템플릿을 숨겨진 윈도우에서 렌더링
- **2x DPI 렌더링** (1200x800 실제 픽셀, 600x400 표시) — HiDPI/소셜미디어 선명도 확보
- 오프스크린 윈도우는 **lazy singleton** — 첫 공유 시 생성, 이후 재사용
- 생성 이미지 **클립보드 자동 복사** + 선택적 파일 저장
- 순수 로컬, 외부 의존성 없음

### 공유 플로우

1. 트레이 메뉴 → "성적표 공유" 클릭
2. 현재 상태 기반 카드 이미지 생성 (~500ms-1s)
3. 클립보드 복사 완료 알림 (Electron notification)
4. 유저가 Twitter/Reddit에 바로 붙여넣기

### 에러 처리

- `MamaState`가 null (앱 방금 시작) → "아직 데이터 수집 중..." 알림, 공유 스킵
- 클립보드 쓰기 실패 → 파일 저장 폴백 (바탕화면) + 실패 알림
- 연속 공유 요청 → mutex로 이전 렌더링 완료까지 대기 (debounce)
- `capturePage()` 빈 버퍼 반환 시 → rect 지정 재시도 1회

### 워터마크

- 카드 하단에 작고 세련되게 `claude-mama` + GitHub 링크
- GitHub star/다운로드로 이어지는 유입 경로

---

## Feature 2: 레어 멘트 도감 (Mom's Quote Collection)

### 등급 시스템

| 등급 | 출현 조건 | 예시 |
|------|----------|------|
| **Common** | 기존 무드별 멘트 | "밥은 먹고 코딩하니?" |
| **Rare** | 특정 사용량 구간 | 사용량 정확히 50%: "딱 반이네... 반만 하는 게 어딨어" |
| **Legendary** | 극한 조건 | 99%+: "엄마가 아들 잘못 봤다... 진짜 대단하다" |
| **Secret** | 시간/날짜 이스터에그 | 새벽 3시: "이 시간에 아직도?! 엄마도 못 자잖아" |

### 트리거 조건

**Rare:**
- 사용량 0% → "한 번도 안 쓴 거야? 비싼 돈 내고?"
- 5시간 사용량 100% → "쉬어!! 손목 부러진다!!"
- 사용량 급등 (전날 대비 +30%) → "갑자기 열심히 하니까 더 무섭다"

**Legendary:**
- 7일 연속 80%+ 유지 → "우리 아들이 달라졌어... (눈물)"
- 첫 설치 후 첫 API 호출 감지 → "첫 걸음마 뗐구나~ 엄마가 봤어"

**Secret:**
- 설날/추석 → "명절에도 코딩하냐... 세뱃돈이나 받아라"
- 크리스마스 → "산타 말고 엄마가 치킨 시켜줄게"
- 앱 설치 100일 → "벌써 100일... 엄마랑 동거 100일째네"

### 도감 UI

설정 창에 "도감" 탭 추가:

```
┌─ 엄마 어록 도감 ─────────────────┐
│  수집 현황: 23/48  (47%)         │
│  ████████████░░░░░░░░░           │
│                                  │
│  [일반] ████████████ 15/15 ✓     │
│  [희귀] ██████░░░░░   6/10       │
│  [전설] ██░░░░░░░░░   2/8        │
│  [비밀] ░░░░░░░░░░░   0/15  🔒  │
│                                  │
│  최근 획득:                       │
│  ⭐ "우리 아들이 달라졌어..."      │
│     2026-03-08 획득              │
│                                  │
│  [미발견 멘트는 "???" 로 표시]    │
└──────────────────────────────────┘
```

### 바이럴 연결

- 레어/전설 멘트 획득 시 → "이 멘트를 성적표로 공유" 버튼
- 성적표 카드에 등급 배지 표시
- 미발견 멘트 힌트 → 커뮤니티 토론 유발

### 데이터 저장

- `electron-store`에 저장할 새 필드:
  - `unlockedQuotes: { id: string, unlockedAt: string }[]` — 해금된 멘트 목록
  - `installDate: string` — 앱 설치 시각 (ISO)
  - `firstApiCallSeen: boolean` — 첫 API 호출 감지 여부
  - `dailyUtilization: { date: string, percent: number }[]` — 일별 사용량 (14일 보관)
  - `collectionVersion: number` — 스키마 버전 (마이그레이션용)
- 각 멘트에 고유 ID (예: `rare_exact50`, `legendary_7day_streak`)
- 총 멘트 수는 quote registry에서 동적 계산 (하드코딩 X)

### 트리거 평가

- `evaluateQuoteTriggers(input, history): string[]` — **새 pure function** (side-effect 없음)
- `computeMood()`와 별도로 `main.ts`에서 호출
- 평가 시점: 매 API 폴링(5분) + 매 메시지 로테이션(2분)
- Secret(시간 기반) 트리거: 시스템 로컬 타임존 사용
- 음력 명절(설날/추석): 향후 2-3년 날짜 상수로 하드코딩

### Common 멘트 정의

- Common = 기존 무드별 멘트. **보이면 자동 해금** (첫 등장 시 기록)
- 기존 메시지 풀 전체가 대상 (무드별 15개 × 4무드 + confused/sleeping/warning)
- 시간 기반 시드로 인한 편향은 허용 — 장기 사용으로 자연 수집

### i18n 전략

- Rare/Legendary/Secret 멘트도 기존 패턴대로 **ko/en/ja/zh 4개 언어 모두 번역**
- 기존 `messages.ts`의 `Record<Locale, string[]>` 구조 확장
- 한국 문화 코드(설날, 치킨 등)는 다른 언어에서도 유지 — "Korean Mom" 브랜딩 의도
- 트레이 메뉴 라벨도 i18n: ko="성적표 공유", en="Share Report Card", ja="成績表を共有", zh="分享成绩单"

---

## IPC 설계

### 새 IPC 채널

| 채널 | 방향 | 용도 |
|------|------|------|
| `mama:collection-get` | renderer → main | 도감 전체 상태 조회 |
| `mama:collection-updated` | main → renderer | 새 멘트 해금 알림 |
| `mama:share-card` | renderer → main | 성적표 카드 생성 요청 (도감에서 특정 멘트 공유 시) |

### 도감 UI 라우팅

- 기존 Settings 창에 **탭으로 추가** (`#settings` → 설정 탭 / 도감 탭)
- 별도 창 불필요 — 기존 `settings-window.ts` + `App.tsx` 해시 라우팅 활용

### Preload 확장

```typescript
electronAPI.getCollection(): Promise<CollectionState>
electronAPI.onCollectionUpdated(callback): void
electronAPI.shareCard(quoteId?: string): Promise<boolean>
```

---

## 테스트 전략

- `src/core/__tests__/quote-collection.test.ts` — 해금 로직, 직렬화, 중복 방지
- `src/core/__tests__/quote-triggers.test.ts` — 경계값 (정확히 50%, 99%, 0%), 연속 기록 감지
- 성적표 카드: 수동 테스트 (오프스크린 렌더링은 자동화 어려움)

---

## 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `src/core/messages.ts` | 등급별 멘트 추가 (Rare/Legendary/Secret, 4개 언어) |
| `src/core/quote-triggers.ts` | **새 파일** — `evaluateQuoteTriggers()` pure function |
| `src/core/quote-collection.ts` | **새 파일** — 도감 상태 관리 (해금, 조회, 직렬화) |
| `src/core/__tests__/quote-collection.test.ts` | **새 파일** — 도감 단위 테스트 |
| `src/core/__tests__/quote-triggers.test.ts` | **새 파일** — 트리거 경계값 테스트 |
| `src/main/main.ts` | broadcastState에서 트리거 평가 + 도감 기록 호출 |
| `src/main/share-card.ts` | **새 파일** — 오프스크린 렌더링 + 클립보드 |
| `src/main/ipc-handlers.ts` | 새 IPC 채널 등록 (collection-get, share-card) |
| `src/main/preload.js` | 새 API 노출 (getCollection, onCollectionUpdated, shareCard) |
| `src/main/tray.ts` | "성적표 공유" 메뉴 항목 추가 (i18n) |
| `src/renderer/pages/Collection.tsx` | **새 파일** — 도감 UI (Settings 창 탭) |
| `src/renderer/pages/Settings.tsx` | 탭 네비게이션 추가 (설정/도감) |
| `src/renderer/share-card-template/` | **새 디렉토리** — 카드 HTML/CSS 템플릿 |
| `src/shared/types.ts` | QuoteRarity, CollectionState, 새 IPC 채널 타입 추가 |
| `src/shared/i18n.ts` | 트레이 메뉴 라벨 i18n 추가 |

## 아키텍처 원칙

- 기존 pure core + Electron main + React renderer 구조 유지
- 도감 로직(`quote-collection.ts`)은 Electron 의존성 없는 pure core
- 성적표 카드 생성(`share-card.ts`)만 Electron main에 위치
