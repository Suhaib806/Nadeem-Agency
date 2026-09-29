"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Search, MapPin, Store, RotateCcw, ZoomIn, Eye, Sparkles, Building2, LayoutGrid, List, Plus, Minus, ShoppingBag } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { Product, Shop } from "@/types";
import { getCompanyBrand } from "@/lib/companies";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";

export default function NewOrderPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");

  const [selectedArea, setSelectedArea] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [shopId, setShopId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [items, setItems] = useState<Record<number, number>>({});
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["booker-shops"],
    queryFn: () => apiFetch("/api/shops?status=active&pageSize=500"),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min cache for instant loading
  });

  const productsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["booker-products"],
    queryFn: () => apiFetch("/api/products?status=active&pageSize=200"),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min cache for instant loading
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      router.push("/booker/today");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to submit order");
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
  const allProducts = productsQuery.data?.items || [];

  // Group shops count by Area
  const areaCounts = shops.reduce((acc, s) => {
    const a = (s.area || "General").trim();
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const areas = Object.keys(areaCounts).sort();

  // Shops within currently selected area
  const areaShops = selectedArea
    ? shops.filter((s) => (s.area || "General").trim() === selectedArea)
    : [];

  // Search filter within selected area
  const filteredAreaShops = areaShops.filter((s) => {
    if (!shopSearch.trim()) return true;
    const q = shopSearch.toLowerCase();
    return (
      s.shopName.toLowerCase().includes(q) ||
      s.shopCode.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  // Extract unique companies for product quick-filter
  const productCompanies = [
    "all",
    ...Array.from(new Set(allProducts.map((p) => (p.company || "Other").trim()))).sort(),
  ];

  const filteredProducts = allProducts.filter((p) => {
    const matchesCompany =
      selectedCompany === "all" || (p.company || "Other").trim() === selectedCompany;
    const matchesSearch =
      !search.trim() ||
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productCode.toLowerCase().includes(search.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(search.toLowerCase()));
    return matchesCompany && matchesSearch;
  });

  const selectedProducts = allProducts.filter((p) => (items[p.id] || 0) > 0);
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.price * (items[p.id] || 0), 0);
  const total = Math.max(0, subtotal - Number(discount));
  const selectedShop = shops.find((s) => String(s.id) === shopId);

  const handleSubmit = () => {
    if (!selectedArea) {
      setError("Please select an area / bazaar first.");
      return;
    }
    if (!shopId) {
      setError("Please choose a shop in the selected area to visit.");
      return;
    }
    if (selectedProducts.length === 0) {
      setError("Please add at least one product with quantity > 0.");
      return;
    }

    setError(null);
    createMutation.mutate({
      shopId: Number(shopId),
      items: selectedProducts.map((p) => ({
        productId: p.id,
        quantity: items[p.id],
      })),
      discount: Number(discount),
      tax: 0,
    });
  };

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Field cockpit"
        title="New order"
        description="Pick an area first, select the retail shop, tap quantities, and confirm."
        action={
          <Link href="/booker/today" className="text-sm font-bold text-[#627784] hover:underline">
            Cancel
          </Link>
        }
      />

      {error && (
        <div className="mb-5 rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        {/* Left column: Area, Shop & Products */}
        <section className="space-y-6">
          {/* Step 1 & 2: Area and Shop Picker */}
          <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-4 sm:p-6 shadow-xs">
            {/* Step 1: Area Selection */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-[#1e3441]">
                  <span className="grid size-5 place-items-center rounded-full bg-[#25897c] text-[11px] font-bold text-white">
                    1
                  </span>
                  <span>Select Area / Bazaar</span>
                  <span className="text-[#c62828]">*</span>
                </label>
                {selectedArea && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedArea("");
                      setShopId("");
                      setShopSearch("");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#e65100] hover:underline"
                  >
                    <RotateCcw size={12} /> Change area
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setShopId("");
                    setShopSearch("");
                  }}
                  className="h-11 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-sm font-medium text-[#1e3441] outline-none transition focus:border-[#25897c]"
                >
                  <option value="">-- Choose Area First (e.g. Main Bazaar, Canal Road...) --</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a} ({areaCounts[a] || 0} {areaCounts[a] === 1 ? "shop" : "shops"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Area Chips */}
              {areas.length > 0 && !selectedArea && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[#627784]">Quick pick:</span>
                  {areas.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setSelectedArea(a);
                        setShopId("");
                        setShopSearch("");
                      }}
                      className="rounded-full border border-[#ded6c3] bg-white px-2.5 py-1 text-xs font-medium text-[#1e3441] hover:border-[#25897c] hover:bg-[#25897c]/5"
                    >
                      {a}{" "}
                      <span className="text-[#627784]">({areaCounts[a]})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Shop Selection within the selected area */}
            {selectedArea ? (
              <div className="mt-5 border-t border-[#ded6c3] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1e3441]">
                    <span className="grid size-5 place-items-center rounded-full bg-[#25897c] text-[11px] font-bold text-white">
                      2
                    </span>
                    <span>
                      Select Shop in <span className="text-[#25897c] font-bold">{selectedArea}</span>
                    </span>
                    <span className="text-[#c62828]">*</span>
                  </label>
                  <span className="rounded-full bg-[#25897c]/10 px-2.5 py-0.5 text-xs font-bold text-[#25897c]">
                    {areaShops.length} {areaShops.length === 1 ? "shop" : "shops"}
                  </span>
                </div>

                {/* Live search input for shops in this area */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-3 text-[#627784]" size={16} />
                  <input
                    type="text"
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    placeholder={`Search shops in ${selectedArea} by name, code, owner...`}
                    className="h-10 w-full rounded-lg border border-[#ded6c3] bg-white pl-9 pr-8 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c]"
                  />
                  {shopSearch && (
                    <button
                      type="button"
                      onClick={() => setShopSearch("")}
                      className="absolute right-2.5 top-2.5 text-xs font-semibold text-[#627784] hover:text-[#1e3441]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Shop dropdown selector */}
                <select
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-sm font-medium text-[#1e3441] outline-none transition focus:border-[#25897c]"
                >
                  <option value="">
                    {filteredAreaShops.length === 0
                      ? "No shops match your search in this area"
                      : `-- Select Shop in ${selectedArea} (${filteredAreaShops.length} available) --`}
                  </option>
                  {filteredAreaShops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shopName} · {s.shopCode} ({s.ownerName})
                    </option>
                  ))}
                </select>

                {/* Selected Shop Highlight Card */}
                {selectedShop && (
                  <div className="mt-3 rounded-lg border border-[#25897c] bg-[#25897c]/5 p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#1e3441]">{selectedShop.shopName}</h3>
                          <span className="rounded-md bg-[#25897c] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            {selectedShop.area}
                          </span>
                          <span className="text-xs font-semibold text-[#627784]">
                            {selectedShop.shopCode}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#627784]">
                          Owner: <strong className="text-[#1e3441]">{selectedShop.ownerName}</strong>
                          {selectedShop.phone ? ` · 📞 ${selectedShop.phone}` : ""}
                          {selectedShop.address ? ` · 📍 ${selectedShop.address}` : ""}
                        </p>
                      </div>
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#25897c] text-white">
                        <Check size={16} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-[#ded6c3] bg-white p-3 text-xs text-[#627784]">
                <MapPin size={16} className="shrink-0 text-[#25897c]" />
                <span>
                  Please select an <strong>Area / Bazaar</strong> first above. The shops belonging to that area will then be loaded.
                </span>
              </div>
            )}
          </div>

          {/* Product Selection Section */}
          <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-4 sm:p-6 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#1e3441] text-base sm:text-lg">Add products</h2>
                <p className="text-xs text-[#627784]">Filter by company or search by name</p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-[#e5decb] px-3 py-1 text-xs font-bold text-[#25897c]">
                  {selectedProducts.length} items in order
                </span>

                {/* View Mode Toggle: Storefront Grid vs Compact List */}
                <div className="flex items-center rounded-xl border border-[#ded6c3] bg-white p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      viewMode === "grid"
                        ? "bg-[#25897c] text-white shadow-xs"
                        : "text-[#627784] hover:text-[#1e3441]"
                    }`}
                    title="Storefront Grid View"
                  >
                    <LayoutGrid size={14} />
                    <span className="hidden sm:inline">Store</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      viewMode === "list"
                        ? "bg-[#25897c] text-white shadow-xs"
                        : "text-[#627784] hover:text-[#1e3441]"
                    }`}
                    title="Compact List View"
                  >
                    <List size={14} />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Company Filter Pills with Brand Logos */}
            {productCompanies.length > 2 && (
              <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-[#627784] flex items-center gap-1">
                  <Building2 size={13} />
                  Brand:
                </span>
                {productCompanies.map((c) => {
                  const brand = getCompanyBrand(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCompany(c)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs ${
                        selectedCompany === c
                          ? "bg-[#25897c] text-white shadow-xs"
                          : "border border-[#ded6c3] bg-white text-[#1e3441] hover:border-[#25897c] hover:bg-[#25897c]/5"
                      }`}
                    >
                      {c !== "all" && (
                        <img
                          src={brand.logo}
                          alt={c}
                          className="size-3.5 rounded object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <span>{c === "all" ? "All Brands" : c}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-[#627784]" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product code, name, or company..."
                className="h-10 w-full rounded-xl border border-[#ded6c3] bg-white pl-9 pr-3 text-sm text-[#1e3441] outline-none transition focus:border-[#25897c]"
              />
            </div>

            {productsQuery.isLoading ? (
              <LoadingBlock />
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ded6c3] bg-white p-8 text-center">
                <p className="text-sm font-semibold text-[#627784]">
                  No products found matching &ldquo;{search}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCompany("all");
                  }}
                  className="mt-2 text-xs font-bold text-[#25897c] hover:underline"
                >
                  Clear search and filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Storefront Grid View */
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((p) => {
                  const qty = items[p.id] || 0;
                  const brand = getCompanyBrand(p.company);
                  const displayImg = p.imageUrl || "/logo.png";

                  return (
                    <div
                      key={p.id}
                      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        qty > 0
                          ? "border-[#25897c] bg-[#25897c]/[0.02] ring-2 ring-[#25897c]/25 shadow-xs"
                          : "border-[#ded6c3] hover:border-[#25897c]/60"
                      }`}
                    >
                      {/* Top Packaging Showcase Box */}
                      <div
                        className="relative aspect-4/3 w-full bg-gradient-to-b from-[#faf8f4] to-[#f0ebde] p-3 flex items-center justify-center cursor-pointer overflow-hidden border-b border-[#ded6c3]/50"
                        onClick={() => setPreviewProduct(p)}
                        title="Click to view packaging details"
                      >
                        <img
                          src={displayImg}
                          alt={p.productName}
                          className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.png";
                          }}
                        />

                        {/* Hover Quick View Overlay */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                          <ZoomIn size={15} />
                          <span>Quick View</span>
                        </div>

                        {/* Brand Logo & Name Badge (Top Left) */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-0.5 shadow-2xs backdrop-blur-xs border border-[#ded6c3]/60">
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="size-3.5 rounded object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span className="text-[10px] font-bold text-[#1e3441] truncate max-w-[85px]">
                            {p.company || "Other"}
                          </span>
                        </div>

                        {/* Packaging Unit Pill (Top Right) */}
                        <div className="absolute top-2 right-2 z-10 rounded-full bg-[#1e3441]/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs backdrop-blur-xs">
                          {p.unit}
                        </div>

                        {/* Active In-Order Indicator */}
                        {qty > 0 && (
                          <div className="absolute bottom-2 right-2 z-10 rounded-md bg-[#25897c] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
                            {qty} in order
                          </div>
                        )}
                      </div>

                      {/* Middle: Product Content */}
                      <div className="p-3.5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-[#627784] mb-1">
                            <span className="uppercase tracking-wider font-mono">{p.productCode}</span>
                            {p.category && (
                              <span className="text-[#25897c] font-medium truncate max-w-[100px]">
                                {p.category}
                              </span>
                            )}
                          </div>

                          <h3
                            className="font-bold text-[#1e3441] text-sm leading-snug line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-[#25897c] transition-colors"
                            onClick={() => setPreviewProduct(p)}
                            title={p.productName}
                          >
                            {p.productName}
                          </h3>

                          <div className="mt-2 flex items-baseline justify-between">
                            <div>
                              <span className="text-base font-extrabold text-[#25897c]">
                                {money(p.price)}
                              </span>
                              <span className="text-xs text-[#7c7260] ml-1">/ {p.unit}</span>
                            </div>
                            {qty > 0 && (
                              <span className="text-xs font-bold text-[#1e3441]">
                                Total: <span className="text-[#25897c]">{money(p.price * qty)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Quantity Controls */}
                        <div className="mt-3 pt-2.5 border-t border-[#ded6c3]/60">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setItems((prev) => ({
                                  ...prev,
                                  [p.id]: 1,
                                }))
                              }
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#ded6c3] bg-[#faf8f4] py-2 text-xs font-bold text-[#1e3441] shadow-2xs hover:border-[#25897c] hover:bg-[#25897c] hover:text-white transition active:scale-[0.98]"
                            >
                              <Plus size={14} />
                              <span>Add to order</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between gap-1 rounded-xl border border-[#25897c]/60 bg-[#25897c]/5 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setItems((prev) => ({
                                    ...prev,
                                    [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                                  }))
                                }
                                className="grid size-8 place-items-center rounded-lg bg-white text-base font-bold text-[#1e3441] shadow-2xs hover:bg-[#ded6c3]/40 active:scale-95 transition"
                                title="Decrease quantity"
                              >
                                −
                              </button>

                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setItems((prev) => ({ ...prev, [p.id]: val }));
                                  }}
                                  className="w-12 text-center text-sm font-black text-[#1e3441] bg-transparent outline-none"
                                />
                                <span className="text-[11px] font-semibold text-[#627784]">{p.unit}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setItems((prev) => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || 0) + 1,
                                  }))
                                }
                                className="grid size-8 place-items-center rounded-lg bg-[#25897c] text-base font-bold text-white shadow-2xs hover:bg-[#1f7368] active:scale-95 transition"
                                title="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact List View */
              <div className="grid gap-2.5 grid-cols-1">
                {filteredProducts.map((p) => {
                  const qty = items[p.id] || 0;
                  const brand = getCompanyBrand(p.company);
                  const displayImg = p.imageUrl || "/logo.png";

                  return (
                    <div
                      key={p.id}
                      className={`group flex items-center justify-between gap-3.5 rounded-2xl border p-3 transition-all duration-200 ${
                        qty > 0
                          ? "border-[#25897c] bg-[#25897c]/[0.03] ring-1 ring-[#25897c]/30 shadow-xs"
                          : "border-[#ded6c3] bg-white hover:border-[#25897c]/50 hover:shadow-xs"
                      }`}
                    >
                      {/* Left: Thumbnail with click to preview */}
                      <div
                        className="relative size-16 sm:size-18 shrink-0 rounded-xl bg-gradient-to-b from-[#faf8f4] to-[#f0ebde] p-1.5 flex items-center justify-center cursor-pointer border border-[#ded6c3]/60 overflow-hidden shadow-2xs group-hover:border-[#25897c]/60"
                        onClick={() => setPreviewProduct(p)}
                        title="Click to view packaging photo"
                      >
                        <img
                          src={displayImg}
                          alt={p.productName}
                          className="max-h-full max-w-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-108"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.png";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white">
                          <ZoomIn size={14} />
                        </div>
                      </div>

                      {/* Middle: Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 rounded bg-[#25897c]/10 px-1.5 py-0.5 text-[10px] font-extrabold text-[#25897c]">
                            <img
                              src={brand.logo}
                              alt={p.company}
                              className="size-3 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            {p.company || "Other"}
                          </span>
                          <span className="text-[10px] font-semibold text-[#627784] uppercase font-mono">
                            {p.productCode}
                          </span>
                        </div>

                        <p
                          className="truncate text-sm font-bold text-[#1e3441] cursor-pointer hover:text-[#25897c]"
                          onClick={() => setPreviewProduct(p)}
                          title={p.productName}
                        >
                          {p.productName}
                        </p>

                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-[#25897c]">
                            {money(p.price)}
                          </span>
                          <span className="text-xs font-medium text-[#7c7260]">
                            / {p.unit}
                          </span>
                          {qty > 0 && (
                            <span className="text-xs font-bold text-[#1e3441] ml-auto">
                              Total: <span className="text-[#25897c]">{money(p.price * qty)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Stepper */}
                      <div className="flex items-center gap-1 rounded-xl border border-[#ded6c3] bg-[#faf8f4] p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                            }))
                          }
                          className="grid size-8 place-items-center rounded-lg bg-white text-base font-bold text-[#1e3441] shadow-2xs hover:bg-[#ded6c3]/40 active:scale-95 disabled:opacity-40"
                          disabled={qty <= 0}
                          title="Decrease quantity"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setItems((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-9 text-center text-xs font-black text-[#1e3441] bg-transparent outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => ({
                              ...prev,
                              [p.id]: (prev[p.id] || 0) + 1,
                            }))
                          }
                          className="grid size-8 place-items-center rounded-lg bg-[#25897c] text-base font-bold text-white shadow-2xs hover:bg-[#1f7368] active:scale-95"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right column: Live summary sticky sidebar */}
        <aside className="h-fit rounded-xl border border-[#ded6c3] bg-[#1c2e38] p-5 text-white shadow-xs lg:sticky lg:top-24">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e65100]">Order summary</p>
          <div className="mt-2">
            {selectedShop ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-[#25897c]/30 px-2 py-0.5 text-[11px] font-bold text-[#4cd3c2]">
                  <MapPin size={11} /> {selectedShop.area || "General"}
                </span>
                <h2 className="display mt-1 text-2xl font-bold leading-tight">{selectedShop.shopName}</h2>
                <p className="text-xs text-white/60">
                  {selectedShop.shopCode} · {selectedShop.ownerName}
                </p>
              </div>
            ) : (
              <div>
                <h2 className="display text-xl font-bold text-white/70">
                  {selectedArea ? `Area: ${selectedArea}` : "Select a shop"}
                </h2>
                <p className="text-xs text-white/40">
                  {selectedArea ? "Pick a shop in this area to proceed" : "Pick area and shop on the left"}
                </p>
              </div>
            )}
          </div>

          <div className="my-5 max-h-60 overflow-y-auto space-y-3 border-y border-white/10 py-5">
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-white/50">Your selected products will appear here.</p>
            ) : (
              selectedProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-white/80">
                    {items[p.id]} × {p.productName}
                  </span>
                  <strong className="text-white">{money(p.price * (items[p.id] || 0))}</strong>
                </div>
              ))
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center justify-between text-sm">
              <span className="text-white/70">Special Discount (Rs)</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-24 rounded-md border border-white/20 bg-transparent px-2.5 py-1.5 text-right text-sm text-white outline-none focus:border-[#e65100]"
              />
            </label>
          </div>

          <div className="flex items-end justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-white/70">Grand total</span>
            <strong className="display text-3xl text-[#e65100]">{money(total)}</strong>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedArea || !shopId || selectedProducts.length === 0 || createMutation.isPending}
            variant="accent"
            className="mt-6 w-full"
          >
            {createMutation.isPending ? "Submitting order..." : "Confirm & submit order"}
            <Check size={17} />
          </Button>
        </aside>
      </div>

      {/* Foodpanda Style Product Detail Modal for Order Booker */}
      {previewProduct && (
        <ProductDetailModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          mode="order"
          currentQuantity={items[previewProduct.id] || 1}
          onAddToCart={(product, qty) => {
            setItems((prev) => ({
              ...prev,
              [product.id]: qty,
            }));
          }}
        />
      )}
    </Shell>
  );
}
