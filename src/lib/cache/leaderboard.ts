import { unstable_cache } from "next/cache";
import { 
  getIndividualLeaderboard as _getIndividualLeaderboard, 
  getTeamLeaderboard as _getTeamLeaderboard,
  _getTournamentAwards
} from "@/services/leaderboard.service";

export const getIndividualLeaderboard = unstable_cache(
  async () => {
    return _getIndividualLeaderboard();
  },
  ["individual-leaderboard"],
  {
    revalidate: 60,
    tags: ["leaderboard"],
  }
);

export const getTeamLeaderboard = unstable_cache(
  async () => {
    return _getTeamLeaderboard();
  },
  ["team-leaderboard"],
  {
    revalidate: 60,
    tags: ["leaderboard"],
  }
);

// Version bumped when the shape of award data changes (new fields on winner objects).
// This forces a cache miss on the next deploy so stale filesystem cache doesn't serve old shapes.
const AWARDS_CACHE_VERSION = "v4";

export const getTournamentAwards = unstable_cache(
  async () => {
    return _getTournamentAwards();
  },
  [`tournament-awards-${AWARDS_CACHE_VERSION}`],
  {
    revalidate: 60,
    tags: ["leaderboard"],
  }
);
