"use client";

import { ChevronsUpDown, HomeIcon, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator"
import type { AuthUser } from "@/src/features/auth/types";
import { useSidebarWidth } from "@/src/components/layout/sidebar-width";
import Image from "next/image";
import Home from "@/src/app/page";

function SidebarResizeHandle() {
  const { setWidth, commitWidth, setIsResizing } = useSidebarWidth();
  const { state, isMobile } = useSidebar();
  const draggingRef = useRef(false);
  const lastWidthRef = useRef<number | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      lastWidthRef.current = event.clientX;
      setWidth(event.clientX);
    }
    function handlePointerUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsResizing(false);
      document.querySelector('[data-slot="sidebar"][data-resizing="true"]')?.removeAttribute("data-resizing");
      if (lastWidthRef.current != null) commitWidth(lastWidthRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setWidth, commitWidth, setIsResizing]);

  if (isMobile || state === "collapsed") return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={(event) => {
        event.preventDefault();
        draggingRef.current = true;
        setIsResizing(true);
        event.currentTarget.closest('[data-slot="sidebar"]')?.setAttribute("data-resizing", "true");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize touch-none hover:bg-sidebar-ring/50"
    />
  );
}

export interface ItemMenuSider {
  key: string,
  icon: React.ReactNode,
  label: string,
  href: string,
}

export interface WorkSpace {
  id: string,
  icon: string,
  label: string,
}

export interface Props {
  workspace?: WorkSpace,
  user: AuthUser,
  menu: ItemMenuSider[],
  onLogout?: (id: string) => void,
}

export default function Siderbar(props: Props) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();

  const { workspace, user, menu, onLogout } = props;
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup className="flex h-12 flex-col items-center justify-center p-0">
          <SidebarMenu className={state === "collapsed" ? "items-center" : undefined}>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      {!workspace ? (
                        <div
                          className={
                            state === "collapsed" ? "relative h-8 w-8" : "relative h-8 w-full"
                          }>
                          <Image
                            src={state === "collapsed" ? "/images/ic_logo_vlive_simple.png" : "/images/ic_logo_vlive.png"}
                            alt="Vlive"
                            fill
                            unoptimized
                            className={state === "collapsed" ? "object-contain object-center" : "object-contain object-left"}
                          />
                        </div>
                      ) : (
                        <>
                          <Image
                            src={workspace.icon}
                            alt={workspace.label}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                          />
                          <span className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                              {workspace && workspace.label}
                            </span>
                          </span>
                          <ChevronsUpDown className="ml-auto size-4" />
                        </>
                      )}
                    </SidebarMenuButton>
                  }
                />
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map(({ key, href, label, icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    tooltip={label}
                    render={<Link href={href} />}>
                    {icon}
                    <h3>{label}</h3>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <h2>
              
            </h2>
            <SidebarMenu>
            
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <Separator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name}</span>
                        {user.email && (
                          <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onLogout?.(user.userId || "")}>
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarResizeHandle />
    </Sidebar>
  );
}
