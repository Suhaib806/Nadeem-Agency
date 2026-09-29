"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Plus, Clock, CheckCircle2, XCircle, ListFilter } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Metric";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { ExportModal } from "@/components/export/ExportModal";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { OrderStatusChanger } from "@/components/orders/OrderStatusChanger";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { Order } from "@/types";

export default function BookerOrdersPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const ordersQuery = useQuery<{
    items: Order[];
    total: number;
    counts?: { all: number; pending: number; submitted: number; cancelled: number };
  }>({
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
        eyebrow="Field history & payment tracking"
        title="My route orders"
        description="Review booked orders, receive payments, and manage status manually from your route visits."
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
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#e65100] px-4 text-sm font-bold text-white hover:bg-[#d84315] shadow-xs transition"
            >
              <Plus size={16} /> Book new order
            </Link>
          </div>
        }
      />

      {/* Quick Filter Tabs */}
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
          <span>Submitted (Paid)</span>
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

      {/* Filter and Search Bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order number or shop name" />
      </div>

      {ordersQuery.isLoading ? (
        <LoadingBlock />
      ) : ordersQuery.isError ? (
        <ErrorBlock onRetry={() => ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyBlock
          title="No orders found"
          detail={
            status === "pending"
              ? "Great job! You have no pending payments awaiting collection."
              : "Start booking at your assigned retail accounts to build your route history."
          }
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
              onClick={() => setSelectedOrderId(o.id)}
              className="group flex flex-col gap-3 border-b border-[#ded6c3]/60 px-4 py-4 last:border-0 hover:bg-[#f5efe1]/40 transition cursor-pointer sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              {/* Left Shop & Order Info */}
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e5decb] text-xs font-bold text-[#25897c] group-hover:bg-[#25897c] group-hover:text-white transition">
                  {o.shopName?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-[#1e3441] group-hover:text-[#25897c] transition">
                    {o.shopName}
                  </p>
                  <p className="text-xs text-[#627784]">
                    {o.orderNumber} · {o.shopCode}
                  </p>
                </div>
              </div>

              {/* Right Side: Total, Date, and Status Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-[#1e3441]">{money(o.grandTotal)}</p>
                  <p className="text-xs text-[#627784]">
                    {o.orderDate} · {o.orderTime}
                  </p>
                </div>

                {/* Inline Status Changer with Quick Payment Receive button */}
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
                  title="View order details and items"
                  className="grid size-8 place-items-center rounded-lg border border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#efe9da] hover:text-[#1e3441] transition"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        user={user}
        initialFilters={{
          status,
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
