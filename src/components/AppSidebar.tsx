import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Share2,
  FolderTree,
  Upload,
  Workflow,
  Bot,
  Settings,
  Boxes,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: '系统概览', icon: LayoutDashboard },
  { path: '/topology', label: '系统拓扑', icon: Share2 },
  { path: '/files-logs', label: '文件日志', icon: FolderTree },
  { path: '/ota', label: 'OTA 升级', icon: Upload },
  { path: '/device-models', label: '设备模型管理', icon: Boxes },
  { path: '/nodered', label: '可视化编程', icon: Workflow },
  { path: '/picoclaw', label: '智能体配置', icon: Bot },
  { path: '/settings', label: '系统设置', icon: Settings },
];

function LogoIcon({ type }: { type: string }) {
  if (type === 'gear') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (type === 'hexagon') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    );
  }
  // default: chip
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const [systemName, setSystemName] = useState(() => localStorage.getItem('zaihong:systemName') || '在鸿设备管理系统');
  const [logoType, setLogoType] = useState(() => localStorage.getItem('zaihong:logoType') || 'chip');

  useEffect(() => {
    const handler = () => {
      setSystemName(localStorage.getItem('zaihong:systemName') || '在鸿设备管理系统');
      setLogoType(localStorage.getItem('zaihong:logoType') || 'chip');
    };
    window.addEventListener('zaihong:appearance-changed', handler);
    return () => window.removeEventListener('zaihong:appearance-changed', handler);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-8 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <LogoIcon type={logoType} />
          </div>
          <div className="flex-1 min-w-0 self-center group-data-[state=collapsed]:hidden">
            <div className="text-base font-semibold truncate">{systemName}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? pathname === '/'
                  : pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className="flex items-center gap-2"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
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
          <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            A
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-medium truncate">Admin</div>
            <div className="text-sm text-muted-foreground">系统管理员</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
