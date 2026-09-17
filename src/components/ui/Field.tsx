"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, className = "", ...props }: FieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#627784]">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c] focus:ring-2 focus:ring-[#25897c]/15"
      />
    </label>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

export function SelectField({ label, children, className = "", ...props }: SelectFieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#627784]">{label}</span>
      <select
        {...props}
        className="h-11 w-full rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c]"
      >
        {children}
      </select>
    </label>
  );
}
