import { useCallback, useEffect, useState } from "react"

import type { NodeMeta, NodePin, SimulateResponse } from './api';
import { getNodePins, simulate } from './api';
import { SerialSimulatorPanel } from './SerialSimulatorPanel';

// ─── JS 指令解析 ─────────────────────────────────────────────

function resolveCommandScript(
  js: string,
  command: string,
  pinValues: Record<string, string>,
  paramValues: Record<string, string>,
): string | null {
  // 1. 从 funSwitch 中找到对应 case 的 return 调用
  const caseRe = new RegExp(`case\\s+'${command}'[\\s\\S]*?return\\s+(build\\w+Script)\\s*\\(([^)]+)\\)`)
  const caseMatch = js.match(caseRe)
  if (!caseMatch) return null

  const funcName = caseMatch[1]
  const argsStr = caseMatch[2]

  // 解析调用参数（逗号分隔，忽略函数嵌套）
  const callArgs = argsStr.split(',').map((s) => s.trim())

  // 2. 提取 case 块中的局部变量定义（var v0 = extractValueByPath(node.valuePath0, info)）
  const localVars: Record<string, string> = {}
  const caseStart = caseMatch.index ?? 0
  const caseBlock = js.slice(caseStart, caseStart + 500)
  const varRe = /var\s+(\w+)\s*=\s*extractValueByPath\(([^,]+),/g
  let vm: RegExpExecArray | null
  while ((vm = varRe.exec(caseBlock)) !== null) {
    localVars[vm[1]] = vm[2].trim()
  }

  // 3. 提取 build 函数的形参名
  const funcDefRe = new RegExp(`function\\s+${escapeRegex(funcName)}\\s*\\(([^)]+)\\)`)
  const funcDefMatch = js.match(funcDefRe)
  if (!funcDefMatch) return null
  const paramNames = funcDefMatch[1].split(',').map((s) => s.trim())

  // 4. 计算每个形参的实际值
  const argValues: Record<string, string> = {}
  paramNames.forEach((name, i) => {
    const expr = callArgs[i]
    if (!expr) return

    // node.xxx → pinValues / paramValues
    const nodeM = expr.match(/^node\.(\w+)$/)
    if (nodeM) {
      argValues[name] = pinValues[nodeM[1]] ?? paramValues[nodeM[1]] ?? `$\{${nodeM[1]}}`
      return
    }

    // 局部变量（v0 → node.valuePath0）
    if (localVars[expr]) {
      const src = localVars[expr].replace(/^node\./, '')
      argValues[name] = paramValues[src] ?? pinValues[src] ?? `$\{${expr}}`
      return
    }

    argValues[name] = expr
  })

  // 5. 提取模板字符串（`` 中的内容）
  const tmplRe = new RegExp(`function\\s+${escapeRegex(funcName)}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?return\\s+\`([\\s\\S]*?)\``)
  const tmplMatch = js.match(tmplRe)
  if (!tmplMatch) return null
  let template = tmplMatch[1]

  // 6. 替换模板表达式
  template = template.replace(/\$\{([^}]+)\}/g, (_m, expr) => {
    const t = expr.trim()

    // 简单变量
    if (argValues[t] !== undefined) return argValues[t]

    // 数学表达式: v0 * 2, count / 2, offset + 1 等
    const mathRe = /^(\w+)\s*([*/+\-])\s*([\d.]+)$/
    const mathM = t.match(mathRe)
    if (mathM) {
      const base = parseFloat(argValues[mathM[1]] ?? mathM[1])
      const n = parseFloat(mathM[3])
      if (!isNaN(base) && !isNaN(n)) {
        switch (mathM[2]) {
          case '*': return String(base * n)
          case '/': return String(base / n)
          case '+': return String(base + n)
          case '-': return String(base - n)
        }
      }
    }
    return `$\{${t}}`
  })

  return template
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface DeviceSimulatorPanelProps {
  node: NodeMeta;
  htmlContent?: string;
  jsContent?: string;
}

export function DeviceSimulatorPanel({ node, htmlContent, jsContent }: DeviceSimulatorPanelProps) {
  // 串口 / 引脚分发：各自独立组件，避免条件 hooks
  if ((node.deviceKind ?? '').toLowerCase() === 'serial') {
    return <SerialSimulatorPanel node={node} htmlContent={htmlContent} jsContent={jsContent} />;
  }
  return <PinSimulatorPanel node={node} htmlContent={htmlContent} jsContent={jsContent} />;
}

function PinSimulatorPanel({ node, htmlContent, jsContent }: DeviceSimulatorPanelProps) {
  const pinConfigs = node.pinConfigs ?? []
  const defaults = node.defaults ?? []

  // Separate pin defaults vs parameter defaults
  const pinFieldNames = new Set<string>()
  for (const pc of pinConfigs) {
    pinFieldNames.add(`${pc.id}0`)
    pinFieldNames.add(`${pc.id}1`)
  }
  const paramDefaults = defaults.filter(
    (d) =>
      !pinFieldNames.has(d.name) &&
      d.name !== 'name' &&
      d.name !== 'sn' &&
      d.name !== 'propertyPath' &&
      d.name !== 'deviceKind',
  )

  // Parse Chinese labels from HTML template form-rows
  const [labelMap, setLabelMap] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!htmlContent) return
    const map: Record<string, string> = {}
    // Match <div class="form-row"> blocks containing <label> with <i> and <input id="node-input-XXX">
    const rowRegex = /<div\s+class="form-row"[\s\S]*?<\/div>/gi
    let match: RegExpExecArray | null
    while ((match = rowRegex.exec(htmlContent)) !== null) {
      const row = match[0]
      const labelMatch = row.match(/<i[^>]*><\/i>\s*([^<]+)</)
      const idMatch = row.match(/id="node-input-(\w+)"/)
      if (labelMatch && idMatch) {
        map[idMatch[1]] = labelMatch[1].trim()
      }
    }
    setLabelMap(map)
  }, [htmlContent])

  const [selectedCommand, setSelectedCommand] = useState(node.commands?.[0] ?? "")
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [pinValues, setPinValues] = useState<Record<string, string>>({})
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [renderedCommand, setRenderedCommand] = useState<string | null>(null)
  const [simulated, setSimulated] = useState(false)

  // Fallback for nodes without pinConfigs: use inputPins metadata
  const [legacyPins, setLegacyPins] = useState<NodePin[]>([])
  const [legacyPinValues, setLegacyPinValues] = useState<Record<string, string>>({})

  // Reset form when node changes
  useEffect(() => {
    setSelectedCommand(node.commands?.[0] ?? "")
    setResult(null)
    setError(null)
    setRenderedCommand(null)
	    setSimulated(false)

    // Initialize pin inputs
    if (pinConfigs.length > 0) {
      const initPins: Record<string, string> = {}
      for (const pc of pinConfigs) {
        initPins[`${pc.id}0`] = ""
        initPins[`${pc.id}1`] = ""
      }
      setPinValues(initPins)
    }

    // Initialize param values
    const initParams: Record<string, string> = {}
    for (const d of paramDefaults) {
      initParams[d.name] = String(d.value ?? "")
    }
    setParamValues(initParams)

    // Fallback: load legacy pins
    setLegacyPins(node.inputPins ?? [])
    setLegacyPinValues({})

    getNodePins(node.code)
      .then((detailedPins) => {
        if (detailedPins.length > 0) {
          setLegacyPins(detailedPins)
          const init: Record<string, string> = {}
          for (const pin of detailedPins) init[pin.name] = ""
          setLegacyPinValues(init)
        }
      })
      .catch(() => {
        if (node.inputPins && node.inputPins.length > 0) {
          const init: Record<string, string> = {}
          for (const pin of node.inputPins) init[pin.name] = ""
          setLegacyPinValues(init)
        }
      })
  }, [node.code])

  const handleSimulate = useCallback(async () => {
    // ── 校验：所有参数和引脚必须填写 ──
    const emptyParams = paramDefaults.filter((d) => !paramValues[d.name] || paramValues[d.name] === "")
    const emptyPins = pinConfigs.filter(
      (pc) => (!pinValues[`${pc.id}0`] || pinValues[`${pc.id}0`] === "") ||
              (!pinValues[`${pc.id}1`] || pinValues[`${pc.id}1`] === ""),
    )
    const emptyLegacyPins = pinConfigs.length === 0 ? legacyPins.filter(
      (p) => !legacyPinValues[p.name] || legacyPinValues[p.name] === "",
    ) : []
    if (emptyParams.length > 0 || emptyPins.length > 0 || emptyLegacyPins.length > 0) {
      setError("请填写所有参数和引脚后再执行模拟")
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setSimulated(true)

    try {
      // Build pins: each pin has two number inputs (group + port)
      const parsedPins: Record<string, unknown> = {}
      if (pinConfigs.length > 0) {
        for (const pc of pinConfigs) {
          const g = pinValues[`${pc.id}0`] ?? ""
          const p = pinValues[`${pc.id}1`] ?? ""
          parsedPins[`${pc.id}0`] = g === "" ? 0 : parseInt(g, 10) || 0
          parsedPins[`${pc.id}1`] = p === "" ? 0 : parseInt(p, 10) || 0
        }
      } else {
        // Legacy pins: use simple value inputs
        for (const pin of legacyPins) {
          const val = legacyPinValues[pin.name] ?? ""
          if (pin.type === "number" || pin.type === "VI" || pin.type === "VO") {
            parsedPins[pin.name] = parseFloat(val) || 0
          } else if (pin.type === "boolean" || pin.type === "DI" || pin.type === "DO") {
            parsedPins[pin.name] = val === "true" || val === "1"
          } else {
            parsedPins[pin.name] = val
          }
        }
      }

      // Build params: typed from NodeDefault type info
      const parsedParams: Record<string, unknown> = {}
      for (const d of paramDefaults) {
        const val = paramValues[d.name] ?? ""
        if (d.type === "number") {
          parsedParams[d.name] = val === "" ? 0 : parseFloat(val) || 0
        } else if (d.type === "boolean") {
          parsedParams[d.name] = val === "true" || val === "1"
        } else {
          parsedParams[d.name] = val
        }
      }

      if (jsContent) {
        const rendered = resolveCommandScript(
          jsContent, selectedCommand, pinValues, paramValues,
        )
        setRenderedCommand(rendered)

        const resp = await simulate({
          nodeCode: node.code,
          command: selectedCommand,
          pins: parsedPins,
          params: parsedParams,
          script: rendered ?? undefined,
        })
        setResult(resp)
      } else {
        const resp = await simulate({
          nodeCode: node.code,
          command: selectedCommand,
          pins: parsedPins,
          params: parsedParams,
        })
        setResult(resp)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed")
    } finally {
      setRunning(false)
    }
  }, [node.code, pinConfigs, pinValues, legacyPins, legacyPinValues, paramDefaults, paramValues, selectedCommand])

  return (
    <div className="device-sim-layout" style={{ maxWidth: "none", display: "flex", gap: 20, alignItems: "stretch" }}>
      {/* ═══ 左侧：配置区 ═══ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── 参数配置 ── */}
        {paramDefaults.length > 0 && (
          <div className="device-sim-section">
            <h3>参数配置</h3>
            {paramDefaults.map((d) => (
              <div key={d.name} className="device-sim-row">
                <span className="sim-pin-name">
                  {labelMap[d.name] || d.name}
                </span>
                {d.type === "boolean" ? (
                  <select
                    value={paramValues[d.name] ?? ""}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [d.name]: e.target.value }))
                    }
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={paramValues[d.name] ?? ""}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [d.name]: e.target.value }))
                    }
                    placeholder={labelMap[d.name] || d.name}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 引脚配置 ── */}
        {pinConfigs.length > 0 ? (
          <div className="device-sim-section">
            <h3>引脚配置</h3>
            {pinConfigs.map((pc) => (
              <div key={pc.id} className="device-sim-row sim-pin-row">
                <span className="sim-pin-name">{pc.id}</span>
                <span className="sim-pin-type">{pc.type}</span>
                <span className="sim-pin-label">组号:</span>
                <input
                  type="text"
                  className="sim-pin-input-sm"
                  value={pinValues[`${pc.id}0`] ?? ""}
                  onChange={(e) =>
                    setPinValues((prev) => ({ ...prev, [`${pc.id}0`]: e.target.value }))
                  }
                  placeholder="0"
                />
                <span className="sim-pin-label">端口:</span>
                <input
                  type="text"
                  className="sim-pin-input-sm"
                  value={pinValues[`${pc.id}1`] ?? ""}
                  onChange={(e) =>
                    setPinValues((prev) => ({ ...prev, [`${pc.id}1`]: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        ) : legacyPins.length > 0 ? (
          <div className="device-sim-section">
            <h3>引脚输入</h3>
            {legacyPins.map((pin) => (
              <div key={pin.name} className="device-sim-row">
                <span className="sim-pin-name">{pin.name}</span>
                <span className="sim-pin-type">{pin.type}</span>
                {pin.type === "boolean" || pin.type === "DI" || pin.type === "DO" ? (
                  <select
                    value={legacyPinValues[pin.name] ?? ""}
                    onChange={(e) =>
                      setLegacyPinValues((prev) => ({ ...prev, [pin.name]: e.target.value }))
                    }
                  >
                    <option value="">-- select --</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={legacyPinValues[pin.name] ?? ""}
                    onChange={(e) =>
                      setLegacyPinValues((prev) => ({ ...prev, [pin.name]: e.target.value }))
                    }
                    placeholder={pin.type.toLowerCase()}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── 指令选择 / 执行 ── */}
        <div className="device-sim-section">
          <h3>指令</h3>
          <div className="device-sim-row">
            <select
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value)}
            >
              {(node.commands ?? []).map((cmd) => (
                <option key={cmd} value={cmd}>
                  {cmd}
                </option>
              ))}
            </select>
            <button
              className="btn-panel primary"
              onClick={handleSimulate}
              disabled={running}
            >
              {running ? "执行中..." : "▶ 模拟执行"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 右侧：执行指令 ═══ */}
      <div className="device-sim-section" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h3>执行指令</h3>
        <pre style={{
          flex: 1,
          background: "var(--input)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "14px 16px",
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          color: renderedCommand ? "var(--accent)" : "var(--text-dim)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          lineHeight: 1.6,
          margin: 0,
          minHeight: 120,
          overflow: "auto",
        }}>
          {renderedCommand || '点击 "▶ 模拟执行" 后将在左侧显示具体执行的指令内容'}
        </pre>

        {simulated && (
          <div style={{ marginTop: 16 }}>
            <h3>执行结果</h3>
            {result?.execError && (
              <div
                className="device-sim-result"
                style={{ borderLeft: "3px solid var(--red)" }}
              >
                <pre style={{ color: "var(--red)" }}>{result.execError}</pre>
              </div>
            )}
            {result?.execResult && (
              <div className="device-sim-result">
                <pre>{result.execResult}</pre>
              </div>
            )}
            {!result?.execResult && !result?.execError && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 0" }}>
                {running ? "执行中..." : "脚本未执行（当前系统非 Linux 或脚本为空）"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
