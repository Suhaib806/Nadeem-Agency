"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  Store,
  User as UserIcon,
} from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { daysAgo, startOfMonth, today, yesterday } from "@/lib/utils";
import { Shop } from "@/types";

export default function BookerExportPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");

  const [datePreset, setDatePreset] = useState<string>("today");
  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(today());
  const [shopId, setShopId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [format, setFormat] = useState<string>("summary");

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  const shopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["booker-export-shops"],
    queryFn: () => apiFetch("/api/shops?status=active&pageSize=200"),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock label="Opening export desk..." />
      </div>
    );
  }

  const shops = shopsQuery.data?.items || [];

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
    setExporting(true);
    setError(null);
    setDownloadedFile(null);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shopId) params.set("shopId", shopId);
      if (status) params.set("status", status);
      if (format) params.set("format", format);

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      let filename = `${user.name.toLowerCase().replace(/\s+/g, "_")}_orders_${today()}.xlsx`;
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
      setError(err.message || "Could not generate order workbook");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Reports & Records"
        title="Export my orders"
        description="Download your booked field orders into formatted Microsoft Excel (.xlsx) workbooks. Filter by any date range or retail account."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        {/* Left Column: Filter Controls */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 sm:p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#1e3441]">Export filters</h2>
              <p className="mt-1 text-xs text-[#627784]">
                Customize your export scope by date, shop, or booking status.
              </p>
            </div>
            <Filter size={18} className="text-[#25897c]" />
          </div>

          <div className="space-y-5">
            {/* Account scope badge */}
            <div className="flex items-center justify-between rounded-lg border border-[#25897c]/20 bg-[#25897c]/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <UserIcon size={16} className="text-[#25897c]" />
                <div>
                  <span className="text-xs text-[#627784]">Order Booker: </span>
                  <strong className="text-sm text-[#1e3441]">{user.name}</strong>
                </div>
              </div>
              <span className="rounded-full bg-[#25897c]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#25897c]">
                Personal Desk
              </span>
            </div>

            {/* Date Presets */}
            <div className="rounded-xl border border-[#ded6c3] bg-white p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#627784]">
                  <Calendar size={13} className="text-[#25897c]" /> Date Range
                </span>
                <span className="text-[11px] text-[#627784]">
                  {from && to ? (from === to ? from : `${from} → ${to}`) : "All dates"}
                </span>
              </div>

              <div className="mb-3.5 flex flex-wrap gap-1.5">
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      datePreset === p.id
                        ? "bg-[#25897c] text-white shadow-xs"
                        : "bg-[#f3efe7] text-[#1e3441] hover:bg-[#ded6c3]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

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

            {/* Shop filter */}
            <SelectField
              label="Retail Shop Filter"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              <option value="">All retail shops visited</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shopName} · {s.shopCode} ({s.area || s.city})
                </option>
              ))}
            </SelectField>

            {/* Status filter */}
            <SelectField
              label="Booking Status Filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses (submitted, pending, cancelled)</option>
              <option value="submitted">Submitted only</option>
              <option value="pending">Pending only</option>
              <option value="cancelled">Cancelled only</option>
            </SelectField>

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

            {error && (
              <div className="rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">
                {error}
              </div>
            )}

            {downloadedFile && (
              <div className="flex items-center gap-2 rounded-lg bg-[#25897c]/15 p-3.5 text-sm font-semibold text-[#25897c]">
                <CheckCircle2 size={18} />
                <span>
                  Downloaded successfully: <strong>{downloadedFile}</strong>
                </span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleDownload}
              disabled={exporting}
              className="mt-2 w-full min-h-11 text-base"
            >
              {exporting ? (
                "Generating Excel workbook..."
              ) : (
                <>
                  <Download size={18} /> Download Excel workbook (.xlsx)
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Right Column: Workbook Preview & Explanation */}
        <aside className="h-fit rounded-xl border border-[#ded6c3] bg-[#1c2e38] p-6 text-white shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e65100]">
              Workbook Structure
            </span>
            <FileSpreadsheet size={20} className="text-[#e65100]" />
          </div>

          <h3 className="display text-xl font-bold">What is in your export?</h3>
          <p className="mt-2 text-xs leading-5 text-white/70">
            The exported file is compatible with Microsoft Excel, Google Sheets, and LibreOffice. It includes detailed breakdowns formatted for distribution accounting:
          </p>

          <div className="mt-5 space-y-3">
            {[
              {
                title: "Order & Shop Information",
                desc: "Order numbers, dates, times, shop codes, shop names, and delivery cities.",
              },
              {
                title: "Itemized Product Details",
                desc: "Product codes, item descriptions, package units (cases, boxes), and booked quantities.",
              },
              {
                title: "Commercial & Line Values",
                desc: "Unit prices in PKR, line totals, subtotal, discount deductions, and net grand totals.",
              },
              {
                title: "Summary Row & Grand Totals",
                desc: "Automatic double-underlined summary row calculating total item count, cumulative value, and order totals.",
              },
            ].map((f, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-bold text-white">{f.title}</p>
                <p className="mt-0.5 text-[11px] text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Shell>
  );
}
