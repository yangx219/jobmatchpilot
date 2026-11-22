"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PanelLeft, Briefcase } from "lucide-react";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIDEBAR_GROUPS } from "@/lib/constants";
import SidebarToggle from "./SidebarToggle";
import { AgentChatTrigger } from "./AgentChatTrigger";
import { NotificationBell } from "./notifications/NotificationBell";
import { WorkspacePageTitle } from "./workspace/WorkspacePageTitle";

function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 sm:gap-3 border-b bg-background/95 px-4 backdrop-blur-md sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <nav className="grid gap-6 text-lg font-medium">
            <SheetClose asChild>
              <Link
                href="/dashboard"
                className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              >
                <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
                <span className="sr-only">JobMatchPilot</span>
              </Link>
            </SheetClose>
            {SIDEBAR_GROUPS.map((group) => (
              <div className="grid gap-3" key={group.label}>
                <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(group.label)}
                </p>
                {group.items.map((item) => {
                  if ("devOnly" in item && item.devOnly && process.env.NODE_ENV !== "development") return null;
                  return (
                    <SheetClose asChild key={item.label}>
                      <Link
                        href={item.route}
                        className="flex items-center gap-4 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <item.icon className="h-5 w-5" />
                        {t(item.label)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <SidebarToggle />
      <WorkspacePageTitle />
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="search"
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        /> */}
      </div>

      <LanguageSwitcher />
      <NotificationBell />
      <AgentChatTrigger />
    </header>
  );
}

export default Header;
