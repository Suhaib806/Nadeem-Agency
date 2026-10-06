"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@/types";
import { apiFetch } from "@/lib/api-client";
import logo from "@/assets/logo.png";

const adminNav = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/order-bookers", label: "Order bookers", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/excel", label: "Excel desk", icon: FileSpreadsheet },
];

const bookerNav = [
  { href: "/booker/today", label: "Today", icon: CalendarDays },
  { href: "/booker/new-order", label: "New order", icon: Plus },
  { href: "/booker/orders", label: "My orders", icon: ClipboardList },
  { href: "/booker/export", label: "Export orders", icon: FileSpreadsheet },
];

export function Shell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const items = user.role === "admin" ? adminNav : bookerNav;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      queryClient.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-[#f3efe7]">
      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[#1c2e38] px-4 py-5 text-[#fbf9f4] transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand logo */}
        <div className="mb-8 flex items-center justify-between px-2">
          <Link
            href={user.role === "admin" ? "/admin/dashboard" : "/booker/today"}
            className="group flex items-center gap-3"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1.5 shadow-sm transition group-hover:bg-white/15">
              <Image
                src={logo}
                alt="Nadeem Agency"
                width={40}
                height={40}
                className="size-full object-contain"
                priority
              />
            </div>
            <div>
              <strong className="display block text-[17px] leading-none text-white tracking-wide">NADEEM</strong>
              <small className="mt-1 block text-[9px] font-bold uppercase tracking-[.24em] text-white/55">
                Distribution desk
              </small>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-white/40">
          {user.role === "admin" ? "Control room" : "Field cockpit"}
        </div>

        <nav className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white/10 text-white font-bold"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
                {isActive && <span className="ml-auto size-1.5 rounded-full bg-[#e65100]" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
              pathname === "/admin/settings"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-[#1c2e38]/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main content wrapper */}
      <div className="md:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#ded6c3] bg-[#f3efe7]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-[#627784] hover:bg-[#e8e2d4] md:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="flex items-center gap-2.5 md:hidden">
              <Image src={logo} alt="Nadeem Agency" width={28} height={28} className="size-7 object-contain" />
              <strong className="display text-sm font-bold tracking-wide text-[#1e3441]">NADEEM AGENCY</strong>
            </div>

            <div className="hidden items-center gap-2.5 text-xs font-semibold text-[#627784] md:flex">
              <Image src={logo} alt="Nadeem Agency" width={24} height={24} className="size-6 object-contain" />
              <span className="text-[#25897c]">Nadeem Agency</span>
              <span className="mx-1 text-[#ded6c3]">/</span>
              <span className="capitalize">{pathname.split("/").pop()?.replaceAll("-", " ") || "Dashboard"}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#1e3441]">{user.name}</p>
              <p className="text-[11px] capitalize text-[#627784]">{user.role.replace("_", " ")}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-[#e5decb] font-bold text-[#25897c]">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="shell-grid min-h-[calc(100vh-72px)] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
