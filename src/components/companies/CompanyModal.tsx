"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { Company } from "@/types";

interface CompanyModalProps {
  company?: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (company: Company) => void;
}

export function CompanyModal({ company, isOpen, onClose, onSuccess }: CompanyModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(company?.name || "");
  const [logo, setLogo] = useState(company?.logo || "");
  const [description, setDescription] = useState(company?.description || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if company changes
  React.useEffect(() => {
    if (company) {
      setName(company.name || "");
      setLogo(company.logo || "");
      setDescription(company.description || "");
    } else {
      setName("");
      setLogo("");
      setDescription("");
    }
    setError(null);
  }, [company, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; logo?: string; description?: string }) =>
      company?.id
        ? apiFetch(`/api/companies/${company.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/api/companies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (savedCompany: Company) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-company-counts"] });
      if (onSuccess) onSuccess(savedCompany);
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save company");
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
      formData.append("folder", "companies");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload logo");
      }

      const data = await res.json();
      setLogo(data.url);
    } catch (err: any) {
      setError(err.message || "Logo upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required");
      return;
    }
    setError(null);
    mutation.mutate({
      name: name.trim(),
      logo: logo.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <Modal title={company ? `Edit ${company.name}` : "Add New Company"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#c62828]/10 p-3 text-xs font-semibold text-[#c62828]">
            {error}
          </div>
        )}

        {/* Logo preview and upload */}
        <div className="rounded-2xl border border-[#ded6c3] bg-[#faf8f4] p-4">
          <label className="block text-xs font-bold text-[#1e3441] mb-2">
            Company Logo / Brand Emblem
          </label>
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 rounded-2xl border border-[#ded6c3] bg-white p-2 shadow-xs flex items-center justify-center overflow-hidden">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/companies/other.svg";
                  }}
                />
              ) : (
                <div className="text-center text-[#7c7260]">
                  <Building2 size={24} className="mx-auto opacity-40 mb-1" />
                  <span className="text-[10px] font-medium">No Logo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#25897c] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1e7368]">
                  <Upload size={14} />
                  <span>{isUploading ? "Uploading..." : "Upload Logo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    className="text-xs text-[#c62828] hover:underline font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="Or enter logo URL (e.g. /companies/my-logo.png)"
                className="h-9 w-full rounded-lg border border-[#ded6c3] bg-white px-3 text-xs text-[#1e3441] outline-none transition focus:border-[#25897c]"
              />
            </div>
          </div>
        </div>

        <Field
          label="Company Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tapal Tea, Shan Foods, National Foods"
        />

        <Field
          label="Category / Brand Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Tea & Beverage Wholesale Distributor"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-[#ded6c3]/60">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || isUploading}>
            {mutation.isPending ? "Saving..." : company ? "Update Company" : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
