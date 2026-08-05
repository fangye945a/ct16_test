import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReactECharts from 'echarts-for-react';
import {
  Cpu,
  HardDrive,
  Network,
  MemoryStick,
  Clock,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Server,
  Hash,
  Package,
  MonitorCog,
} from 'lucide-react';
import { MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS, MOCK_ALERT_EVENTS, type IAlertEvent, type ISystemInfo, type ISystemMetrics } from '@/data/dashboard';
import { CHART_COLORS } from '@/lib/chart-colors';
import { GetPrototypeOverview } from '@/services/prototypeRuntime';

function formatUptime(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sparklineOption(data: number[], color: string) {
  return {
    grid: { top: 5, right: 5, bottom: 5, left: 5 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: Math.min(...data) - 2, max: Math.max(...data) + 2 },
    series: [
      {
        data,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` },
            ],
          },
        },
      },
    ],
  };
}

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  color,
  sparkData,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down';
  trendValue: number;
  color: string;
  sparkData: number[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                <Icon className="size-4" />
              </div>
              <span className="text-base text-muted-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <TrendingUp className="size-3.5 text-success" />
              ) : (
                <TrendingDown className="size-3.5 text-destructive" />
              )}
              <span className={`text-sm font-medium ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                {trendValue}%
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
              <div className="text-sm text-muted-foreground">{unit}</div>
            </div>
            <div className="w-24 h-12">
              <ReactECharts option={sparklineOption(sparkData, color)} style={{ height: 48, width: 96 }} />
            </div>
          </div>
          <Progress value={value} className="mt-3 h-1.5" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ISystemMetrics>(MOCK_SYSTEM_METRICS);
  const [systemInfo, setSystemInfo] = useState<ISystemInfo>(MOCK_SYSTEM_INFO);
  const [alerts, setAlerts] = useState<IAlertEvent[]>(MOCK_ALERT_EVENTS);
  const [uptime, setUptime] = useState(Date.now() - new Date(systemInfo.startedAt).getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Date.now() - new Date(systemInfo.startedAt).getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [systemInfo.startedAt]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const overview = await GetPrototypeOverview();
      if (!active) {
        return;
      }
      setMetrics(overview.metrics);
      setSystemInfo(overview.systemInfo);
      setAlerts(overview.alerts);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const statusConfig = {
    normal: { label: '系统运行正常', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
    warning: { label: '系统负载较高', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
    error: { label: '系统异常', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  };

  const sc = statusConfig[metrics.overallStatus];

  const alertLevelIcon = {
    warning: <AlertTriangle className="size-4 text-warning" />,
    error: <AlertCircle className="size-4 text-destructive" />,
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${sc.bg} ${sc.border}`}
      >
        <span className={`relative flex size-2.5`}>
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${metrics.overallStatus === 'normal' ? 'animate-ping bg-success' : metrics.overallStatus === 'warning' ? 'animate-ping bg-warning' : 'animate-ping bg-destructive'}`} />
          <span className={`relative inline-flex rounded-full size-2.5 ${metrics.overallStatus === 'normal' ? 'bg-success' : metrics.overallStatus === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
        </span>
        <span className={`text-sm font-semibold ${sc.color}`}>{sc.label}</span>
        <span className="text-sm text-muted-foreground ml-auto">运行时长: {formatUptime(uptime)}</span>
      </motion.div>

      {/* Device Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: Server, label: '设备名称', value: systemInfo.deviceName },
          { icon: Package, label: '型号', value: systemInfo.model },
          { icon: Hash, label: '序列号', value: systemInfo.serialNumber },
          { icon: MonitorCog, label: '系统版本', value: systemInfo.systemVersion },
          { icon: Clock, label: '固件版本', value: systemInfo.firmwareVersion },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30"
          >
            <item.icon className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="text-base font-medium truncate">{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="CPU 使用率"
          value={metrics.cpuUsage}
          unit="%"
          icon={Cpu}
          trend={metrics.cpuUsage > 50 ? 'up' : 'down'}
          trendValue={Math.abs(Math.round((metrics.cpuTrend[9] - metrics.cpuTrend[0]) * 10) / 10)}
          color={CHART_COLORS[0]}
          sparkData={metrics.cpuTrend}
        />
        <MetricCard
          title="内存使用率"
          value={metrics.memoryUsage}
          unit="%"
          icon={MemoryStick}
          trend={metrics.memoryUsage > 60 ? 'up' : 'down'}
          trendValue={Math.abs(Math.round((metrics.memoryTrend[9] - metrics.memoryTrend[0]) * 10) / 10)}
          color={CHART_COLORS[1]}
          sparkData={metrics.memoryTrend}
        />
        <MetricCard
          title="磁盘使用率"
          value={metrics.diskUsage}
          unit="%"
          icon={HardDrive}
          trend="up"
          trendValue={0.5}
          color={CHART_COLORS[2]}
          sparkData={metrics.diskTrend}
        />
        <MetricCard
          title="网络流量"
          value={Math.round((metrics.networkIn + metrics.networkOut) * 10) / 10}
          unit="Mbps"
          icon={Network}
          trend={metrics.networkIn > 10 ? 'up' : 'down'}
          trendValue={Math.abs(Math.round((metrics.networkTrend[9] - metrics.networkTrend[0]) * 10) / 10)}
          color={CHART_COLORS[3]}
          sparkData={metrics.networkTrend}
        />
      </div>

      {/* Alert Events */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            告警事件
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-start gap-3 px-5 py-3"
              >
                {alertLevelIcon[alert.level]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${alert.level === 'error' ? 'border-destructive/50 text-destructive' : 'border-warning/50 text-warning'}`}>
                      {alert.level === 'error' ? 'ERROR' : 'WARN'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{alert.source}</span>
                  </div>
                  <p className="text-base mt-1">{alert.message}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date(alert.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
