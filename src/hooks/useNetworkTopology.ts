import { useState, useEffect, useCallback } from 'react'
import { getCustomNetworkDevices } from '@/api'
import { mapCustomDtoListToNetworkDevices, type INetworkDevice } from '@/data/topology'

export interface NetworkLink {
  id: string
  source: string
  target: string
  label: string
  status: 'active' | 'inactive'
}

export interface NetworkTopologyData {
  devices: INetworkDevice[]
  links: NetworkLink[]
  master: INetworkDevice | undefined
  slaves: INetworkDevice[]
  onlineCount: number
  totalCount: number
}

export function useNetworkTopology() {
  const [data, setData] = useState<NetworkTopologyData>({
    devices: [],
    links: [],
    master: undefined,
    slaves: [],
    onlineCount: 0,
    totalCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNetworkDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const list = await getCustomNetworkDevices()
      const { devices, links } = mapCustomDtoListToNetworkDevices(list)

      const master = devices.find((d) => d.role === 'master')
      const slaves = devices.filter((d) => d.role === 'slave')
      const onlineCount = devices.filter((d) => d.status === 'online').length

      setData({
        devices,
        links,
        master,
        slaves,
        onlineCount,
        totalCount: devices.length,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取组网拓扑失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNetworkDevices()
    // 每 10 秒自动刷新
    const interval = setInterval(fetchNetworkDevices, 10000)
    return () => clearInterval(interval)
  }, [fetchNetworkDevices])

  return { ...data, loading, error, refresh: fetchNetworkDevices }
}
