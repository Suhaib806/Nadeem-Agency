import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: unknown = 0): string {
  const num = Number(value ?? 0);
  return `Rs ${num.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export function moneyRaw(value: unknown = 0): number {
  return Number(Number(value ?? 0).toFixed(2));
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseId(value: string | undefined | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function countWhere(where: string): string {
  return where.replace(/\$(\d+)/g, (_, value: string) => `$${Number(value) - 2}`);
}
