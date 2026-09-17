"use client";

import React, { useState } from "react";
import { ArrowDownToLine, Download, FileSpreadsheet, Filter, Upload } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Metric";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { today } from "@/lib/utils";

export default function ExcelDeskPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");

  const [entity, setEntity] = useState<"shops" | "products">("shops");
  const [rows, setRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ created: number; skipped: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-8 text-center">
          <p className="text-sm text-[#627784]">Loading Excel desk...</p>
        </div>
      </div>
    );
  }

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

    try {
      const res = await fetch("/api/reports/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nadeem-orders-${today()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
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
                Download formatted ExcelJS workbook with full order & line item details.
              </p>
            </div>
            <ArrowDownToLine size={20} className="text-[#e65100]" />
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-[#e65100]" />
              <p className="text-sm font-semibold text-white">Full agency dataset</p>
            </div>
            <p className="text-xs leading-5 text-white/60">
              Generates a multi-column .xlsx sheet formatted with bold emerald headers and formatted numeric currencies for commercial distribution.
            </p>
          </div>

          <Button
            variant="accent"
            className="mt-6 w-full"
            onClick={handleDownloadExport}
            disabled={exporting}
          >
            {exporting ? "Generating workbook..." : "Download Excel workbook (.xlsx)"}
            <Download size={16} />
          </Button>

          {exportSuccess && (
            <p className="mt-3 text-center text-xs font-bold text-[#e65100]">
              ✓ File downloaded successfully to your device!
            </p>
          )}
        </section>
      </div>
    </Shell>
  );
}
