# Office Battle Royale 🥊

A tournament-style battle game where office workers (or anyone!) compete in an epic battle royale. Built with React + Tauri for a lightweight desktop experience.

## Features

- 🎮 **Tournament Mode**: Bracket-style elimination battles
- 📱 **QR Code Join**: Players join via phone with custom stats
- 🎲 **Live Betting**: Spectators can bet on matches in real-time
- ⚔️ **Dynamic Combat**: Rich battle system with 11+ stats
- 🎨 **Cyberpunk UI**: Sleek, animated interface
- 💻 **Cross-Platform**: Windows, macOS, Linux (x64, ARM)

## Quick Start

### Desktop App (Recommended)

Download the latest release for your platform:
- [Windows (64-bit / 32-bit)](../../releases)
- [macOS (Apple Silicon / Intel)](../../releases)  
- [Linux (x64 / ARM64)](../../releases)

### Run from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/bsFight.git
cd bsFight/app

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Or build for production
npm run tauri:build
```

## How to Play

### Host Setup

1. Launch the app
2. Choose **QR Code Join** mode or **Manual Entry**
3. If QR mode: Players scan the QR code on their phones
4. Click **Start Tournament** when ready

### Player Join (via Phone)

1. Scan the QR code
2. Enter your name
3. Choose an emoji avatar
4. Distribute 55 points across 11 combat stats:
   - 💪 Power - Raw damage output
   - ⚡ Speed - Dodge and first strike
   - 🔥 Hype - Buffs and lifesteal
   - 🌀 Chaos - Crits and stuns
   - 🎲 Luck - Healing and counters
   - 🛡 Defense - Damage reduction
   - 🎯 Focus - Energy gain
   - 🏋️ Stamina - HP and shields
   - 🧠 Wit - Counter damage and poison
   - 💎 Grit - Comeback damage
   - 😏 Swagger - Intimidation
5. Join the tournament!

### Spectator Betting

1. Navigate to `/bet` on your phone
2. Bet on the overall champion
3. Bet on individual match winners
4. Track your score!

## Architecture

```
bsFight/
├── app/                    # Main application
│   ├── src/               # React frontend
│   │   ├── App.jsx        # Host/tournament view
│   │   ├── JoinPage.jsx   # Player join interface
│   │   ├── BetPage.jsx    # Spectator betting
│   │   └── utils/         # Battle engine, helpers
│   ├── src-tauri/         # Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs     # Main Tauri app
│   │   │   └── websocket.rs # WebSocket server
│   │   └── Cargo.toml     # Rust dependencies
│   └── package.json
├── .github/workflows/     # CI/CD pipelines
│   ├── release.yml        # Multi-platform builds
│   └── build-test.yml     # PR/push verification
└── BUILD.md               # Build instructions
```

## Building from Source

See [BUILD.md](BUILD.md) for detailed build instructions for all platforms.

**Quick build:**
```bash
cd app
npm install
npm run tauri:build
```

## Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Backend**: Rust (Tauri 2.x)
- **Real-time**: WebSocket (Tokio + Tungstenite)
- **Build**: GitHub Actions, multi-platform CI/CD

## Why Tauri?

Compared to Electron:
- ✅ **90% smaller** (~5MB vs ~50MB)
- ✅ **Faster** startup and runtime
- ✅ **More secure** (no bundled Chromium)
- ✅ **Native WebView** on each platform

## Development

```bash
# Install dependencies
cd app
npm install

# Run dev server (web mode)
npm run dev

# Run Tauri dev (desktop mode)
npm run tauri:dev

# Lint
npm run lint

# Build
npm run tauri:build
```

## CI/CD

The project includes automated workflows:

- **Release** (`v*` tags): Builds for Windows (x64/x86), macOS (ARM/Intel), Linux (x64/ARM)
- **Test** (PRs/main): Verifies builds on all platforms

Push a tag to trigger a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## WebSocket API

The embedded WebSocket server runs on `ws://127.0.0.1:8765`:

**Host messages:**
- `registerHost` - Register as tournament host
- `gameStarted` - Broadcast fighter list
- `fightEvent` - Send battle events
- `targetPlayer` - Send message to specific player
- `tournamentEnd` - Declare winner

**Player messages:**
- `join` - Join tournament with stats
- `selectAction` - Choose combat action
- `betSpectator` - Join as spectator

See `app/src-tauri/src/websocket.rs` for full implementation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on your platform
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Tauri](https://tauri.app) - Desktop framework
- [React](https://react.dev) - UI library
- [Vite](https://vitejs.dev) - Build tool
- [TailwindCSS](https://tailwindcss.com) - Styling

---

**Have fun battling! ⚔️**
