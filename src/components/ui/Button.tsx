"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "accent";
}

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const styles: Record<string, string> = {
    primary: "bg-[#25897c] text-white hover:bg-[#1f7368] shadow-sm",
    secondary: "bg-[#e5decb] text-[#1e3441] hover:bg-[#d8d0ba]",
    ghost: "text-[#627784] hover:bg-[#e8e2d4] hover:text-[#1e3441]",
    danger: "bg-[#c62828] text-white hover:bg-[#b71c1c]",
    outline: "border border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:bg-[#efe9da]",
    accent: "bg-[#e65100] text-white hover:bg-[#d84315] shadow-sm",
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
