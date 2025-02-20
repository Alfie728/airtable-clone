"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseById, renameBase } from "~/lib/actions/bases.action";
import { getTables, createTable } from "~/lib/actions/tables.action";
import type {
  BaseResponse,
  BaseListResponse,
  SerializedBase,
  BaseRenameResponse,
} from "~/types/base";
import type {
  TableCreateResponse,
  TableListResponse,
  SerializedTable,
} from "~/types/table";
import { queryKeys } from "~/lib/query/keys";

export const useBase = (baseId: string) => {
  const queryClient = useQueryClient();

  const baseInfoQuery = useQuery({
    queryKey: queryKeys.bases.info(baseId),
    queryFn: () => getBaseById(baseId),
    enabled: Boolean(baseId),
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const baseTablesQuery = useQuery({
    queryKey: queryKeys.bases.tables.list(baseId),
    queryFn: () => getTables(baseId),
    staleTime: 10 * 1000,
    enabled: Boolean(baseId),
  });

  const addTableMutation = useMutation({
    mutationFn: async (params: { tableName: string; optimisticId: string }) => {
      const result = await createTable(
        baseId,
        params.tableName,
        params.optimisticId,
      );
      if (!result.success || !result.table) {
        throw new Error(result.error ?? "Failed to create table");
      }
      return {
        success: true as const,
        table: {
          ...result.table,
          createdAt: result.table.createdAt.toISOString(),
          updatedAt:
            result.table.updatedAt?.toISOString() ??
            result.table.createdAt.toISOString(),
        },
        defaultViewId: result.defaultViewId,
      };
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });
      const previousData = queryClient.getQueryData<TableListResponse>(
        queryKeys.bases.tables.list(baseId),
      );

      const optimisticTable = {
        id: params.optimisticId,
        name: params.tableName,
        baseId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: null,
        rowCount: 0,
      };

      if (previousData?.tables) {
        queryClient.setQueryData<TableListResponse>(
          queryKeys.bases.tables.list(baseId),
          {
            ...previousData,
            tables: [...previousData.tables, optimisticTable],
          },
        );
      }

      return { previousData, optimisticTable };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.bases.tables.list(baseId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });
    },
  });

  const renameMutation = useMutation<
    BaseRenameResponse,
    Error,
    string,
    {
      previousBaseInfo: BaseResponse | undefined;
      previousBasesList: BaseListResponse | undefined;
    }
  >({
    mutationFn: async (newName: string): Promise<BaseRenameResponse> => {
      const result = await renameBase(baseId, newName);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to rename base");
      }
      return result;
    },
    onMutate: async (newName) => {
      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: queryKeys.bases.info(baseId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.bases.list(),
        }),
      ]);

      // Get previous data
      const previousBaseInfo = queryClient.getQueryData<BaseResponse>(
        queryKeys.bases.info(baseId),
      );
      const previousBasesList = queryClient.getQueryData<BaseListResponse>(
        queryKeys.bases.list(),
      );

      // Update base info
      queryClient.setQueryData(
        queryKeys.bases.info(baseId),
        (old: SerializedBase | undefined) => ({
          ...old,
          name: newName,
        }),
      );

      // Update bases list while maintaining order
      if (previousBasesList?.bases) {
        queryClient.setQueryData(queryKeys.bases.list(), {
          ...previousBasesList,
          bases: previousBasesList.bases.map((base) =>
            base.id === baseId ? { ...base, name: newName } : base,
          ),
        });
      }

      return { previousBaseInfo, previousBasesList };
    },
    onError: (err, _, context) => {
      if (context?.previousBaseInfo) {
        queryClient.setQueryData(
          queryKeys.bases.info(baseId),
          context.previousBaseInfo,
        );
      }
      if (context?.previousBasesList) {
        queryClient.setQueryData(
          queryKeys.bases.list(),
          context.previousBasesList,
        );
      }
    },
    onSettled: () => {
      // We don't need to invalidate since we already have the correct data
      // from optimistic updates and server response
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
    renameBase: (newName: string) => renameMutation.mutateAsync(newName),
    isRenaming: renameMutation.isPending,
  };
};
