"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";


export function PredictionsTable({ predictions }: { predictions: any[] }) {
  const [userFilter, setUserFilter] = useState("ALL");
  const [matchFilter, setMatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Extract unique users and matches for filters
  const uniqueUsers = Array.from(new Set(predictions.map(p => p.user.name || p.user.email))).sort();
  const uniqueMatches = Array.from(new Set(predictions.map(p => `${p.match.homeTeamName} vs ${p.match.awayTeamName}`))).sort();

  // Determine status
  const getStatus = (p: any) => {
    const match = p.match;
    const isLocked = new Date() >= new Date(match.startTime) || match.status !== "SCHEDULED";
    
    if (p.pointsAwarded !== null) return "SCORED";
    if (match.pointsCalculated && p.pointsAwarded === null) return "ERROR";
    if (isLocked) return "LOCKED";
    return "PENDING";
  };

  const filtered = predictions.filter(p => {
    if (userFilter !== "ALL" && (p.user.name !== userFilter && p.user.email !== userFilter)) return false;
    if (matchFilter !== "ALL" && `${p.match.homeTeamName} vs ${p.match.awayTeamName}` !== matchFilter) return false;
    if (statusFilter !== "ALL" && getStatus(p) !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="w-48">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">User</label>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Users</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        
        <div className="w-64">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Match</label>
          <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Matches</option>
            {uniqueMatches.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="w-48">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-card h-10 w-full px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground">
            <option value="ALL">All Statuses</option>
            <option value="PENDING">🟡 Pending</option>
            <option value="LOCKED">🔵 Locked</option>
            <option value="SCORED">🟢 Scored</option>
            <option value="ERROR">🔴 Error</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-white/5 border-b border-border/40 font-black">
            <tr>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 text-center leading-tight">Winner<br/><span className="text-[10px] text-muted-foreground font-normal">Act / Pred</span></th>
              <th className="px-4 py-3 text-center leading-tight">Win Gls<br/><span className="text-[10px] text-muted-foreground font-normal">Act / Pred</span></th>
              <th className="px-4 py-3 text-center leading-tight">Lose Gls<br/><span className="text-[10px] text-muted-foreground font-normal">Act / Pred</span></th>
              <th className="px-4 py-3 text-center leading-tight">Max Gls<br/><span className="text-[10px] text-muted-foreground font-normal">Act / Pred</span></th>
              <th className="px-4 py-3 text-center">Points</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const status = getStatus(p);
              
              const statusBadge = {
                PENDING: <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-bold border border-yellow-500/30 inline-flex items-center gap-1.5 whitespace-nowrap w-fit mx-auto">🟡 Pending</span>,
                LOCKED: <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold border border-blue-500/30 inline-flex items-center gap-1.5 whitespace-nowrap w-fit mx-auto">🔵 Locked</span>,
                SCORED: <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold border border-green-500/30 inline-flex items-center gap-1.5 whitespace-nowrap w-fit mx-auto">🟢 Scored</span>,
                ERROR: <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold border border-red-500/30 inline-flex items-center gap-1.5 whitespace-nowrap w-fit mx-auto">🔴 Error</span>
              }[status];

              const matchName = `${p.match.homeTeamName} vs ${p.match.awayTeamName}`;
              
              const predWinGls = Math.max(p.predictedHomeGoals, p.predictedAwayGoals);
              const predLoseGls = Math.min(p.predictedHomeGoals, p.predictedAwayGoals);

              let actWinGls: number | string = "-";
              let actLoseGls: number | string = "-";
              let actualWinner = "-";
              
              if (p.match.status === 'FINISHED') {
                actWinGls = Math.max(p.match.homeScore, p.match.awayScore);
                actLoseGls = Math.min(p.match.homeScore, p.match.awayScore);
                
                if (p.match.homeScore > p.match.awayScore) actualWinner = p.match.homeTeamName;
                else if (p.match.homeScore < p.match.awayScore) actualWinner = p.match.awayTeamName;
                else actualWinner = "DRAW";
              }

              const predWinner = p.predictedWinner === 'DRAW' ? 'DRAW' : p.predictedWinner === p.match.homeTeamId ? p.match.homeTeamName : p.match.awayTeamName;
              const predMax = p.predictedMaxGoals !== null ? p.predictedMaxGoals : "-";
              const actMax = p.match.status === 'FINISHED' && p.match.actualMaxGoals !== null ? p.match.actualMaxGoals : "-";

              return (
                <tr key={p.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{matchName}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(p.match.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} IST
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold">{p.user.name || p.user.email}</td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-bold text-accent text-xs whitespace-nowrap">{actualWinner}</span>
                      <span className="font-bold text-muted-foreground text-[10px] whitespace-nowrap">{predWinner}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-accent text-sm">{actWinGls}</span>
                      <span className="font-mono font-bold text-muted-foreground text-[10px]">{predWinGls}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-accent text-sm">{actLoseGls}</span>
                      <span className="font-mono font-bold text-muted-foreground text-[10px]">{predLoseGls}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-accent text-sm">{actMax}</span>
                      <span className="font-mono font-bold text-muted-foreground text-[10px]">{predMax}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center font-black">
                    {p.pointsAwarded !== null ? (
                      <span className="text-green-400">+{p.pointsAwarded}</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground font-bold">No predictions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
