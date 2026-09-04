import { useCallback, useEffect, useMemo, useState } from 'react';

import type { NodeMeta, SimulateResponse } from './api';
import { simulate } from './api';

type FieldKind = 'text' | 'select' | 'checkbox';

interface FormField {
  name: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractTabHtml(html: string, tabId: string): string {
  const startRe = new RegExp(`<div\\s+id="${tabId}"[^>]*>`, 'i');
  const startMatch = startRe.exec(html);
  if (!startMatch) return '';
  let i = startMatch.index + startMatch[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.toLowerCase().indexOf('<div', i);
    const nextClose = html.toLowerCase().indexOf('</div>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(startMatch.index + startMatch[0].length, nextClose);
      }
      i = nextClose + 6;
    }
  }
  return '';
}

function parseFormRows(tabHtml: string): FormField[] {
  const fields: FormField[] = [];
  const rowRe = /<div\s+class="form-row"[^>]*>([\s\S]*?)<\/div>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(tabHtml)) !== null) {
    const block = row[1];
    const idMatch = block.match(/id="node-input-(\w+)"/);
    if (!idMatch) continue;
    const name = idMatch[1];
    if (name === 'deviceKind') continue;

    let label = name;
    const labelMatch = block.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
    if (labelMatch) {
      label = stripTags(labelMatch[1]) || name;
    }

    if (/<select\b/i.test(block)) {
      const options: { value: string; label: string }[] = [];
      const optRe = /<option\s+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi;
      let opt: RegExpExecArray | null;
      while ((opt = optRe.exec(block)) !== null) {
        options.push({ value: opt[1], label: stripTags(opt[2]) || opt[1] });
      }
      fields.push({ name, label, kind: 'select', options });
      continue;
    }

    if (/type="checkbox"/i.test(block)) {
      fields.push({ name, label, kind: 'checkbox' });
      continue;
    }

    const ph = block.match(/placeholder="([^"]*)"/i)?.[1];
    fields.push({ name, label, kind: 'text', placeholder: ph });
  }
  return fields;
}

function defaultValueMap(node: NodeMeta, htmlContent?: string): Record<string, string> {
  const init: Record<string, string> = {};

  // Prefer API defaults, but fill gaps from HTML defaults block
  // (backend historically dropped dotted string values like '127.0.0.1').
  const fromHtml = htmlContent ? extractDefaultsFromHtml(htmlContent) : {};
  for (const [name, value] of Object.entries(fromHtml)) {
    if (name === 'deviceKind' || name === 'name') continue;
    init[name] = value;
  }

  for (const d of node.defaults ?? []) {
    if (d.name === 'deviceKind' || d.name === 'name') continue;
    if (d.value == null || d.value === '') {
      // Keep HTML fallback when API value is missing/empty
      if (init[d.name] !== undefined) continue;
      init[d.name] = '';
      continue;
    }
    if (typeof d.value === 'boolean') {
      init[d.name] = d.value ? 'true' : 'false';
    } else {
      init[d.name] = String(d.value);
    }
  }
  return init;
}

/** Parse RED.nodes.registerType defaults from node HTML template */
function extractDefaultsFromHtml(html: string): Record<string, string> {
  const startMatch = /defaults:\s*\{/.exec(html);
  if (!startMatch || startMatch.index == null) return {};

  let i = startMatch.index + startMatch[0].length;
  let depth = 1;
  let end = -1;
  while (i < html.length && depth > 0) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    i++;
  }
  if (end < 0) return {};

  const block = html.slice(startMatch.index + startMatch[0].length, end);
  const out: Record<string, string> = {};
  const fieldRe = /(\w+)\s*:\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(block)) !== null) {
    const name = m[1];
    const content = m[2];
    const vm = content.match(/value:\s*('[^']*'|"[^"]*"|true|false|-?\d+(?:\.\d+)?)/);
    if (!vm) {
      out[name] = '';
      continue;
    }
    const raw = vm[1];
    if (raw === "''" || raw === '""') out[name] = '';
    else if (raw === 'true' || raw === 'false') out[name] = raw;
    else if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      out[name] = raw.slice(1, -1);
    } else {
      out[name] = raw;
    }
  }
  return out;
}

function typedConfig(
  values: Record<string, string>,
  defaults: NodeMeta['defaults'],
): Record<string, unknown> {
  const typeMap = new Map((defaults ?? []).map((d) => [d.name, d.type]));
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(values)) {
    if (k === 'deviceKind') continue;
    const t = typeMap.get(k);
    if (t === 'number') {
      out[k] = raw === '' ? 0 : parseFloat(raw) || 0;
    } else if (t === 'boolean' || raw === 'true' || raw === 'false') {
      out[k] = raw === 'true' || raw === '1';
    } else {
      out[k] = raw;
    }
  }
  return out;
}

/** Settings 中除 address / clientTimeout 外均为 uiFields */
const SETTINGS_FIXED_FIELDS = new Set(['address', 'clientTimeout', 'name']);

