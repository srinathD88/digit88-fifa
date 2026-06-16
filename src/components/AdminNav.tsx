"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/admin" },
    { name: "Users", path: "/admin/users" },
    { name: "Scoring", path: "/admin/scoring" },
    { name: "Predictions", path: "/admin/predictions" },
    { name: "Settings", path: "/admin/settings" },
  ];

  return (
    <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link key={item.path} href={item.path} className="shrink-0">
            <Button 
              variant="ghost" 
              className={`w-full justify-start text-md h-12 transition-colors ${isActive ? "bg-primary text-white hover:bg-primary/90" : "glass-card hover:bg-primary/20"}`}
            >
              {item.name}
            </Button>
          </Link>
        );
      })}
      <Link href="/" className="shrink-0 md:mt-8">
        <Button variant="outline" className="w-full justify-start text-md h-12 border-border/50">
          ← Back to App
        </Button>
      </Link>
    </nav>
  );
}
