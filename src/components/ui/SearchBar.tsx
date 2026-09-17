"use client";

import React from "react";
import { Search } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by name or code",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-3 top-3 text-[#627784]" size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-[#ded6c3] bg-[#fbf9f4] pl-10 pr-3 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c]"
      />
    </div>
  );
}
