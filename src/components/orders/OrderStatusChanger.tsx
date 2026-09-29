"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronDown, Clock, Loader2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface OrderStatusChangerProps {
  orderId: number;
  orderNumber: string;
  currentStatus: string;
  showQuickPaymentButton?: boolean;
  className?: string;
  onStatusChanged?: (newStatus: string) => void;
}

export function OrderStatusChanger({
  orderId,
  orderNumber,
  currentStatus,
  showQuickPaymentButton = true,
  className,
  onStatusChanged,
}: OrderStatusChangerProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      apiFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }),
    onMutate: () => {
      setIsUpdating(true);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-today-summary"] });
      if (onStatusChanged) onStatusChanged(updated.status);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update order status");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    if (newStatus === "cancelled") {
      if (!confirm(`Are you sure you want to cancel order ${orderNumber}?`)) {
        return;
      }
    }
    const note = newStatus === "submitted" ? "Payment received" : undefined;
    statusMutation.mutate({ status: newStatus, note });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
      case "pending":
        return "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100";
      case "cancelled":
        return "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100";
      default:
        return "border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441]";
    }
  };

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick "Payment Received" button when Pending */}
      {showQuickPaymentButton && currentStatus === "pending" && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => handleStatusChange("submitted")}
          title="Payment collected: mark order as submitted"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25897c] px-2.5 text-[11px] font-bold text-white shadow-xs hover:bg-[#1f7368] active:scale-95 transition disabled:opacity-50"
        >
          {isUpdating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={13} className="stroke-[3]" />
          )}
          <span>Receive Payment</span>
        </button>
      )}

      {/* Status Selector Dropdown */}
      <div className="relative inline-flex items-center">
        <select
          value={currentStatus}
          disabled={isUpdating}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={cn(
            "h-8 appearance-none rounded-lg border pl-2.5 pr-7 text-[11px] font-bold capitalize transition outline-none cursor-pointer disabled:opacity-50",
            getStatusColor(currentStatus),
          )}
        >
          <option value="pending">Pending (Awaiting Payment)</option>
          <option value="submitted">Submitted (Payment Received)</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="pointer-events-none absolute right-2 text-current opacity-60">
          {isUpdating ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <ChevronDown size={12} />
          )}
        </div>
      </div>
    </div>
  );
}
