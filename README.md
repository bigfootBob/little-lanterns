# 🏮 Little Lanterns

A mobile health companion for caregivers tracking pediatric seizure episodes and daily wellness. Little Lanterns is a React Native app built with love to help families record, understand, and share medical data with their care team.

Available on **iOS**, **Android**, and **Web**.

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/0ca543b5-45c1-45d8-a24d-8c7dbd1ed485" width="180"/><br/><sub>Main Screen</sub></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/82dcef82-50d6-4919-a100-a2b889e2e468" width="180"/><br/><sub>Success!</sub></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/cd893a26-b202-4a9a-89a8-9904edb13773" width="180"/><br/><sub>Sync Account Data</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/5c746605-8c44-40ec-b03d-d77757cc2933" width="180"/><br/><sub>GI Log</sub></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/6fbb875b-c2a6-4b48-9067-983d3908aac5" width="180"/><br/><sub>Data Visualization</sub></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/d14454ee-91ca-4840-ac8d-35b423ab620c" width="180"/><br/><sub>Notes & Daily Meds</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/94040fa5-a256-4974-953e-b72fd284a8fc" width="180"/><br/><sub>Episode Data</sub></td>
    <td></td>
    <td></td>
  </tr>
</table>

---

## Features

### ⚡ Episode Tracker
One-tap timer to log seizure episodes from start to stop. After each episode, record:
- Duration (auto-timed)
- Free-text notes (triggers, observations, context)
- What calmed the episode — from a categorized list covering intervention types, environmental factors, and natural resolution

### 🪵 GI Log
Track gastrointestinal health using the Bristol Stool Scale. Logs are stored with timestamps and viewable as a chart or scrollable history — useful for identifying patterns alongside neurological events.

### 💊 Daily Health
Medication tracking with configurable dose frequency (1–5x/day) and customizable time slots. Includes a daily notes journal for general health observations.

### 📊 Review & Reports
Charts across 30-day, 90-day, and year-to-date windows including:
- Episode frequency over time (line chart)
- Episode duration distribution (bar chart)
- Calm-factor breakdown (pie chart)
- GI log trends

Data can be exported as CSV and shared directly from the app.

### 🔒 Privacy-First
The app launches with anonymous authentication — no account required to start tracking. Data is stored privately in Firebase under an anonymous user ID. Users can optionally link a Google account at any time to enable cloud backup and cross-device access.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (~54) |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS for RN) |
| Backend | Firebase (Firestore + Auth) |
| Auth | Anonymous sign-in + optional Google Sign-In |
| Charts | react-native-gifted-charts |
| Localization | i18n-js + expo-localization |
| Build | EAS Build |
| Language | TypeScript |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
git clone https://github.com/bigfootBob/little-lanterns.git
cd little-lanterns
npm install
```

### Environment Setup

Create a `.env` file in the root with your Firebase config values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

For Android builds, also provide your `google-services.json` or set:
```
GOOGLE_SERVICES_JSON=./google-services.json
```

### Running the App

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run in browser
npx expo start --web
```

---

## Project Structure

```
app/
  (tabs)/
    index.tsx        # Episode tracker
    gi-log.tsx       # GI / Bristol log
    daily-health.tsx # Medication & notes
    tips.tsx         # Account management & tips
    review.tsx       # Charts & data export
  _layout.tsx        # Root layout, auth init, font loading
  i18n.ts            # Localization strings
components/          # Shared UI components
constants/           # Theme, colors, calm categories
assets/              # Images, icons, fonts
```

---

## Firebase Setup

The app requires the following Firestore collections:

**`episodes`**
```
userId: string
duration_seconds: number
notes: string
calmed_by: string
variant: string
timestamp: Timestamp
```

**`gi_logs`**
```
userId: string
type: number          # Bristol Stool Scale 1–7
timestamp: Timestamp
```

**`daily_notes`**
```
userId: string
note: string
timestamp: Timestamp
```

Recommended Firestore security rules: restrict all reads/writes to `request.auth.uid == resource.data.userId`.

---

## Building for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for web (static export)
npx expo export --platform web
```

---

## Localization

All user-facing strings are managed in `app/i18n.ts`. To add a language, extend the translations object with a new locale key and add the corresponding strings.

---

## License

This project is personal software. All rights reserved.
