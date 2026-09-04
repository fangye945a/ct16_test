import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Share2,
  Cpu,
  Cable,
} from 'lucide-react';
import NetworkTopology from './NetworkTopology';
import ModuleTopology from './ModuleTopology';
import DeviceTopology from './DeviceTopology';
import NodeDetailDrawer from './NodeDetailDrawer';
import type { IDeviceNode, INetworkDevice } from '@/data/topology';

type TabKey = 'network' | 'device' | 'module';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'module', label: '模块拓扑', icon: Cable },
  { key: 'device', label: '设备拓扑', icon: Cpu },
  { key: 'network', label: '组网拓扑', icon: Share2 },
];

export default function TopologyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('module');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<INetworkDevice | IDeviceNode | null>(null);
  const [selectedDeviceUpdater, setSelectedDeviceUpdater] = useState<
    ((node: IDeviceNode) => void) | null
  >(null);
  const [drawerTab, setDrawerTab] = useState<'network' | 'device'>('network');

  const handleNetworkNodeSelect = (node: INetworkDevice) => {
    setSelectedNode(node);
    setDrawerTab('network');
    setDrawerOpen(true);
  };

  const handleDeviceNodeSelect = (
    node: IDeviceNode,
    updateNode: (node: IDeviceNode) => void,
  ) => {
    setSelectedNode(node);
    setSelectedDeviceUpdater(() => updateNode);
    setDrawerTab('device');
    setDrawerOpen(true);
  };

  const handleDeviceNodeUpdate = useCallback((node: IDeviceNode) => {
    setSelectedNode(node);
    selectedDeviceUpdater?.(node);
  }, [selectedDeviceUpdater]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as TabKey;
          setActiveTab(nextTab);
          if (nextTab !== 'device') setDrawerOpen(false);
        }}
        className="w-full"
      >
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
              <DeviceTopology
                active={activeTab === 'device'}
                onNodeSelect={handleDeviceNodeSelect}
              />
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
        node={selectedNode}
        tab={drawerTab}
        onDeviceNodeUpdate={handleDeviceNodeUpdate}
      />
    </div>
  );
}
