"use client";

import {
  Settings,
  Filter,
  Group,
  SortAsc,
  Palette,
  Menu,
  Share2,
  Search,
  ChevronDown,
  Eye,
  Grid,
} from "lucide-react";
import { Button } from "~/components/ui/button";

interface GridControlsProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function GridControls({
  isSidebarOpen,
  onToggleSidebar,
}: GridControlsProps) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-gray-200 px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
          onClick={onToggleSidebar}
        >
          <Grid className="h-3.5 w-3.5" />
          Grid view
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <Eye className="h-3.5 w-3.5" />
          Hide fields
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <Group className="h-3.5 w-3.5" />
          Group
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <SortAsc className="h-3.5 w-3.5" />
          Sort
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <Palette className="h-3.5 w-3.5" />
          Color
        </Button>
      </div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share and sync
      </Button>
    </div>
  );
}