function coerceSimValue(raw: string): unknown {
  const t = raw.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return parseFloat(t);
  try {
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      return JSON.parse(t);
    }
  } catch {
    /* ignore */
  }
  return raw;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalForDisplay(v: unknown): string {
  return typeof v === 'string' ? JSON.stringify(v) : String(v);
}

/** 从 funSwitch 的 case 找到 action 函数名，再抽出完整函数源码，并用实际参数替换便于预览 */
function resolveSerialActionSource(
  js: string,
  command: string,
  address: unknown,
  params: Record<string, unknown>,
): string | null {
  if (!js || !command) return null;

  const caseRe = new RegExp(
    `case\\s+['"]${escapeRegExp(command)}['"]\\s*:\\s*return\\s+(action\\w+)\\s*\\(`,
  );
  const caseMatch = js.match(caseRe);
  if (!caseMatch) return null;
  const fnName = caseMatch[1];

  const fnHeadRe = new RegExp(
    `(?:async\\s+)?function\\s+${escapeRegExp(fnName)}\\s*\\([^)]*\\)\\s*\\{`,
  );
  const head = fnHeadRe.exec(js);
  if (!head || head.index == null) return null;

  const openIdx = head.index + head[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = openIdx; i < js.length; i++) {
    const c = js[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      while (i < js.length) {
        if (js[i] === '\\') {
          i += 2;
          continue;
        }
        if (js[i] === q) break;
        i++;
      }
      continue;
    }
    if (c === '/' && js[i + 1] === '/') {
      i += 2;
      while (i < js.length && js[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && js[i + 1] === '*') {
      i += 2;
      while (i + 1 < js.length && !(js[i] === '*' && js[i + 1] === '/')) i++;
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;

  let code = js.slice(head.index, end + 1);

  const addrLit = literalForDisplay(address ?? 1);
  code = code.replace(/resolveDeviceAddress\s*\(\s*params\s*\)/g, addrLit);
  code = code.replace(/\bparams\.address\b/g, addrLit);

  if (params.value !== undefined) {
    code = code.replace(/\bparams\.value\b/g, literalForDisplay(params.value));
  }
  for (const [k, v] of Object.entries(params)) {
    if (k === 'value' || k === 'address') continue;
    code = code.replace(new RegExp(`\\bparams\\.${escapeRegExp(k)}\\b`, 'g'), literalForDisplay(v));
  }

  return code;
}

/** 串口设备模拟：Settings + Connection，执行走后端 JS runner */
export function SerialSimulatorPanel({
  node,
  htmlContent,
  jsContent,
}: {
  node: NodeMeta;
  htmlContent?: string;
  jsContent?: string;
}) {
  const settingsFields = useMemo(() => {
    if (!htmlContent) return [];
    const tab = extractTabHtml(htmlContent, 'modbus-settings-tab');
    return parseFormRows(tab).filter((f) => f.name !== 'name');
  }, [htmlContent]);

  const fixedSettingsFields = useMemo(
    () => settingsFields.filter((f) => SETTINGS_FIXED_FIELDS.has(f.name)),
    [settingsFields],
  );
  const uiFields = useMemo(
    () => settingsFields.filter((f) => !SETTINGS_FIXED_FIELDS.has(f.name)),
    [settingsFields],
  );

  const connectionFields = useMemo(() => {
    if (!htmlContent) return [];
    const tab = extractTabHtml(htmlContent, 'modbus-connection-tab');
    return parseFormRows(tab);
  }, [htmlContent]);

  const [activeTab, setActiveTab] = useState<'settings' | 'connection'>('settings');
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaultValueMap(node, htmlContent),
  );
  const [selectedCommand, setSelectedCommand] = useState(node.commands?.[0] ?? '');
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandSource, setCommandSource] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    const init = defaultValueMap(node, htmlContent);
    for (const f of settingsFields) {
      if (!SETTINGS_FIXED_FIELDS.has(f.name)) init[f.name] = '';
    }
    setValues(init);
    setSelectedCommand(node.commands?.[0] ?? '');
    setResult(null);
    setError(null);
    setCommandSource(null);
    setSimulated(false);
    setActiveTab('settings');
  }, [node.code, htmlContent]);

  const clientType = values.clienttype || 'serial';

  const visibleConnectionFields = useMemo(() => {
    return connectionFields.filter((f) => {
      if (['tcpHost', 'tcpPort', 'tcpType'].includes(f.name)) {
        return clientType === 'tcp';
      }
      if (
        [
          'serialPort',
          'serialType',
          'serialBaudrate',
          'serialDatabits',
          'serialStopbits',
          'serialParity',
          'serialConnectionDelay',
        ].includes(f.name)
      ) {
        return clientType !== 'tcp';
      }
      return true;
    });
  }, [connectionFields, clientType]);

  const setField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const renderField = (f: FormField, opts?: { placeholder?: string }) => {
    if (f.kind === 'select') {
      return (
        <div key={f.name} className="device-sim-row">
          <span className="sim-pin-name">{f.label}</span>
          <select value={values[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)}>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (f.kind === 'checkbox') {
      return (
        <div key={f.name} className="device-sim-row">
          <span className="sim-pin-name">{f.label}</span>
          <input
            type="checkbox"
            checked={values[f.name] === 'true' || values[f.name] === '1'}
            onChange={(e) => setField(f.name, e.target.checked ? 'true' : 'false')}
            style={{ width: 'auto' }}
          />
        </div>
      );
    }
    return (
      <div key={f.name} className="device-sim-row">
        <span className="sim-pin-name">{f.label}</span>
        <input
          type="text"
          value={values[f.name] ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={opts?.placeholder || f.placeholder || f.label}
        />
      </div>
    );
  };

  const handleSimulate = useCallback(async () => {
    if (!values.address?.trim()) {
      setError('请填写 Device Address');
      setActiveTab('settings');
      return;
    }
    if (clientType === 'tcp') {
      if (!values.tcpHost?.trim() || !values.tcpPort?.trim()) {
        setError('TCP 模式请填写 Host 与 Port');
        setActiveTab('connection');
        return;
      }
    } else if (!values.serialPort?.trim()) {
      setError('Serial 模式请填写 Port（如 COM3 / /dev/ttyUSB0）');
      setActiveTab('connection');
      return;
    }
    if (!selectedCommand) {
      setError('请选择指令');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    setSimulated(true);

    try {
      const config = typedConfig(values, node.defaults);
      for (const f of uiFields) {
        config[f.name] = '';
      }

      const params: Record<string, unknown> = {};
      for (const f of uiFields) {
        const raw = (values[f.name] ?? '').trim();
        if (raw === '') continue;
        const v = coerceSimValue(raw);
        params[f.name] = v;
        if (params.value === undefined) params.value = v;
      }

      if (jsContent) {
        const src = resolveSerialActionSource(jsContent, selectedCommand, config.address, params);
        setCommandSource(src);
      } else {
        setCommandSource(null);
      }

      const resp = await simulate({
        nodeCode: node.code,
        command: selectedCommand,
        pins: {},
        params,
        config,
        deviceKind: 'serial',
        info: { payload: { command: selectedCommand, params } },
      });
      setResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }, [values, uiFields, clientType, selectedCommand, node.code, node.defaults, jsContent]);

  return (
    <div
      className="device-sim-layout"
      style={{ maxWidth: 'none', display: 'flex', gap: 20, alignItems: 'stretch' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="device-sim-section">
          <div className="device-sim-tabs" role="tablist" aria-label="串口模拟配置">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'connection'}
              className={activeTab === 'connection' ? 'active' : ''}
              onClick={() => setActiveTab('connection')}
            >
              Connection
            </button>
          </div>

          <div className="device-sim-settings-scroll">
            {activeTab === 'settings' && (
              <div className="device-sim-tab-body">
                {settingsFields.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>未解析到 Settings 字段</div>
                ) : (
                  <>
                    {fixedSettingsFields.map((f) => renderField(f))}
                    {uiFields.length > 0 && (
                      <>
                        <div className="device-sim-ui-divider">
                          自定义字段（模拟时直接填具体值，不走路径解析）
                        </div>
                        {uiFields.map((f) =>
                          renderField(f, { placeholder: '直接填写具体值，如: 128' }),
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'connection' && (
              <div className="device-sim-tab-body">
                <div
                  className="form-tips"
                  style={{ marginBottom: 10, color: 'var(--text-dim)', fontSize: 12 }}
                >
                  仅配置传输通道与连接参数（TCP / 串口）。协议规则固化在节点 JS（PROTOCOL）。
                </div>
                {visibleConnectionFields.map((f) => renderField(f))}
              </div>
            )}
          </div>
        </div>

        <div className="device-sim-section">
          <h3>指令</h3>
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>
          )}
          <div className="device-sim-row">
            <select value={selectedCommand} onChange={(e) => setSelectedCommand(e.target.value)}>
              {(node.commands ?? []).map((cmd) => (
                <option key={cmd} value={cmd}>
                  {cmd}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-panel primary"
              onClick={handleSimulate}
              disabled={running}
            >
              {running ? '执行中...' : '▶ 模拟执行'}
            </button>
          </div>
        </div>
      </div>

      <div className="device-sim-section device-sim-pane-right" style={{ flex: 1 }}>
        <h3>执行指令</h3>
        <pre
          className="device-sim-code-pre"
          style={{ color: commandSource ? 'var(--accent)' : 'var(--text-dim)' }}
        >
          {commandSource || '点击 "▶ 模拟执行" 后将显示该指令对应 action 方法的完整代码'}
        </pre>

        {simulated && (
          <div className="device-sim-result-wrap">
            <h3>执行结果</h3>
            {result?.execError && (
              <div className="device-sim-result" style={{ borderLeft: '3px solid var(--red)' }}>
                <pre style={{ color: 'var(--red)' }}>{result.execError}</pre>
              </div>
            )}
            {result?.execResult && (
              <div className="device-sim-result">
                <pre>{result.execResult}</pre>
              </div>
            )}
            {!result?.execResult && !result?.execError && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>
                {running ? '执行中...' : '无输出'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
