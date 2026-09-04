import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage'
import LoginPage from '@/pages/LoginPage/LoginPage'
import DashboardPage from '@/modules/dashboard'
import TopologyPage from '@/modules/topology'
import LogsPage from '@/modules/logs'
import OtaUpgradePage from '@/modules/ota'
import NodeRedPage from '@/modules/nodered'
import AgentPage from '@/modules/agent'
import SettingsPage from '@/modules/settings'
import NetworkSettingsPage from '@/modules/network'
import DeviceModelPage from '@/modules/device-models'
import CloudServicePage from '@/modules/cloud'
import BatchOperationsPage from '@/pages/BatchOperationsPage/BatchOperationsPage'
import { getSystemAppearance } from '@/api/appearance'
import { applyCt16Appearance, CT16_APPEARANCE_EVENT, getCt16Appearance, getCt16Favicon } from '@/lib/appearance'
import { Toaster } from '@/components/ui/sonner'
import { installMockRuntime } from '@/api/mockRuntime'

installMockRuntime()

export default function App() {
  useEffect(() => {
    const updateDocumentAppearance = () => {
      const appearance = getCt16Appearance()
      document.title = appearance.systemName

      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) {
        favicon.href = getCt16Favicon(appearance)
      }
    }

    updateDocumentAppearance()
    void getSystemAppearance()
      .then((appearance) => {
        const cachedAppearance = getCt16Appearance()
        const needsLogoMigration =
          cachedAppearance.logoType === 'custom' &&
          cachedAppearance.logoImage.startsWith('data:') &&
          appearance.logoType !== 'custom'
        if (!needsLogoMigration) {
          applyCt16Appearance(appearance)
        }
      })
      .catch(() => undefined)
    window.addEventListener(CT16_APPEARANCE_EVENT, updateDocumentAppearance)
    return () => window.removeEventListener(CT16_APPEARANCE_EVENT, updateDocumentAppearance)
  }, [])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="topology" element={<TopologyPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="ota" element={<OtaUpgradePage />} />
          <Route path="nodered" element={<NodeRedPage />} />
          <Route path="agent" element={<AgentPage />} />
          <Route path="device-models" element={<DeviceModelPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="network" element={<NetworkSettingsPage />} />
          <Route path="northbound-platforms" element={<CloudServicePage />} />
          <Route path="batch-operations" element={<BatchOperationsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
