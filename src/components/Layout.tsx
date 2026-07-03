import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  Bot,
  Image,
  CalendarDays,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: Wand2, label: "Smart Chat" },
  { to: "/books", icon: BookOpen, label: "Books" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/agents", icon: Bot, label: "Agent Hub" },
  { to: "/media", icon: Image, label: "Media" },
  { to: "/posts", icon: CalendarDays, label: "Scheduler" },
  { to: "/learn", icon: GraduationCap, label: "Learn" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-neutral-800">
          <Sparkles className="h-6 w-6 text-amber-500 shrink-0" />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg tracking-tight truncate">
              AURA
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  isActive
                    ? "bg-amber-500/15 text-amber-500"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-amber-500")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-neutral-800 hidden lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-neutral-800 bg-neutral-900/50">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium text-neutral-300 capitalize">
            {location.pathname === "/"
              ? "Dashboard"
              : location.pathname.replace("/", "").replace("-", " ")}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-neutral-400">All Systems Active</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#171717",
            color: "#fff",
            border: "1px solid #262626",
          },
        }}
      />
    </div>
  );
}
