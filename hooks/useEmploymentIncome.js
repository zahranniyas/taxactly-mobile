import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export const useCreateEmploymentIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/employment-income", payload),
    onSuccess: (_, vars) =>
      qc.invalidateQueries(["employment-income", vars.taxYear]),
  });
};

export const useEmploymentIncome = (taxYear) =>
  useQuery({
    queryKey: ["employment-income", taxYear],
    queryFn: () => api.get(`/employment-income/${taxYear}`).then((r) => r.data),
  });

export const useUpdateMonth = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, idx, data }) =>
      api.put(`/employment-income/${id}/month/${idx}`, data),

    onSuccess: (_, { id }) => {
      qc.invalidateQueries(["employment-income"]);
      qc.invalidateQueries(["employment-income", id]);
    },
  });
};

export const useUpdateEmploymentIncomeHeader = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.put(`/employment-income/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries(["employment-income", payload.taxYear]),
  });
};
