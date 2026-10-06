"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Store,
  User as UserIcon,
  X,
  XCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { apiFetch } from "@/lib/api-client";
import { money } from "@/lib/utils";
import { Order, User } from "@/types";

interface OrderDetailModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStatusUpdated?: (newStatus: string) => void;
}

export function OrderDetailModal({
  orderId,
  isOpen,
  onClose,
  currentUser,
  onStatusUpdated,
}: OrderDetailModalProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery<Order>({
    queryKey: ["order-detail", orderId],
    queryFn: () => apiFetch(`/api/orders/${orderId}`),
    enabled: mounted && isOpen && !!orderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      apiFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note || undefined }),
      }),
    onSuccess: (updatedOrder: Order) => {
      setSuccessMessage(`Order status successfully updated to "${updatedOrder.status}"`);
      setErrorMessage(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-today-summary"] });
      if (onStatusUpdated) onStatusUpdated(updatedOrder.status);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to update order status");
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () => apiFetch(`/api/orders/${orderId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["booker-today-summary"] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to delete order");
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  if (!mounted || !isOpen || !orderId) return null;

  const currentStatus = order?.status || "pending";
  const isUpdating = updateStatusMutation.isPending;

  const handleSetStatus = (newStatus: string, defaultNote?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    updateStatusMutation.mutate({
      status: newStatus,
      note: note.trim() || defaultNote,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ded6c3] bg-[#f3efe7] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#25897c] text-white shadow-xs">
              <FileText size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1e3441]">
                  {order ? order.orderNumber : `Order #${orderId}`}
                </h2>
                {order && <StatusPill status={order.status} />}
              </div>
              <p className="text-xs text-[#627784]">
                {order?.shopName} {order?.shopCode && `(${order.shopCode})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl border border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#e8e2d4] hover:text-[#1e3441] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-[#25897c]" />
              <p className="mt-3 text-sm text-[#627784]">Loading order details...</p>
            </div>
          ) : isError || !order ? (
            <div className="rounded-xl border border-[#c62828]/20 bg-[#c62828]/10 p-5 text-center text-[#c62828]">
              <AlertCircle className="mx-auto size-8 mb-2" />
              <p className="font-bold">Failed to load order details</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-3 text-xs border-[#c62828]/30"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Feedback messages */}
              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-[#c62828]/20 bg-[#c62828]/10 p-3.5 text-sm text-[#c62828]">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Status Management Box */}
              <div className="rounded-xl border border-[#ded6c3] bg-white p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#ded6c3]/60">
                  <div>
                    <h3 className="text-sm font-bold text-[#1e3441] flex items-center gap-1.5">
                      <DollarSign size={16} className="text-[#25897c]" />
                      Payment & Order Status Management
                    </h3>
                    <p className="text-xs text-[#627784]">
                      Change the status manually when payment is collected or if the order is modified.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#627784]">Current:</span>
                    <StatusPill status={currentStatus} />
                  </div>
                </div>

                {/* Quick Payment Received Action for Pending */}
                {currentStatus === "pending" && (
                  <div className="mt-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-emerald-900">
                        Payment Pending for this Order
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        When the retail shop pays, tap below to mark as submitted and confirm payment.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleSetStatus("submitted", "Payment received in full")}
                      disabled={isUpdating}
                      className="bg-[#25897c] hover:bg-[#1f7368] text-white font-bold text-xs h-9 px-4 shrink-0 shadow-xs flex items-center gap-1.5"
                    >
                      {isUpdating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Mark Payment Received
                    </Button>
                  </div>
                )}

                {/* Status Switcher Buttons */}
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-[#1e3441] mb-2">
                    Set Order Status Manually:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Pending button */}
                    <button
                      type="button"
                      disabled={isUpdating || currentStatus === "pending"}
                      onClick={() => handleSetStatus("pending")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                        currentStatus === "pending"
                          ? "border-[#e65100] bg-[#e65100]/15 text-[#a44619] shadow-xs"
                          : "border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#efe9da] hover:text-[#1e3441]"
                      }`}
                    >
                      <Clock size={14} />
                      <span>Pending</span>
                    </button>

                    {/* Submitted button */}
                    <button
                      type="button"
                      disabled={isUpdating || currentStatus === "submitted"}
                      onClick={() => handleSetStatus("submitted")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                        currentStatus === "submitted"
                          ? "border-[#25897c] bg-[#25897c]/15 text-[#25897c] shadow-xs"
                          : "border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#efe9da] hover:text-[#1e3441]"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>Submitted</span>
                    </button>

                    {/* Cancelled button */}
                    <button
                      type="button"
                      disabled={isUpdating || currentStatus === "cancelled"}
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
                          handleSetStatus("cancelled");
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                        currentStatus === "cancelled"
                          ? "border-[#c62828] bg-[#c62828]/15 text-[#c62828] shadow-xs"
                          : "border-[#ded6c3] bg-[#fbf9f4] text-[#627784] hover:bg-[#c62828]/10 hover:text-[#c62828]"
                      }`}
                    >
                      <XCircle size={14} />
                      <span>Cancelled</span>
                    </button>
                  </div>
                </div>

                {/* Optional Status Change Note */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note (e.g. Paid in cash, Cheque #123, jazzcash)"
                    className="w-full h-8 rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-xs text-[#1e3441] outline-none placeholder:text-[#627784]/60 focus:border-[#25897c]"
                  />
                </div>
              </div>

              {/* Order Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shop Information */}
                <div className="rounded-xl border border-[#ded6c3] bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1e3441] mb-2">
                    <Store size={15} className="text-[#25897c]" />
                    <span>Retail Shop Details</span>
                  </div>
                  <p className="text-sm font-bold text-[#1e3441]">{order.shopName}</p>
                  <p className="text-xs text-[#627784]">Code: {order.shopCode}</p>
                  {order.shopOwnerName && (
                    <p className="text-xs text-[#627784] mt-1">Owner: {order.shopOwnerName}</p>
                  )}
                  {order.shopPhone && (
                    <p className="text-xs text-[#627784] flex items-center gap-1 mt-0.5">
                      <Phone size={11} />
                      <a href={`tel:${order.shopPhone}`} className="text-[#25897c] hover:underline">
                        {order.shopPhone}
                      </a>
                    </p>
                  )}
                  {order.shopArea && (
                    <p className="text-xs text-[#627784] flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> Area: {order.shopArea}
                    </p>
                  )}
                </div>

                {/* Booker & Date Information */}
                <div className="rounded-xl border border-[#ded6c3] bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1e3441] mb-2">
                    <UserIcon size={15} className="text-[#25897c]" />
                    <span>Booking Information</span>
                  </div>
                  <p className="text-sm font-bold text-[#1e3441]">
                    Booker: {order.orderBookerName}
                  </p>
                  <p className="text-xs text-[#627784] flex items-center gap-1 mt-1">
                    <Calendar size={12} /> Date: {order.orderDate}
                  </p>
                  <p className="text-xs text-[#627784] flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> Time: {order.orderTime}
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-xl border border-[#ded6c3] bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-3 border-b border-[#ded6c3] bg-[#f8f5ee] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1e3441] uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-[#25897c]" />
                    Order Line Items ({order.items?.length || 0})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#ded6c3] bg-[#fbf9f4] text-[#627784]">
                        <th className="py-2.5 px-4 font-semibold">Product</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Unit</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ded6c3]/50">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item) => (
                          <tr key={item.id} className="hover:bg-[#fbf9f4]/60">
                            <td className="py-2.5 px-4 font-medium text-[#1e3441]">
                              <p className="font-bold">{item.productName}</p>
                              <span className="text-[10px] text-[#627784] font-mono">
                                {item.productCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-[#627784]">{item.unit}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#1e3441]">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#627784]">
                              {money(item.unitPrice)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-[#1e3441]">
                              {money(item.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#627784]">
                            No items found in this order
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary Footer */}
                <div className="border-t border-[#ded6c3] bg-[#f8f5ee] px-4 py-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[#627784]">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-[#1e3441]">{money(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-[#c62828]">
                      <span>Discount:</span>
                      <span>- {money(order.discount)}</span>
                    </div>
                  )}
                  {order.tax > 0 && (
                    <div className="flex justify-between text-[#627784]">
                      <span>Tax:</span>
                      <span>+ {money(order.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-[#ded6c3] text-sm font-bold text-[#1e3441]">
                    <span>Grand Total:</span>
                    <span className="text-base text-[#25897c]">{money(order.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Audit Timeline */}
              {order.audit && order.audit.length > 0 && (
                <div className="rounded-xl border border-[#ded6c3] bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e3441] mb-3">
                    <History size={14} className="text-[#25897c]" />
                    <span>Audit Trail & Activity Log</span>
                  </div>
                  <div className="space-y-2">
                    {order.audit.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between text-xs py-1.5 border-b border-[#ded6c3]/40 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-[#25897c]" />
                          <div>
                            <p className="font-medium text-[#1e3441]">{event.action}</p>
                            <p className="text-[10px] text-[#627784]">by {event.actorName}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#627784]" suppressHydrationWarning>
                          {new Date(event.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#ded6c3] bg-[#f3efe7] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#627784]">
              Role: <strong className="capitalize">{currentUser.role.replace("_", " ")}</strong>
            </span>
            {currentUser.role === "admin" && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`Permanently delete order ${order?.orderNumber}? This will completely remove it from the system.`)) {
                    deleteOrderMutation.mutate();
                  }
                }}
                disabled={deleteOrderMutation.isPending}
                className="text-[#c62828] hover:bg-[#c62828]/10 text-xs h-8 px-2.5 gap-1.5"
                title="Delete this order"
              >
                <Trash2 size={13} />
                {deleteOrderMutation.isPending ? "Deleting..." : "Delete order"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/reports/export?orderId=${orderId}&format=pdf`}
              download={`invoice-${order?.orderNumber || orderId}.pdf`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25897c] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f7368] transition"
              title="Download official PDF receipt matching your print layout"
            >
              <Download size={14} /> Download PDF Receipt
            </a>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:bg-[#efe9da] text-xs h-9 px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
