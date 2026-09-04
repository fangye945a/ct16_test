import { useState, useEffect, useCallback } from 'react'
import {
  getDeviceInstances,
  getDeviceModelInterfaces,
  getDeviceModels,
  readDeviceInstance,
  type Ct16DeviceModelPropertyDto,
} from '@/api/deviceModels'
import { type IDeviceNode } from '@/data/topology'

export interface DeviceLink {
  id: string
  source: string
  target: string
  interfaceType: string
  label: string
}

export interface DeviceTopologyData {
  nodes: IDeviceNode[]
  links: DeviceLink[]
  normalCount: number
  warningCount: number
  offlineCount: number
  totalCount: number
}

function modelKey(type: string, vendor: string, model: string): string {
  return `${type}\u0000${vendor}\u0000${model}`
}

function formatStatusValue(value: unknown, property: Ct16DeviceModelPropertyDto): string {
  const matched = property.values.find((item) => {
    try {
      return JSON.stringify(JSON.parse(item.valueJSON)) === JSON.stringify(value)
    } catch {
      return item.valueJSON === String(value)
    }
  })
  if (property.isEnum && matched?.meaning) return matched.meaning
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return '--'
  return String(value)
}

function dsdkReadError(code: number, detail?: string): string {
  return detail || `读取失败，错误码 ${code}`
}

export function useDeviceTopology(enabled = true) {
  const [data, setData] = useState<DeviceTopologyData>({
    nodes: [],
    links: [],
    normalCount: 0,
    warningCount: 0,
    offlineCount: 0,
    totalCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeviceTopology = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [instances, modelResponse] = await Promise.all([
        getDeviceInstances(),
        getDeviceModels(),
      ])
      const models = new Map(
        modelResponse.models.map((model) => [
          modelKey(model.deviceType, model.deviceVendor, model.deviceModel),
          model,
        ]),
      )
      const modelInterfaces = new Map(
        await Promise.all(
          Array.from(
            new Set(
              instances.map((instance) => modelKey(instance.type, instance.vendor, instance.model)),
            ),
          ).map(async (key) => {
            const model = models.get(key)
            if (!model) return [key, new Map<string, string>()] as const
            try {
              const interfaces = await getDeviceModelInterfaces(model.id)
              return [key, new Map(interfaces.map((item) => [item.id, item.type]))] as const
            } catch {
              return [key, new Map<string, string>()] as const
            }
          }),
        ),
      )
      const reads = await Promise.all(
        instances.map(async (instance) => {
          try {
            const response = await readDeviceInstance(instance.sn)
            if (!response.success) {
              return { values: {}, error: dsdkReadError(response.code, response.error) }
            }
            if (!response.info) return { values: {}, error: '' }
            const value = JSON.parse(response.info)
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
              return { values: {}, error: '读取失败：返回数据格式无效' }
            }
            return { values: value as Record<string, unknown>, error: '' }
          } catch (error) {
            return {
              values: {},
              error: error instanceof Error ? error.message : '读取失败',
            }
          }
        }),
      )
      const nodes = instances.map<IDeviceNode>((instance, index) => {
        const key = modelKey(instance.type, instance.vendor, instance.model)
        const deviceModel = models.get(key)
        const interfaceTypes = modelInterfaces.get(key)
        const configuredInterfaceIDs = Object.keys(instance.interfaceConfigs)
        const interfaceEntries = configuredInterfaceIDs.map((id) => [id, interfaceTypes?.get(id) || ''] as const)
        const hasInvalidInterface = configuredInterfaceIDs.length > 0 && interfaceEntries.some(([, type]) => !type)
        const interfaceType = !deviceModel
          ? '模型不存在'
          : configuredInterfaceIDs.length === 0
            ? '未配置接口'
            : hasInvalidInterface
              ? '模型接口异常'
              : Array.from(new Set(interfaceEntries.map(([, type]) => type))).join(' · ')
        const interfaceLabel = configuredInterfaceIDs.join(' / ') || '未配置'
        const statusValues = (deviceModel?.statuses ?? []).map((property) => ({
          id: property.id,
          name: property.name || property.id,
          value: formatStatusValue(reads[index].values[property.id], property),
          unit: property.unit,
          isEnum: property.isEnum,
          values: property.values,
        }))

        return {
          id: instance.sn,
          name: instance.name,
          deviceType: instance.type,
          modelName: deviceModel?.modelName || instance.type,
          iconUrl: deviceModel?.iconUrl || '',
          category: 'other',
          interfaceType,
          interfaceLabel,
          status: reads[index].error ? 'warning' : 'normal',
          value: statusValues[0]?.value || '--',
          unit: '',
          serialNumber: instance.sn,
          address: '',
          description: instance.remark,
			location: instance.devPoint,
          lastUpdate: '刚刚更新',
          readError: reads[index].error,
          statusValues,
          angle: 0,
          distance: 0,
          group: 'eth',
        }
      })
      const links = nodes.map((node) => ({
        id: `dlink-${node.id}`,
        source: 'dev-controller',
        target: node.id,
        interfaceType: node.interfaceType,
        label: node.interfaceLabel,
      }))

      const normalCount = nodes.filter((d) => d.status === 'normal').length
      const warningCount = nodes.filter((d) => d.status === 'warning').length
      const offlineCount = nodes.filter((d) => d.status === 'offline').length

      setData({
        nodes,
        links,
        normalCount,
        warningCount,
        offlineCount,
        totalCount: nodes.length,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取系统拓扑失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchDeviceTopology()
  }, [enabled, fetchDeviceTopology])

  const updateNode = useCallback((node: IDeviceNode) => {
    setData((current) => {
      const nodes = current.nodes.map((item) => item.id === node.id ? node : item)
      return {
        ...current,
        nodes,
        normalCount: nodes.filter((item) => item.status === 'normal').length,
        warningCount: nodes.filter((item) => item.status === 'warning').length,
        offlineCount: nodes.filter((item) => item.status === 'offline').length,
      }
    })
  }, [])

  return { ...data, loading, error, refresh: fetchDeviceTopology, updateNode }
}
