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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { tables } from "~/server/db/schema";

interface SidebarProps {
  tables?: Array<typeof tables.$inferSelect>;
  onTableClick?: (tableId: string) => void;
}

export function Sidebar({ tables }: SidebarProps) {
  const [selectedView, setSelectedView] = useState("grid");

  return (
    <div className="w-60 border-r p-4">
      <div className="mb-4">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Eye className="h-4 w-4" />
          Views
        </Button>
      </div>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Find a view"
          className="h-8 bg-gray-50"
        />
      </div>
      <div className="space-y-1">
        <Button
          variant={selectedView === "grid" ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => setSelectedView("grid")}
        >
          <Grid className="h-4 w-4" />
          Grid view
        </Button>
      </div>
      <div className="mt-8">
        <div className="mb-2 text-sm font-medium text-gray-500">Create...</div>
        <div className="space-y-1">
          {/* View options */}
          {viewOptions.map((option) => (
            <Button
              key={option.label}
              variant="ghost"
              className="w-full justify-start gap-2"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>
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
