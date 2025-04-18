import { useInfiniteQuery } from "@tanstack/react-query";
import { NOTICES } from "../lib/notices";

const PAGE_SIZE = 10;

export const useAlerts = () =>
  useInfiniteQuery({
    queryKey: ["alerts-local"],
    queryFn: ({ pageParam = 1 }) => {
      const start = (pageParam - 1) * PAGE_SIZE;
      const slice = NOTICES.slice(start, start + PAGE_SIZE);

      return Promise.resolve(slice);
    },
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE ? undefined : all.length + 1,
    staleTime: Infinity,
  });
