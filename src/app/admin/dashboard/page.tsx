"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Store,
  Users,
} from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { PageHead, Metric } from "@/components/ui/Metric";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money, today } from "@/lib/utils";
import { DashboardSummary } from "@/types";

export default function AdminDashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch("/api/dashboard/summary"),
    enabled: !!user,
  });

  const recentQuery = useQuery<any[]>({
    queryKey: ["recent-orders"],
    queryFn: () => apiFetch("/api/dashboard/recent-orders?limit=6"),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock label="Verifying admin credentials..." />
      </div>
    );
  }

  const s = summaryQuery.data || {
    date: today(),
    totalOrders: 0,
    shopsVisited: 0,
    totalSales: 0,
    activeOrderBookers: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    salesByBooker: [],
  };

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Operational overview"
        title={`Good day, ${user.name}`}
        description={`Live route activity and order book pulse for ${s.date}.`}
        action={
          <Link
            href="/admin/orders"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#25897c] px-4 text-sm font-bold text-white hover:bg-[#1f7368] transition"
          >
            View order book <ArrowRight size={16} />
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Orders today"
          value={s.totalOrders}
          note={`${s.pendingOrders} awaiting fulfillment`}
          icon={ClipboardList}
        />
        <Metric
          label="Sales today"
          value={money(s.totalSales)}
          note="Across submitted orders"
          tone="accent"
          icon={BarChart3}
        />
        <Metric
          label="Shops visited"
          value={s.shopsVisited}
          note="Route coverage logged"
          icon={Store}
        />
        <Metric
          label="Active order bookers"
          value={s.activeOrderBookers}
          note={`${s.cancelledOrders} cancelled today`}
          icon={Users}
        />
      </div>

      {/* Detail grids */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        {/* Recent orders feed */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-[0_8px_25px_rgba(30,52,65,0.03)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#1e3441]">Recent orders</h2>
              <p className="mt-1 text-xs text-[#627784]">The latest submissions from the field</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold text-[#25897c] hover:underline">
              See all
            </Link>
          </div>

          {recentQuery.isLoading ? (
            <LoadingBlock />
          ) : recentQuery.isError ? (
            <ErrorBlock onRetry={() => recentQuery.refetch()} />
          ) : !recentQuery.data || recentQuery.data.length === 0 ? (
            <EmptyBlock title="No orders booked yet" detail="Orders submitted in the field will appear here." />
          ) : (
            <div className="space-y-1">
              {recentQuery.data.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 border-b border-[#ded6c3]/60 py-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e5decb] text-xs font-bold text-[#25897c]">
                      {o.shopName?.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1e3441]">{o.shopName}</p>
                      <p className="text-xs text-[#627784]">
                        {o.orderNumber} · {o.orderBookerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1e3441]">{money(o.grandTotal)}</p>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Booker performance chart */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#1c2e38] p-5 text-white shadow-[0_8px_25px_rgba(30,52,65,0.03)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Sales by booker</h2>
              <p className="mt-1 text-xs text-white/50">Today's route output breakdown</p>
            </div>
            <Activity size={18} className="text-[#e65100]" />
          </div>

          {s.salesByBooker.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">No route activity recorded today.</p>
          ) : (
            <div className="space-y-5">
              {s.salesByBooker.map((b) => (
                <div key={b.userId}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-white/90">{b.name}</span>
                    <strong className="text-white">{money(b.sales)}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#e65100] transition-all duration-500"
                      style={{ width: `${Math.min(100, (b.sales / Math.max(s.totalSales, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/45">
                    {b.orders} orders · {b.shopsVisited} shops visited
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
