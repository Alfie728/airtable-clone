"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { SerializedBase } from "~/lib/actions/bases.action";
import { HomeSidebar } from "~/components/layout/HomeSidebar";
import { HomeTopNavigation } from "~/components/layout/TopNavigation";
import { cn } from "~/lib/utils";
import { prefetchBaseTables } from "~/lib/query/prefetch";
import { useQueryClient } from "@tanstack/react-query";

interface HomeContentProps {
  bases: SerializedBase[];
}

export function HomeContent({ bases }: HomeContentProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  const tableData = {
    rows: bases.map((base: SerializedBase) => ({
      id: base.id,
      name: base.name,
      description: base.description,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    })),
    columns: [
      { key: "name", name: "Name" },
      { key: "description", name: "Description" },
      { key: "createdAt", name: "Created" },
      { key: "updatedAt", name: "Last modified" },
    ],
  };

  const handleBaseHover = async (baseId: string) => {
    console.log("Hovering over base:", baseId);
    await prefetchBaseTables(queryClient, baseId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeTopNavigation onMenuToggle={setIsSidebarOpen} />
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
              <Link
                href="/new-base"
                className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Plus className="h-5 w-5" />
                Create new base
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tableData.rows.map((row) => (
                <Link
                  key={row.id}
                  href={`/${row.id}/tables/grid`}
                  onMouseEnter={() => handleBaseHover(row.id)}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                      {row.name}
                    </h3>
                    {row.description && (
                      <p className="mt-2 text-sm text-gray-500">
                        {row.description}
                      </p>
                    )}
                    <div className="mt-4 text-xs text-gray-400">
                      Created {new Date(row.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}

              {tableData.rows.length === 0 && (
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
