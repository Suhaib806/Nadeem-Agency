"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, ListFilter, Plus, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Metric";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { ExportModal } from "@/components/export/ExportModal";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { OrderStatusChanger } from "@/components/orders/OrderStatusChanger";
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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const usersQuery = useQuery<User[]>({
    queryKey: ["users-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: !!user,
  });

  const ordersQuery = useQuery<{
    items: Order[];
    total: number;
    counts?: { all: number; pending: number; submitted: number; cancelled: number };
  }>({
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
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
  const counts = ordersQuery.data?.counts || {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    submitted: orders.filter((o) => o.status === "submitted").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const pendingCount = counts.pending;
  const submittedCount = counts.submitted;
  const cancelledCount = counts.cancelled;
  const allCount = counts.all;

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Order book & status operations"
        title="Orders"
        description="Review, verify payments, and manage statuses manually across all active routes and order bookers."
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

      {/* Quick Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus("")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            status === ""
              ? "border-[#25897c] bg-[#25897c] text-white shadow-xs"
              : "border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#efe9da] hover:text-[#1e3441]"
          }`}
        >
          <ListFilter size={13} />
          <span>All Orders</span>
          <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${status === "" ? "bg-white/20 text-white" : "bg-[#ded6c3] text-[#1e3441]"}`}>
            {allCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus("pending")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            status === "pending"
              ? "border-[#e65100] bg-[#e65100] text-white shadow-xs"
              : "border-[#ded6c3] bg-[#fbf9f4] text-[#a44619] hover:bg-[#efe9da]"
          }`}
        >
          <Clock size={13} />
          <span>Pending (Awaiting Payment)</span>
          {pendingCount > 0 && (
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${status === "pending" ? "bg-white/20 text-white" : "bg-[#e65100]/20 text-[#a44619]"}`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatus("submitted")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            status === "submitted"
              ? "border-[#25897c] bg-[#25897c] text-white shadow-xs"
              : "border-[#ded6c3] bg-[#fbf9f4] text-[#25897c] hover:bg-[#efe9da]"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>Submitted (Paid / Confirmed)</span>
          {submittedCount > 0 && (
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${status === "submitted" ? "bg-white/20 text-white" : "bg-[#25897c]/20 text-[#25897c]"}`}>
              {submittedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatus("cancelled")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            status === "cancelled"
              ? "border-[#c62828] bg-[#c62828] text-white shadow-xs"
              : "border-[#ded6c3] bg-[#fbf9f4] text-[#c62828] hover:bg-[#efe9da]"
          }`}
        >
          <XCircle size={13} />
          <span>Cancelled</span>
          {cancelledCount > 0 && (
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${status === "cancelled" ? "bg-white/20 text-white" : "bg-[#c62828]/20 text-[#c62828]"}`}>
              {cancelledCount}
            </span>
          )}
        </button>
      </div>

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
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
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
              onClick={() => setSelectedOrderId(o.id)}
              className="group flex flex-col gap-3 border-b border-[#ded6c3]/60 px-4 py-4 last:border-0 hover:bg-[#f5efe1]/40 transition cursor-pointer sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e5decb] text-xs font-bold text-[#25897c] group-hover:bg-[#25897c] group-hover:text-white transition">
                  {o.shopName?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-[#1e3441] group-hover:text-[#25897c] transition">
                    {o.shopName}
                  </p>
                  <p className="text-xs text-[#627784]">
                    {o.orderNumber} · {o.shopCode} · Booker:{" "}
                    <strong className="text-[#1e3441]">{o.orderBookerName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-[#1e3441]">{money(o.grandTotal)}</p>
                  <p className="text-xs text-[#627784]">
                    {o.orderDate} · {o.orderTime}
                  </p>
                </div>

                {/* Inline Status Changer: Select or Quick Mark Payment */}
                <OrderStatusChanger
                  orderId={o.id}
                  orderNumber={o.orderNumber}
                  currentStatus={o.status}
                  showQuickPaymentButton={true}
                />

                {/* View Details Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrderId(o.id);
                  }}
                  title="View order details, products, and timeline"
                  className="grid size-8 place-items-center rounded-lg border border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#efe9da] hover:text-[#1e3441] transition"
                >
                  <Eye size={15} />
                </button>

                {o.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    className="size-8 p-0 text-[#c62828] hover:bg-[#c62828]/10"
                    title="Cancel order"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Cancel order ${o.orderNumber}?`)) {
                        cancelMutation.mutate(o.id);
                      }
                    }}
                  >
                    <X size={15} />
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

      {/* Order Detail & Status Management Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        currentUser={user}
      />
    </Shell>
  );
}
