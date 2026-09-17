"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { money } from "@/lib/utils";
import { Product, Shop } from "@/types";

export default function NewOrderPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser("order_booker");

  const [shopId, setShopId] = useState("");
  const [items, setItems] = useState<Record<number, number>>({});
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shopsQuery = useQuery<{ items: Shop[] }>({
    queryKey: ["booker-shops"],
    queryFn: () => apiFetch("/api/shops?status=active&pageSize=100"),
    enabled: !!user,
  });

  const productsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["booker-products"],
    queryFn: () => apiFetch("/api/products?status=active&pageSize=100"),
    enabled: !!user,
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

  const filteredProducts = allProducts.filter(
    (p) =>
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productCode.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedProducts = allProducts.filter((p) => (items[p.id] || 0) > 0);
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.price * (items[p.id] || 0), 0);
  const total = Math.max(0, subtotal - Number(discount));
  const selectedShop = shops.find((s) => String(s.id) === shopId);

  const handleSubmit = () => {
    if (!shopId) {
      setError("Please choose a shop to visit.");
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
        description="Pick a shop, tap the quantities, and confirm. Designed for rapid one-handed mobile booking."
        action={
          <Link href="/booker/today" className="text-sm font-bold text-[#627784] hover:underline">
            Cancel
          </Link>
        }
      />

      {error && (
        <div className="mb-5 rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        {/* Left column: Shop & Products */}
        <section className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-4 sm:p-6 shadow-xs">
          <SelectField
            label="Shop to visit"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="">Choose a retail shop</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shopName} · {s.shopCode} ({s.city})
              </option>
            ))}
          </SelectField>

          <div className="mb-4 mt-7 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#1e3441]">Add products</h2>
              <p className="text-xs text-[#627784]">Tap + or − to adjust quantities</p>
            </div>
            <span className="rounded-full bg-[#e5decb] px-3 py-1 text-xs font-bold text-[#25897c]">
              {selectedProducts.length} items
            </span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-[#627784]" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product code or name..."
              className="h-10 w-full rounded-lg border border-[#ded6c3] bg-white pl-9 pr-3 text-sm text-[#1e3441] outline-none focus:border-[#25897c]"
            />
          </div>

          {productsQuery.isLoading ? (
            <LoadingBlock />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.map((p) => {
                const qty = items[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      qty > 0 ? "border-[#25897c] bg-[#25897c]/5" : "border-[#ded6c3] bg-[#fbf9f4]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1e3441]">{p.productName}</p>
                      <p className="text-xs text-[#627784]">
                        {p.productCode} · {money(p.price)}/{p.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => ({
                            ...prev,
                            [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                          }))
                        }
                        className="grid size-9 place-items-center rounded-lg bg-[#ded6c3]/60 text-lg font-bold text-[#1e3441] active:bg-[#ded6c3]"
                      >
                        −
                      </button>

                      <span className="w-6 text-center text-sm font-bold text-[#1e3441]">{qty}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => ({
                            ...prev,
                            [p.id]: (prev[p.id] || 0) + 1,
                          }))
                        }
                        className="grid size-9 place-items-center rounded-lg bg-[#25897c] text-lg font-bold text-white shadow-xs active:bg-[#1f7368]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right column: Live summary sticky sidebar */}
        <aside className="h-fit rounded-xl border border-[#ded6c3] bg-[#1c2e38] p-5 text-white shadow-xs lg:sticky lg:top-24">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e65100]">Order summary</p>
          <h2 className="display mt-2 text-2xl font-bold">
            {selectedShop ? selectedShop.shopName : "Select a shop"}
          </h2>

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
            disabled={!shopId || selectedProducts.length === 0 || createMutation.isPending}
            variant="accent"
            className="mt-6 w-full"
          >
            {createMutation.isPending ? "Submitting order..." : "Confirm & submit order"}
            <Check size={17} />
          </Button>
        </aside>
      </div>
    </Shell>
  );
}
