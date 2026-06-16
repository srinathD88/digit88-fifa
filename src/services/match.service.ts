import { getMatchProvider } from "./providers";

/**
 * Synchronizes the daily fixtures using the configured MatchProvider.
 * Should be called infrequently (e.g. daily).
 */
export async function syncFixturesService() {
  const provider = getMatchProvider();
  await provider.syncFixtures();
}

/**
 * Synchronizes the live results using the configured MatchProvider.
 * Should be called frequently but the cron ensures it only runs when matches are live.
 */
export async function syncResultsService() {
  const provider = getMatchProvider();
  await provider.syncResults();
}
