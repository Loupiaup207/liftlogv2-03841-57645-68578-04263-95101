import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Les données ne deviennent jamais stale
      gcTime: Infinity, // Les données restent en cache indéfiniment
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 0, // Pas de retry, utilise le cache
    },
    mutations: {
      retry: 0,
    },
  },
});
