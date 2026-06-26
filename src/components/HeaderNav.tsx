"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 md:gap-6 flex-wrap">
      <Link 
        href="/" 
        className={`text-sm font-semibold transition-colors uppercase tracking-wider ${pathname === "/" ? "text-primary border-b-2 border-primary pb-1" : "hover:text-primary"}`}
      >
        Match Center
      </Link>
      <Link 
        href="/leaderboard" 
        className={`text-sm font-semibold transition-colors uppercase tracking-wider ${pathname === "/leaderboard" ? "text-primary border-b-2 border-primary pb-1" : "hover:text-primary"}`}
      >
        Leaderboard
      </Link>
      {isAdmin && (
        <Link 
          href="/admin" 
          className={`text-sm font-bold transition-colors uppercase tracking-wider ${pathname.startsWith("/admin") ? "text-accent border-b-2 border-accent pb-1" : "text-accent hover:text-accent/80"}`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
