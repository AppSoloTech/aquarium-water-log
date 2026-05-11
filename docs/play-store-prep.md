# Google Play Store Prep

Use this as a working draft for the first closed testing submission.

## App Identity

- App name: Aquarium Water Log
- Android package: `com.appsolo.aquariumwaterlog`
- Category: Tools or Lifestyle
- First release track: Closed testing
- Privacy policy: publish `docs/privacy-policy.md` to a public URL before submission

## Short Description

Log freshwater aquarium water tests locally on your phone.

## Full Description

Aquarium Water Log helps freshwater aquarium keepers record and review water test readings on their Android device.

Create tanks, then track NO3 nitrate, NO2 nitrite, pH, KH, GH, water changes, notes, and test dates for each tank. Tank details and saved tests can be edited if readings are mistyped. The dashboard shows your tanks and latest reading with a simple beginner-friendly status label. History keeps your saved tests newest first, can filter by tank, and CSV export lets you share or save your records when needed. Settings use focused option tiles to create and manage tank-specific notifications, configure low/high target ranges for each analyte, and manage local data cleanup. Each tank keeps one active notification schedule at a time.

The app is local-first. It does not require an account, cloud sync, subscriptions, ads, or a hosted backend. Your aquarium records stay on your device unless you choose to export them.

## Suggested Keywords

aquarium, water test, fish tank, freshwater, nitrate, nitrite, pH, tank log, water change, aquarium log

## Data Safety Draft

Review these answers in Play Console before submitting.

- Collects user data: No
- Shares user data with third parties: No
- Data encrypted in transit: Not applicable because app data is not sent to a server
- Users can request data deletion: Not applicable for server data; local data can be deleted in app per-record, per tank, with a full local reset, by clearing app storage, or by uninstalling
- Location collected: No
- Personal info collected: No
- Financial info collected: No
- Health and fitness collected: No
- Messages collected: No
- Photos and videos collected: No
- Audio collected: No
- Files and docs collected: No, unless the user chooses to export/share CSV through Android's share sheet
- App activity collected: No
- App info and performance collected: No
- Device or other IDs collected: No

## Screenshot Checklist

Capture screenshots from the preview or production Android build, not the web app.

- Home screen with a latest reading and status badge
- Add Test form with readable labels
- History screen with several saved tests
- Tanks screen showing multiple tanks and the default tank
- Settings screen showing Manage Notifications and Create Notification
- Settings screen showing tank-specific target ranges
- CSV export share sheet if useful for listing materials

## Pre-Submission Checklist

- Run `npm run lint`
- Run `npx tsc --noEmit`
- Build preview APK: `eas build --platform android --profile preview`
- Install preview APK on a physical Android device
- Confirm local data persists after app restart
- Confirm reminders can be enabled and disabled
- Confirm Local Data settings can delete one tank's tests and reset app data
- Confirm CSV export opens the Android share sheet
- Confirm app icon and splash look correct on device
- Publish privacy policy to a public URL
- Create Play Console closed testing track and add testers
