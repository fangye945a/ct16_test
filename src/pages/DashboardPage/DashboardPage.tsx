import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Cpu,
  HardDrive,
  Hash,
  MemoryStick,
  Minus,
  MonitorCog,
  Network,
  Package,
  Server,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { clearResolvedAlerts, deleteAlert, getAlertHistory, getSystemOverview, type Ct16OverviewAlertDto, type Ct16StatusLevel, type Ct16SystemOverviewDto } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CHART_COLORS } from '@/lib/chart-colors';

type TrendDirection = 'up' | 'down' | 'flat';

interface NetworkRateDisplay {
  value: number;
  unit: 'kbps' | 'Mbps' | 'Gbps';
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatNetworkRate(mbps: number): NetworkRateDisplay {
  if (mbps >= 1000) {
    return { value: Math.round((mbps / 1000) * 10) / 10, unit: 'Gbps' };
  }
  if (mbps >= 1) {
    return { value: Math.round(mbps * 10) / 10, unit: 'Mbps' };
  }
  return { value: Math.round(mbps * 1000 * 10) / 10, unit: 'kbps' };
}

function sparklineOption(data: number[], color: string) {
  const safeData = data.length > 0 ? data : [0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);

  const padding = Math.max((max - min) * 0.2, max * 0.1, 0.01);

  return {
    grid: { top: 5, right: 5, bottom: 5, left: 5 },
    xAxis: { type: 'category', show: false, data: safeData.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: Math.max(0, min - padding), max: max + padding },
    series: [
      {
        data: safeData,
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

function calcTrend(data: number[], precision = 1) {
  if (data.length < 2) {
    return { direction: 'flat' as const, value: 0 };
  }
  const factor = 10 ** precision;
  const delta = Math.round((data[data.length - 1] - data[0]) * factor) / factor;
  if (delta === 0) {
    return { direction: 'flat' as const, value: 0 };
  }
  return { direction: delta > 0 ? 'up' as const : 'down' as const, value: Math.abs(delta) };
}

function calcNetworkTrendPercent(data: number[]) {
  const baseline = data[0];
  if (data.length < 2 || baseline < 0.01) {
    return { direction: 'flat' as const, label: '—' };
  }

  const percent = ((data[data.length - 1] - baseline) / baseline) * 100;
  if (Math.abs(percent) >= 100) {
    return {
      direction: percent > 0 ? 'up' as const : 'down' as const,
      label: '波动较大',
    };
  }
  if (Math.abs(percent) < 0.05) {
    return { direction: 'flat' as const, label: '0%' };
  }

  return {
    direction: percent > 0 ? 'up' as const : 'down' as const,
    label: `${Math.abs(Math.round(percent * 10) / 10)}%`,
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
  progressValue,
  trendUnit = '',
  trendFormatter,
  details,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: TrendDirection;
  trendValue: number;
  color: string;
  sparkData: number[];
  progressValue: number;
  trendUnit?: string;
  trendFormatter?: (value: number) => string;
  details?: React.ReactNode;
}) {
  const trendColorClass =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
        <CardContent className="flex h-[176px] flex-col p-5">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                <Icon className="size-4" />
              </div>
              <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              {trend === 'up' ? <TrendingUp className="size-3.5 text-success" /> : null}
              {trend === 'down' ? <TrendingDown className="size-3.5 text-destructive" /> : null}
              {trend === 'flat' ? <Minus className="size-3.5 text-muted-foreground" /> : null}
              <span
                className={`text-xs font-medium ${trendColorClass}`}
              >
                {trendFormatter ? trendFormatter(trendValue) : `${trendValue}${unit === '%' ? '%' : trendUnit}`}
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1.5">
              <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
              <div className="text-sm font-medium text-muted-foreground">{unit}</div>
            </div>
            <div className="h-12 w-24">
              <ReactECharts option={sparklineOption(sparkData, color)} style={{ height: 48, width: 96 }} />
            </div>
          </div>
          <div className="mt-auto flex h-8 items-end">
            {details ?? <Progress value={progressValue} className="w-full h-1.5" />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const EMPTY_OVERVIEW: Ct16SystemOverviewDto = {
  device: {
    deviceName: 'CT16 控制器',
    model: 'CT16',
    serialNumber: '未烧录',
    systemVersion: 'unknown',
    firmwareVersion: '未接入',
  },
  status: {
    overallStatus: 'normal',
    statusMessage: '系统概览初始化中',
    uptimeSeconds: 0,
    sampledAt: '',
  },
  metrics: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkInMbps: 0,
    networkOutMbps: 0,
  },
  trends: {
    cpu: Array.from({ length: 10 }, () => 0),
    memory: Array.from({ length: 10 }, () => 0),
    disk: Array.from({ length: 10 }, () => 0),
    network: Array.from({ length: 10 }, () => 0),
  },
  alerts: [],
};

const STATUS_CONFIG: Record<Ct16StatusLevel, { color: string; bg: string; border: string }> = {
  normal: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  warning: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  error: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<Ct16SystemOverviewDto>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUptimeSeconds, setLiveUptimeSeconds] = useState<number>(0);
  const [alertHistory, setAlertHistory] = useState<Ct16OverviewAlertDto[]>([]);
  const [alertActionError, setAlertActionError] = useState<string | null>(null);
  const [alertActionId, setAlertActionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const next = await getSystemOverview();
        if (!active) {
          return;
        }
        setOverview(next);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : '系统概览加载失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOverview();
    const timer = window.setInterval(() => {
      void loadOverview();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAlertHistory() {
      try {
        const response = await getAlertHistory();
        if (active) {
          setAlertHistory(response.alerts);
          setAlertActionError(null);
        }
      } catch (err) {
        if (active) {
          setAlertActionError(err instanceof Error ? err.message : '告警历史加载失败');
        }
      }
    }

    void loadAlertHistory();
    const timer = window.setInterval(() => void loadAlertHistory(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function handleDeleteAlert(id: string) {
    setAlertActionId(id);
    try {
      await deleteAlert(id);
      setAlertHistory((current) => current.filter((alert) => alert.id !== id));
      setAlertActionError(null);
    } catch (err) {
      setAlertActionError(err instanceof Error ? err.message : '删除告警失败');
    } finally {
      setAlertActionId(null);
    }
  }

  async function handleClearResolvedAlerts() {
    setAlertActionId('clear');
    try {
      await clearResolvedAlerts();
      setAlertHistory((current) => current.filter((alert) => alert.active));
      setAlertActionError(null);
    } catch (err) {
      setAlertActionError(err instanceof Error ? err.message : '清除告警失败');
    } finally {
      setAlertActionId(null);
    }
  }

  useEffect(() => {
    function updateLiveUptime() {
      const { uptimeSeconds, sampledAt } = overview.status;
      if (!sampledAt || uptimeSeconds <= 0) {
        setLiveUptimeSeconds(uptimeSeconds);
        return;
      }
      const sampledTime = new Date(sampledAt).getTime();
      const elapsedSeconds = Math.floor((Date.now() - sampledTime) / 1000);
      setLiveUptimeSeconds(Math.max(0, uptimeSeconds + elapsedSeconds));
    }

    updateLiveUptime();
    const timer = window.setInterval(updateLiveUptime, 1000);
    return () => window.clearInterval(timer);
  }, [overview.status.uptimeSeconds, overview.status.sampledAt]);

  const statusAppearance = STATUS_CONFIG[overview.status.overallStatus];
  const cpuTrend = calcTrend(overview.trends.cpu);
  const memoryTrend = calcTrend(overview.trends.memory);
  const diskTrend = calcTrend(overview.trends.disk);
  const networkTrend = calcNetworkTrendPercent(overview.trends.network);
  const networkRate = formatNetworkRate(
    overview.metrics.networkInMbps + overview.metrics.networkOutMbps,
  );

  const alertLevelIcon = {
    warning: <AlertTriangle className="size-4 text-warning" />,
    error: <AlertCircle className="size-4 text-destructive" />,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${statusAppearance.bg} ${statusAppearance.border}`}
      >
        <span className="relative flex size-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${overview.status.overallStatus === 'normal' ? 'animate-ping bg-success' : overview.status.overallStatus === 'warning' ? 'animate-ping bg-warning' : 'animate-ping bg-destructive'}`} />
          <span className={`relative inline-flex size-2.5 rounded-full ${overview.status.overallStatus === 'normal' ? 'bg-success' : overview.status.overallStatus === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
        </span>
        <span className={`text-sm font-semibold ${statusAppearance.color}`}>{overview.status.statusMessage}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          运行时长: {formatUptime(liveUptimeSeconds)}
        </span>
      </motion.div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
            <AlertCircle className="size-4" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: Server, label: '设备名称', value: overview.device.deviceName },
          { icon: Package, label: '型号', value: overview.device.model },
          { icon: Hash, label: '序列号', value: overview.device.serialNumber },
          { icon: MonitorCog, label: '系统版本', value: overview.device.systemVersion },
          { icon: Clock, label: '固件版本', value: overview.device.firmwareVersion },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/40 px-3 py-2.5"
          >
            <item.icon className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="truncate text-sm font-medium">{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="CPU 使用率"
          value={overview.metrics.cpuUsage}
          unit="%"
          icon={Cpu}
          trend={cpuTrend.direction}
          trendValue={cpuTrend.value}
          color={CHART_COLORS[0]}
          sparkData={overview.trends.cpu}
          progressValue={overview.metrics.cpuUsage}
        />
        <MetricCard
          title="内存使用率"
          value={overview.metrics.memoryUsage}
          unit="%"
          icon={MemoryStick}
          trend={memoryTrend.direction}
          trendValue={memoryTrend.value}
          color={CHART_COLORS[1]}
          sparkData={overview.trends.memory}
          progressValue={overview.metrics.memoryUsage}
        />
        <MetricCard
          title="磁盘使用率"
          value={overview.metrics.diskUsage}
          unit="%"
          icon={HardDrive}
          trend={diskTrend.direction}
          trendValue={diskTrend.value}
          color={CHART_COLORS[2]}
          sparkData={overview.trends.disk}
          progressValue={overview.metrics.diskUsage}
        />
        <MetricCard
          title="网络流量"
          value={networkRate.value}
          unit={networkRate.unit}
          icon={Network}
          trend={networkTrend.direction}
          trendValue={0}
          trendFormatter={() => networkTrend.label}
          color={CHART_COLORS[3]}
          sparkData={overview.trends.network}
          progressValue={Math.min(
            (overview.metrics.networkInMbps + overview.metrics.networkOutMbps) * 10,
            100,
          )}
        />
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-warning" />
            告警事件
            <Badge variant="outline" className="ml-1">历史 {alertHistory.length}</Badge>
            {alertHistory.some((alert) => !alert.active) ? (
              <Button variant="outline" size="sm" className="ml-auto h-8 gap-1.5" disabled={alertActionId !== null} onClick={() => void handleClearResolvedAlerts()}>
                <Trash2 className="size-3.5" />
                清除已恢复
              </Button>
            ) : null}
            {loading ? (
              <Badge variant="outline" className="ml-2">加载中</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alertActionError ? (
            <div className="border-b border-border/30 px-5 py-3 text-sm text-destructive">{alertActionError}</div>
          ) : null}
          {alertHistory.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              暂无告警历史记录。
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {alertHistory.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex items-start gap-3 px-5 py-3"
                >
                  {alertLevelIcon[alert.level]}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${alert.level === 'error' ? 'border-destructive/50 text-destructive' : 'border-warning/50 text-warning'}`}>
                        {alert.level === 'error' ? 'ERROR' : 'WARN'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.source}</span>
                      <Badge variant="outline" className={alert.active ? 'border-warning/50 text-warning' : 'text-muted-foreground'}>
                        {alert.active ? '活动' : '已恢复'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString('zh-CN')}
                      {alert.resolvedAt ? `，恢复于 ${new Date(alert.resolvedAt).toLocaleString('zh-CN')}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={alertActionId !== null} onClick={() => void handleDeleteAlert(alert.id)} aria-label="清除告警记录">
                    <Trash2 className="size-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
