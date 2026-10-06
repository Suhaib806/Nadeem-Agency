"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Calendar, CheckCircle2, Download, FileSpreadsheet, Filter, Upload } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { daysAgo, startOfMonth, today, yesterday } from "@/lib/utils";
import { Shop, User } from "@/types";

export default function ExcelDeskPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");

  const [entity, setEntity] = useState<"shops" | "products">("shops");
  const [rows, setRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ created: number; skipped: number } | null>(null);

  // Enhanced export states
  const [datePreset, setDatePreset] = useState<string>("today");
  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(today());
  const [shopId, setShopId] = useState<string>("");
  const [bookerId, setBookerId] = useState<string>("");
  const [status, setStatus] = useState<string>("" );
  const [format, setFormat] = useState<string>("pdf");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);

  const shopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["admin-export-shops"],
    queryFn: () => apiFetch("/api/shops?status=active&pageSize=200"),
    enabled: !!user,
  });

  const bookersQuery = useQuery<User[]>({
    queryKey: ["admin-export-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-8 text-center">
          <p className="text-sm text-[#627784]">Loading Excel desk...</p>
        </div>
      </div>
    );
  }

  const shops = shopsQuery.data?.items || [];
  const bookers = (bookersQuery.data || []).filter((u) => u.role === "order_booker");

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    setExportSuccess(false);
    setDownloadedFilename(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCommitResult(null);
    setPreview(null);
    setPreviewing(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result);
        const [head, ...body] = text.split(/\r?\n/).filter(Boolean);
        if (!head) throw new Error("Empty CSV file");

        const keys = head.split(",").map((k) => k.trim().replace(/^["']|["']$/g, ""));
        const parsed = body.map((line) => {
          const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
          return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? ""]));
        });

        setRows(parsed);

        const result = await apiFetch("/api/reports/import/preview", {
          method: "POST",
          body: JSON.stringify({ entity, rows: parsed }),
        });

        setPreview(result);
      } catch (err: any) {
        setPreview({ valid: false, rows: 0, errors: [{ row: 1, message: err.message || "Failed to read file" }] });
      } finally {
        setPreviewing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCommit = async () => {
    if (!rows.length) return;
    setCommitting(true);
    try {
      const res = await apiFetch("/api/reports/import/commit", {
        method: "POST",
        body: JSON.stringify({ entity, rows }),
      });
      setCommitResult(res);
      setPreview(null);
      setRows([]);
    } catch (err: any) {
      alert(err.message || "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    setDownloadedFilename(null);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shopId) params.set("shopId", shopId);
      if (bookerId) params.set("orderBookerId", bookerId);
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

      setExportSuccess(true);
      setDownloadedFilename(filename);
    } catch (err: any) {
      alert(err.message || "Could not download export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Data desk"
        title="Excel workflows"
        description="Bulk import master data from CSV/Excel and generate formatted order book workbooks for distribution and accounting."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bulk Import */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-6 shadow-xs">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-[#1e3441]">Import master data</h2>
              <p className="mt-1 text-xs text-[#627784]">CSV format with column headers matching data fields.</p>
            </div>
            <Upload size={20} className="text-[#25897c]" />
          </div>

          <div className="mb-4 flex gap-2">
            {(["shops", "products"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setEntity(v);
                  setPreview(null);
                  setCommitResult(null);
                }}
                className={`rounded-lg px-3.5 py-2 text-sm font-bold capitalize transition ${
                  entity === v
                    ? "bg-[#25897c] text-white shadow-xs"
                    : "bg-[#ded6c3]/50 text-[#627784] hover:bg-[#ded6c3]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#25897c]/40 bg-[#25897c]/5 p-5 text-center transition hover:bg-[#25897c]/10">
            <FileSpreadsheet className="mb-2 text-[#25897c]" size={28} />
            <span className="text-sm font-bold text-[#1e3441]">Choose CSV file</span>
            <span className="mt-1 text-xs text-[#627784]">Review & validation happens before anything is saved</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {previewing && (
            <div className="mt-4 rounded-lg bg-[#ded6c3]/30 p-4 text-center text-sm text-[#627784]">
              Analyzing file rows...
            </div>
          )}

          {preview && (
            <div
              className={`mt-4 rounded-lg p-4 ${
                preview.valid ? "bg-[#25897c]/10 border border-[#25897c]/20" : "bg-[#c62828]/10 border border-[#c62828]/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <strong className={preview.valid ? "text-[#25897c]" : "text-[#c62828]"}>
                  {preview.rows} rows analyzed
                </strong>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${preview.valid ? "bg-[#25897c] text-white" : "bg-[#c62828] text-white"}`}>
                  {preview.valid ? "Ready to import" : `${preview.errors?.length ?? 0} errors detected`}
                </span>
              </div>

              {preview.errors && preview.errors.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto space-y-1 text-xs text-[#c62828]">
                  {preview.errors.map((e: any, idx: number) => (
                    <p key={idx}>
                      {e.row ? `Row ${e.row}: ` : ""}{e.message}
                    </p>
                  ))}
                </div>
              )}

              {preview.valid && (
                <Button onClick={handleCommit} disabled={committing} className="mt-4 w-full">
                  {committing ? "Importing records..." : `Commit import of ${preview.rows} records`}
                </Button>
              )}
            </div>
          )}

          {commitResult && (
            <div className="mt-4 rounded-lg bg-[#25897c]/15 p-4 text-sm font-semibold text-[#25897c]">
              Import completed: {commitResult.created} created, {commitResult.skipped} skipped.
            </div>
          )}
        </section>

        {/* Excel Export */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#1c2e38] p-6 text-white shadow-xs">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-bold">Export orders</h2>
              <p className="mt-1 text-xs text-white/50">
                Download formatted Excel workbook with custom date, shop, booker, and status filters.
              </p>
            </div>
            <ArrowDownToLine size={20} className="text-[#e65100]" />
          </div>

          <div className="space-y-4">
            {/* Date Preset Buttons */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-white/60">
                  <Calendar size={13} className="text-[#e65100]" /> Date Range
                </span>
                <span className="text-[11px] text-white/50">
                  {from && to ? (from === to ? from : `${from} → ${to}`) : "All dates"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                        ? "bg-[#e65100] text-white shadow-xs"
                        : "bg-white/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* From & To Inputs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">From date</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="h-10 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#e65100]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">To date</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="h-10 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#e65100]"
                />
              </label>
            </div>

            {/* Shop filter */}
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Retail Shop</span>
              <select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/20 bg-[#1c2e38] px-3 text-sm text-white outline-none focus:border-[#e65100]"
              >
                <option value="">All retail shops</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shopName} · {s.shopCode} ({s.area || s.city})
                  </option>
                ))}
              </select>
            </label>

            {/* Booker and Status filters */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Order Booker</span>
                <select
                  value={bookerId}
                  onChange={(e) => setBookerId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/20 bg-[#1c2e38] px-3 text-sm text-white outline-none focus:border-[#e65100]"
                >
                  <option value="">All bookers</option>
                  {bookers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/20 bg-[#1c2e38] px-3 text-sm text-white outline-none focus:border-[#e65100]"
                >
                  <option value="">All statuses</option>
                  <option value="submitted">Submitted only</option>
                  <option value="pending">Pending only</option>
                  <option value="cancelled">Cancelled only</option>
                </select>
              </label>
            </div>

            {/* Format selection */}
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Export File Format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/20 bg-[#1c2e38] px-3 text-sm text-white outline-none focus:border-[#e65100]"
              >
                <option value="pdf">Official PDF Invoices & Receipts (Recommended)</option>
                <option value="excel">Excel Workbook (.xlsx)</option>
              </select>
            </label>
          </div>

          <Button
            variant="accent"
            className="mt-6 w-full min-h-11"
            onClick={handleDownloadExport}
            disabled={exporting}
          >
            {exporting
              ? "Generating export..."
              : format === "pdf"
              ? "Download PDF Receipts"
              : "Download Excel workbook (.xlsx)"}
            <Download size={16} />
          </Button>

          {exportSuccess && downloadedFilename && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-white/10 p-2 text-center text-xs font-bold text-[#e65100]">
              <CheckCircle2 size={16} />
              <span>Downloaded: {downloadedFilename}</span>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
