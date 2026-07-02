import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactECharts from 'echarts-for-react';
import {
  Bot,
  Cpu,
  Zap,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  Plus,
  Settings,
  ToggleLeft,
  ToggleRight,
  Download,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
} from 'lucide-react';
import {
  MOCK_SKILLS,
  MOCK_MARKET_SKILLS,
  MOCK_AGENT_CONFIG,
  MOCK_AGENT_STATS,
  type ISkill,
  type IAgentConfig,
} from '@/data/picoclaw';
import { CHART_COLORS } from '@/lib/chart-colors';
import { toast } from 'sonner';
import { Image } from '@/components/ui/image';

export default function PicoClawPage() {
  const [agentConfig, setAgentConfig] = useState<IAgentConfig>(MOCK_AGENT_CONFIG);
  const [skills, setSkills] = useState<ISkill[]>(MOCK_SKILLS);
  const [marketSkills, setMarketSkills] = useState<ISkill[]>(MOCK_MARKET_SKILLS);
  const [stats, setStats] = useState(MOCK_AGENT_STATS);
  const [configSkill, setConfigSkill] = useState<ISkill | null>(null);
  const [activeTab, setActiveTab] = useState('installed');

  // Simulate stats update
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        totalCalls: prev.totalCalls + Math.floor(Math.random() * 5),
        avgResponseTime: Math.max(30, prev.avgResponseTime + (Math.random() - 0.5) * 2),
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'enabled' ? 'disabled' as const : 'enabled' as const } : s
      )
    );
    const skill = skills.find((s) => s.id === id);
    if (skill) {
      toast.success(`${skill.name} 已${skill.status === 'enabled' ? '停用' : '启用'}`);
    }
  };

  const installSkill = (skill: ISkill) => {
    setMarketSkills((prev) => prev.filter((s) => s.id !== skill.id));
    setSkills((prev) => [...prev, { ...skill, status: 'enabled' as const }]);
    toast.success(`已安装: ${skill.name}`);
  };

  const saveAgentConfig = () => {
    toast.success('智能体配置已保存');
  };

  const saveSkillConfig = () => {
    setConfigSkill(null);
    toast.success('技能配置已保存');
  };

  const barOption = {
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: {
      type: 'category',
      data: stats.dailyLabels,
      axisLabel: { color: '#888', fontSize: 10, interval: 3 },
      axisLine: { lineStyle: { color: '#333' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#888', fontSize: 10 },
      splitLine: { lineStyle: { color: '#222' } },
    },
    series: [
      {
        data: stats.dailyCalls,
        type: 'bar',
        itemStyle: {
          color: CHART_COLORS[0],
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '60%',
      },
    ],
  };

  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        center: ['50%', '60%'],
        radius: '85%',
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          show: true,
          lineStyle: {
            width: 12,
            color: [
              [0.3, '#F43F5E'],
              [0.7, '#F97316'],
              [1, '#00B894'],
            ],
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          color: '#00B894',
          offsetCenter: [0, '50%'],
          formatter: '{value}%',
        },
        data: [{ value: Math.round(stats.successRate * 10) / 10 }],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Agent Config */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="size-4 text-primary" />
            智能体参数配置
          </CardTitle>
          <CardDescription>配置 PicoClaw 端侧智能体的运行参数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">模型选择</Label>
              <Select
                value={agentConfig.model}
                onValueChange={(v) => setAgentConfig((prev) => ({ ...prev, model: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TinyLLM-1B">TinyLLM-1B</SelectItem>
                  <SelectItem value="MiniGPT-3B">MiniGPT-3B</SelectItem>
                  <SelectItem value="Phi-2">Phi-2 (2.7B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">上下文长度: {agentConfig.contextLength}</Label>
              <Slider
                value={[agentConfig.contextLength]}
                onValueChange={([v]) => setAgentConfig((prev) => ({ ...prev, contextLength: v }))}
                min={512}
                max={4096}
                step={512}
                className="py-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">温度: {agentConfig.temperature.toFixed(1)}</Label>
              <Slider
                value={[agentConfig.temperature]}
                onValueChange={([v]) => setAgentConfig((prev) => ({ ...prev, temperature: v }))}
                min={0}
                max={2}
                step={0.1}
                className="py-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">最大 Token 数</Label>
              <Input
                type="number"
                value={agentConfig.maxTokens}
                onChange={(e) =>
                  setAgentConfig((prev) => ({ ...prev, maxTokens: Number(e.target.value) }))
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={saveAgentConfig}>
              <Settings className="size-3.5 mr-1" />
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: '总调用次数', value: stats.totalCalls.toLocaleString(), color: CHART_COLORS[0] },
          { icon: CheckCircle, label: '成功率', value: `${stats.successRate}%`, color: '#00B894' },
          { icon: Clock, label: '平均响应时间', value: `${Math.round(stats.avgResponseTime)}ms`, color: CHART_COLORS[2] },
          { icon: Activity, label: '活跃技能', value: `${skills.filter((s) => s.status === 'enabled').length}/${skills.length}`, color: CHART_COLORS[3] },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold tabular-nums mt-1">{item.value}</p>
                  </div>
                  <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                    <item.icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              近 24 小时调用量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={barOption} style={{ height: 200 }} />
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="size-4 text-success" />
              成功率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={gaugeOption} style={{ height: 200 }} />
          </CardContent>
        </Card>
      </div>

      {/* Skills Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="installed" className="text-xs">
                已安装技能 ({skills.length})
              </TabsTrigger>
              <TabsTrigger value="market" className="text-xs">
                技能市场 ({marketSkills.length})
              </TabsTrigger>
            </TabsList>
        </CardHeader>
        <CardContent className="pt-4">
          <TabsContent value="installed" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="border-border/40 bg-card/60 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="size-12 rounded-lg overflow-hidden shrink-0 bg-muted/40 border border-border/30">
                          <Image
                            src={skill.imageUrl}
                            alt={skill.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold truncate">{skill.name}</h4>
                            <button
                              onClick={() => toggleSkill(skill.id)}
                              className="shrink-0"
                            >
                              {skill.status === 'enabled' ? (
                                <ToggleRight className="size-5 text-success" />
                              ) : (
                                <ToggleLeft className="size-5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {skill.version}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {skill.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {skill.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => setConfigSkill(skill)}
                          >
                            <Settings className="size-3 mr-1" />
                            配置参数
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="market" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketSkills.map((skill, i) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="border-border/40 bg-card/60 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="size-12 rounded-lg overflow-hidden shrink-0 bg-muted/40 border border-border/30">
                          <Image
                            src={skill.imageUrl}
                            alt={skill.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold">{skill.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {skill.version}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {skill.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {skill.description}
                          </p>
                          <Button
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => installSkill(skill)}
                          >
                            <Download className="size-3 mr-1" />
                            安装
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </CardContent>
      </Card>
        </Tabs>

      {/* Skill Config Dialog */}
      <Dialog open={!!configSkill} onOpenChange={() => setConfigSkill(null)}>
        <DialogContent className="max-w-md border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="size-4 text-primary" />
              {configSkill?.name} - 参数配置
            </DialogTitle>
          </DialogHeader>
          {configSkill && (
            <div className="space-y-4">
              {Object.entries(configSkill.config).map(([key, val]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs capitalize">{key}</Label>
                  {typeof val === 'boolean' ? (
                    <button
                      onClick={() => {
                        setConfigSkill({
                          ...configSkill,
                          config: { ...configSkill.config, [key]: !val },
                        });
                      }}
                    >
                      {val ? (
                        <ToggleRight className="size-5 text-success" />
                      ) : (
                        <ToggleLeft className="size-5 text-muted-foreground" />
                      )}
                    </button>
                  ) : typeof val === 'number' ? (
                    <Input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        setConfigSkill({
                          ...configSkill,
                          config: { ...configSkill.config, [key]: Number(e.target.value) },
                        })
                      }
                      className="h-9 text-sm"
                    />
                  ) : (
                    <Input
                      value={String(val)}
                      onChange={(e) =>
                        setConfigSkill({
                          ...configSkill,
                          config: { ...configSkill.config, [key]: e.target.value },
                        })
                      }
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}
              <Button onClick={saveSkillConfig} className="w-full">
                保存配置
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
