# nonbu-app

Personal Android app (Expo SDK 57, expo-router) for tracking fasts and daily food
(calories + macros). Signs in with Google; talks to [nonbu-backend](https://github.com/sreesri/nonbu-backend).

## How updates work

- **JS/UI changes** (almost everything) ship **over the air** with EAS Update. Push to
  `main` → GitHub Action runs `eas update` → the app downloads it on next launch/foreground
  and shows "A new version is ready — tap to restart" (also Settings → Check for updates).
- **Native changes** (new native library, permissions, `app.json` plugin config, Expo SDK
  upgrade) need a new APK: `npm run build:apk`, install it over the old one. The runtime
  version uses the `fingerprint` policy, so an OTA update is never sent to an APK whose
  native code doesn't match it.

## One-time setup

### 1. Google Cloud (OAuth)
1. Create a project at https://console.cloud.google.com → **APIs & Services → OAuth consent
   screen**: External, leave in *Testing*, add your Gmail as a test user.
2. **Credentials → Create OAuth client ID → Web application**. Its client ID is used by
   both the app (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and the backend (`GOOGLE_CLIENT_IDS`).
3. **Create OAuth client ID → Android**, package `com.sreesri.nonbu`, SHA-1 from
   `eas credentials -p android` (the EAS-managed keystore; run after the first build
   generates it). The Android client needs no secret — it just authorises that signed app.

### 2. EAS environment variables
The project is linked to `@dev.shriram.ms/nonbu`. Set the public config for builds and updates:

```sh
eas env:set --environment production --environment development --visibility plaintext \
  --name EXPO_PUBLIC_API_URL --value https://<your-render-service>.onrender.com
eas env:set --environment production --environment development --visibility plaintext \
  --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-client-id>.apps.googleusercontent.com
```

### 3. GitHub Action
Create a token at https://expo.dev/settings/access-tokens and add it as the repo secret
`EXPO_TOKEN` (GitHub → Settings → Secrets and variables → Actions).

### 4. Install the app
```sh
npm run build:apk     # eas build -p android --profile production
```
Open the build link on your phone, download the APK, allow "install unknown apps".
You only repeat this when native code changes.

## Development

```sh
npm install
cp .env.example .env.local   # point EXPO_PUBLIC_API_URL at your local/remote backend
npm run build:dev            # once: dev-client APK (Google Sign-In needs native code, so no Expo Go)
npm start                    # Metro with hot reload; open in the dev client
npm run typecheck && npm run lint
```

For a local backend on an Android emulator use `http://10.0.2.2:8000`; on a real phone use
your computer's LAN IP (run uvicorn with `--host 0.0.0.0`). The dev-client APK is signed with a
different key than production, so add its SHA-1 (shown by `eas credentials`) as a second Android
OAuth client.

Publish an update manually: `npm run update`.

## Layout

```
src/app/            routes (expo-router)
  (auth)/sign-in    Google sign-in
  (tabs)/index      fasting timer
  (tabs)/food       daily food log + macro totals
  (tabs)/history    charts, streak, fast history
  (tabs)/settings   goals, timezone, update status, sign out
  food/new, [id]    add / edit entry
src/api/            fetch client (JWT + refresh), React Query hooks, types
src/auth/           AuthProvider, secure token storage
src/components/     UI building blocks
src/lib/            config, theme, formatting, notifications
```
