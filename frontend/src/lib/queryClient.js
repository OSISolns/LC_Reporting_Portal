import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute stale time for clinical data
      gcTime: 1000 * 60 * 5, // 5 minutes cache retention
      refetchOnWindowFocus: false, // Prevent surprising UI shifts during data entry
      retry: 1, // Max 1 retry on network error
    },
  },
});
