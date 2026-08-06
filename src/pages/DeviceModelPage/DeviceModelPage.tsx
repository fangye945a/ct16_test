import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type IDeviceModel } from '@/data/device-models';
import { GetPrototypeDeviceModels, SavePrototypeDeviceModels } from '@/services/prototypeDeviceModels';
import DeviceInstanceManagement from './DeviceInstanceManagement';
import DeviceModelCatalog from './components/DeviceModelCatalog';

export default function DeviceModelPage() {
  const [models, setModels] = useState<IDeviceModel[]>(() => GetPrototypeDeviceModels());

  useEffect(() => {
    SavePrototypeDeviceModels(models);
  }, [models]);

  return (
    <Tabs defaultValue="instances" className="w-full space-y-6">
      <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl bg-muted/60 p-1">
        <TabsTrigger value="instances" className="py-2.5 text-sm">设备实例</TabsTrigger>
        <TabsTrigger value="models" className="py-2.5 text-sm">设备模型</TabsTrigger>
      </TabsList>
      <TabsContent value="instances" className="mt-0">
        <DeviceInstanceManagement models={models} />
      </TabsContent>
      <TabsContent value="models" className="mt-0">
        <DeviceModelCatalog models={models} setModels={setModels} />
      </TabsContent>
    </Tabs>
  );
}
