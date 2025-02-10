"use client";

import { useState } from "react";
import {
  ChevronRight,
  Star,
  Users,
  Plus,
  BookOpen,
  ShoppingBag,
  Upload,
  Home,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import NextLink from "next/link";

interface HomeSidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

type OpenSection = "home" | "workspaces" | null;

function MiniSidebar({ onToggle }: { onToggle?: () => void }) {
  return (
    <div className="left-0 top-[56px] z-50 flex h-[calc(100vh-56px)] w-[46px] flex-col items-center border-r border-gray-200 bg-white py-3 pt-5">
      <div className="flex flex-col">
        <Button variant="ghost" size="sm" className="mb-2 p-0">
          <Home className="text-gray-700" />
        </Button>
        <Button variant="ghost" size="sm" className="mb-2 p-0">
          <Users className="text-gray-700" />
        </Button>
      </div>
      <Separator className="w-[55%]" />
    </div>
  );
}

export function HomeSidebar({ isOpen, onToggle }: HomeSidebarProps) {
  const [openSection, setOpenSection] = useState<OpenSection>("workspaces");

  const toggleSection = (section: OpenSection) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (!isOpen) {
    return <MiniSidebar onToggle={onToggle} />;
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-[56px] z-50 flex h-[calc(100vh-56px)] w-[300px] flex-col justify-between border-r border-gray-200 bg-white p-3 transition-all duration-300",
        !isOpen && "-translate-x-full",
      )}
    >
      <nav className="flex h-full min-h-[597px] flex-col justify-between">
        <div>
          {/* Navigation Section */}
          <div className="mb-2 flex flex-col">
            <div className="flex items-center gap-2">
              <button
                className="flex flex-1 items-center px-3 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900"
                onClick={() => toggleSection("home")}
              >
                Home
              </button>
              <button
                className="m-2 flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-gray-100"
                onClick={() => toggleSection("home")}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openSection === "home" && "rotate-90",
                  )}
                />
              </button>
            </div>
            {openSection === "home" && (
              <div className="mt-1 flex items-center space-y-0.5 px-3">
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm border border-gray-200 text-[rgba(0,0,0,0.1)]">
                  <Star width={16} height={16} />
                </div>
                <p className="ml-3 py-1 text-[11px] font-[400] leading-[13.75px] text-[rgb(97,102,112)]">
                  Your starred bases, interfaces, and workspaces will appear
                  here
                </p>
              </div>
            )}
          </div>

          {/* Workspaces Section */}
          <div>
            <div className="flex items-center">
              <button
                className="flex flex-1 items-center justify-between px-3 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900"
                onClick={() => toggleSection("workspaces")}
              >
                All workspaces
                <button className="-mr-4 flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-gray-100">
                  <Plus className="h-4 w-4" />
                </button>
              </button>
              <div className="flex items-center">
                <button
                  className="m-2 flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-gray-100"
                  onClick={() => toggleSection("workspaces")}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openSection === "workspaces" && "rotate-90",
                    )}
                  />
                </button>
              </div>
            </div>
            {openSection === "workspaces" && (
              <div className="mt-1 space-y-0.5 px-2">
                <NextLink
                  href="#"
                  className="flex h-8 items-center gap-2 rounded bg-gray-100 px-2 text-[13px] font-normal text-[rgb(29,31,37)]"
                >
                  <Users className="h-4 w-4 pr-1" />
                  My First Workspace
                </NextLink>
                <NextLink
                  href="#"
                  className="flex h-8 items-center gap-2 rounded bg-gray-100 px-2 text-[13px] font-normal text-[rgb(29,31,37)]"
                >
                  <Users className="h-4 w-4 pr-1" />
                  Workspace
                </NextLink>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200">
          <div className="flex flex-col px-2 py-2">
            <NextLink
              href="/templates"
              className="flex h-8 items-center gap-2 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
            >
              <BookOpen className="h-4 w-4 text-gray-500" />
              Templates and apps
            </NextLink>
            <NextLink
              href="/marketplace"
              className="flex h-8 items-center gap-2 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
            >
              <ShoppingBag className="h-4 w-4 text-gray-500" />
              Marketplace
            </NextLink>
            <NextLink
              href="/import"
              className="flex h-8 items-center gap-2 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
            >
              <Upload className="h-4 w-4 text-gray-500" />
              Import
            </NextLink>
          </div>
          <div className="px-2 pb-2">
            <Button className="h-9 w-full gap-2 bg-[rgb(45,127,249)] text-sm font-semibold hover:bg-[rgb(41,122,241)]">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
