"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "@/types";
import { getCompanyBrand } from "@/lib/companies";
import { formatRs } from "@/lib/utils";
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Package, 
  Layers, 
  Sparkles, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  ExternalLink,
  Pencil, 
  Store,
  Tag,
  Trash2,
} from "lucide-react";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  mode?: "admin" | "order" | "view";
  currentQuantity?: number;
  onAddToCart?: (product: Product, quantity: number) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  mode = "view",
  currentQuantity = 1,
  onAddToCart,
  onEdit,
  onDelete,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(Math.max(1, currentQuantity));
  const [isFullPageOpen, setIsFullPageOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const brand = getCompanyBrand(product.company);

  const subtotal = Number(product.price || 0) * quantity;
  const hasImage = Boolean(product.imageUrl);
  const displayImage = product.imageUrl || "/logo.png";

  // Handle ESC key for full page image modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullPageOpen) {
        setIsFullPageOpen(false);
        setLightboxZoom(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullPageOpen]);

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1e3441] shadow-lg backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95"
        >
          <X size={20} />
        </button>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto overscroll-contain">
          {/* Top Hero Image Showcase (Foodpanda Style) */}
          <div className="relative w-full h-72 sm:h-80 bg-gradient-to-b from-[#f8f5ee] to-[#ede7dc] flex items-center justify-center overflow-hidden border-b border-[#e6dece]/60">
            {/* Background ambient radial glow matching company brand */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${brand.accent} 0%, transparent 70%)`
              }}
            />

            {/* Product Image - Clicking opens large full page view */}
            <div 
              className="relative w-full h-full p-6 flex items-center justify-center cursor-pointer group"
              onClick={() => {
                setLightboxZoom(1);
                setIsFullPageOpen(true);
              }}
              title="Click to open image in full-screen large view"
            >
              <img
                src={displayImage}
                alt={product.productName}
                className="max-h-full max-w-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(displayImage, "_blank");
                  }}
                  title="Open image on full browser page (new tab)"
                  className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#1e3441] shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95 border border-[#ded6c3]"
                >
                  <ExternalLink size={13} />
                  <span>Open Full Page</span>
                </button>

                <div className="flex items-center gap-1.5 rounded-full bg-[#1e3441]/85 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md group-hover:bg-[#25897c] transition">
                  <Maximize2 size={13} />
                  <span>View Large</span>
                </div>
              </div>
            </div>

            {/* Company Badge floating over image */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md border border-[#e6dece]/80">
              <img 
                src={brand.logo} 
                alt={brand.name} 
                className="h-6 w-6 rounded-lg object-contain bg-white shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xs font-bold text-[#1e3441]">{product.company}</span>
            </div>

            {/* Packaging Unit Pill */}
            <div className="absolute bottom-4 left-4 z-10 rounded-full bg-[#1e3441]/85 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
              {product.unit} pack
            </div>
          </div>

          {/* Product Info Section */}
          <div className="p-5 sm:p-7 space-y-5">
            {/* Header: Title & SKU */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#25897c]/10 px-2.5 py-0.5 text-xs font-bold text-[#25897c]">
                  <Tag size={12} />
                  {product.productCode}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#f0ebd8] px-2.5 py-0.5 text-xs font-semibold text-[#6d6350]">
                  {product.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 size={13} />
                  In Stock & Ready
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3441] tracking-tight">
                {product.productName}
              </h2>
              <p className="text-sm text-[#5a7184] mt-1">
                Distributed by <span className="font-semibold text-[#1e3441]">{product.company}</span> • {brand.description}
              </p>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline justify-between rounded-2xl bg-[#faf8f4] p-4 border border-[#e6dece]">
              <div>
                <span className="text-xs font-medium text-[#7c7260] uppercase tracking-wider block">Wholesale Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#25897c]">
                    {formatRs(product.price)}
                  </span>
                  <span className="text-sm font-medium text-[#7c7260]">
                    / {product.unit}
                  </span>
                </div>
              </div>

              {Number(product.taxOrDiscount) > 0 && (
                <div className="text-right">
                  <span className="text-xs font-medium text-[#7c7260] uppercase tracking-wider block">Tax/Discount</span>
                  <span className="text-sm font-bold text-[#e65100]">
                    {formatRs(product.taxOrDiscount)}
                  </span>
                </div>
              )}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#ded6c3] p-3 bg-white">
                <span className="text-[11px] font-semibold text-[#7c7260] uppercase tracking-wider block flex items-center gap-1">
                  <Package size={12} /> Unit Packaging
                </span>
                <span className="mt-1 text-sm font-bold text-[#1e3441] capitalize">
                  {product.unit}
                </span>
              </div>
              <div className="rounded-xl border border-[#ded6c3] p-3 bg-white">
                <span className="text-[11px] font-semibold text-[#7c7260] uppercase tracking-wider block flex items-center gap-1">
                  <Layers size={12} /> Brand Division
                </span>
                <span className="mt-1 text-sm font-bold text-[#1e3441] truncate block">
                  {product.company}
                </span>
              </div>
              <div className="rounded-xl border border-[#ded6c3] p-3 bg-white col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-[#7c7260] uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles size={12} /> Status
                </span>
                <span className={`mt-1 text-sm font-bold capitalize ${product.status === "active" ? "text-emerald-700" : "text-amber-700"}`}>
                  {product.status}
                </span>
              </div>
            </div>

            {/* Admin Stats & Edit/Delete Action */}
            {mode === "admin" && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ded6c3]/60">
                <span className="text-xs font-medium text-[#7c7260]">
                  Booked today across retailers: <strong className="text-[#1e3441]">{product.ordersToday ?? 0} units</strong>
                </span>
                <div className="flex items-center gap-2">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(product)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#c62828]/20 bg-[#c62828]/10 px-3 py-2 text-xs font-bold text-[#c62828] transition hover:bg-[#c62828] hover:text-white"
                      title="Delete product directly"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => {
                        onClose();
                        onEdit(product);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3441] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#25897c]"
                    >
                      <Pencil size={13} />
                      Edit Product
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foodpanda Style Bottom Action Bar for Order Booker */}
        {mode === "order" && (
          <div className="sticky bottom-0 z-20 border-t border-[#ded6c3] bg-white p-4 sm:p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c7260] hidden sm:inline">
                Quantity:
              </span>
              <div className="flex items-center rounded-2xl border border-[#ded6c3] bg-[#faf8f4] p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1e3441] shadow-sm transition hover:bg-[#f0ebd8] active:scale-95 disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 w-14 bg-transparent text-center font-extrabold text-[#1e3441] outline-none text-base"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1e3441] shadow-sm transition hover:bg-[#f0ebd8] active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Foodpanda Add to Order Button */}
            <button
              type="button"
              onClick={handleAdd}
              className="w-full sm:w-auto flex-1 flex items-center justify-between gap-4 rounded-2xl bg-[#e65100] px-6 py-3.5 text-white shadow-lg shadow-[#e65100]/25 transition hover:bg-[#c94500] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <ShoppingBag size={18} />
                <span>{currentQuantity > 0 ? "Update in Order" : "Add to Order"}</span>
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight bg-white/20 px-3 py-1 rounded-xl">
                {formatRs(subtotal)}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Full Page / Large Image Lightbox Overlay */}
      {isFullPageOpen && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => {
            setIsFullPageOpen(false);
            setLightboxZoom(1);
          }}
        >
          {/* Top Bar */}
          <div 
            className="flex items-center justify-between gap-4 w-full max-w-7xl mx-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product Info Chip */}
            <div className="flex items-center gap-2 sm:gap-3 bg-white/10 rounded-2xl px-3 sm:px-4 py-2 backdrop-blur-md border border-white/15 text-white">
              <span className="rounded-lg bg-[#25897c] px-2 py-0.5 text-xs font-bold text-white">
                #{product.productCode}
              </span>
              <span className="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-md">
                {product.productName}
              </span>
              <span className="text-xs text-white/70 hidden md:inline">
                ({product.company})
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                disabled={lightboxZoom <= 0.75}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>

              {/* Reset Zoom */}
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="px-3 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white text-xs font-bold border border-white/15 hover:bg-white/20 transition"
                title="Reset Zoom"
              >
                {Math.round(lightboxZoom * 100)}%
              </button>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                disabled={lightboxZoom >= 3}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>

              {/* Open in New Tab */}
              <button
                type="button"
                onClick={() => window.open(displayImage, "_blank")}
                className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/15 hover:bg-white/20 transition"
                title="Open full page in browser tab"
              >
                <ExternalLink size={14} />
                <span>Full Page</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFullPageOpen(false);
                  setLightboxZoom(1);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1e3441] shadow-lg hover:bg-white/90 hover:scale-105 active:scale-95 transition"
                title="Close full view (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Center Large Image */}
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4 my-2"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFullPageOpen(false);
                setLightboxZoom(1);
              }
            }}
          >
            <div 
              className="relative max-h-[82vh] max-w-[92vw] flex items-center justify-center transition-transform duration-200 ease-out"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoom((z) => (z > 1 ? 1 : 1.75));
              }}
              title="Click image to zoom in / reset"
            >
              <img
                src={displayImage}
                alt={product.productName}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] cursor-zoom-in"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
          </div>

          {/* Bottom Bar Info / Tips */}
          <div 
            className="flex items-center justify-between text-xs text-white/60 max-w-7xl mx-auto w-full z-10 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Click image to toggle zoom • Use +/- controls to zoom</span>
            <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px]">ESC</kbd> or click outside to exit</span>
          </div>
        </div>
      )}
    </div>
  );
}
