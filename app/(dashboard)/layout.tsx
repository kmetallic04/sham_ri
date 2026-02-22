import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CreateSessionButton } from "@/components/dashboard/create-session-button";
import {
  AdminViewButtons,
  HomeNavButton,
  SupervisorViewButtons,
} from "@/components/dashboard/view-dropdown";
import { getCurrentUserRole } from "@/lib/supabase/admin";
import { ShamiriLogo } from "@/components/shamiri-logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container relative mx-auto flex h-[73px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <ShamiriLogo />
            <h1 className="text-md font-semibold">Supervisor Copilot</h1>
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <HomeNavButton />
            <Suspense fallback={null}>
              <RoleNavButtons />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <Suspense fallback={null}>
              <CreateSessionAction />
            </Suspense>
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
}

async function RoleNavButtons() {
  const role = await getCurrentUserRole();
  if (role === "admin") return <AdminViewButtons />;
  if (role === "supervisor") return <SupervisorViewButtons />;
  return null;
}

async function CreateSessionAction() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "supervisor") return null;
  return <CreateSessionButton />;
}
