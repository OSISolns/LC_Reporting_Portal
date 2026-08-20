import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllShifts, 
  getShiftById, 
  markShiftReviewed, 
  reactivateShift, 
  bulkReviewShifts, 
  deleteShift, 
  updateShiftByAdmin 
} from '../api/shifts';

/**
 * Query keys for TanStack Query caching
 */
export const shiftQueryKeys = {
  all: ['shifts'],
  list: (filters, page) => ['shifts', 'list', { ...filters, page }],
  detail: (id) => ['shifts', 'detail', id],
};

/**
 * Custom hook to fetch paginated shift logs with TanStack Query caching
 */
export function useShifts(filters = {}, page = 1, options = {}) {
  const queryParams = { ...filters, page, limit: 50 };
  Object.keys(queryParams).forEach(k => !queryParams[k] && delete queryParams[k]);

  return useQuery({
    queryKey: shiftQueryKeys.list(filters, page),
    queryFn: async () => {
      const res = await getAllShifts(queryParams);
      return res.data;
    },
    staleTime: 1000 * 30, // 30s stale time for shifts
    keepPreviousData: true,
    ...options,
  });
}

/**
 * Custom hook to fetch a single shift by ID
 */
export function useShiftDetail(id, options = {}) {
  return useQuery({
    queryKey: shiftQueryKeys.detail(id),
    queryFn: async () => {
      const res = await getShiftById(id);
      return res.data.data;
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * Custom mutations for shift operations with automatic cache invalidation
 */
export function useShiftMutations() {
  const queryClient = useQueryClient();

  const invalidateShifts = () => {
    queryClient.invalidateQueries({ queryKey: shiftQueryKeys.all });
  };

  const reviewMutation = useMutation({
    mutationFn: (id) => markShiftReviewed(id),
    onSuccess: () => invalidateShifts(),
  });

  const reactivateMutation = useMutation({
    mutationFn: ({ id, password }) => reactivateShift(id, password),
    onSuccess: () => invalidateShifts(),
  });

  const bulkReviewMutation = useMutation({
    mutationFn: ({ ids, password }) => bulkReviewShifts(ids, password),
    onSuccess: () => invalidateShifts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteShift(id),
    onSuccess: () => invalidateShifts(),
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ id, payload }) => updateShiftByAdmin(id, payload),
    onSuccess: () => invalidateShifts(),
  });

  return {
    reviewMutation,
    reactivateMutation,
    bulkReviewMutation,
    deleteMutation,
    updateAdminMutation,
  };
}
