"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  FileText,
  User,
  Settings,
  LogOut,
  Plus,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/types";
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";

type SidebarProps = {
  role: UserRole;
  className?: string;
};

export default function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems =
    role === "Candidate"
      ? [
          {
            label: "Dashboard",
            href: "/candidate/dashboard",
            icon: Home,
          },
          {
            label: "Discover Jobs",
            href: "/candidate/jobs",
            icon: Briefcase,
          },
          {
            label: "My Applications",
            href: "/candidate/applications",
            icon: FileText,
          },
          {
            label: "Profile",
            href: "/candidate/profile",
            icon: User,
          },
        ]
      : [
          {
            label: "Dashboard",
            href: "/recruiter/dashboard",
            icon: Home,
          },
          {
            label: "Create Job",
            href: "/recruiter/jobs/new",
            icon: Plus,
          },
          {
            label: "My Jobs",
            href: "/recruiter/jobs",
            icon: Briefcase,
          },
          {
            label: "Applications",
            href: "/recruiter/applications",
            icon: FileText,
          },
          {
            label: "Company Profile",
            href: "/recruiter/company-profile",
            icon: Building2,
          },
        ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <div
      className={cn(
        "h-full bg-card border-r border-border p-4 flex flex-col",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">HireMind</span>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 pt-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}
