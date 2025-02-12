"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseById } from "~/lib/actions/bases.action";
import { getTables, createTable } from "~/lib/actions/tables.action";
import type { BaseResponse, TableCreateResponse } from "~/types/table";

export const useBase = (baseId: string) => {
  const queryClient = useQueryClient();

  const baseInfoQuery = useQuery({
    queryKey: ["base", baseId, "info"],
    queryFn: () => getBaseById(baseId),
    enabled: Boolean(baseId),
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const baseTablesQuery = useQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    staleTime: 10 * 1000,
    enabled: Boolean(baseId),
  });

  const addTableMutation = useMutation({
    mutationFn: async (params: { tableName: string; optimisticId: string }) => {
      const promise = createTable(
        baseId,
        params.tableName,
        params.optimisticId,
      );
      const result = await promise;
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create table");
      }
      return result;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["base", baseId] });
      const previousData = queryClient.getQueryData<BaseResponse>([
        "base",
        baseId,
      ]);

      const optimisticTable = {
        id: params.optimisticId,
        name: params.tableName,
        baseId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        rowCount: 0,
      };

      if (previousData?.tables) {
        queryClient.setQueryData<BaseResponse>(["base", baseId], {
          ...previousData,
          tables: [...previousData.tables, optimisticTable],
        });
      }

      return { previousData, optimisticTable };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["base", baseId], context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["base", baseId] });
    },
  });

  return {
    baseName: baseInfoQuery.data?.name ?? "Untitled Base",
    isLoading: baseInfoQuery.isLoading || baseTablesQuery.isLoading,
    isFetching: baseInfoQuery.isFetching || baseTablesQuery.isFetching,
    isPending: baseInfoQuery.isPending || baseTablesQuery.isPending,
    tables: baseTablesQuery.data?.tables ?? [],
    addTable: (tableName: string) => {
      const optimisticId = crypto.randomUUID();
      return addTableMutation.mutateAsync({ tableName, optimisticId });
    },
    isAddingTable: addTableMutation.isPending,
    error: baseInfoQuery.error ?? baseTablesQuery.error ?? null,
  };
};
