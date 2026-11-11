# ClickerGameTS Mobile Edition — Alpha 0.1

A separate Capacitor project based on ClickerGameTS v2.0 — The Farm Update. The original web project is not modified.

## Requirements

- Node.js LTS and npm
- Android Studio for Android builds
- macOS with Xcode for native iOS builds (iOS builds cannot be produced locally on Windows)

## Setup on Windows (Android)

Open PowerShell in this folder and run:

```powershell
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Build and run the Android app from Android Studio. For later web changes, run `npx cap sync android` again.

## iOS

On a Mac with Xcode installed, run:

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

## Project layout

- `www/` — copied v2.0 web application
- `package.json` — Capacitor dependencies and scripts
- `capacitor.config.json` — app identity and web asset directory

## Important

This is a starter wrapper, not a finished mobile redesign. The v2.0 interface and game logic are initially preserved as the baseline. Mobile navigation, touch UX, safe-area handling, and device testing are the next development tasks. The existing localStorage save implementation is retained for the first baseline; verify save persistence on target devices before release.
