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

export const getTournamentAwards = unstable_cache(
  async () => {
    return _getTournamentAwards();
  },
  ["tournament-awards"],
  {
    revalidate: 60,
    tags: ["leaderboard"],
  }
);
