import { MatchProvider } from "./MatchProvider";

/**
 * ManualProvider is a no-op provider used as a fallback.
 * It relies entirely on Admins entering data via the Admin UI.
 */
export class ManualProvider implements MatchProvider {
  async syncFixtures(): Promise<void> {
    console.log("[ManualProvider] Syncing fixtures bypassed. Relies on Admin manual entry.");
    // No-op
  }

  async syncResults(): Promise<void> {
    console.log("[ManualProvider] Syncing results bypassed. Relies on Admin manual entry.");
    // No-op
  }
}
