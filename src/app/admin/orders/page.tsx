"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, X } from "lucide-react";
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
import { Order, User } from "@/types";

export default function AdminOrdersPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedBooker, setSelectedBooker] = useState("");
  const [showExport, setShowExport] = useState(false);

  const usersQuery = useQuery<User[]>({
    queryKey: ["users-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: !!user,
  });

  const ordersQuery = useQuery<{ items: Order[]; total: number }>({
    queryKey: ["orders", search, status, selectedBooker],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (selectedBooker) params.set("orderBookerId", selectedBooker);
      params.set("page", "1");
      params.set("pageSize", "100");
      return apiFetch(`/api/orders?${params.toString()}`);
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const orders = ordersQuery.data?.items || [];
  const bookers = (usersQuery.data || []).filter((u) => u.role === "order_booker");

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Order book"
        title="Orders"
        description="Review, filter, verify, and action real-time field orders across all active routes."
        action={
          <Button
            variant="outline"
            onClick={() => setShowExport(true)}
            className="border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:bg-[#efe9da]"
          >
            <Download size={16} /> Export to Excel
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-3 lg:flex-row">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by order number, shop name, or code"
        />

        <div className="flex gap-2 overflow-x-auto">
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

          <select
            value={selectedBooker}
            onChange={(e) => setSelectedBooker(e.target.value)}
            className="h-11 max-w-[180px] rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none focus:border-[#25897c]"
          >
            <option value="">All bookers</option>
            {bookers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      {ordersQuery.isLoading ? (
        <LoadingBlock />
      ) : ordersQuery.isError ? (
        <ErrorBlock onRetry={() => ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyBlock
          title="No orders found"
          detail="There are no booked orders matching the active search or filter criteria."
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
                    {o.orderNumber} · {o.shopCode} · Booker: {o.orderBookerName}
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

                {o.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    className="size-9 p-0 text-[#c62828] hover:bg-[#c62828]/10"
                    title="Cancel order"
                    onClick={() => {
                      if (confirm(`Cancel order ${o.orderNumber}?`)) {
                        cancelMutation.mutate(o.id);
                      }
                    }}
                  >
                    <X size={16} />
                  </Button>
                )}
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
          orderBookerId: selectedBooker,
        }}
      />
    </Shell>
  );
}
