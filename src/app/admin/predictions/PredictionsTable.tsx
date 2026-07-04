"use client";

import { useState } from "react";

export function PredictionsTable({ predictions }: { predictions: any[] }) {
  const [userFilter, setUserFilter]   = useState("ALL");
  const [matchFilter, setMatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [penaltyOnly, setPenaltyOnly] = useState(false);

  const uniqueUsers   = Array.from(new Set(predictions.map(p => p.user.name || p.user.email))).sort();
  const uniqueMatches = Array.from(new Set(predictions.map(p => `${p.match.homeTeamName} vs ${p.match.awayTeamName}`))).sort();

  const getStatus = (p: any) => {
    const isLocked = new Date() >= new Date(p.match.startTime) || p.match.status !== "SCHEDULED";
    if (p.pointsAwarded !== null) return "SCORED";
    if (p.match.pointsCalculated && p.pointsAwarded === null) return "ERROR";
    if (isLocked) return "LOCKED";
    return "PENDING";
  };

  // Compute which rules fired for this prediction — for breakdown display
  const getBreakdown = (p: any) => {
    const m = p.match;
    if (m.status !== "FINISHED") return null;

    const exactScore = p.predictedHomeGoals === m.homeScore && p.predictedAwayGoals === m.awayScore;
    const actualWinner = m.homeScore > m.awayScore ? m.homeTeamId : m.homeScore < m.awayScore ? m.awayTeamId : "DRAW";
    const gotWinner = p.predictedWinner === actualWinner;

    const CUTOFF = new Date("2026-07-04T06:30:00.000Z");
    const postCutoff = new Date(m.startTime) >= CUTOFF;

    let nearMiss = false;
    let nearMissClose = false;
    if (postCutoff && !exactScore) {
      const hDiff = Math.abs(p.predictedHomeGoals - m.homeScore);
      const aDiff = Math.abs(p.predictedAwayGoals - m.awayScore);
      if ((hDiff === 0 && aDiff > 0) || (aDiff === 0 && hDiff > 0)) {
        nearMiss = true;
        nearMissClose = Math.max(hDiff, aDiff) === 1;
      }
    }

    const gotMaxGoals = m.actualMaxGoals !== null && p.predictedMaxGoals !== null && p.predictedMaxGoals === m.actualMaxGoals;

    let penaltyCorrect = false;
    if (m.isPenaltyShootout && postCutoff && m.homePenaltyScore !== null && m.awayPenaltyScore !== null) {
      penaltyCorrect = p.predictedPenaltyHomeScore === m.homePenaltyScore && p.predictedPenaltyAwayScore === m.awayPenaltyScore;
    }

    const isPerfect = exactScore && gotWinner && gotMaxGoals && (!m.isPenaltyShootout || !postCutoff || penaltyCorrect);

    return { exactScore, gotWinner, nearMiss, nearMissClose, gotMaxGoals, penaltyCorrect, isPerfect, postCutoff };
  };

  const filtered = predictions.filter(p => {
    if (userFilter !== "ALL" && p.user.name !== userFilter && p.user.email !== userFilter) return false;
    if (matchFilter !== "ALL" && `${p.match.homeTeamName} vs ${p.match.awayTeamName}` !== matchFilter) return false;
    if (statusFilter !== "ALL" && getStatus(p) !== statusFilter) return false;
    if (penaltyOnly && !p.match.isPenaltyShootout) return false;
    return true;
  });

  const check = (ok: boolean) => ok
    ? <span className="text-green-400 font-bold">✓</span>
    : <span className="text-red-400 font-bold">✗</span>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="w-48">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">User</label>
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Users</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="w-64">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Match</label>
          <select value={matchFilter} onChange={e => setMatchFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Matches</option>
            {uniqueMatches.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="w-48">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Statuses</option>
            <option value="PENDING">🟡 Pending</option>
            <option value="LOCKED">🔵 Locked</option>
            <option value="SCORED">🟢 Scored</option>
            <option value="ERROR">🔴 Error</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer h-10 px-3 py-2 glass-card rounded-md border border-white/10 text-sm font-bold">
            <input type="checkbox" checked={penaltyOnly} onChange={e => setPenaltyOnly(e.target.checked)} className="accent-primary" />
            Penalty matches only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-white/5 border-b border-border/40 font-black">
            <tr>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 text-center leading-tight">
                Score<br/><span className="text-[10px] text-muted-foreground font-normal normal-case">Actual / Predicted</span>
              </th>
              <th className="px-4 py-3 text-center leading-tight">
                Max Gls<br/><span className="text-[10px] text-muted-foreground font-normal normal-case">Act / Pred</span>
              </th>
              <th className="px-4 py-3 text-center leading-tight">
                Penalty<br/><span className="text-[10px] text-muted-foreground font-normal normal-case">Act / Pred</span>
              </th>
              <th className="px-4 py-3 text-center">Points</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const status = getStatus(p);
              const m = p.match;
              const bd = getBreakdown(p);

              const statusBadge: Record<string, JSX.Element> = {
                PENDING: <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-bold border border-yellow-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">🟡 Pending</span>,
                LOCKED:  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold border border-blue-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">🔵 Locked</span>,
                SCORED:  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold border border-green-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">🟢 Scored</span>,
                ERROR:   <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold border border-red-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">🔴 Error</span>,
              };

              const actualScore  = m.status === "FINISHED" ? `${m.homeScore} – ${m.awayScore}` : "–";
              const predScore    = `${p.predictedHomeGoals} – ${p.predictedAwayGoals}`;
              const exactMatch   = m.status === "FINISHED" && bd?.exactScore;

              const actMax  = m.status === "FINISHED" && m.actualMaxGoals !== null ? m.actualMaxGoals : "–";
              const predMax = p.predictedMaxGoals !== null ? p.predictedMaxGoals : "–";

              // Penalty display
              const isPenalty = m.isPenaltyShootout;
              const actPenalty  = isPenalty && m.homePenaltyScore !== null ? `${m.homePenaltyScore} – ${m.awayPenaltyScore}` : "–";
              const predPenalty = p.predictedPenaltyHomeScore !== null ? `${p.predictedPenaltyHomeScore} – ${p.predictedPenaltyAwayScore}` : "–";

              return (
                <tr key={p.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                  {/* Match */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{m.homeTeamName} vs {m.awayTeamName}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(m.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} IST
                      {isPenalty && <span className="ml-2 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold text-[9px]">PENALTIES</span>}
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{p.user.name || p.user.email}</td>

                  {/* Score */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`font-mono font-bold text-sm ${exactMatch ? "text-green-400" : "text-accent"}`}>{actualScore}</span>
                      <span className={`font-mono text-xs ${exactMatch ? "text-green-400/70" : "text-muted-foreground"}`}>{predScore}</span>
                      {bd && !bd.exactScore && bd.nearMiss && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold">
                          {bd.nearMissClose ? "near miss +1" : "near miss 2+"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Max Goals */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`font-mono font-bold text-sm ${bd?.gotMaxGoals ? "text-green-400" : "text-accent"}`}>{actMax}</span>
                      <span className={`font-mono text-xs ${bd?.gotMaxGoals ? "text-green-400/70" : "text-muted-foreground"}`}>{predMax}</span>
                    </div>
                  </td>

                  {/* Penalty */}
                  <td className="px-4 py-3 text-center">
                    {isPenalty ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-mono font-bold text-sm ${bd?.penaltyCorrect ? "text-green-400" : "text-accent"}`}>{actPenalty}</span>
                        <span className={`font-mono text-xs ${bd?.penaltyCorrect ? "text-green-400/70" : "text-muted-foreground"}`}>{predPenalty}</span>
                        {bd && (
                          <span className="text-[10px]">{check(bd.penaltyCorrect)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </td>

                  {/* Points + breakdown */}
                  <td className="px-4 py-3 text-center">
                    {p.pointsAwarded !== null ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-green-400 font-black text-lg">+{p.pointsAwarded}</span>
                        {bd && (
                          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[9px] font-bold text-muted-foreground">
                            <span>{check(bd.gotWinner)} win</span>
                            <span>{check(bd.exactScore)} score</span>
                            <span>{check(bd.gotMaxGoals)} max</span>
                            {isPenalty && bd.postCutoff && <span>{check(bd.penaltyCorrect)} pen</span>}
                            <span>{check(bd.isPerfect)} perfect</span>
                          </div>
                        )}
                      </div>
                    ) : "–"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">{statusBadge[status]}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-bold">No predictions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
