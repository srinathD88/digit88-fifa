import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/AdminNav";
import { Digit88Logo } from "@/components/Digit88Logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  if (!(session.user as any).teamId) {
    redirect("/team-selection");
  }

  return (
    <div className="container mx-auto py-8 px-4 relative z-10 flex flex-col md:flex-row min-h-[calc(100vh-8rem)]">
      <aside className="w-full md:w-64 shrink-0 md:mr-8 border-b md:border-b-0 md:border-r border-border/40 pb-6 md:pb-0 md:pr-6 mb-8 md:mb-0">
        <div className="mb-8 flex items-center">
          <Digit88Logo className="h-10 w-auto" />
          <span className="ml-3 text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            Admin
          </span>
        </div>
        <AdminNav />
      </aside>
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
