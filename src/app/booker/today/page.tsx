"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ClipboardList, Plus, Store } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Metric, PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { DashboardSummary } from "@/types";

export default function BookerTodayPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ["booker-today-summary"],
    queryFn: () => apiFetch("/api/dashboard/summary"),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock label="Opening your field cockpit..." />
      </div>
    );
  }

  const s = summaryQuery.data || {
    totalOrders: 0,
    shopsVisited: 0,
    totalSales: 0,
  };

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Field cockpit"
        title="Today's route"
        description="Your pace, your orders, your route coverage."
        action={
          <Link
            href="/booker/new-order"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#e65100] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#d84315] transition"
          >
            <Plus size={18} /> New order
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Orders today"
          value={s.totalOrders}
          note="Submitted from the field"
          icon={ClipboardList}
        />
        <Metric
          label="Sales today"
          value={money(s.totalSales)}
          note="Your live commercial total"
          tone="accent"
          icon={BarChart3}
        />
        <Metric
          label="Shops visited"
          value={s.shopsVisited}
          note="Visits logged today"
          icon={Store}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1e3441]">Ready for the next visit?</h2>
            <p className="mt-1 text-sm text-[#627784]">
              Start a clean order in a few taps on your phone.
            </p>
          </div>
          <Link
            href="/booker/new-order"
            className="grid size-12 place-items-center rounded-xl bg-[#25897c] text-white shadow-sm hover:bg-[#1f7368] transition"
          >
            <ArrowRight size={22} />
          </Link>
        </div>
      </div>
    </Shell>
  );
}
