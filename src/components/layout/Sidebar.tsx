"use client";

import { useState } from "react";
import {
  Grid,
  Calendar,
  ImageIcon,
  Layout,
  List,
  TimerIcon as Timeline,
  Eye,
  Table,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";

interface SidebarProps {
  tables: (typeof tables.$inferSelect)[];
  currentTableId: string | null;
  onTableSelect: (tableId: string) => void;
  isAddingTable: boolean;
  pendingActiveTableId: string | null;
}

export function Sidebar({
  tables,
  currentTableId,
  isAddingTable,
  onTableSelect,
  pendingActiveTableId,
}: SidebarProps) {
  const [isViewsOpen, setIsViewsOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant={currentTableId === table.id ? "secondary" : "ghost"}
                  className={cn(
                    "h-7 w-full justify-start gap-2 rounded px-2 text-xs font-normal",
                    isAddingTable && tables.indexOf(table) === tables.length - 1
                      ? "bg-blue-50 text-blue-700"
                      : table.id === pendingActiveTableId ||
                          (!pendingActiveTableId && currentTableId === table.id)
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-50 text-gray-500",
                  )}
                  onClick={() => onTableSelect(table.id)}
                >
                  <Grid className="h-3.5 w-3.5" />
                  {table.name}
                </Button>
              ))}
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
                Create...
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
                  Grid
                </Button>
                {/* Add other view types here */}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const viewOptions = [
  { icon: Grid, label: "Grid" },
  { icon: Calendar, label: "Calendar" },
  { icon: ImageIcon, label: "Gallery" },
  { icon: Layout, label: "Kanban" },
  { icon: Timeline, label: "Timeline" },
  { icon: List, label: "List" },
];
