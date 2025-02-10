"use client";

import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import {
  Bell,
  ChevronDown,
  Command,
  HelpCircle,
  Search,
  History,
  Users,
  Menu,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { AirtableLogo, AirtableLogoWithText } from "~/components/Icons";

interface BaseTopNavigationProps {
  baseName: string;
}

interface HomeTopNavigationProps {
  onMenuToggle?: (isOpen: boolean) => void;
}

interface TopNavButtonProps {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function TopNavButton({
  active,
  children,
  className,
  onClick,
}: TopNavButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 rounded-full px-3 text-[13px] font-normal leading-[1.5] text-white transition-colors",
        active
          ? "cursor-default bg-[rgba(0,0,0,0.15)] text-[rgba(255,255,255,0.95)] mix-blend-normal shadow-[inset_0px_0px_2px_rgba(0,0,0,0.1),inset_0px_1px_1px_rgba(0,0,0,0.1)]"
          : "hover:bg-opacity-0",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function BaseTopNavigation({ baseName }: BaseTopNavigationProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);
  return (
    <header className="flex h-[56px] items-center bg-[#616670] px-4 pl-5">
      <div className="flex h-12 flex-1 items-center justify-between">
        <div className="flex items-center">
          <div className="flex min-w-[60px] items-center">
            <AirtableLogo />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded text-[17px] font-[675] leading-6 tracking-[-0.16px] text-white"
            >
              {baseName}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex items-center">
            <TopNavButton
              active={activeButton === "Data"}
              onClick={() => setActiveButton("Data")}
              className="ml-1 mr-2"
            >
              Data
            </TopNavButton>
            <TopNavButton
              active={activeButton === "Automations"}
              onClick={() => setActiveButton("Automations")}
              className="mr-2"
            >
              Automations
            </TopNavButton>
            <TopNavButton
              active={activeButton === "Interfaces"}
              onClick={() => setActiveButton("Interfaces")}
              className="mr-3"
            >
              Interfaces
            </TopNavButton>
            <div className="h-4 w-px bg-white/20" />
            <TopNavButton
              active={activeButton === "Forms"}
              onClick={() => setActiveButton("Forms")}
              className="ml-3"
            >
              Forms
            </TopNavButton>
          </nav>
        </div>
        <div className="flex items-center">
          <TopNavButton onClick={() => setActiveButton("History")}>
            <History className="h-4 w-4" />
          </TopNavButton>
          <TopNavButton onClick={() => setActiveButton("Help")}>
            <HelpCircle className="h-4 w-4" />
            Help
          </TopNavButton>
          <TopNavButton
            onClick={() => setActiveButton("Share")}
            className="mx-2 bg-[rgba(255,255,255,0.95)] hover:bg-[rgba(255,255,255)]"
          >
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[rgb(97,102,112)]" />
              <span className="text-[rgb(97,102,112)]">Share</span>
            </div>
          </TopNavButton>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveButton("Notifications")}
            className="relative mx-2 h-7 w-7 rounded-full bg-[rgba(255,255,255,0.95)] p-0 hover:bg-[rgba(255,255,255)]"
          >
            <Bell className="h-4 w-4 text-[rgb(97,102,112)]" />
          </Button>
          <div className="ml-2 flex items-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <TopNavButton>Sign in</TopNavButton>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}

export function HomeTopNavigation({ onMenuToggle }: HomeTopNavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleMenuToggle = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    onMenuToggle?.(newState);
  };

  return (
    <header className="flex h-[56px] items-center border-b border-gray-200 bg-white">
      <div className="flex h-12 flex-1 items-center justify-between px-4">
        <div className="flex min-w-[170px] flex-auto items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleMenuToggle}
          >
            <Menu className="text-gray-700" width={20} height={20} />
          </Button>
          <AirtableLogoWithText />
        </div>
        <div className="flex h-8 w-full items-center gap-2 rounded-full border px-3 shadow-[rgba(0,0,0,0.32)_0px_0px_0.2px_0px,rgba(0,0,0,0.08)_0px_0px_0.5px_0px,rgba(0,0,0,0.08)_0px_0.5px_0.5px_0px] max-lg:max-w-[300px] xl:max-w-[354px]">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
          <div className="flex items-center gap-1 rounded pl-2 text-xs text-gray-500">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
        <div className="flex min-w-[170px] flex-auto items-center justify-end gap-2">
          <TopNavButton className="text-[rgb(29, 31, 37)] hover:bg-[rgb(0,0,0,0.1)]">
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
          </TopNavButton>
          <Button
            variant="ghost"
            size="sm"
            className="text-[rgb(29, 31, 37)] relative mx-2 h-7 w-7 rounded-full p-0 shadow-[0px_0px_1px_rgba(0,0,0,0.32),0px_0px_2px_rgba(0,0,0,0.08),0px_1px_3px_rgba(0,0,0,0.08)] hover:bg-[rgb(229,233,240)]"
          >
            <Bell className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:bg-gray-100"
              >
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
