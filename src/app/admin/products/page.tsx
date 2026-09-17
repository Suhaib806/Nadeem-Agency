"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Settings, Trash2 } from "lucide-react";
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
import { Product } from "@/types";

function ProductForm({
  product,
  onClose,
}: {
  product?: Product | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    productCode: product?.productCode || "",
    productName: product?.productName || "",
    category: product?.category || "General",
    unit: product?.unit || "case",
    price: product?.price || 0,
    taxOrDiscount: product?.taxOrDiscount || 0,
    status: product?.status || "active",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      product?.id
        ? apiFetch(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/api/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save product");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate({
      ...form,
      price: Number(form.price),
      taxOrDiscount: Number(form.taxOrDiscount),
    });
  };

  return (
    <Modal title={product ? "Edit product" : "Add a product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="col-span-2 rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">
            {error}
          </div>
        )}

        <Field
          label="Product code"
          required
          value={form.productCode}
          onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
          placeholder="e.g. PR-001"
        />
        <Field
          label="Product name"
          required
          value={form.productName}
          onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          placeholder="e.g. Surf Excel 1kg"
        />
        <Field
          label="Category"
          required
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Home Care, Beverages"
        />
        <Field
          label="Unit"
          required
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder="e.g. case, box, dozen, pcs"
        />
        <Field
          label="Price (Rs)"
          type="number"
          required
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
        />
        <Field
          label="Tax or discount (Rs)"
          type="number"
          value={form.taxOrDiscount}
          onChange={(e) => setForm((f) => ({ ...f, taxOrDiscount: Number(e.target.value) }))}
        />

        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          className="sm:col-span-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>

        <div className="flex justify-end gap-2 sm:col-span-2 mt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : product ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null | "new">(null);

  const productsQuery = useQuery<{ items: Product[]; total: number }>({
    queryKey: ["products", search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", "1");
      params.set("pageSize", "100");
      return apiFetch(`/api/products?${params.toString()}`);
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const products = productsQuery.data?.items || [];

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Catalog"
        title="Products"
        description="Configure unit packaging, categories, and wholesale pricing for field ordering."
        action={
          <Button onClick={() => setModalProduct("new")}>
            <Plus size={17} /> Add product
          </Button>
        }
      />

      <div className="mb-5 flex rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search products by code, name, or category" />
      </div>

      {productsQuery.isLoading ? (
        <LoadingBlock />
      ) : productsQuery.isError ? (
        <ErrorBlock onRetry={() => productsQuery.refetch()} />
      ) : products.length === 0 ? (
        <EmptyBlock
          title="Catalog is empty"
          detail="Add your first wholesale product to start taking field orders."
          action={
            <Button className="mt-4" onClick={() => setModalProduct("new")}>
              <Plus size={15} /> Add product
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-[0_8px_25px_rgba(30,52,65,0.03)]"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-[#e5decb] text-[#25897c]">
                  <Package size={19} />
                </span>
                <StatusPill status={p.status} />
              </div>

              <p className="text-xs font-bold uppercase tracking-[.1em] text-[#627784]">{p.productCode}</p>
              <h3 className="mt-1 font-bold text-[#1e3441]">{p.productName}</h3>

              <div className="mt-5 flex items-end justify-between border-t border-[#ded6c3]/60 pt-3">
                <div>
                  <p className="text-xs text-[#627784]">
                    {p.category} · per {p.unit}
                  </p>
                  <p className="display mt-1 text-xl font-bold text-[#1e3441]">{money(p.price)}</p>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    className="size-9 p-0"
                    onClick={() => setModalProduct(p)}
                    aria-label="Edit product"
                  >
                    <Settings size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="size-9 p-0 text-[#c62828] hover:bg-[#c62828]/10"
                    onClick={() => {
                      if (confirm(`Archive ${p.productName}?`)) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                    aria-label="Archive product"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalProduct !== null && (
        <ProductForm
          product={modalProduct === "new" ? null : modalProduct}
          onClose={() => setModalProduct(null)}
        />
      )}
    </Shell>
  );
}
