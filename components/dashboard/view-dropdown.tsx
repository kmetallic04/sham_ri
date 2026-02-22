"use client";

import { Button } from "@/components/ui/button";
import { House, Users, UserCheck, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HomeNavButton() {
  const pathname = usePathname();
  const isActive = pathname === "/";

  return (
    <Button asChild variant={isActive ? "default" : "secondary"} size="sm">
      <Link href="/">
        <House className="h-4 w-4" />
        Home
      </Link>
    </Button>
  );
}

export function AdminViewButtons() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        variant={
          pathname.startsWith("/supervisors") ? "default" : "secondary"
        }
        size="sm"
      >
        <Link href="/supervisors">
          <Users className="h-4 w-4" />
          Supervisors
        </Link>
      </Button>
      <Button
        asChild
        variant={
          pathname.startsWith("/fellows") ? "default" : "secondary"
        }
        size="sm"
      >
        <Link href="/fellows">
          <UserCheck className="h-4 w-4" />
          Fellows
        </Link>
      </Button>
      <Button
        asChild
        variant={
          pathname.startsWith("/groups") ? "default" : "secondary"
        }
        size="sm"
      >
        <Link href="/groups">
          <Layers className="h-4 w-4" />
          Groups
        </Link>
      </Button>
    </div>
  );
}

export function SupervisorViewButtons() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        variant={
          pathname.startsWith("/my-fellows") ? "default" : "secondary"
        }
        size="sm"
      >
        <Link href="/my-fellows">
          <UserCheck className="h-4 w-4" />
          My Fellows
        </Link>
      </Button>
    </div>
  );
}
