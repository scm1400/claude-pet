<div align="center">

# 🐱 Claude Pet

**Your coding companion that grows with you.**

A desktop virtual pet that lives alongside your Claude Code sessions — feed it, play with it, and watch it grow.

[![Build](https://github.com/scm1400/claude-mama/actions/workflows/build.yml/badge.svg)](https://github.com/scm1400/claude-mama/actions/workflows/build.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron)](https://www.electronjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

<br/>

| Hungry | Bored | Happy | Playful | Sleepy |
|:---:|:---:|:---:|:---:|:---:|
| 🍗 "Feed me~" | 😐 "Play with me!" | 😊 "I love coding with you!" | 🎾 "*bounces around*" | 😴 "zzz..." |

</div>

---

## What is this?

Claude Pet is a tiny desktop widget that lives alongside your [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) sessions. It's a virtual pet that reacts to your coding activity — feed it, play with it, pet it, and watch it grow from a Baby to an Adult.

- **Hungry?** Feed your pet to keep it happy and healthy.
- **Bored?** Play together to boost its mood.
- **Happy?** It bounces around and cheers you on.
- **Sleepy?** Let it rest — even pets need downtime.

> *"The best coding companion doesn't review your PRs — it just sits on your desktop and believes in you."*

## Features

- **Virtual pet system** — Feed, play, and pet your companion with Claude Code slash commands
- **Growth stages** — Watch your pet evolve from Baby → Teen → Adult as it gains EXP
- **Mood expressions** — 6 reactive moods (happy, playful, sleepy, worried, bored, confused) with pixel art animations
- **Real-time usage tracking** — Monitors your Claude Code API usage via Anthropic OAuth, with smart JSONL session fallback
- **Stat system** — Track hunger, happiness, and energy levels that change over time
- **Leveling & EXP** — Earn experience points through interactions and usage milestones
- **Custom character skins** — Upload your own pet images (single, per-mood, or sprite sheet modes)
- **Always on Top** — Keep your pet visible above other windows (toggle in Settings or tray)
- **System tray** — Lives quietly in your taskbar, waiting for attention
- **Settings panel** — Position, auto-start, language selection, and skin customization
- **4 languages** — 한국어, English, 日本語, 中文
- **Auto-start** — Boots with your OS so your pet is always ready
- **Auto-update** — Keeps itself up to date via GitHub Releases

## Installation

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) must be installed and logged in (OAuth)
- That's it. Your pet isn't picky.

### Quick Install (One-liner)

**npm** (all platforms, requires Node.js):
```bash
npm install -g claude-pet
claude-pet
```

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/scm1400/claude-pet/main/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/scm1400/claude-pet/main/scripts/install.ps1 | iex
```

### Download Installer

Or grab the latest installer from [**Releases**](https://github.com/scm1400/claude-mama/releases):

| Platform | File | Arch |
|----------|------|------|
| Windows | `Claude Pet Setup x.x.x.exe` | x64 |
| macOS | `Claude Pet-x.x.x.dmg` | Universal (Intel + Apple Silicon) |
| Linux | `Claude Pet-x.x.x.AppImage` | x64 |
| Linux | `claude-pet_x.x.x_amd64.deb` | x64 |

> **⚠️ Not code-signed:** Your OS may show a security warning on first install.
> - **Windows:** SmartScreen → **More info** → **Run anyway**
> - **macOS:** **System Settings** → **Privacy & Security** → **Open Anyway**
> - **Linux (AppImage):** `chmod +x Claude\ Pet-*.AppImage && ./Claude\ Pet-*.AppImage`
> - **Linux (deb):** `sudo dpkg -i claude-pet_*.deb`

### Claude Code Integration

Claude Pet includes slash commands that work inside Claude Code:

| Command | Effect |
|---------|--------|
| `/feed` | Feed your pet (hunger -30%) |
| `/play` | Play with your pet (happiness +25%) |
| `/pet` | Pet your pet (hunger -10%, happiness +10%, energy +10%) |
| `/name <name>` | Give your pet a name |

Each command shows a live status line with level, growth stage, and stat changes.

### First Launch

1. Make sure Claude Code is installed and logged in (`claude` in terminal)
2. Claude Pet will automatically detect your API usage via OAuth
3. If rate-limited (429), it falls back to local JSONL session parsing — no extra config needed
4. Your pet starts reacting to your coding sessions. Just let it do its thing.

### Auto-Start & Auto-Update

- **Auto-start:** Enabled by default. Claude Pet starts with your OS. Toggle in Settings.
- **Auto-update:** Updates are downloaded automatically from GitHub Releases. When a new version is ready, your pet will ask you to restart.

## How It Works

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Anthropic OAuth │────>│ Usage Tracker │───>│ Mood Engine │
│ Usage API       │     │ (5min poll)   │    │             │
└─────────────────┘     └──────┬───────┘     └──────┬──────┘
                               │                    │
                        ┌──────┴───────┐    ┌───────┘
                        │ JSONL Session│    │
                        │ Parser (429) │    v
                        └──────────────┘  ┌──────────────┐
                                          │ Pet Character │
┌──────────────┐     ┌──────────────┐     │ + Animations  │
│ Speech       │     │ Stat Bars    │     └──────────────┘
│ Bubble       │     │ (HP/EXP)     │
└──────────────┘     └──────────────┘
```

1. **Polls** the Anthropic usage API every 5 minutes
2. **Falls back to JSONL session parsing** when rate limited (429) — scans `~/.claude/projects/` session files to estimate usage
3. **Computes mood** based on pet stats and activity
4. **Renders** an animated pet character with mood-appropriate expression
5. **Reacts** to your slash commands (`/feed`, `/play`, `/pet`)

### Pet Moods

| Mood | Expression | When |
|:---:|:---:|---|
| 😊 Happy | Bouncing | Well-fed, high happiness |
| 🎾 Playful | Jumping | After `/play`, high energy |
| 😟 Worried | Swaying | Low happiness or hunger rising |
| 😐 Bored | Wobbling | No interaction for a while |
| 😴 Sleepy | Tilting | Low energy |
| 😵 Confused | Wobbling | API error or rate limited |

## FAQ

**Q: Can I name my pet?**
A: Yes! Use `/name <name>` in Claude Code or set it in the app settings.

**Q: How does my pet grow?**
A: Your pet earns EXP through interactions (`/feed`, `/play`, `/pet`) and coding sessions. Baby → Teen (100 EXP) → Adult (500 EXP).

**Q: My pet looks confused?**
A: This usually means the API is rate-limited or there's a connection issue. It'll resolve automatically.

**Q: Can I customize how my pet looks?**
A: Yes! Go to **Settings → Skins** to upload custom images. Supports single image, per-mood, and sprite sheet modes.

**Q: Does it work offline?**
A: The pet widget runs locally. Usage tracking needs an internet connection, but your pet will still hang out with you offline.

**Q: Why 4 languages?**
A: Because pets are loved worldwide. Switch between 한국어, English, 日本語, and 中文 in settings.

## Contributing

PRs welcome! Whether it's new pet expressions, animations, or language support — your pet appreciates the help.

1. Fork this repo
2. Create your feature branch (`git checkout -b feature/new-expression`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Privacy Policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

- **Anthropic API**: The app calls the Anthropic OAuth Usage API to retrieve your token usage statistics. This is initiated by you when you log in with your Claude Code credentials.
- **GitHub (Auto-Update)**: The app checks GitHub Releases for new versions. No personal data is transmitted.
- **Local Storage**: Your API credentials and settings are stored locally on your machine using `electron-store`. They are never sent to any third-party server.

## Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

**Team roles:**
- Committers and reviewers: [Members](https://github.com/orgs/scm1400/people)
- Approvers: [Owners](https://github.com/orgs/scm1400/people?query=role%3Aowner)

## License

[ISC](LICENSE) — Free as in freedom.

---

<div align="center">

**Built with ❤️ and curiosity**

*If your pet made coding more fun, please star the repo. It'll make your pet happy.*

</div>
