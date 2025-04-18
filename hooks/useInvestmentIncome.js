import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export const useInvestmentIncome = (taxYear) =>
  useQuery({
    queryKey: ["investment-income", taxYear],
    queryFn: () => api.get(`/investment-income/${taxYear}`).then((r) => r.data),
  });

export const useEnsureInvestmentDoc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taxYear }) =>
      api.post("/investment-income", { taxYear }).then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["investment-income", taxYear]),
  });
};

export const useAddInvLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.post(`/investment-income/${id}/line`, payload).then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["investment-income", taxYear]),
  });
};

export const useUpdateInvLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lid, payload }) =>
      api
        .put(`/investment-income/${id}/line/${lid}`, payload)
        .then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["investment-income", taxYear]),
  });
};

export const useDeleteInvLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lid }) =>
      api.delete(`/investment-income/${id}/line/${lid}`).then((r) => r.data),
    onSuccess: (_, { taxYear }) =>
      qc.invalidateQueries(["investment-income", taxYear]),
  });
};
