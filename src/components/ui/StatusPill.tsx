import React from "react";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-[#25897c]/15 text-[#25897c]",
    submitted: "bg-[#25897c]/15 text-[#25897c]",
    pending: "bg-[#e65100]/15 text-[#a44619]",
    cancelled: "bg-[#c62828]/15 text-[#c62828]",
    inactive: "bg-[#ded6c3] text-[#627784]",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide",
        map[status] ?? map.inactive,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
