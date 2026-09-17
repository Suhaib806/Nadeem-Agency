import React from "react";
import { Boxes, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "./Button";

export function LoadingBlock({ label = "Loading live data" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-8 text-center">
      <div className="mx-auto mb-3 h-2 w-32 animate-pulse rounded-full bg-[#ded6c3]" />
      <p className="text-sm text-[#627784]">{label}</p>
    </div>
  );
}

export function ErrorBlock({
  message = "We could not load this view.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#c62828]/20 bg-[#c62828]/5 p-8 text-center">
      <ShieldAlert className="mx-auto mb-3 text-[#c62828]" size={25} />
      <p className="font-bold text-[#1e3441]">{message}</p>
      <p className="mt-1 text-sm text-[#627784]">Check your connection, then try again.</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw size={15} />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyBlock({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#ded6c3] bg-[#fbf9f4] px-6 py-14 text-center">
      <Boxes className="mx-auto mb-3 text-[#25897c]/60" size={30} />
      <p className="font-bold text-[#1e3441]">{title}</p>
      <p className="mt-1 text-sm text-[#627784]">{detail}</p>
      {action}
    </div>
  );
}
