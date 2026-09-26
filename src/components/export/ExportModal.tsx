"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  Store,
  User as UserIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { daysAgo, startOfMonth, today, yesterday } from "@/lib/utils";
import { Shop, User } from "@/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  initialFilters?: {
    from?: string;
    to?: string;
    shopId?: string;
    orderBookerId?: string;
    status?: string;
  };
}

export function ExportModal({
  isOpen,
  onClose,
  user,
  initialFilters = {},
}: ExportModalProps) {
  const [datePreset, setDatePreset] = useState<string>("today");
  const [from, setFrom] = useState<string>(initialFilters.from || today());
  const [to, setTo] = useState<string>(initialFilters.to || today());
  const [shopId, setShopId] = useState<string>(initialFilters.shopId || "");
  const [bookerId, setBookerId] = useState<string>(initialFilters.orderBookerId || "");
  const [status, setStatus] = useState<string>(initialFilters.status || "");
  const [format, setFormat] = useState<string>("summary");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  // Fetch shops for dropdown filter
  const shopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["export-shops"],
    queryFn: () => apiFetch("/api/shops?status=active&pageSize=200"),
    enabled: isOpen,
  });

  // Fetch bookers for admin filter
  const bookersQuery = useQuery<User[]>({
    queryKey: ["export-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: isOpen && user.role === "admin",
  });

  if (!isOpen) return null;

  const shops = shopsQuery.data?.items || [];
  const bookers = (bookersQuery.data || []).filter((u) => u.role === "order_booker");

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    setError(null);
    setDownloadedFile(null);
    if (preset === "today") {
      setFrom(today());
      setTo(today());
    } else if (preset === "yesterday") {
      setFrom(yesterday());
      setTo(yesterday());
    } else if (preset === "last7") {
      setFrom(daysAgo(7));
      setTo(today());
    } else if (preset === "month") {
      setFrom(startOfMonth());
      setTo(today());
    } else if (preset === "all") {
      setFrom("");
      setTo("");
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setDownloadedFile(null);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shopId) params.set("shopId", shopId);
      if (user.role === "admin" && bookerId) params.set("orderBookerId", bookerId);
      if (status) params.set("status", status);
      if (format) params.set("format", format);

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      let filename = `nadeem-orders-${today()}.xlsx`;
      const disposition = res.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadedFile(filename);
    } catch (err: any) {
      setError(err.message || "Failed to download export file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={user.role === "admin" ? "Export Agency Orders" : "Export My Orders"}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Banner / Info */}
        <div className="flex items-center gap-3 rounded-xl border border-[#ded6c3] bg-[#e5decb]/40 p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#25897c] text-white">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1e3441]">
              Formatted Excel Workbook (.xlsx)
            </p>
            <p className="text-xs text-[#627784]">
              {user.role === "order_booker"
                ? "Exports all line items and order totals booked by you. Filter by any date range or retail account."
                : "Exports comprehensive order book records across active routes with line item snapshots and financial totals."}
            </p>
          </div>
        </div>

        {/* Booker scope notice */}
        {user.role === "order_booker" ? (
          <div className="flex items-center justify-between rounded-lg border border-[#25897c]/20 bg-[#25897c]/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-[#25897c]" />
              <span className="text-xs font-semibold text-[#1e3441]">
                Booker Account: <strong className="text-[#25897c]">{user.name}</strong>
              </span>
            </div>
            <span className="rounded-full bg-[#25897c]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#25897c] uppercase tracking-wider">
              Your Orders Only
            </span>
          </div>
        ) : (
          <SelectField
            label="Order Booker Filter"
            value={bookerId}
            onChange={(e) => setBookerId(e.target.value)}
          >
            <option value="">All order bookers (full agency)</option>
            {bookers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.email})
              </option>
            ))}
          </SelectField>
        )}

        {/* Date Filter Section */}
        <div className="rounded-xl border border-[#ded6c3] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#627784]">
              <Calendar size={14} className="text-[#25897c]" /> Date Range
            </span>
            <span className="text-[11px] text-[#627784]">
              {from && to ? (from === to ? from : `${from} → ${to}`) : "All dates"}
            </span>
          </div>

          {/* Quick presets */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  datePreset === p.id
                    ? "bg-[#25897c] text-white shadow-xs"
                    : "bg-[#f3efe7] text-[#1e3441] hover:bg-[#ded6c3]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual date inputs */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="From date"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setDatePreset("custom");
              }}
            />
            <Field
              label="To date"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setDatePreset("custom");
              }}
            />
          </div>
        </div>

        {/* Additional Filters: Shop & Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Shop Filter"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="">All retail shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shopName} · {s.shopCode} ({s.area || s.city})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Order Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses (submitted, pending, cancelled)</option>
            <option value="submitted">Submitted only</option>
            <option value="pending">Pending only</option>
            <option value="cancelled">Cancelled only</option>
          </SelectField>
        </div>

        {/* Workbook Layout */}
        <SelectField
          label="Excel Workbook Layout"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="summary">Orders Summary (1 row per order — Products grouped)</option>
          <option value="both">Complete Workbook (Orders summary + Line Items Detail sheets)</option>
          <option value="items">Line Items Breakdown (Product rows only)</option>
        </SelectField>

        {/* Messages */}
        {error && (
          <div className="rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">
            {error}
          </div>
        )}

        {downloadedFile && (
          <div className="flex items-center gap-2 rounded-lg bg-[#25897c]/15 p-3 text-sm font-semibold text-[#25897c]">
            <CheckCircle2 size={18} />
            <span>
              Export downloaded: <strong>{downloadedFile}</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#ded6c3]/60 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="min-w-[160px]"
          >
            {loading ? (
              "Generating .xlsx..."
            ) : (
              <>
                <ArrowDownToLine size={16} /> Download Excel
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
