"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Users, Trash2 } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { Modal } from "@/components/ui/Modal";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { User } from "@/types";

function BookerForm({
  user,
  onClose,
  onDelete,
}: {
  user?: User | null;
  onClose: () => void;
  onDelete?: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "order_booker",
    active: user?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      user?.id
        ? apiFetch(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/api/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save user details");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate({
      ...form,
      password: form.password ? form.password : undefined,
    });
  };

  return (
    <Modal title={user ? "Manage order booker" : "Add order booker"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">{error}</div>
        )}

        <Field
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Adeel Khan"
        />

        <Field
          label="Work email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="adeel@nadeem.agency"
        />

        <Field
          label={user ? "New password (leave blank to keep)" : "Password"}
          type="password"
          required={!user}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={user ? "Optional" : "At least 6 characters"}
        />

        <SelectField
          label="Access status"
          value={form.active ? "active" : "inactive"}
          onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "active" }))}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
          {user?.id && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-[#c62828] hover:bg-[#c62828]/10 text-xs px-2.5"
              onClick={() => {
                if (confirm(`Permanently delete order booker "${user.name}"? This will unassign their shops and remove their records directly.`)) {
                  onDelete(user.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={15} /> Delete booker
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : user ? "Save changes" : "Create account"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function OrderBookersPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();
  const [modalUser, setModalUser] = useState<User | null | "new">(null);

  const usersQuery = useQuery<User[]>({
    queryKey: ["users-all"],
    queryFn: () => apiFetch("/api/users"),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      queryClient.invalidateQueries({ queryKey: ["users-bookers"] });
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const bookers = (usersQuery.data || []).filter((u) => u.role === "order_booker");

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="People & routes"
        title="Order bookers"
        description="Monitor field route activity, track individual sales output, and manage credentials."
        action={
          <Button onClick={() => setModalUser("new")}>
            <Plus size={17} /> Add booker
          </Button>
        }
      />

      {usersQuery.isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bookers.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-[0_8px_25px_rgba(30,52,65,0.03)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-[#25897c] text-sm font-bold text-white">
                  {b.name.slice(0, 2).toUpperCase()}
                </span>
                <StatusPill status={b.active ? "active" : "inactive"} />
              </div>

              <h3 className="mt-4 font-bold text-[#1e3441]">{b.name}</h3>
              <p className="mt-1 text-xs text-[#627784]">{b.email}</p>

              <div className="mt-5 grid grid-cols-2 border-t border-[#ded6c3]/60 pt-4">
                <div>
                  <p className="text-xs text-[#627784]">Orders today</p>
                  <p className="display mt-1 text-xl font-bold text-[#1e3441]">{b.ordersToday ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-[#627784]">Sales today</p>
                  <p className="display mt-1 text-xl font-bold text-[#25897c]">{money(b.salesToday)}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModalUser(b)}
                >
                  <Settings size={15} /> Manage account
                </Button>
                <Button
                  variant="ghost"
                  className="size-10 shrink-0 p-0 text-[#c62828] border border-[#ded6c3] bg-[#fbf9f4] hover:bg-[#c62828]/10 hover:border-[#c62828]/30 transition"
                  title="Delete order booker directly"
                  onClick={() => {
                    if (confirm(`Permanently delete order booker "${b.name}"? This will unassign their shops and remove their records directly.`)) {
                      deleteMutation.mutate(b.id);
                    }
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalUser !== null && (
        <BookerForm
          user={modalUser === "new" ? null : modalUser}
          onClose={() => setModalUser(null)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </Shell>
  );
}
