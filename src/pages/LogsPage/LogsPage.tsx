import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileSearch, AlertTriangle, Terminal, Activity } from 'lucide-react';
import LogFileQueryPage from './LogFileQueryPage';
import ExceptionLogQueryPage from './ExceptionLogQueryPage';
import KernelLogAnalysisPage from './KernelLogAnalysisPage';
import SystemLogAnalysisPage from './SystemLogAnalysisPage';

type TabKey = 'file-query' | 'exception-query' | 'kernel' | 'system';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'file-query', label: '日志文件查询', icon: FileSearch },
  { key: 'exception-query', label: '异常日志查询', icon: AlertTriangle },
  { key: 'kernel', label: '内核日志', icon: Terminal },
  { key: 'system', label: '系统日志', icon: Activity },
];

export default function LogsPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab: TabKey = TABS.some((tab) => tab.key === requestedTab)
    ? (requestedTab as TabKey)
    : 'file-query';
  const initialKeyword = searchParams.get('keyword') ?? '';
  const autoStart = searchParams.get('autoStart') === '1';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  return (
    <div className="flex h-full flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-1 flex-col gap-4"
      >
        <TabsList className="w-full max-w-2xl bg-[#F3F4F6] rounded-2xl p-1 h-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#9CA3AF] hover:text-[#111827]'
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <TabsContent value="file-query" key="file-query" className="h-full mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <LogFileQueryPage />
              </motion.div>
            </TabsContent>

            <TabsContent value="exception-query" key="exception-query" className="h-full mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ExceptionLogQueryPage />
              </motion.div>
            </TabsContent>

            <TabsContent value="kernel" key="kernel" className="h-full mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <KernelLogAnalysisPage />
              </motion.div>
            </TabsContent>

            <TabsContent value="system" key="system" className="h-full mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <SystemLogAnalysisPage initialKeyword={initialKeyword} autoStart={autoStart} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}
