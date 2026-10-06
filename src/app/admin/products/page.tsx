"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  HelpCircle, 
  Layers, 
  Package, 
  Plus, 
  Settings, 
  Trash2, 
  X, 
  Eye, 
  LayoutGrid, 
  List, 
  ZoomIn,
  Store
} from "lucide-react";
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
import { Company, Product } from "@/types";
import { getCompanyBrand, CORE_COMPANIES, PRESET_COMPANIES } from "@/lib/companies";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { CompanyModal } from "@/components/companies/CompanyModal";

function ProductForm({
  product,
  onClose,
  onDelete,
}: {
  product?: Product | null;
  onClose: () => void;
  onDelete?: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);

  const companiesQuery = useQuery<{ items: Company[] }>({
    queryKey: ["companies"],
    queryFn: () => apiFetch("/api/companies"),
  });

  const [form, setForm] = useState({
    productCode: product?.productCode || "",
    productName: product?.productName || "",
    company: product?.company || "Other",
    category: product?.category || "General",
    unit: product?.unit || "case",
    price: product?.price || 0,
    taxOrDiscount: product?.taxOrDiscount || 0,
    status: product?.status || "active",
    imageUrl: product?.imageUrl || "",
  });
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dbCompanies = (companiesQuery.data?.items || []).map((c) => c.name.trim());
  const allCompanyOptions = Array.from(new Set([...dbCompanies, ...PRESET_COMPANIES]));
  if (form.company && !allCompanyOptions.includes(form.company)) {
    allCompanyOptions.push(form.company);
  }

  const mutation = useMutation({
    mutationFn: (data: any) =>
      product?.id
        ? apiFetch(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/api/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-company-counts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save product");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err: any) {
      setError(err.message || "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim()) {
      setError("Please specify a company name or choose 'Other'");
      return;
    }
    setError(null);
    mutation.mutate({
      ...form,
      company: form.company.trim() || "Other",
      price: Number(form.price),
      taxOrDiscount: Number(form.taxOrDiscount),
      imageUrl: form.imageUrl.trim() || null,
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

        {/* Product Image Upload & Preview Section */}
        <div className="col-span-2 rounded-2xl border border-[#ded6c3] bg-[#faf8f4] p-3.5 sm:p-4">
          <label className="block text-xs font-bold text-[#1e3441] mb-2">
            Product Packaging Photo
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Live Preview Box */}
            <div className="relative size-24 shrink-0 rounded-2xl border border-[#ded6c3] bg-white overflow-hidden shadow-xs flex items-center justify-center p-1.5">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Product preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
              ) : (
                <div className="text-center text-[#7c7260]">
                  <Package size={24} className="mx-auto opacity-40 mb-1" />
                  <span className="text-[10px] font-medium">No Image</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#25897c] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1e7368]">
                  <span>{isUploading ? "Uploading..." : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="text-xs text-[#c62828] hover:underline font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="Or paste image URL (e.g. /products/surf-excel.jpg or https://...)"
                className="h-9 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-xs text-[#1e3441] outline-none transition focus:border-[#25897c]"
              />
            </div>
          </div>
        </div>

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

        {/* Company Selection Field */}
        <div className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#1e3441]">
              Company <span className="text-[#c62828]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewCompanyModal(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#25897c] hover:underline"
            >
              <Plus size={12} />
              <span>Register New Company</span>
            </button>
          </div>
          <select
            value={isCustomCompany ? "__custom__" : form.company}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setIsCustomCompany(true);
                setForm((f) => ({ ...f, company: "" }));
              } else if (e.target.value === "__add_new__") {
                setShowNewCompanyModal(true);
              } else {
                setIsCustomCompany(false);
                setForm((f) => ({ ...f, company: e.target.value }));
              }
            }}
            className="h-11 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-sm font-medium text-[#1e3441] outline-none transition focus:border-[#25897c]"
          >
            {allCompanyOptions.map((c) => (
              <option key={c} value={c}>
                {c} {c === "Other" ? "(No company / Unassigned)" : ""}
              </option>
            ))}
            <option value="__add_new__">+ Register New Company (with Logo)...</option>
            <option value="__custom__">+ Add Custom Company Name...</option>
          </select>
          {isCustomCompany && (
            <input
              type="text"
              required
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Type company name..."
              className="mt-2 h-10 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c]"
            />
          )}

          <CompanyModal
            isOpen={showNewCompanyModal}
            onClose={() => setShowNewCompanyModal(false)}
            onSuccess={(newComp) => {
              setForm((f) => ({ ...f, company: newComp.name }));
              setIsCustomCompany(false);
              queryClient.invalidateQueries({ queryKey: ["companies"] });
            }}
          />
        </div>

        <Field
          label="Category"
          required
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Home Care, Beverages, Snacks"
        />
        <Field
          label="Unit packaging"
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

        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 mt-3">
          {product?.id && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-[#c62828] hover:bg-[#c62828]/10 text-xs px-2.5"
              onClick={() => {
                if (confirm(`Permanently delete "${product.productName}" (${product.productCode})? This cannot be undone.`)) {
                  onDelete(product.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={15} /> Delete product
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : product ? "Save changes" : "Add product"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();

  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [search, setSearch] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null | "new">(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Read URL company parameter if navigating from /admin/companies
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const comp = urlParams.get("company");
      if (comp) {
        setSelectedCompany(comp);
      }
    }
  }, []);

  const companiesQuery = useQuery<{ items: Company[] }>({
    queryKey: ["companies"],
    queryFn: () => apiFetch("/api/companies"),
    enabled: !!user,
  });

  const productsQuery = useQuery<{ items: Product[]; total: number }>({
    queryKey: ["products", search, selectedCompany],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCompany !== "all") params.set("company", selectedCompany);
      params.set("page", "1");
      params.set("pageSize", "200");
      return apiFetch(`/api/products?${params.toString()}`);
    },
    enabled: !!user,
  });

  const allProductsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["all-products-for-company-counts"],
    queryFn: () => apiFetch("/api/products?pageSize=500"),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-company-counts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const allProducts = allProductsQuery.data?.items || [];
  const products = productsQuery.data?.items || [];
  const dbCompanies = companiesQuery.data?.items || [];

  // Compute product counts per company
  const companyCounts = allProducts.reduce((acc, p) => {
    const c = (p.company || "Other").trim();
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Map of company name -> logo from database
  const companyLogoMap = dbCompanies.reduce((acc, c) => {
    if (c.logo) acc[c.name.trim()] = c.logo;
    return acc;
  }, {} as Record<string, string>);

  const extraCompanies = Array.from(
    new Set([
      ...CORE_COMPANIES,
      ...dbCompanies.map((c) => c.name.trim()),
      ...allProducts.map((p) => (p.company || "Other").trim()),
    ])
  ).filter((c) => c !== "Other");

  const displayCompanies = [
    ...extraCompanies,
    "Other",
  ];

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Wholesale Catalog"
        title="Products & Brands"
        description="Browse items by distributor company, inspect high-res packaging, and manage pricing."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAddCompanyModal(true)}>
              <Building2 size={16} /> Add Company
            </Button>
            <Button onClick={() => setModalProduct("new")}>
              <Plus size={17} /> Add Product
            </Button>
          </div>
        }
      />

      {/* Companies Showcase Grid with Brand Logos */}
      <div className="mb-6">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#627784] flex items-center gap-1.5">
            <Store size={14} className="text-[#25897c]" />
            Distributor Companies
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddCompanyModal(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#25897c] bg-[#25897c]/10 px-2.5 py-1 text-xs font-bold text-[#25897c] hover:bg-[#25897c] hover:text-white transition shadow-xs"
            >
              <Plus size={13} />
              <span>Add Company</span>
            </button>
            <Link
              href="/admin/companies"
              className="text-xs font-bold text-[#627784] hover:text-[#1e3441] hover:underline"
            >
              Manage Brands &rarr;
            </Link>
            {selectedCompany !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedCompany("all")}
                className="text-xs font-bold text-[#e65100] hover:underline ml-1"
              >
                Reset to all
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {/* All Companies Card */}
          <button
            type="button"
            onClick={() => setSelectedCompany("all")}
            className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 shadow-xs ${
              selectedCompany === "all"
                ? "border-[#25897c] bg-[#25897c] text-white shadow-md ring-2 ring-[#25897c]/30"
                : "border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:border-[#25897c]/60 hover:bg-white hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`grid size-9 place-items-center rounded-xl shadow-inner ${
                  selectedCompany === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[#ded6c3]/50 text-[#25897c]"
                }`}
              >
                <Layers size={18} />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  selectedCompany === "all"
                    ? "bg-white/25 text-white"
                    : "bg-[#ded6c3]/60 text-[#1e3441]"
                }`}
              >
                {allProducts.length}
              </span>
            </div>
            <div className="mt-3">
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedCompany === "all" ? "text-white/80" : "text-[#627784]"
                }`}
              >
                Complete Catalog
              </p>
              <h4 className="truncate text-sm font-extrabold">All Companies</h4>
            </div>
          </button>

          {/* Individual Company Cards with Real Company Logos */}
          {displayCompanies.map((comp) => {
            const isSelected = selectedCompany === comp;
            const count = companyCounts[comp] || 0;
            const brand = getCompanyBrand(comp, companyLogoMap[comp]);

            return (
              <button
                key={comp}
                type="button"
                onClick={() => setSelectedCompany(comp)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 shadow-xs ${
                  isSelected
                    ? "border-[#25897c] bg-[#25897c] text-white shadow-md ring-2 ring-[#25897c]/30"
                    : "border-[#ded6c3] bg-[#fbf9f4] text-[#1e3441] hover:border-[#25897c]/60 hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="size-9 rounded-xl bg-white p-1 shadow-sm border border-[#ded6c3]/60 overflow-hidden flex items-center justify-center">
                    <img
                      src={brand.logo}
                      alt={comp}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-[#ded6c3]/60 text-[#1e3441]"
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <div className="mt-3">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? "text-white/80" : "text-[#627784]"
                    }`}
                  >
                    Partner
                  </p>
                  <h4 className="truncate text-sm font-extrabold">{comp}</h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter, Search Bar, and View Mode Toggle */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={
              selectedCompany === "all"
                ? "Search all products by code, name, category, or company..."
                : `Search products in ${selectedCompany}...`
            }
          />
        </div>

        <div className="flex items-center gap-2.5">
          {selectedCompany !== "all" && (
            <div className="flex items-center gap-2 rounded-xl bg-[#25897c]/10 px-3 py-1.5 text-xs font-semibold text-[#25897c]">
              <Building2 size={14} />
              <span>
                <strong>{selectedCompany}</strong> ({products.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedCompany("all")}
                className="ml-1 text-[#e65100] hover:text-[#bf360c]"
                aria-label="Clear company filter"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* View Mode Toggle: Foodpanda Store Grid vs Compact Table */}
          <div className="flex items-center rounded-xl border border-[#ded6c3] bg-white p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-[#25897c] text-white shadow-xs"
                  : "text-[#627784] hover:text-[#1e3441]"
              }`}
              title="Storefront Grid View (Foodpanda style)"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Store</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "table"
                  ? "bg-[#25897c] text-white shadow-xs"
                  : "text-[#627784] hover:text-[#1e3441]"
              }`}
              title="List Table View"
            >
              <List size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Display */}
      {productsQuery.isLoading ? (
        <LoadingBlock />
      ) : productsQuery.isError ? (
        <ErrorBlock onRetry={() => productsQuery.refetch()} />
      ) : products.length === 0 ? (
        <EmptyBlock
          title={
            selectedCompany !== "all"
              ? `No products found for ${selectedCompany}`
              : "Catalog is empty"
          }
          detail={
            selectedCompany !== "all"
              ? `There are currently no products registered under ${selectedCompany}. Click "Add product" to create one.`
              : "Add your first wholesale product to start taking field orders."
          }
          action={
            <Button className="mt-4" onClick={() => setModalProduct("new")}>
              <Plus size={15} /> Add product
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* Foodpanda Storefront Card Grid */
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const brand = getCompanyBrand(p.company);
            const hasImage = Boolean(p.imageUrl);
            const displayImg = p.imageUrl || "/logo.png";

            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ded6c3] bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#25897c]/50 hover:shadow-lg"
              >
                {/* Foodpanda Style Image Box */}
                <div
                  className="relative aspect-4/3 w-full bg-gradient-to-b from-[#faf8f4] to-[#f0ebde] p-4 flex items-center justify-center cursor-pointer overflow-hidden border-b border-[#ded6c3]/40"
                  onClick={() => setPreviewProduct(p)}
                >
                  <img
                    src={displayImg}
                    alt={p.productName}
                    className="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-108"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.png";
                    }}
                  />

                  {/* Hover Lightbox Icon Overlay */}
                  <div className="absolute inset-0 bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                    <ZoomIn size={16} />
                    <span>Quick View</span>
                  </div>

                  {/* Company Logo Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-md border border-[#ded6c3]/60">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="size-4 rounded object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="text-[11px] font-bold text-[#1e3441] truncate max-w-[90px]">
                      {p.company || "Other"}
                    </span>
                  </div>

                  {/* Packaging Unit Pill */}
                  <div className="absolute bottom-2.5 right-2.5 z-10 rounded-full bg-[#1e3441]/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-md">
                    {p.unit}
                  </div>
                </div>

                {/* Product Content Body */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#627784] mb-1">
                      <span className="uppercase tracking-wider">{p.productCode}</span>
                      <span className="text-[#25897c]">{p.category}</span>
                    </div>

                    <h3
                      className="font-bold text-[#1e3441] text-base leading-snug line-clamp-2 cursor-pointer hover:text-[#25897c]"
                      onClick={() => setPreviewProduct(p)}
                      title={p.productName}
                    >
                      {p.productName}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#ded6c3]/60 flex items-baseline justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#7c7260]">Wholesale</p>
                      <p className="text-xl font-extrabold text-[#25897c] leading-none mt-0.5">
                        {money(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewProduct(p)}
                        className="flex size-8 items-center justify-center rounded-lg bg-[#faf8f4] text-[#1e3441] border border-[#ded6c3] hover:bg-[#25897c] hover:text-white hover:border-[#25897c] transition"
                        title="View details & large image"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProduct(p)}
                        className="flex size-8 items-center justify-center rounded-lg bg-[#faf8f4] text-[#1e3441] border border-[#ded6c3] hover:bg-[#1e3441] hover:text-white hover:border-[#1e3441] transition"
                        title="Edit product"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Permanently delete "${p.productName}" (${p.productCode})? This will delete the product directly.`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="flex size-8 items-center justify-center rounded-lg bg-[#faf8f4] text-[#c62828] border border-[#ded6c3] hover:bg-[#c62828] hover:text-white hover:border-[#c62828] transition"
                        title="Delete product directly"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="overflow-hidden rounded-2xl border border-[#ded6c3] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1e3441]">
              <thead className="border-b border-[#ded6c3] bg-[#faf8f4] text-xs font-bold uppercase tracking-wider text-[#627784]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Wholesale Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ded6c3]/60">
                {products.map((p) => {
                  const brand = getCompanyBrand(p.company);
                  return (
                    <tr key={p.id} className="transition hover:bg-[#faf8f4]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="size-11 shrink-0 rounded-xl border border-[#ded6c3] bg-[#faf8f4] p-1 flex items-center justify-center cursor-pointer hover:border-[#25897c]"
                            onClick={() => setPreviewProduct(p)}
                            title="Click to view packaging"
                          >
                            <img
                              src={p.imageUrl || "/logo.png"}
                              alt={p.productName}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/logo.png";
                              }}
                            />
                          </div>
                          <div>
                            <p 
                              className="font-bold text-[#1e3441] cursor-pointer hover:text-[#25897c]"
                              onClick={() => setPreviewProduct(p)}
                            >
                              {p.productName}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#627784]">
                              {p.productCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#25897c]/10 px-2.5 py-1 text-xs font-bold text-[#25897c]">
                          <img
                            src={brand.logo}
                            alt={p.company}
                            className="size-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          {p.company || "Other"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#627784]">{p.category}</td>
                      <td className="px-4 py-3 text-xs font-semibold capitalize">{p.unit}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#25897c]">{money(p.price)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            className="size-8 p-0"
                            onClick={() => setPreviewProduct(p)}
                            title="Preview"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            className="size-8 p-0"
                            onClick={() => setModalProduct(p)}
                            title="Edit"
                          >
                            <Settings size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            className="size-8 p-0 text-[#c62828] hover:bg-[#c62828]/10"
                            onClick={() => {
                              if (confirm(`Permanently delete "${p.productName}" (${p.productCode})? This will delete the product directly.`)) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                            title="Delete product directly"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Detail Modal (Foodpanda Lightbox Popup) */}
      {previewProduct && (
        <ProductDetailModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          mode="admin"
          onEdit={(p) => {
            setPreviewProduct(null);
            setModalProduct(p);
          }}
          onDelete={(p) => {
            if (confirm(`Permanently delete "${p.productName}" (${p.productCode})? This cannot be undone.`)) {
              deleteMutation.mutate(p.id);
              setPreviewProduct(null);
            }
          }}
        />
      )}

      {/* Add / Edit Product Form Modal */}
      {modalProduct !== null && (
        <ProductForm
          product={modalProduct === "new" ? null : modalProduct}
          onClose={() => setModalProduct(null)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <CompanyModal
          isOpen={showAddCompanyModal}
          onClose={() => setShowAddCompanyModal(false)}
          onSuccess={(newComp) => {
            setSelectedCompany(newComp.name);
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            queryClient.invalidateQueries({ queryKey: ["all-products-for-company-counts"] });
          }}
        />
      )}
    </Shell>
  );
}
