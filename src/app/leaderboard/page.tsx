import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import LeaderboardContent from "./LeaderboardContent";
import { LeaderboardShell } from "./LeaderboardShell";

const TABS = [
  { key: "alltime", label: "All-time" },
  { key: "r32",     label: "Round of 32" },
  { key: "r16",     label: "Round of 16" },
  { key: "qf",      label: "Quarter-finals" },
  { key: "sf",      label: "Semi-finals" },
  { key: "teams",   label: "Teams" },
] as const;

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-14 bg-white/5 rounded-lg" />
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="h-16 bg-white/5 rounded-lg"
          style={{ opacity: 1 - i * 0.07 }}
        />
      ))}
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const currentUserTeamId = (session.user as any).teamId;
  const currentUserId = session.user.id!;
  if (!currentUserTeamId) redirect("/team-selection");

  const { tab: rawTab } = await searchParams;
  const tab = TABS.find(t => t.key === rawTab)?.key ?? "alltime";

  return (
    <div className="container mx-auto py-12 px-4 relative z-10">
      <Header />

      <LeaderboardShell>
        {/* key forces Suspense to remount (and show skeleton) when tab changes server-side */}
        <Suspense key={tab} fallback={<LeaderboardSkeleton />}>
          <LeaderboardContent
            tab={tab}
            currentUserId={currentUserId}
            currentUserTeamId={currentUserTeamId}
          />
        </Suspense>
      </LeaderboardShell>
    </div>
  );
}
