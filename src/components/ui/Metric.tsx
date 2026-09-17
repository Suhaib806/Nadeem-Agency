import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string | number;
  note?: string;
  tone?: "primary" | "accent";
  icon: LucideIcon;
}

export function Metric({ label, value, note, tone = "primary", icon: Icon }: MetricProps) {
  return (
    <div className="fade-up rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-[0_8px_25px_rgba(30,52,65,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#627784]">{label}</p>
          <p className="display mt-2 text-3xl font-bold text-[#1e3441]">{value}</p>
        </div>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-lg",
            tone === "accent" ? "bg-[#e65100]/10 text-[#e65100]" : "bg-[#25897c]/10 text-[#25897c]",
          )}
        >
          <Icon size={19} />
        </span>
      </div>
      {note && <p className="mt-4 text-xs text-[#627784]">{note}</p>}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#25897c]">{eyebrow}</p>}
        <h1 className="display text-3xl font-bold text-[#1e3441] md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-[#627784]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
