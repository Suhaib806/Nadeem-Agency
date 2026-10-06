"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Edit2,
  ExternalLink,
  Layers,
  Package,
  Plus,
  Search,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PageHead } from "@/components/ui/Metric";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/StateBlocks";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-user";
import { Company } from "@/types";
import { getCompanyBrand } from "@/lib/companies";
import { CompanyModal } from "@/components/companies/CompanyModal";

export default function AdminCompaniesPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser("admin");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalCompany, setModalCompany] = useState<Company | "new" | null>(null);

  const companiesQuery = useQuery<{ items: Company[] }>({
    queryKey: ["companies"],
    queryFn: () => apiFetch("/api/companies"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/companies/${id}`, { method: "DELETE" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-company-counts"] });
      if (data.message) {
        alert(data.message);
      }
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete company");
    },
  });

  if (userLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <LoadingBlock />
      </div>
    );
  }

  const companies = companiesQuery.data?.items || [];
  const filteredCompanies = companies.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const totalProducts = companies.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <Shell user={user}>
      <PageHead
        eyebrow="Distributor Management"
        title="Companies & Brands"
        description="Add and manage supplier companies, configure brand identities, and track catalog distribution."
        action={
          <Button onClick={() => setModalCompany("new")}>
            <Plus size={17} /> Add Company
          </Button>
        }
      />

      {/* Metrics Highlights */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#627784]">
            <span>Active Companies</span>
            <Building2 size={16} className="text-[#25897c]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#1e3441]">{companies.length}</p>
          <p className="text-[11px] text-[#627784]">Registered supplier partners</p>
        </div>

        <div className="rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#627784]">
            <span>Total Catalog Items</span>
            <Package size={16} className="text-[#e65100]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#1e3441]">{totalProducts}</p>
          <p className="text-[11px] text-[#627784]">Distributed across companies</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#627784]">
            <span>Quick Catalog</span>
            <Layers size={16} className="text-sky-600" />
          </div>
          <Link
            href="/admin/products"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#25897c] hover:underline"
          >
            <span>Open Products Table</span>
            <ExternalLink size={14} />
          </Link>
          <p className="text-[11px] text-[#627784]">Filter and edit SKU line items</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search company by name or category..."
        />
      </div>

      {/* Companies Grid */}
      {companiesQuery.isLoading ? (
        <LoadingBlock />
      ) : companiesQuery.isError ? (
        <ErrorBlock message="Failed to load companies" onRetry={() => companiesQuery.refetch()} />
      ) : filteredCompanies.length === 0 ? (
        <EmptyBlock
          title="No companies found"
          detail={
            search
              ? "No companies match your search criteria."
              : "No companies added yet. Click 'Add Company' to create your first supplier brand."
          }
          action={
            <Button onClick={() => setModalCompany("new")}>
              <Plus size={16} /> Add First Company
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((comp) => {
            const brand = getCompanyBrand(comp.name, comp.logo);
            const isDefault = comp.name === "Other";

            return (
              <div
                key={comp.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-xs transition hover:border-[#25897c] hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    {/* Logo thumbnail */}
                    <div className="size-14 rounded-2xl border border-[#ded6c3]/80 bg-white p-2 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={brand.logo}
                        alt={comp.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/companies/other.svg";
                        }}
                      />
                    </div>

                    {/* Products Count Pill */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ded6c3]/50 px-2.5 py-1 text-xs font-bold text-[#1e3441]">
                      <Package size={12} className="text-[#25897c]" />
                      <span>{comp.productCount || 0} products</span>
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-black text-[#1e3441] group-hover:text-[#25897c] transition">
                      {comp.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#627784] line-clamp-2">
                      {comp.description || brand.description || "Distributor FMCG Partner"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#ded6c3]/50 flex items-center justify-between">
                  <Link
                    href={`/admin/products?company=${encodeURIComponent(comp.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#25897c] hover:underline"
                  >
                    <span>View Products</span>
                    <ExternalLink size={12} />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalCompany(comp)}
                      className="p-1.5 rounded-lg text-[#627784] hover:bg-[#ded6c3]/50 hover:text-[#1e3441] transition"
                      title="Edit company"
                    >
                      <Edit2 size={15} />
                    </button>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          const msg = comp.productCount && comp.productCount > 0
                            ? `Are you sure you want to delete "${comp.name}"? Its ${comp.productCount} product(s) will be automatically reassigned to "Other".`
                            : `Are you sure you want to delete "${comp.name}"?`;
                          if (confirm(msg)) {
                            deleteMutation.mutate(comp.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg text-[#c62828] hover:bg-[#c62828]/10 transition"
                        title="Delete company"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CompanyModal
        isOpen={modalCompany !== null}
        company={modalCompany === "new" ? null : modalCompany}
        onClose={() => setModalCompany(null)}
      />
    </Shell>
  );
}
