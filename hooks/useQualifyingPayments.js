import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export const useQualifyingPayments = (taxYear) =>
  useQuery({
    queryKey: ["qualifying", taxYear],
    queryFn: () =>
      api.get(`/qualifying-payments/${taxYear}`).then((r) => r.data),
  });

const invalidate = (qc, taxYear) =>
  qc.invalidateQueries(["qualifying", taxYear]);

export const useEnsureQPDoc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taxYear }) =>
      api.post("/qualifying-payments", { taxYear }).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useAddQPLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.post(`/qualifying-payments/${id}/line`, payload).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useUpdateQPLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lid, payload }) =>
      api
        .put(`/qualifying-payments/${id}/line/${lid}`, payload)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};

export const useDeleteQPLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lid }) =>
      api.delete(`/qualifying-payments/${id}/line/${lid}`).then((r) => r.data),
    onSuccess: (_, { taxYear }) => invalidate(qc, taxYear),
  });
};
