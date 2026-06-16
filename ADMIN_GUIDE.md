# Administrator Guide

This guide is intended for Super Admins and Admins to manage the FIFA 2026 Prediction App during the tournament. The Admin Portal (`/admin`) provides direct control over data synchronization, user management, and AI generation.

## 👥 User Management

### Promote User to Admin
By default, new users are assigned the `USER` role. To promote a user to `ADMIN`:
1. Navigate to **Admin Portal -> Users** (`/admin/users`).
2. Search or find the user in the table.
3. Click the **Edit** button (pencil icon) in the Actions column.
4. Change their Role dropdown from `USER` to `ADMIN`.
5. Click **Save Changes**.

### Manual Point Adjustments
If you need to manually award or penalize points (e.g., for an external competition or to fix a scoring bug):
1. In the **Users** table, edit the user's **Points** total directly.
2. The system will automatically calculate the difference between their auto-calculated prediction points and your entered value, saving the delta as `bonusPoints` under the hood.

---

## 🔄 Data Synchronization

The application relies on background CRON jobs to fetch data from the `worldcup26.ir` API. If the cron jobs fail or you need immediate data, you can trigger these manually from the **Admin Portal -> Settings** (`/admin/settings`).

### Sync Teams
- **What it does**: Fetches the latest countries, group assignments, and flag URLs.
- **When to use**: Before the tournament starts, or if a team is unexpectedly swapped out.
- **Action**: Click `Sync Teams` in the settings menu.

### Sync Matches
- **What it does**: Forces an immediate fetch of all fixtures and live scores.
- **When to use**: If a match has finished but the status still says `IN_PLAY` on the dashboard, or if a live score is lagging behind and users are complaining.
- **Action**: Click `Sync Matches` in the settings menu.

---

## 🤖 AI & Scoring Overrides

### Generate AI Highlights
- **What it does**: Compiles stats from matches that finished in the last 24 hours and uses the Hugging Face API to generate a markdown recap of the day's events.
- **When to use**: The cron job does this automatically every morning at 5 AM. If the cron fails, or if you want to generate an immediate recap after a massive upset, trigger this manually.
- **Action**: Click `Generate AI Highlights` in Settings.

### Recalculate Scores
- **What it does**: A "nuclear" option. It wipes every single prediction score currently awarded, fetches every `FINISHED` match, and re-evaluates every user's prediction from scratch.
- **When to use**: **ONLY** use this if scoring logic rules change mid-tournament (e.g., changing max goals points from 5 to 10) or if a severe database corruption occurs where points were awarded incorrectly.
- **Action**: Click `Recalculate All Scores` in Settings. Be aware this may take several seconds.

---

## 🚑 Troubleshooting

### "Sync Matches" Keeps Failing
- **Cause**: The external `worldcup26.ir` API might be rate-limiting you or experiencing downtime.
- **Fix**: Wait 15-30 minutes before trying again. If the tournament API goes down completely, a developer can swap the provider interface in `src/services/providers/index.ts` from `WorldCup26Provider` to `ManualProvider` to allow manual entry of scores.

### AI Highlights Look Broken or Empty
- **Cause**: The Hugging Face API might be overwhelmed, or your API key (`HUGGINGFACE_API_KEY`) is invalid/exhausted.
- **Fix**: Check the "Sync Logs" table at the bottom of the Settings page. If it shows an error for `AI_HIGHLIGHTS`, verify your API key in the `.env` file or consider swapping the `AI_MODEL` to a smaller/different Llama model.

### Leaderboard Isn't Updating After a Match
- **Cause**: Predictions are only scored when a Match status changes explicitly to `FINISHED`.
- **Fix**: 
  1. Trigger a manual `Sync Matches` to force the API to update the match status.
  2. Wait up to 20 minutes for the background `processPendingMatches` cron job to sweep through the predictions and award points.
