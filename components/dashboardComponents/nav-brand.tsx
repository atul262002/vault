"use client"

import * as React from "react"
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { Separator } from "../ui/separator"

export function NavBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <span className="text-lg font-semibold flex items-center gap-1 mr-2">
          <img
            src="/logo.svg"
            width={25}
            height={25}
            className="rounded-lg pt-2 h-12 w-12"
            alt="Vault Logo"
          />
          <span >Vault</span>
        </span>
      </SidebarMenuItem>
      <Separator />
    </SidebarMenu>
  )
}
