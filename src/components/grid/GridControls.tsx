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
} from "lucide-react";
import { Button } from "~/components/ui/button";

export function GridControls() {
  return (
    <div className="flex items-center border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="gap-2">
          Grid view
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost">Hide fields</Button>
        <Button variant="ghost" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button variant="ghost" className="gap-2">
          <Group className="h-4 w-4" />
          Group
        </Button>
        <Button variant="ghost" className="gap-2">
          <SortAsc className="h-4 w-4" />
          Sort
        </Button>
        <Button variant="ghost" className="gap-2">
          <Palette className="h-4 w-4" />
          Color
        </Button>
        <Button variant="ghost">
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share and sync
        </Button>
        <Button variant="ghost" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
