import { MatchProvider } from "./MatchProvider";
import { ManualProvider } from "./ManualProvider";
import { WorldCup26Provider } from "./WorldCup26Provider";

export function getMatchProvider(): MatchProvider {
  // We default to WorldCup26Provider for the tournament.
  // The interface and structure are kept to easily swap to ManualProvider or others if needed.
  return new WorldCup26Provider();
}
