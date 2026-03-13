"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { cn, COUNTY_LABELS, ROLE_LABELS } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface NavProps {
  session: Session;
}

function NavLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-blue-100 text-blue-900"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

export function Nav({ session }: NavProps) {
  const [open, setOpen] = useState(false);
  const role = session.user.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "COUNTY_COORDINATOR";

  const volunteerLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/schedule", icon: CalendarDays, label: "Schedule" },
    { href: "/my-visits", icon: ClipboardList, label: "My Visits" },
  ];

  const adminLinks = [
    { href: "/admin/volunteers", icon: Users, label: "Volunteers" },
    { href: "/admin/visits", icon: CalendarDays, label: "Visits" },
    { href: "/admin/recurring", icon: ClipboardList, label: "Recurring Schedules" },
    { href: "/admin/mods", icon: MapPin, label: "Manage Mods" },
  ];

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-3 py-4 border-b">
        <p className="font-semibold text-gray-900 truncate">{session.user.name}</p>
        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-blue-700 font-medium">
            {ROLE_LABELS[role]}
          </span>
          {session.user.county && (
            <span className="text-xs text-gray-400">
              · {COUNTY_LABELS[session.user.county]}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {volunteerLinks.map((l) => (
          <NavLink key={l.href} {...l} onClick={onLinkClick} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminLinks.map((l) => (
              <NavLink key={l.href} {...l} onClick={onLinkClick} />
            ))}
          </>
        )}
      </nav>

      <div className="px-2 py-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-600"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r bg-white z-30">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold text-blue-900">Jail Ministry</h1>
          <p className="text-xs text-gray-500">Volunteer Portal</p>
        </div>
        <NavContent />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-blue-900">Jail Ministry</h1>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setOpen(false)}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-5 border-b flex items-center justify-between h-14">
              <h1 className="text-lg font-bold text-blue-900">Jail Ministry</h1>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <NavContent onLinkClick={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
