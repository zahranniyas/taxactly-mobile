import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export const useBusinessIncome = (taxYear) =>
  useQuery({
    queryKey: ["business-income", taxYear],
    queryFn: () => api.get(`/business-income/${taxYear}`).then((r) => r.data),
  });

export const useEnsureBusinessDoc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taxYear }) =>
      api.post("/business-income", { taxYear }).then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["business-income", taxYear]),
  });
};

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api
        .post(`/business-income/${id}/transaction`, payload)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["business-income", taxYear]),
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tid, payload }) =>
      api
        .put(`/business-income/${id}/transaction/${tid}`, payload)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["business-income", taxYear]),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tid }) =>
      api
        .delete(`/business-income/${id}/transaction/${tid}`)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["business-income", taxYear]),
  });
};
