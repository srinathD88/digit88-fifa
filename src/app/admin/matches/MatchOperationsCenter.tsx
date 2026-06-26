"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { updateMatchManualAction, createMatchManualAction } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";

export function MatchOperationsCenter({ matches, teams, stadiums, auditLogs }: any) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStage, setFilterStage] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      today: matches.filter((m: any) => new Date(m.startTime) >= today && new Date(m.startTime) < tomorrow).length,
      upcoming: matches.filter((m: any) => m.status === "SCHEDULED").length,
      live: matches.filter((m: any) => m.status === "IN_PLAY" || m.status === "PAUSED").length,
      completed: matches.filter((m: any) => m.status === "FINISHED").length,
      predictions: matches.reduce((acc: number, m: any) => acc + (m._count?.predictions || 0), 0)
    };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m: any) => {
      if (filterStatus !== "ALL" && m.status !== filterStatus) return false;
      if (filterStage !== "ALL" && m.stage !== filterStage) return false;
      if (filterSource !== "ALL" && m.source !== filterSource) return false;
      return true;
    }).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [matches, filterStatus, filterStage, filterSource]);

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Matches Today", value: stats.today, color: "text-blue-400" },
          { label: "Upcoming", value: stats.upcoming, color: "text-purple-400" },
          { label: "Live", value: stats.live, color: "text-green-400" },
          { label: "Completed", value: stats.completed, color: "text-muted-foreground" },
          { label: "Predictions Received", value: stats.predictions, color: "text-accent" },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <span className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-secondary/20 p-4 rounded-xl">
        <span className="text-sm font-bold text-muted-foreground">Filters:</span>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-black/40 border border-border/50 rounded p-2 text-sm">
          <option value="ALL">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PLAY">Live</option>
          <option value="FINISHED">Completed</option>
        </select>
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="bg-black/40 border border-border/50 rounded p-2 text-sm">
          <option value="ALL">All Stages</option>
          <option value="GROUP">Group Stage</option>
          <option value="ROUND_16">Round of 16</option>
          <option value="QUARTER_FINAL">Quarter Finals</option>
          <option value="SEMI_FINAL">Semi Finals</option>
          <option value="FINAL">Final</option>
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-black/40 border border-border/50 rounded p-2 text-sm">
          <option value="ALL">All Sources</option>
          <option value="API">API</option>
          <option value="MANUAL">Manual</option>
        </select>
        
        <div className="flex-1"></div>
        <button className="bg-accent/20 text-accent font-bold px-4 py-2 rounded-lg text-sm border border-accent/30 hover:bg-accent/40" onClick={() => setSelectedMatch({ isNew: true })}>
          + Create Match
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/20">
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="p-4">Date</th>
                <th className="p-4">Match</th>
                <th className="p-4">Venue</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Status</th>
                <th className="p-4">Score</th>
                <th className="p-4">Predictions</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((match: any) => (
                <tr key={match.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-xs">{format(new Date(match.startTime), "MMM d, HH:mm")}</td>
                  <td className="p-4 font-bold">
                    {match.homeTeamName} vs {match.awayTeamName}
                    {match.manualOverride && <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase">Override</span>}
                  </td>
                  <td className="p-4 text-muted-foreground">{stadiums.find((s:any) => s.id === match.stadiumId)?.name || 'Unknown'}</td>
                  <td className="p-4 text-xs font-semibold">{match.stage.replace('_', ' ')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                      match.status === 'FINISHED' ? 'bg-green-500/20 text-green-400' :
                      match.status === 'IN_PLAY' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                      'bg-secondary/50 text-white/70'
                    }`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-accent">
                    {match.status === 'FINISHED' || match.status === 'IN_PLAY' ? `${match.homeScore} - ${match.awayScore}` : '—'}
                  </td>
                  <td className="p-4 font-mono">{match._count?.predictions || 0}</td>
                  <td className="p-4">
                    <button onClick={() => setSelectedMatch(match)} className="text-xs bg-primary/20 text-primary px-3 py-1 rounded font-bold hover:bg-primary hover:text-white transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMatches.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">No matches found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMatch(null)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0a0c] border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-secondary/20 sticky top-0 z-10">
              <h2 className="text-xl font-bold">{selectedMatch.isNew ? 'Create Match' : 'Match Details & Override'}</h2>
              <button onClick={() => setSelectedMatch(null)} className="text-muted-foreground hover:text-white p-2 text-xl font-bold">×</button>
            </div>
            
            <form action={async (formData) => {
              if (selectedMatch.isNew) {
                await createMatchManualAction(formData);
              } else {
                await updateMatchManualAction(formData);
              }
              setSelectedMatch(null);
            }} className="p-6 space-y-8 flex-1 flex flex-col">
              <input type="hidden" name="matchId" value={selectedMatch.id || ''} />
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-white/5 pb-2">Section 1: General</h3>
                <div className="grid grid-cols-2 gap-4">
                  {!selectedMatch.isNew ? (
                     <></> 
                  ) : (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Home Team</label>
                        <select name="homeTeamId" className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" required>
                           <option value="">Select Home Team</option>
                           {teams.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Away Team</label>
                        <select name="awayTeamId" className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" required>
                           <option value="">Select Away Team</option>
                           {teams.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Status</label>
                    <select name="status" defaultValue={selectedMatch.status || "SCHEDULED"} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm">
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PLAY">Live</option>
                      <option value="PAUSED">Paused</option>
                      <option value="FINISHED">Finished</option>
                      <option value="POSTPONED">Postponed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Stage</label>
                    <select name="stage" defaultValue={selectedMatch.stage || "GROUP"} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm">
                      <option value="GROUP">Group Stage</option>
                      <option value="ROUND_16">Round of 16</option>
                      <option value="QUARTER_FINAL">Quarter Finals</option>
                      <option value="SEMI_FINAL">Semi Finals</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Start Time (UTC)</label>
                    <input type="datetime-local" name="startTime" defaultValue={selectedMatch.startTime ? new Date(selectedMatch.startTime).toISOString().slice(0, 16) : ''} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" required />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-white/5 pb-2">Section 2: Result</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Home Score</label>
                    <input type="number" name="homeScore" defaultValue={selectedMatch.homeScore ?? ''} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Away Score</label>
                    <input type="number" name="awayScore" defaultValue={selectedMatch.awayScore ?? ''} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Max Goals By Player</label>
                    <input type="number" name="actualMaxGoals" defaultValue={selectedMatch.actualMaxGoals ?? ''} className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Winner</label>
                    <select name="winner" defaultValue={
                      selectedMatch.winner === selectedMatch.homeTeamName ? "HOME" :
                      selectedMatch.winner === selectedMatch.awayTeamName ? "AWAY" :
                      selectedMatch.winner || ""
                    } className="w-full bg-secondary/30 border border-white/10 rounded p-2 text-sm">
                      <option value="">None / Draw</option>
                      <option value="HOME">Home Team</option>
                      <option value="AWAY">Away Team</option>
                    </select>
                  </div>
                </div>
              </div>

              {!selectedMatch.isNew && (
                <div className="space-y-4 bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider border-b border-red-500/20 pb-2">Section 3: Sync & Protection</h3>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-mono">{selectedMatch.source}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold">Manual Override Active?</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="manualOverride" value="true" defaultChecked={selectedMatch.manualOverride} className="sr-only peer" />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">If active, this match will completely ignore future API sync updates to protect your manual data.</p>
                  </div>
                </div>
              )}

              {!selectedMatch.isNew && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-white/5 pb-2">Section 4: Timeline Audit</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2 text-xs font-mono bg-black/40 p-3 rounded">
                    {auditLogs.filter((l: any) => l.entityId === selectedMatch.id).map((log: any) => (
                      <div key={log.id} className="flex gap-4 border-b border-white/5 pb-1">
                        <span className="text-muted-foreground shrink-0">{format(new Date(log.createdAt), "HH:mm")}</span>
                        <span className="text-white/80 break-words">{log.action}</span>
                      </div>
                    ))}
                    {auditLogs.filter((l: any) => l.entityId === selectedMatch.id).length === 0 && (
                      <span className="text-muted-foreground italic">No manual audit logs found.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-white/10 flex justify-end gap-4 pb-4">
                <button type="button" onClick={() => setSelectedMatch(null)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-white">Cancel</button>
                <SubmitButton type="submit" className="bg-accent text-black font-bold px-6 py-2 rounded shadow hover:bg-accent/90" loadingText="Saving...">
                  Save & Automate Actions
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
