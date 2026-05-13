# Release QA Checklist

Use this checklist on a physical Android phone before a closed testing build.

## Fresh Install

- Install a fresh preview build.
- Open the app and confirm it creates the local database.
- Confirm Home, Tanks, Add Test, History, and Settings all open without errors.
- Confirm the app works without signing in and does not ask for account setup.

## Tanks

- Create a new tank with notes.
- Rename the tank and confirm the new name appears on Home, History, and reminders.
- Confirm Add Test opened from the tab starts with no tank selected.
- Confirm Add Test opened from a tank action preselects that tank.
- Confirm a tank with saved tests cannot be deleted.
- Confirm a tank without tests or notifications can be deleted.

## Logging

- Log a test using the native date picker and quick value chips.
- Log a test with blank optional values.
- Try entering a non-numeric reading and confirm validation catches it.
- Mark water change performed and confirm it appears in History.
- Edit a saved test from History.
- Delete a saved test and confirm the list/chart refreshes.

## Dashboard

- Confirm Home shows each tank's latest reading.
- Confirm status badges appear for tanks with readings.
- Confirm status explanations match target ranges.
- Confirm Log Test and View History actions route to the expected screens.

## History And Charts

- Filter History by one tank.
- Confirm the Trends chart appears for NO3, NO2, pH, KH, and GH.
- Confirm high/low target lines appear when ranges are set.
- Tap chart points and confirm the detail panel shows date, value, tank, and water change.
- Tap Edit Test from a chart point and confirm the correct test opens.
- Confirm All Tanks mode asks the user to select one tank for charts.

## Reminders

- Create a tank-specific reminder.
- Confirm permission handling works when notifications are allowed.
- Confirm creating a new reminder for the same tank replaces the previous one.
- Delete a reminder from Manage Notifications.

## Target Ranges

- Set low/high values for a tank.
- Confirm reversed ranges are rejected.
- Confirm status badges and explanations update based on custom ranges.
- Confirm blank range values behave as unset sides of the target.

## Backup, Import, And Local Data

- Export all tests from Settings > Backup & Import.
- Export filtered tests from History.
- Import an exported CSV and confirm matching rows are skipped.
- Import a CSV with a new tank name and confirm the tank is created.
- Delete all tests for one tank from Local Data.
- Reset all local data and confirm the app returns to a ready-to-use fresh state with a starter tank.

## Store Build

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Build preview APK with `eas build --platform android --profile preview`.
- Install the preview APK on a physical Android device.
- Confirm app icon, splash screen, and status bar look correct.
- Confirm the privacy policy URL is public before Play Console submission.
