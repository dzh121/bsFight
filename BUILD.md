# Building Office Battle Royale

This guide explains how to build Office Battle Royale as desktop executables for multiple platforms.

## Quick Start

### Prerequisites

1. **Node.js** (LTS version recommended)
2. **Rust** (latest stable)
3. **Platform-specific dependencies** (see below)

### Install Rust

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# Download and run: https://win.rustup.rs/
```

### Platform-Specific Dependencies

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  build-essential \
  curl \
  wget \
  file
```

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Windows
- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10+)

## Building

### Development Build

```bash
cd app
npm install
npm run tauri:dev
```

This will start the app in development mode with hot-reload enabled.

### Production Build

```bash
cd app
npm install
npm run tauri:build
```

**Output locations:**
- **Windows**: `app/src-tauri/target/release/bundle/msi/` and `app/src-tauri/target/release/bundle/nsis/`
- **macOS**: `app/src-tauri/target/release/bundle/dmg/` and `app/src-tauri/target/release/bundle/macos/`
- **Linux**: `app/src-tauri/target/release/bundle/appimage/`, `app/src-tauri/target/release/bundle/deb/`, `app/src-tauri/target/release/bundle/rpm/`

## Cross-Platform Builds

### Building for Different Architectures

#### Windows 32-bit (from Windows)
```bash
rustup target add i686-pc-windows-msvc
cd app
npm run tauri build -- --target i686-pc-windows-msvc
```

#### macOS Universal Binary (from macOS)
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
cd app
npm run tauri build -- --target universal-apple-darwin
```

Or build separately:
```bash
# Apple Silicon (M1/M2/M3)
npm run tauri build -- --target aarch64-apple-darwin

# Intel
npm run tauri build -- --target x86_64-apple-darwin
```

#### Linux ARM (ARM64/ARMv7)
```bash
# Install cross-compilation tool
cargo install cross --git https://github.com/cross-rs/cross

# Build for ARM64
cd app/src-tauri
cross build --release --target aarch64-unknown-linux-gnu

# Build for ARMv7
cross build --release --target armv7-unknown-linux-gnueabihf
```

## Automated Builds with GitHub Actions

This repository includes GitHub Actions workflows for automated builds:

### Release Workflow
Automatically builds for all platforms when you push a git tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates:
- Windows x64 and x86 installers
- macOS ARM64 and x64 DMGs
- Linux x64 AppImage/deb/rpm
- Linux ARM64 and ARMv7 binaries

### Test Workflow
Runs on every PR and push to main/develop branches to verify builds work.

## Troubleshooting

### Linux: Missing WebKit
```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

### macOS: Code Signing Issues
For distribution, you'll need to sign your app. For local builds, you can skip this:
```bash
npm run tauri build -- --bundles app
```

### Windows: MSVC Not Found
Install Visual Studio Build Tools with C++ support.

### Build Size Optimization

To reduce build size:

1. **Use release mode** (automatically optimized)
2. **Strip debug symbols**:
   ```bash
   npm run tauri build -- --config '{"bundle":{"windows":{"nsis":{"compression":"lzma"}}}}'
   ```

## File Sizes (Approximate)

- **Windows**: 4-6 MB (installer)
- **macOS**: 5-8 MB (DMG)
- **Linux**: 6-10 MB (AppImage)

These are significantly smaller than Electron-based apps (~50-150 MB).

## Environment Variables

You can customize builds with environment variables:

```bash
# Enable debug logging
RUST_LOG=debug npm run tauri:dev

# Custom app version
TAURI_VERSION=1.2.3 npm run tauri:build
```

## CI/CD Integration

The project includes:
- `.github/workflows/release.yml` - Multi-platform release builds
- `.github/workflows/build-test.yml` - PR/push verification builds

Both workflows cache dependencies for faster builds.

## Additional Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
