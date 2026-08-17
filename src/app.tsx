import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import AuthGuard from "@/components/AuthGuard";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import SetupPasswordPage from "@/pages/SetupPasswordPage/SetupPasswordPage";
import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import TopologyPage from "@/pages/TopologyPage/TopologyPage";
import FileLogPage from "@/pages/FileLogPage/FileLogPage";
import OtaUpgradePage from "@/pages/OtaUpgradePage/OtaUpgradePage";
import NodeRedPage from "@/pages/NodeRedPage/NodeRedPage";
import PicoClawPage from "@/pages/PicoClawPage/PicoClawPage";
import SettingsPage from "@/pages/SettingsPage/SettingsPage";
import DeviceModelPage from "@/pages/DeviceModelPage/DeviceModelPage";
import NorthboundPlatformPage from "@/pages/NorthboundPlatformPage/NorthboundPlatformPage";
import BatchOperationsPage from "@/pages/BatchOperationsPage/BatchOperationsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPasswordPage />} />
      <Route element={<AuthGuard><Layout /></AuthGuard>}>
        <Route index element={<DashboardPage />} />
        <Route path="topology" element={<TopologyPage />} />
        <Route path="files-logs" element={<FileLogPage />} />
        <Route path="ota" element={<OtaUpgradePage />} />
        <Route path="nodered" element={<NodeRedPage />} />
        <Route path="picoclaw" element={<PicoClawPage />} />
        <Route path="device-models" element={<DeviceModelPage />} />
        <Route path="northbound-platforms" element={<NorthboundPlatformPage />} />
        <Route path="batch-operations" element={<BatchOperationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
