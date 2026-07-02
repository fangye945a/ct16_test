import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Clock, Wifi, Activity } from 'lucide-react';
import { MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS } from '@/data/dashboard';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusConfig = {
    normal: { label: '正常', variant: 'default' as const, className: 'bg-success text-success-foreground' },
    warning: { label: '警告', variant: 'default' as const, className: 'bg-warning text-warning-foreground' },
    error: { label: '异常', variant: 'default' as const, className: 'bg-destructive text-destructive-foreground' },
  };

  const s = statusConfig[MOCK_SYSTEM_METRICS.overallStatus];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="hidden sm:flex items-center gap-2">
            <Wifi className="size-4 text-success" />
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
            <span>{formatDate(now)}</span>
            <span>{formatTime(now)}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              A
            </div>
            <span className="hidden sm:inline text-sm text-muted-foreground">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
