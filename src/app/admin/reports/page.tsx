"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ClipboardList, RefreshCw, Store } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead, Metric } from "@/components/ui/Metric";
import { EmptyBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { DashboardSummary, User } from "@/types";

export default function AdminReportsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch("/api/dashboard/summary"),
    enabled: !!user,
  });

  const usersQuery = useQuery<User[]>({
    queryKey: ["users-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const s = summaryQuery.data || {
    date: "",
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
        eyebrow="Performance"
        title="Reports"
        description="Focused analysis of route productivity, sales performance, and commercial output."
        action={
          <Button variant="outline" onClick={() => summaryQuery.refetch()}>
            <RefreshCw size={16} /> Refresh data
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total sales today"
          value={money(s.totalSales)}
          note="Gross submitted order value"
          icon={BarChart3}
          tone="accent"
        />
        <Metric
          label="Orders booked"
          value={s.totalOrders}
          note="Across active routes"
          icon={ClipboardList}
        />
        <Metric
          label="Coverage achieved"
          value={s.shopsVisited}
          note="Unique retail accounts visited"
          icon={Store}
        />
      </div>

      <section className="mt-6 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-xs">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#1e3441]">Booker performance leaderboard</h2>
            <p className="mt-1 text-xs text-[#627784]">Ranked by today's total booking value</p>
          </div>
          <BarChart3 size={19} className="text-[#25897c]" />
        </div>

        {s.salesByBooker.length === 0 ? (
          <EmptyBlock
            title="No route output yet"
            detail="Leaderboard rankings will update as order bookers book visits today."
          />
        ) : (
          <div className="space-y-1">
            {s.salesByBooker.map((r, i) => (
              <div
                key={r.userId}
                className="grid grid-cols-[30px_1fr_auto] items-center gap-3 border-b border-[#ded6c3]/60 py-4 last:border-0"
              >
                <span className="display text-lg font-bold text-[#627784]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-bold text-[#1e3441]">{r.name}</p>
                  <p className="text-xs text-[#627784]">
                    {r.orders} orders · {r.shopsVisited} shops visited
                  </p>
                </div>
                <p className="display font-bold text-[#25897c]">{money(r.sales)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-xs">
        <h2 className="font-bold text-[#1e3441]">Active field sales team</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(usersQuery.data || []).map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-2 rounded-full bg-[#e5decb] px-3.5 py-1.5 text-xs font-semibold text-[#1e3441]"
            >
              <span className="size-2 rounded-full bg-[#25897c]" />
              {u.name}
            </span>
          ))}
        </div>
      </section>
    </Shell>
  );
}
