"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { SerializedBase } from "~/types/base";
import { HomeSidebar } from "~/components/layout/HomeSidebar";
import { HomeTopNavigation } from "~/components/layout/TopNavigation";
import { cn } from "~/lib/utils";
import { prefetchBaseTables } from "~/lib/query/prefetch";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { BaseCard } from "~/components/home/BaseCard";
import { queryKeys } from "~/lib/query/keys";
import { getDefaultView } from "~/lib/actions/views.action";
import { createBase } from "~/lib/actions/bases.action";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";


interface HomeContentProps {
  bases: SerializedBase[];
}

export function HomeContent({ bases: initialBases }: HomeContentProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  // Configure the bases list query with strict refetch settings
  const { data: basesData } = useQuery({
    queryKey: queryKeys.bases.list(),
    queryFn: () => ({ success: true, bases: initialBases }),
    initialData: { success: true, bases: initialBases },
    staleTime: Infinity, // Never mark the data as stale
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const bases = basesData?.bases ?? initialBases;

  const handleBaseHover = async (baseId: string) => {
    console.log("Hovering over base:", baseId);
    await prefetchBaseTables(queryClient, baseId);
  };
  
  function uniqueBaseName() {
    let count = 0;
    let baseName = "Untitled Base";
    while (bases.some((base) => base.name === baseName)) {
      count++;
      baseName = `Untitled Base ${count}`;
    }
    return baseName;
  }

  const handleCreateBase = async () => {
    try {
      const formData = new FormData();
      formData.append("name", uniqueBaseName());
      formData.append("userId", userId ?? "");

      const result = await createBase(formData);
      if (!result) {
        throw new Error("Failed to create base");
      }

      toast.success("Base created successfully");

      const { viewId, error } = await getDefaultView(result.defaultTableId);
      if (!viewId) {
        throw new Error(error ?? "Failed to get default view");
      }

      router.push(`/${result.baseId}/${result.defaultTableId}/${viewId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create base");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeTopNavigation
        isSidebarOpen={isSidebarOpen}
        onMenuToggle={setIsSidebarOpen}
      />
      <div className="flex flex-1">
        <HomeSidebar isOpen={isSidebarOpen} />
        <main
          className={cn(
            "flex-1 p-6 transition-all duration-300",
            isSidebarOpen && "ml-[300px]",
          )}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                Your bases
              </h1>
              <Button
                onClick={handleCreateBase}
                className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Plus className="h-5 w-5" />
                Create new base
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bases.map((base) => (
                <BaseCard key={base.id} base={base} onHover={handleBaseHover} />
              ))}

              {bases.length === 0 && (
                <div className="col-span-full">
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      No bases
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new base
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/new-base"
                        className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <Plus className="h-5 w-5" />
                        Create new base
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
