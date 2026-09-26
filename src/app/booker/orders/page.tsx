"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Metric";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { ExportModal } from "@/components/export/ExportModal";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { Order } from "@/types";

export default function BookerOrdersPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showExport, setShowExport] = useState(false);

  const ordersQuery = useQuery<{ items: Order[]; total: number }>({
    queryKey: ["booker-orders", search, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("page", "1");
      params.set("pageSize", "100");
      return apiFetch(`/api/orders?${params.toString()}`);
    },
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const orders = ordersQuery.data?.items || [];

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Field history"
        title="My submitted orders"
        description="All orders you have booked and submitted from your retail route visits."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExport(true)}
              className="border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:bg-[#efe9da]"
            >
              <Download size={16} /> Export
            </Button>
            <Link
              href="/booker/new-order"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#e65100] px-4 text-sm font-bold text-white hover:bg-[#d84315] transition"
            >
              <Plus size={16} /> Book new order
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order number or shop name" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none focus:border-[#25897c]"
        >
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {ordersQuery.isLoading ? (
        <LoadingBlock />
      ) : ordersQuery.isError ? (
        <ErrorBlock onRetry={() => ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyBlock
          title="No orders yet"
          detail="Start booking at your assigned retail accounts to build your route history."
          action={
            <Link
              href="/booker/new-order"
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#25897c] px-4 text-sm font-bold text-white hover:bg-[#1f7368]"
            >
              <Plus size={15} /> Book an order
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#ded6c3] bg-[#fbf9f4] shadow-xs">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 border-b border-[#ded6c3]/60 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-[#e5decb] text-xs font-bold text-[#25897c]">
                  {o.shopName?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-[#1e3441]">{o.shopName}</p>
                  <p className="text-xs text-[#627784]">
                    {o.orderNumber} · {o.shopCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-[#1e3441]">{money(o.grandTotal)}</p>
                  <p className="text-xs text-[#627784]">
                    {o.orderDate} · {o.orderTime}
                  </p>
                </div>
                <StatusPill status={o.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        user={user}
        initialFilters={{
          status,
        }}
      />
    </Shell>
  );
}
