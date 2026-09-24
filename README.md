# Logitech Battery API

Logitech Battery API is a lightweight Windows tray application that reads battery information from the local Logitech G HUB WebSocket service. It keeps battery status visible without opening G HUB and can warn you before a device runs out of power.

The application runs locally. It does not require an account, a cloud service, telemetry, GitHub Actions, or a background server.

## Features

- Battery status for supported Logitech G devices
- Color-coded tray and menu indicators
- Charging, full battery, low battery, and empty battery notifications
- A compact dashboard opened by left-clicking the tray icon
- Seven-day battery history with per-device charts
- G HUB connection status, automatic reconnect, and manual reconnect
- Optional disconnect notifications
- Optional automatic startup with Windows
- Turkish and English interface languages
- Built-in update screen with commit message and update status
- Local diagnostics, application log, and copyable diagnostic report
- Commit-based in-app updates from a public GitHub repository

## Privacy

Battery readings, preferences, history, and logs stay on the computer. The application only connects to:

- `ws://127.0.0.1:9010` for the local G HUB service
- GitHub's public API to check and download the update bundle

No analytics or personal information is collected.

## Requirements

- Windows 10 or Windows 11
- Logitech G HUB running in the background
- Node.js 20 or newer for development; Node.js 22 LTS is recommended
- npm

## Development

```powershell
npm install
npm run dev
```

The application starts in the notification area. Left-click the tray icon to open the dashboard or right-click it for the native menu.

If G HUB cannot be detected, verify that `lghub_agent.exe` is running and that port 9010 is listening:

```powershell
Get-NetTCPConnection -LocalPort 9010 -State Listen
```

G HUB's local interface is undocumented and may change in future G HUB versions.

## Tests

```powershell
npm test
```

## Build a portable Windows application

```powershell
npm run dist
```

The output is created at:

```text
release/Logitech-Battery-API-1.1.0-x64.exe
```

The executable is portable and does not require an installer. Because the application is unsigned, Windows SmartScreen may display a warning on first launch.

## Commit-based updates

The updater intentionally does not use GitHub Releases or GitHub Actions.

1. Edit the application source.
2. Run `npm test` or `npm run build:update`.
3. Commit the source files and the generated `updates/app.cjs` file.
4. Push the commit to the configured public branch.
5. Running clients detect the new bundle automatically or through **Check for updates**.

The updater downloads only `updates/app.cjs`, validates its Git blob SHA against the GitHub API response, and stores it under the application's user-data directory. If the downloaded bundle cannot start, the application discards it and returns to the bundled version.

Changes to Electron, native dependencies, packaging metadata, the executable name, or the Windows application identity require a new portable executable.

## Project structure

- `src/main.ts` — tray, dashboard, notifications, settings, history, and diagnostics
- `src/ghub-client.ts` — G HUB WebSocket client and reconnect logic
- `src/updater.ts` — commit-based updater
- `src/app-store.ts` — local preferences and battery history
- `src/state-store.ts` — notification threshold state
- `src/dashboard.ts` — embedded dashboard and preload bridge
- `updates/app.cjs` — generated in-app update bundle

## Contributing

Issues and pull requests are welcome. Please run `npm test` before submitting a change and include the regenerated `updates/app.cjs` when application code changes.

## License

See [LICENSE](LICENSE) for the current license terms.
