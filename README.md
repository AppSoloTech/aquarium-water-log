# Aquarium Water Log

A local-first Expo React Native app for logging freshwater aquarium water tests. The app stores data on the device with SQLite and does not use a backend, accounts, cloud sync, ads, or subscriptions.

## Features

- Save aquarium water test readings for NO3, NO2, pH, KH, GH, notes, and water changes.
- Create multiple tanks and scope every test to a selected tank.
- Edit tank names/notes and correct saved water tests.
- View the latest reading on the dashboard.
- Browse all history or filter history by tank with dropdown selection.
- Save a default tank for faster logging.
- Create and manage local hourly or daily notifications for specific tanks.
- Configure tank-specific low/high target ranges for NO3, NO2, pH, KH, and GH.
- Delete saved tests for one tank or reset all local app data from Settings.
- Show beginner-friendly status labels: Good, Caution, and Danger.
- Schedule local water test reminders.
- Export all readings as CSV through the native share sheet.

## Run Locally

```bash
npm install
npx expo start
```

Then open the app in an Android emulator or on a device through Expo.

Expo Go may print an Android warning from `expo-notifications` because remote push notifications are not supported there in SDK 53+. This app uses local scheduled reminders, but final notification QA should still happen in an Android development build or preview build.

## Useful Commands

```bash
npm run lint
npm run generate-assets
npm run android
```

## Manual Test Checklist

- Fresh install creates the local SQLite tables.
- Tanks can be created, marked as default, and selected while logging tests.
- Tanks can be edited after creation.
- Add Test saves a valid record and rejects non-numeric water values.
- History can open an existing test for correction.
- Add Test and History use dropdowns for tank selection.
- Home shows the latest saved reading.
- History sorts tests newest first, filters by tank, and confirms before deleting.
- Notification settings open from separate Manage Notifications and Create Notification tiles.
- Created notifications can be reviewed and deleted from Settings.
- Creating a notification for a tank replaces that tank's previous active notification.
- Target ranges can be configured per tank and influence status labels.
- Local Data settings can delete one tank's test history and reset all local data.
- CSV export opens the native share sheet and includes tank IDs plus all saved rows in the current history scope.

## Android Release Notes

The Android package is configured as `com.appsolo.aquariumwaterlog`.

The local-only privacy policy draft is in [docs/privacy-policy.md](docs/privacy-policy.md). The Play Console working draft is in [docs/play-store-prep.md](docs/play-store-prep.md). Publish the privacy policy to a public URL before submitting to Google Play.

Regenerate app artwork:

```bash
npm run generate-assets
```

Preview APK:

```bash
eas build --platform android --profile preview
```

Google Play AAB:

```bash
eas build --platform android --profile production
```

Submit after the first Play Console setup:

```bash
eas submit --platform android --profile production
```

Before closed testing, replace any placeholder icon or splash assets with final production artwork and verify the generated build target SDK meets the current Google Play requirement.
