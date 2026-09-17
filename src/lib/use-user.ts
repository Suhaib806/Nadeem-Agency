"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User } from "@/types";
import { apiFetch } from "./api-client";

export function useCurrentUser(requiredRole?: "admin" | "order_booker") {
  const router = useRouter();

  const query = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: () => apiFetch("/api/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      router.replace("/");
    } else if (query.data && requiredRole && query.data.role !== requiredRole) {
      router.replace(query.data.role === "admin" ? "/admin/dashboard" : "/booker/today");
    }
  }, [query.data, query.isError, requiredRole, router]);

  return query;
}
