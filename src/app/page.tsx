"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import logo from "@/assets/logo.png";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated
    apiFetch("/api/auth/me")
      .then((user) => {
        if (user && user.role) {
          window.location.href = user.role === "admin" ? "/admin/dashboard" : "/booker/today";
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.user) {
        queryClient.clear();
        queryClient.setQueryData(["current-user"], res.user);
        window.location.href = res.user.role === "admin" ? "/admin/dashboard" : "/booker/today";
      }
    } catch (err: any) {
      setError(err.message || "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3efe7]">
        <div className="rounded-xl border border-[#ded6c3] bg-[#fbf9f4] p-8 text-center">
          <div className="mx-auto mb-3 h-2 w-32 animate-pulse rounded-full bg-[#ded6c3]" />
          <p className="text-sm text-[#627784]">Opening workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell-grid flex min-h-screen items-center justify-center bg-[#f3efe7] p-4">
      <div className="grid w-full max-w-[980px] overflow-hidden rounded-2xl border border-[#ded6c3] bg-[#fbf9f4] shadow-[0_24px_80px_rgba(30,52,65,0.12)] md:grid-cols-[.9fr_1.1fr]">
        {/* Left marketing sidebar */}
        <div className="relative hidden overflow-hidden bg-[#fff] p-10 text-[#fbf9f4] md:block">
          <div className="absolute -right-20 -top-20 size-64 rounded-full border-[30px] border-[#e65100]/20" />
          <div className="absolute -bottom-24 -left-20 size-64 rounded-full border-[30px] border-[#25897c]/20" />

          <div className="flex items-center gap-3.5">
            <div className="flex  shrink-0 items-center justify-center rounded-2xl border border-white/10 p-1.5 ">
              <Image
                src={logo}
                alt="Nadeem Agency"
                width={120}
                height={120}
                className="size-full object-contain"
                priority
              />
            </div>
            {/* <span>
              <strong className="display block text-[18px] leading-none text-white tracking-wide">NADEEM</strong>
              <small className="mt-1 block text-[9px] font-bold uppercase tracking-[.24em] text-white/55">
                Distribution desk
              </small>
            </span> */}
          </div>

          <div className="relative mt-18">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[.2em] text-[#e65100]">
              Field sales cockpit
            </p>
            <h1 className="display max-w-sm text-5xl text-[#1e3441] font-bold leading-[.98]">
              Keep every shelf moving.
            </h1>
            <p className="mt-6 max-w-xs text-sm leading-6 text-[#1e3441]">
              The fast, clean way to turn shop visits into an automated order book.
            </p>
          </div>

          <div className="absolute bottom-8 text-[11px] text-[#1e3441]">
            NADEEM AGENCY · WHOLESALE DISTRIBUTION
          </div>
        </div>

        {/* Right login form */}
        <div className="p-7 sm:p-12">
          <div className="mb-9 flex items-center justify-center gap-3.5 md:hidden">
            <div className="flex  shrink-0 items-center justify-center rounded-2xl border border-white/10 p-1.5 ">
              <Image
                src={logo}
                alt="Nadeem Agency"
                width={120}
                height={120}
                className="size-full object-contain"
                priority
              />
            </div>
            {/* <div>
              <strong className="display block text-xl font-bold leading-none text-[#1e3441]">NADEEM AGENCY</strong>
              <small className="mt-1 block text-[9px] font-bold uppercase tracking-[.18em] text-[#627784]">
                Distribution desk
              </small>
            </div> */}
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#25897c]">Welcome back</p>
          <h2 className="display mt-2 text-3xl font-bold text-[#1e3441]">Sign in to your desk</h2>
          <p className="mt-2 text-sm text-[#627784]">Use your agency credentials to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field
              label="Work email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@nadeem.agency"
            />
            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            {error && (
              <p className="rounded-lg bg-[#c62828]/10 p-3 text-sm text-[#c62828]">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Signing you in..." : "Enter workspace"}
              <ArrowRight size={17} />
            </Button>
          </form>

          <div className="mt-8 rounded-lg bg-[#ded6c3]/40 p-3 text-center text-xs text-[#627784]">
            <p className="font-semibold text-[#1e3441]">Demo Accounts:</p>
            <p className="mt-1">Admin: <code className="text-[#25897c]">admin@nadeem.agency</code> / <code className="text-[#25897c]">admin123</code></p>
            <p className="mt-0.5">Booker: <code className="text-[#25897c]">adeel@nadeem.agency</code> / <code className="text-[#25897c]">booker123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
