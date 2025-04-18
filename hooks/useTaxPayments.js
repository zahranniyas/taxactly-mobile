import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export const useTaxPayments = (taxYear) =>
  useQuery({
    queryKey: ["tax-payments", taxYear],
    queryFn: () => api.get(`/tax-payments/${taxYear}`).then((r) => r.data),
  });

const invalidate = (qc, taxYear) =>
  qc.invalidateQueries(["tax-payments", taxYear]);

export const useEnsureTaxDoc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taxYear }) =>
      api.post("/tax-payments", { taxYear }).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useAddTaxPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.post(`/tax-payments/${id}/payment`, payload).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useUpdateTaxPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pid, payload }) =>
      api
        .put(`/tax-payments/${id}/payment/${pid}`, payload)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useDeleteTaxPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pid }) =>
      api.delete(`/tax-payments/${id}/payment/${pid}`).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};
