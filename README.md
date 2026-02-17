# Sample Evil App

Sample Evil App is a deliberately "evil" Electron app used to validate itch.io sandbox behavior.
It attempts actions like reading local config data and environment variables so you can verify what is blocked or allowed under different launch modes.

## Development

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm start
DEVTOOLS=1 npm start
```

## Packaging

Build all configured targets:

```bash
npm run package
```

Build a single target:

```bash
npm run package:win32
npm run package:linux
npm run package:darwin
```

Output goes to `build/`:

- `build/Sample Evil App-win32-x64`
- `build/Sample Evil App-linux-x64`
- `build/Sample Evil App-darwin-arm64`

## Publish To itch.io

Current target project:

- `leafo/sample-evil-app`

Prerequisites:

- `butler` installed
- `butler login` completed

Publish all channels (and package first):

```bash
make publish
```

Published channels:

- `leafo/sample-evil-app:win32`
- `leafo/sample-evil-app:linux`
- `leafo/sample-evil-app:osx`

## Sandbox Actions

The shipped `itch.toml` defines launch actions for:

- default launch
- sandbox opt-in launch
- launch with sample args
