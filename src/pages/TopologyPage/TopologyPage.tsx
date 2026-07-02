import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Share2,
  Cpu,
  Cable,
} from 'lucide-react';
import NetworkTopology from './NetworkTopology';
import DeviceTopology from './DeviceTopology';
import ModuleTopology from './ModuleTopology';
import NodeDetailDrawer from './NodeDetailDrawer';
import type { INetworkDevice, IDeviceNode } from '@/data/topology';

type TabKey = 'network' | 'device' | 'module';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'network', label: '组网拓扑', icon: Share2 },
  { key: 'device', label: '设备拓扑', icon: Cpu },
  { key: 'module', label: '模块拓扑', icon: Cable },
];

export default function TopologyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('network');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNetworkNode, setSelectedNetworkNode] = useState<INetworkDevice | null>(null);
  const [selectedDeviceNode, setSelectedDeviceNode] = useState<IDeviceNode | null>(null);

  const handleNetworkNodeSelect = (node: INetworkDevice) => {
    setSelectedNetworkNode(node);
    setSelectedDeviceNode(null);
    setDrawerOpen(true);
  };

  const handleDeviceNodeSelect = (node: IDeviceNode) => {
    setSelectedDeviceNode(node);
    setSelectedNetworkNode(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-[#111827] italic">系统拓扑</h1>
          <p className="text-xs text-[#9CA3AF] font-medium mt-1">组网拓扑 · 设备拓扑 · 模块拓扑</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
        <TabsList className="w-full max-w-md bg-[#F3F4F6] rounded-2xl p-1 h-auto">
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

        <AnimatePresence mode="wait">
          <TabsContent value="network" key="network" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <NetworkTopology onNodeSelect={handleNetworkNodeSelect} />
            </motion.div>
          </TabsContent>

          <TabsContent value="device" key="device" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DeviceTopology onNodeSelect={handleDeviceNodeSelect} />
            </motion.div>
          </TabsContent>

          <TabsContent value="module" key="module" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ModuleTopology />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Node detail drawer */}
      <NodeDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        node={selectedNetworkNode || selectedDeviceNode}
        tab={selectedNetworkNode ? 'network' : 'device'}
      />
    </div>
  );
}
