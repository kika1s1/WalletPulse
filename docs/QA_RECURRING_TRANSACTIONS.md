# Manual QA — Recurring Transactions with Notifications

This checklist covers the changes from the `Recurring transactions with notifications` plan. Run on a physical Android device — emulators do not behave the same way for WorkManager + boot completion.

## Pre-flight

- [ ] Apply the Supabase migration `supabase/migrations/20260424_recurring_schedules.sql` to the target environment.
- [ ] Build a fresh debug APK (the new native module + WorkManager dependency require a native rebuild — Metro reload is **not** enough): `npx react-native run-android`.
- [ ] Sign in to a test account that has at least one active wallet and one category.
- [ ] In **Settings → Notifications**, confirm the new toggle **Recurring Transaction Alerts** is visible and ON by default.

## 1. Schedule creation (Add screen)

- [ ] Add a new **expense** transaction. Toggle **Recurring** ON, pick **Monthly**, save.
- [ ] In Supabase SQL editor, confirm a row exists in `recurring_schedules` with `is_active = true`, `cadence = 'monthly'`, and `template_transaction_id` matching the new transaction's id.
- [ ] Add a new **income** transaction (e.g. "Salary"). Toggle **Recurring** ON, pick **Weekly**, save.
- [ ] Confirm a second row in `recurring_schedules` with `type = 'income'` and `cadence = 'weekly'`.
- [ ] Add a **transfer**. Confirm the Recurring toggle is hidden (existing screen behaviour) and no row is created.

## 2. Edit screen flips

- [ ] Open the income transaction in **Edit Transaction**, toggle Recurring **OFF**, save.
- [ ] Confirm the matching `recurring_schedules` row now has `is_active = false`.
- [ ] Re-open the same transaction, toggle Recurring **ON** with **Monthly**, save.
- [ ] Confirm the same row is reactivated (`is_active = true`, `cadence = 'monthly'`) — **no duplicate row** should be created.

## 3. Foreground catch-up

- [ ] In Supabase, manually edit one of your active `recurring_schedules` rows to set `next_due_date` to a timestamp in the past (e.g. `extract(epoch from now() - interval '1 hour') * 1000`).
- [ ] Background the app for >1 minute, then bring it back to the foreground.
- [ ] Within a couple of seconds you should see a local notification: *"-$X to <merchant>"* (or *"+$X from <merchant>"* for income), body mentioning the wallet name and "recurring schedule".
- [ ] Tap the notification — app opens directly to **TransactionDetail** for the newly auto-created transaction.
- [ ] Verify a new row appeared in the `transactions` table with the template's amount/category/wallet, and `recurring_schedules.next_due_date` was advanced one cadence step.
- [ ] Verify the wallet balance reflects the new transaction.

## 4. WorkManager background run (app killed)

- [ ] Set another `recurring_schedules` row's `next_due_date` to ~5 minutes in the future.
- [ ] **Force-stop** the app (Settings → Apps → WalletPulse → Force Stop).
- [ ] Wait 15-75 minutes (WorkManager periodic minimum is 15 min; the actual fire time is non-deterministic within the interval).
- [ ] You should still receive the notification with the app killed.
- [ ] Open the app and confirm the transaction was created and balance updated.

> Tip: shorten the wait by running `adb shell cmd jobscheduler run -f com.walletpulse 999` or by using `adb shell dumpsys jobscheduler | grep walletpulse` to find the job ID and force-run it. WorkManager jobs surface as JobScheduler jobs on API 23+.

## 5. Reboot persistence

- [ ] With at least one active recurring schedule, set its `next_due_date` to ~10 minutes after the time you plan to reboot.
- [ ] Reboot the phone.
- [ ] Do **not** open the app after reboot.
- [ ] After the due time + WorkManager's next tick (up to ~1 hour), the notification should still fire.

## 6. Airplane mode

- [ ] Set a row's `next_due_date` to a past timestamp.
- [ ] Enable airplane mode, open the app.
- [ ] Confirm the scheduler does **not** crash (it should silently no-op since Supabase is unreachable).
- [ ] Disable airplane mode, background and foreground the app.
- [ ] The catch-up should now run and a notification should appear.

## 7. Settings toggle

- [ ] In **Settings → Recurring Transaction Alerts**, switch OFF.
- [ ] Trigger a due schedule (set `next_due_date` to past, foreground the app).
- [ ] Confirm the transaction **is** still posted, but **no notification** appears.
- [ ] Re-enable the toggle and confirm notifications resume on the next run.

## 8. Catch-up of multiple periods

- [ ] Take a daily-cadence schedule, set its `next_due_date` to 3 days ago.
- [ ] Foreground the app.
- [ ] Confirm 3+ separate `transactions` rows are created (one per missed day) and 3+ separate notifications fire (one per occurrence).
- [ ] `next_due_date` should now be in the future.

## 9. Coexistence with existing Subscription / Bill notifications

- [ ] Create a Subscription with `nextDueDate` in the past.
- [ ] Create a recurring Bill Reminder with `dueDate` in the past.
- [ ] Foreground the app and confirm:
  - Subscription auto-charge fires a notification with body **"Subscription charged from …"**.
  - Bill payment fires a notification with body **"Bill paid from …"**.
  - Both transactions are inserted in the `transactions` table.

## Known-good signals

- `adb logcat | grep -E "RecurringWorker|HeadlessJsTask"` should show the worker invoking the JS task.
- `adb shell dumpsys jobscheduler | grep -A3 walletpulse` should list the unique job `wp-recurring`.
