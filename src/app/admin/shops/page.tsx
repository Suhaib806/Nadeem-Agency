"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Trash2 } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { StatusPill } from "@/components/ui/StatusPill";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { Shop, User } from "@/types";

function ShopForm({
  shop,
  onClose,
  bookers,
  onDelete,
}: {
  shop?: Shop | null;
  onClose: () => void;
  bookers: User[];
  onDelete?: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    shopCode: shop?.shopCode || "",
    shopName: shop?.shopName || "",
    ownerName: shop?.ownerName || "",
    phone: shop?.phone || "",
    address: shop?.address || "",
    city: shop?.city || "",
    area: shop?.area || "",
    assignedOrderBookerId: shop?.assignedOrderBookerId ? String(shop.assignedOrderBookerId) : "",
    creditLimit: shop?.creditLimit || 0,
    status: shop?.status || "active",
    notes: shop?.notes || "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      shop?.id
        ? apiFetch(`/api/shops/${shop.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/api/shops", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      queryClient.invalidateQueries({ queryKey: ["all-shops-areas"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save shop details");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.area.trim()) {
      setError("Please specify the area / bazaar name");
      return;
    }
    setError(null);
    mutation.mutate({
      ...form,
      area: form.area.trim() || "General",
      assignedOrderBookerId: form.assignedOrderBookerId ? Number(form.assignedOrderBookerId) : null,
      creditLimit: Number(form.creditLimit),
    });
  };

  return (
    <Modal title={shop ? "Edit shop" : "Add a shop"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="col-span-2 rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">
            {error}
          </div>
        )}

        <Field
          label="Shop code"
          required
          value={form.shopCode}
          onChange={(e) => setForm((f) => ({ ...f, shopCode: e.target.value }))}
          placeholder="e.g. SH-1024"
        />
        <Field
          label="Shop name"
          required
          value={form.shopName}
          onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))}
          placeholder="e.g. Al-Madina Cash & Carry"
        />
        <Field
          label="Area / Market / Bazaar"
          required
          value={form.area}
          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          placeholder="e.g. Main Bazaar, Urdu Bazaar, Canal Road"
        />
        <Field
          label="Owner name"
          required
          value={form.ownerName}
          onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
          placeholder="e.g. Farooq Ahmed"
        />
        <Field
          label="Phone"
          required
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="0321 1234567"
        />
        <Field
          label="City"
          required
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="e.g. Lahore"
        />
        <Field
          label="Credit limit (Rs)"
          type="number"
          value={form.creditLimit}
          onChange={(e) => setForm((f) => ({ ...f, creditLimit: Number(e.target.value) }))}
        />
        <Field
          label="Address"
          required
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Street address or market location"
        />

        <SelectField
          label="Assigned order booker"
          value={form.assignedOrderBookerId}
          onChange={(e) => setForm((f) => ({ ...f, assignedOrderBookerId: e.target.value }))}
        >
          <option value="">Unassigned</option>
          {bookers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 mt-3">
          {shop?.id && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-[#c62828] hover:bg-[#c62828]/10 text-xs px-2.5"
              onClick={() => {
                if (confirm(`Permanently delete "${shop.shopName}" (${shop.shopCode})? This will delete the shop and its related records directly.`)) {
                  onDelete(shop.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={15} /> Delete shop
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : shop ? "Save changes" : "Add shop"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function ShopsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [modalShop, setModalShop] = useState<Shop | null | "new">(null);

  const shopsQuery = useQuery<{ items: Shop[]; total: number }>({
    queryKey: ["shops", search, status, area],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (area) params.set("area", area);
      params.set("page", "1");
      params.set("pageSize", "100");
      return apiFetch(`/api/shops?${params.toString()}`);
    },
    enabled: !!user,
  });

  const allShopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["all-shops-areas"],
    queryFn: () => apiFetch("/api/shops?pageSize=500"),
    enabled: !!user,
  });

  const availableAreas = Array.from(
    new Set((allShopsQuery.data?.items || []).map((s) => s.area?.trim()).filter(Boolean) as string[]),
  ).sort();

  const usersQuery = useQuery<User[]>({
    queryKey: ["users-bookers"],
    queryFn: () => apiFetch("/api/users?status=active"),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/shops/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      queryClient.invalidateQueries({ queryKey: ["all-shops-areas"] });
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const shops = shopsQuery.data?.items || [];
  const bookers = (usersQuery.data || []).filter((u) => u.role === "order_booker");

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Master data"
        title="Shops"
        description="Maintain the retail route book, contact details, assigned bookers, and credit guardrails."
        action={
          <Button onClick={() => setModalShop("new")}>
            <Plus size={17} /> Add shop
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Search shops by code, name, area, or city" />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="h-11 rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none focus:border-[#25897c]"
        >
          <option value="">All areas / bazaars</option>
          {availableAreas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-lg border border-[#ded6c3] bg-[#fbf9f4] px-3 text-sm text-[#1e3441] outline-none focus:border-[#25897c]"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table view */}
      {shopsQuery.isLoading ? (
        <LoadingBlock />
      ) : shopsQuery.isError ? (
        <ErrorBlock onRetry={() => shopsQuery.refetch()} />
      ) : shops.length === 0 ? (
        <EmptyBlock
          title="No shops found"
          detail="Try adjusting your search criteria or add a new shop to the route book."
          action={
            <Button className="mt-4" onClick={() => setModalShop("new")}>
              <Plus size={15} /> Add shop
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#ded6c3] bg-[#fbf9f4] shadow-xs">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_.8fr_.7fr_80px] gap-4 border-b border-[#ded6c3] bg-[#ded6c3]/30 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#627784] md:grid">
            <span>Shop & Area</span>
            <span>Contact</span>
            <span>Route assignment</span>
            <span>Credit limit</span>
            <span>Status</span>
            <span />
          </div>

          {shops.map((s) => (
            <div
              key={s.id}
              className="grid gap-3 border-b border-[#ded6c3]/60 px-4 py-4 last:border-0 md:grid-cols-[1.4fr_1fr_1fr_.8fr_.7fr_80px] md:items-center md:gap-4 md:px-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-bold text-[#1e3441]">{s.shopName}</p>
                  <span className="inline-flex items-center rounded-md bg-[#25897c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#25897c]">
                    {s.area || "General"}
                  </span>
                </div>
                <p className="text-xs text-[#627784]">
                  {s.shopCode} · {s.city}
                </p>
              </div>
              <div className="text-sm text-[#1e3441]">
                <p>{s.ownerName}</p>
                <p className="text-xs text-[#627784]">{s.phone}</p>
              </div>
              <div className="text-sm text-[#627784]">{s.assignedOrderBookerName || "Unassigned"}</div>
              <div className="text-sm font-semibold text-[#1e3441]">{money(s.creditLimit)}</div>
              <div>
                <StatusPill status={s.status} />
              </div>
              <div className="flex gap-1 md:justify-end">
                <Button
                  variant="ghost"
                  className="size-9 p-0"
                  onClick={() => setModalShop(s)}
                  aria-label="Edit shop"
                >
                  <Settings size={15} />
                </Button>
                <Button
                  variant="ghost"
                  className="size-9 p-0 text-[#c62828] hover:bg-[#c62828]/10"
                  onClick={() => {
                    if (confirm(`Permanently delete "${s.shopName}" (${s.shopCode})? This will delete the shop directly.`)) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                  title="Delete shop directly"
                  aria-label="Delete shop"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalShop !== null && (
        <ShopForm
          shop={modalShop === "new" ? null : modalShop}
          bookers={bookers}
          onClose={() => setModalShop(null)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </Shell>
  );
}
