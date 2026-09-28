# Contributing to Logitech Battery API

Thanks for helping improve the project. Small, focused pull requests are easier to review and safer for users who run the application in the Windows notification area.

## Before you start

- Search existing issues and pull requests before creating a new one.
- Use the bug report template for defects and include reproducible steps.
- Use the feature request template for product proposals.
- Open an issue before a large architectural change so the scope can be discussed.
- Do not post security vulnerabilities publicly; follow [SECURITY.md](SECURITY.md).

## Local setup

```powershell
git clone https://github.com/battincik/logitech-api.git
cd logitech-api
npm install
npm test
npm run dev
```

Keep Logitech G HUB running when testing real devices. The application connects to the local G HUB WebSocket service on port `9010`.

## Development guidelines

- Keep the application local-first and avoid telemetry or mandatory cloud services.
- Preserve Turkish and English translations for every user-facing label.
- Keep Electron renderer isolation enabled and expose only narrow IPC methods through the preload bridge.
- Treat G HUB responses as untrusted input and validate optional fields.
- Avoid adding runtime dependencies when the platform API or a small local implementation is sufficient.
- Keep dashboard changes usable at the minimum window size and with long device names.
- Store battery history in the existing local data model and respect the retention limit.

## Testing dashboard changes

Verify these states before submitting:

- G HUB connected and disconnected
- No supported devices
- One and multiple devices
- Charging and non-charging devices
- Empty, short, and seven-day history
- Turkish and English
- Window minimize, maximize, restore, and close controls
- Update states: idle, checking, ready, and error

Run the complete suite:

```powershell
npm test
```

Application code changes regenerate `updates/app.cjs`. Include that generated file in the same pull request.

For packaging changes, also run:

```powershell
npm run dist
```

## Pull request checklist

- Explain the user-visible problem and the chosen solution.
- Keep unrelated refactors out of the pull request.
- Add or update meaningful tests for regressions and behavior changes.
- Update README or contributor documentation when commands or behavior change.
- Include `updates/app.cjs` when application code changes.
- Confirm `npm test` passes without failures.
- Add screenshots for visible dashboard changes.

## Commit messages

Use a short imperative or Conventional Commit style subject:

```text
feat: add charging activity timeline
fix: restore dashboard rendering
docs: expand Windows installation guide
```

## Release notes

Release notes should summarize user-visible changes, verification performed, the executable name, and its SHA-256 digest. Maintainers create version tags and publish release assets.
