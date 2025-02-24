"use client";

import { useState } from "react";
import {
  Grid,
  ChevronRight,
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Calendar,
  Columns,
  FormInput,
  GanttChart,
  LayoutGrid,
  List,
  Clock,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { views } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { Separator } from "@radix-ui/react-separator";

interface SidebarProps {
  views: (typeof views.$inferSelect)[] | undefined;
  currentViewId: string | null;
  onViewSelect: (viewId: string) => void;
  isAddingView?: boolean;
  pendingActiveViewId?: string | null;
  isLoading?: boolean;
  onCreateView?: (type: "grid") => Promise<void>;
}

export function Sidebar({
  views,
  currentViewId,
  isAddingView,
  onViewSelect,
  pendingActiveViewId,
  isLoading = false,
  onCreateView,
}: SidebarProps) {
  const [isViewsOpen, setIsViewsOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Determine if we're in a loading state
  const isLoadingViews =
    isLoading ||
    (pendingActiveViewId !== null && pendingActiveViewId !== currentViewId) ||
    currentViewId === "loading";

  return (
    <div className="flex h-full w-full flex-col border-gray-200 bg-gray-50/50 px-3">
      <div className="flex h-full flex-1 flex-col justify-between">
        <div className="p-2">
          <div className="relative border-b border-gray-200">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Find a view"
              className="h-7 w-full border-none bg-white pl-7 text-xs shadow-none placeholder:text-gray-500"
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
        <Separator className="mx-auto h-[1px] w-full bg-gray-200" />
        <div className="px-2">
          <div className="flex items-center justify-between gap-2 py-[11px] pl-2">
            <span className="text-[15px] font-medium leading-[18px] text-black">
              Create...
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 pr-0.5"
              onClick={() => setIsCreateOpen(!isCreateOpen)}
            >
              {isCreateOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isCreateOpen && (
            <div className="space-y-1 pb-4">
              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <Grid className="h-4 w-4 text-blue-600" />
                  Grid
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                  onClick={() => onCreateView?.("grid")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Calendar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <LayoutGrid className="h-4 w-4 text-purple-600" />
                  Gallery
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <Columns className="h-4 w-4 text-green-600" />
                  Kanban
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                  >
                    <Clock className="h-4 w-4 text-red-600" />
                    Timeline
                  </Button>
                  <span className="rounded-full bg-[#c4ecff] px-1.5 py-0.5 text-xs text-[#0f68a2]">
                    Team
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative left-[2px] h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <List className="h-4 w-4 text-blue-600" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                  >
                    <GanttChart className="h-4 w-4 text-teal-600" />
                    Gantt
                  </Button>
                  <span className="rounded-full bg-[#c4ecff] px-1.5 py-0.5 text-xs text-[#0f68a2]">
                    Team
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative left-[2px] h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pb-2 pr-1 hover:bg-gray-100">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                  >
                    New section
                  </Button>
                  <span className="rounded-full bg-[#c4ecff] px-1.5 py-0.5 text-xs text-[#0f68a2]">
                    Team
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative left-[2px] h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Separator className="mx-auto !mb-[9px] h-[1px] w-full bg-gray-200" />
              <div className="flex items-center justify-between pr-1 hover:bg-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 rounded px-2 text-sm font-normal text-gray-700"
                >
                  <FormInput className="h-4 w-4 text-pink-600" />
                  Form
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
