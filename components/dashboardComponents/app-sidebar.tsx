"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  MessageCircle,
  PieChart,
  Settings2,
  SquareTerminal,
  ShoppingBag,
} from "lucide-react"
import { NavMain } from "@/components/dashboardComponents/nav-main"
import { NavProjects } from "@/components/dashboardComponents/nav-projects"
import { NavUser } from "@/components/dashboardComponents/nav-user"
import { NavBrand } from "@/components/dashboardComponents/nav-brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,

    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: Bot,

    },
    {
      title: "My Products",
      url: "/myProducts",
      icon: BookOpen,

    },
    {
      title: "My Orders",
      url: "/orders/history",
      icon: ShoppingBag,
    },
    {
      title: "Chats",
      url: "/chats",
      icon: MessageCircle,

    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [navItems, setNavItems] = React.useState(data.navMain);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/user/unread-count");
      if (res.ok) {
        const { count } = await res.json();
        setNavItems((prev) =>
          prev.map((item) =>
            item.title === "Chats" ? { ...item, badge: count } : item
          )
        );
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <NavBrand /> */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
