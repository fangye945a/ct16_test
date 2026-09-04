import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Activity, Clock, LogOut, User } from 'lucide-react'
import { clearSessionToken } from '@/api/client'
import { getTimeSettings } from '@/api/settings'
import { MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS } from '@/data/dashboard'
import { BrandLogo } from '@/components/BrandLogo'
import { CT16_APPEARANCE_EVENT, getCt16Appearance } from '@/lib/appearance'

function formatDeviceDateTime(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T');
  return { date: date.replaceAll('-', '/'), time };
}

export default function Header() {
  const navigate = useNavigate();
  const [deviceTime, setDeviceTime] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [appearance, setAppearance] = useState(getCt16Appearance);

  useEffect(() => {
    let active = true;
    const loadDeviceTime = async () => {
      try {
        const settings = await getTimeSettings();
        if (active) setDeviceTime(settings.systemTime);
      } catch {
        // 设备时间暂时不可用时保留空白，避免显示访问端时间。
      }
    };
    void loadDeviceTime();
    const timer = setInterval(() => void loadDeviceTime(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleAppearanceChange = () => setAppearance(getCt16Appearance());
    window.addEventListener(CT16_APPEARANCE_EVENT, handleAppearanceChange);
    return () => window.removeEventListener(CT16_APPEARANCE_EVENT, handleAppearanceChange);
  }, []);

  const handleLogout = () => {
    clearSessionToken();
    navigate('/login', { replace: true });
  };

  const statusConfig = {
    normal: { label: '正常', variant: 'default' as const, className: 'bg-success text-success-foreground' },
    warning: { label: '警告', variant: 'default' as const, className: 'bg-warning text-warning-foreground' },
    error: { label: '异常', variant: 'default' as const, className: 'bg-destructive text-destructive-foreground' },
  };

  const s = statusConfig[MOCK_SYSTEM_METRICS.overallStatus];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="hidden sm:flex items-center gap-2">
            <div className={`size-5 shrink-0 rounded-md text-primary-foreground flex items-center justify-center ${appearance.logoType === 'custom' ? 'bg-transparent' : 'bg-primary'}`}>
              <BrandLogo logoType={appearance.logoType} logoImage={appearance.logoImage} className="size-3.5" />
            </div>
            <span className="text-sm font-medium">{MOCK_SYSTEM_INFO.deviceName}</span>
            <span className="text-xs text-muted-foreground">{MOCK_SYSTEM_INFO.model}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5" />
            <Badge variant="outline" className={`text-xs gap-1 ${s.className}`}>
              <span className="relative flex size-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${MOCK_SYSTEM_METRICS.overallStatus === 'normal' ? 'animate-ping bg-success' : MOCK_SYSTEM_METRICS.overallStatus === 'warning' ? 'animate-ping bg-warning' : 'animate-ping bg-destructive'}`} />
                <span className={`relative inline-flex rounded-full size-1.5 ${MOCK_SYSTEM_METRICS.overallStatus === 'normal' ? 'bg-success' : MOCK_SYSTEM_METRICS.overallStatus === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
              </span>
              {s.label}
            </Badge>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{formatDeviceDateTime(deviceTime).date}</span>
            <span>{formatDeviceDateTime(deviceTime).time}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 cursor-pointer hover:opacity-80 outline-none">
                <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  A
                </div>
                <span className="hidden sm:inline text-sm text-muted-foreground">管理员</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="text-xs">
                <User className="size-3.5" />
                管理员
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs text-destructive focus:text-destructive"
                onSelect={() => setShowLogoutDialog(true)}
              >
                <LogOut className="size-3.5" />
                退出系统
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认退出系统</AlertDialogTitle>
          <AlertDialogDescription>
            确定要退出当前登录吗？退出后需要重新输入账号密码才能访问系统。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
