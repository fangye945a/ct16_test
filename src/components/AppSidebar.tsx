import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Share2,
  ScrollText,
  Upload,
  Workflow,
  Bot,
  Settings,
  Boxes,
  EthernetPort,
  CloudCog,
  ListChecks,
} from "lucide-react";
import { CT16_APPEARANCE_EVENT, getCt16Appearance } from "@/lib/appearance";
import { BrandLogo } from "@/components/BrandLogo";

const NAV_ITEMS = [
  { path: "/", label: "系统概览", icon: LayoutDashboard },
  { path: "/topology", label: "系统拓扑", icon: Share2 },
  { path: "/logs", label: "日志与诊断", icon: ScrollText },
  { path: "/ota", label: "OTA 升级", icon: Upload },
  { path: "/device-models", label: "南向设备接入", icon: Boxes },
  { path: "/northbound-platforms", label: "北向平台对接", icon: CloudCog },
  { path: "/batch-operations", label: "批量运维管理", icon: ListChecks },
  { path: "/nodered", label: "可视化编程", icon: Workflow },
  { path: "/agent", label: "智能体配置", icon: Bot },
  { path: "/network", label: "网络设置", icon: EthernetPort },
  { path: "/settings", label: "系统设置", icon: Settings },
];

export default function AppSidebar() {
  const { pathname } = useLocation();
  const [appearance, setAppearance] = useState(getCt16Appearance);

  useEffect(() => {
    const handler = () => {
      setAppearance(getCt16Appearance());
    };
    window.addEventListener(CT16_APPEARANCE_EVENT, handler);
    return () => window.removeEventListener(CT16_APPEARANCE_EVENT, handler);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className={`size-8 shrink-0 rounded-md text-primary-foreground flex items-center justify-center ${appearance.logoType === 'custom' ? 'bg-transparent' : 'bg-primary'}`}>
            <BrandLogo
              logoType={appearance.logoType}
              logoImage={appearance.logoImage}
              className="size-[18px]"
            />
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-semibold truncate">
              {appearance.systemName}
            </div>
            <div className="text-xs text-muted-foreground">
              CT16 · OpenHarmony
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? pathname === "/"
                  : pathname === item.path ||
                    pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                  >
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className="flex items-center gap-2"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            A
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-xs font-medium truncate">Admin</div>
            <div className="text-xs text-muted-foreground">系统管理员</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
