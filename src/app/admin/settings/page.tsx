"use client";

import React from "react";
import { ShieldCheck, SlidersHorizontal, User as UserIcon } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { useCurrentUser } from "@/lib/use-user";

export default function SettingsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Workspace"
        title="Settings"
        description="Review your account credentials, role permissions, and operating configuration."
      />

      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        {/* Profile Card */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-6 shadow-xs">
          <span className="grid size-16 place-items-center rounded-full bg-[#25897c] text-xl font-bold text-white">
            {user.name.slice(0, 2).toUpperCase()}
          </span>

          <h2 className="mt-4 text-xl font-bold text-[#1e3441]">{user.name}</h2>
          <p className="mt-1 text-sm text-[#627784]">{user.email}</p>

          <div className="mt-4">
            <StatusPill status={user.active ? "active" : "inactive"} />
          </div>

          <div className="mt-6 border-t border-[#ded6c3]/60 pt-4 text-xs text-[#627784]">
            <p className="font-semibold uppercase tracking-wider text-[#1e3441]">Role</p>
            <p className="mt-1 capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </section>

        {/* Operating Rules */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-6 shadow-xs">
          <h2 className="font-bold text-[#1e3441]">Agency operating parameters</h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-4 rounded-xl bg-[#ded6c3]/25 p-4">
              <SlidersHorizontal className="mt-0.5 text-[#25897c]" size={20} />
              <div>
                <p className="text-sm font-bold text-[#1e3441]">Direct Order Routing</p>
                <p className="mt-1 text-xs text-[#627784]">
                  Orders submitted by field order bookers are finalized in real time and recorded in the central database with line item snapshots.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl bg-[#ded6c3]/25 p-4">
              <ShieldCheck className="mt-0.5 text-[#25897c]" size={20} />
              <div>
                <p className="text-sm font-bold text-[#1e3441]">Role-Based Access Enforcement</p>
                <p className="mt-1 text-xs text-[#627784]">
                  Administrators possess full visibility across all routes, catalogs, and exports. Order bookers operate strictly within mobile field taking flows.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
