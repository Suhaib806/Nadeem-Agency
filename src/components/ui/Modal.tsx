"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1e3441]/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="display text-xl font-bold text-[#1e3441]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-2 text-[#627784] hover:bg-[#e8e2d4]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
