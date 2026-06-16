export interface MatchProvider {
  /**
   * Synchronizes the full tournament fixture list.
   * This should generally be run infrequently (e.g. daily).
   */
  syncFixtures(): Promise<void>;

  /**
   * Synchronizes the results and live scores for current matches.
   * This should be run frequently (e.g. every 5-10 minutes) but only when matches are active.
   */
  syncResults(): Promise<void>;

  /**
   * Synchronizes tournament teams and groups.
   */
  syncTeams?(): Promise<void>;

  /**
   * Synchronizes tournament stadiums and venues.
   */
  syncStadiums?(): Promise<void>;
}
