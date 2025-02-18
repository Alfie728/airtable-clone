"use client";

import { useState } from "react";
import { Grid, ChevronDown, ChevronRight, Search, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { views } from "~/server/db/schema";
import { cn } from "~/lib/utils";

interface SidebarProps {
  views: (typeof views.$inferSelect)[] | undefined;
  currentViewId: string | null;
  onViewSelect: (viewId: string) => void;
  isAddingView?: boolean;
  pendingActiveViewId?: string | null;
  isLoading?: boolean;
}

export function Sidebar({
  views,
  currentViewId,
  isAddingView,
  onViewSelect,
  pendingActiveViewId,
  isLoading = false,
}: SidebarProps) {
  const [isViewsOpen, setIsViewsOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Determine if we're in a loading state
  const isLoadingViews =
    isLoading ||
    (pendingActiveViewId !== null && pendingActiveViewId !== currentViewId) ||
    currentViewId === "loading";

  return (
    <div className="flex w-60 flex-col border-r border-gray-200 bg-gray-50/50">
      <div className="flex h-10 items-center gap-2 border-b border-gray-200 px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsViewsOpen(!isViewsOpen)}
        >
          {isViewsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <span className="text-xs font-medium text-gray-600">Views</span>
      </div>

      {isViewsOpen && (
        <>
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Find a view"
                className="h-7 w-full border-gray-200 bg-white pl-7 text-xs placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1">
            <div className="space-y-0.5">
              {isLoadingViews ? (
                <div className="px-2 py-1 text-sm text-gray-500">
                  Loading views...
                </div>
              ) : !Array.isArray(views) || views.length === 0 ? (
                <div className="px-2 py-1 text-sm text-gray-500">No views</div>
              ) : (
                views.map((view) => (
                  <Button
                    key={view.id}
                    variant={currentViewId === view.id ? "secondary" : "ghost"}
                    className={cn(
                      "h-7 w-full justify-start gap-2 rounded px-2 text-xs font-normal",
                      isAddingView && views.indexOf(view) === views.length - 1
                        ? "bg-blue-50 text-blue-700"
                        : view.id === pendingActiveViewId ||
                            (!pendingActiveViewId && currentViewId === view.id)
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-50 text-gray-500",
                    )}
                    onClick={() => onViewSelect(view.id)}
                    disabled={isLoadingViews}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    {view.name}
                  </Button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 p-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsCreateOpen(!isCreateOpen)}
              >
                {isCreateOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <span className="text-xs font-medium text-gray-600">
                Create view...
              </span>
            </div>

            {isCreateOpen && (
              <div className="mt-1 space-y-0.5 pl-7">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-start gap-2 rounded px-2 text-xs font-normal"
                >
                  <Grid className="h-3.5 w-3.5" />
                  Grid view
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
