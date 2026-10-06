"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ClipboardList, Download, Plus, Store } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Metric, PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { ExportModal } from "@/components/export/ExportModal";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money, today } from "@/lib/utils";
import { DashboardSummary } from "@/types";

export default function BookerTodayPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");
  const [showExport, setShowExport] = useState(false);

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
        eyebrow="Field cockpit"
        title="Today's route"
        description="Your pace, your orders, your route coverage."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExport(true)}
              className="border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:bg-[#efe9da]"
            >
              <Download size={16} /> Export Receipts (PDF)
            </Button>
            <Link
              href="/booker/new-order"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#e65100] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#d84315] transition"
            >
              <Plus size={18} /> New order
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Orders today"
          value={s.totalOrders}
          note={s.pendingOrders > 0 ? `${s.pendingOrders} pending payment` : "All route orders today"}
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

      {s.pendingOrders > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-[#a44619]">
              <ClipboardList size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {s.pendingOrders} {s.pendingOrders === 1 ? "order is" : "orders are"} pending payment
              </p>
              <p className="text-xs text-amber-700">
                Collect payments on your route and mark them as received.
              </p>
            </div>
          </div>
          <Link
            href="/booker/orders"
            className="inline-flex items-center justify-center rounded-lg bg-[#e65100] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#d84315] transition shadow-xs shrink-0"
          >
            Manage Payments & Status
          </Link>
        </div>
      )}

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

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        user={user}
        initialFilters={{
          from: today(),
          to: today(),
        }}
      />
    </Shell>
  );
}
