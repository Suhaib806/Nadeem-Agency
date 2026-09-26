"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { User } from "@/types";
import { apiFetch } from "./api-client";

export function useCurrentUser(requiredRole?: "admin" | "order_booker") {
  const query = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: () => apiFetch("/api/auth/me"),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (query.isError) {
      window.location.href = "/";
    } else if (query.data && !query.isFetching && requiredRole && query.data.role !== requiredRole) {
      window.location.href = query.data.role === "admin" ? "/admin/dashboard" : "/booker/today";
    }
  }, [query.data, query.isError, query.isFetching, requiredRole]);

  return query;
}
