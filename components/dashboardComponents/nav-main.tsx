"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url?: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: number
    items?: {
      title: string
      url?: string
      component?: React.ReactNode
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} asChild>
              <a href={item.url}>
                {item.icon && <item.icon className="mr-2" />}
                <span>{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            </SidebarMenuButton>

            {item.items && (
              <SidebarMenuSub>
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    {subItem.component ? (
                      subItem.component
                    ) : (
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url || "#"}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    )}
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
