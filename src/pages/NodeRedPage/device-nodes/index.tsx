import { useCallback, useEffect, useState } from 'react';

import type { NodeMeta } from './api';
import { deleteNode, getNode, getNodes } from './api';
import { DeviceNodeCard } from './DeviceNodeCard';
import { DeviceNodeEditorPage } from './DeviceNodeEditorPage';
import { DeviceNodeLayout } from './DeviceNodeLayout';
import { DeviceSimulatorPanel } from './DeviceSimulatorPanel';
import './device-iframe.css';

const PAGE_SIZE = 12;

type SimulateFrom = 'list' | 'create' | 'edit';

type View =
  | { kind: 'list' }
  | { kind: 'create'; resumeCode?: string }
  | { kind: 'edit'; code: string }
  | { kind: 'simulate'; code: string; from: SimulateFrom };

export function DeviceNodesWorkspace() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [nodes, setNodes] = useState<NodeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<NodeMeta | null>(null);

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNodes();
      setNodes(list);
    } catch (err) {
      console.error('[DeviceNodesWorkspace] loadNodes failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view.kind === 'list') {
      void loadNodes();
    }
  }, [view.kind, loadNodes]);

  if (view.kind === 'create') {
    return (
      <DeviceNodeEditorPage
        mode="create"
        nodeCode={view.resumeCode}
        onBack={() => setView({ kind: 'list' })}
        onSimulate={(code) => setView({ kind: 'simulate', code, from: 'create' })}
      />
    );
  }

  if (view.kind === 'edit') {
    return (
      <DeviceNodeEditorPage
        mode="edit"
        nodeCode={view.code}
        onBack={() => setView({ kind: 'list' })}
        onSimulate={(code) => setView({ kind: 'simulate', code, from: 'edit' })}
      />
    );
  }

  if (view.kind === 'simulate') {
    const handleSimulateBack = () => {
      if (view.from === 'edit') {
        setView({ kind: 'edit', code: view.code });
        return;
      }
      if (view.from === 'create') {
        setView({ kind: 'create', resumeCode: view.code });
        return;
      }
      setView({ kind: 'list' });
    };

    return (
      <SimulateView
        nodeCode={view.code}
        onBack={handleSimulateBack}
      />
    );
  }

  const filtered = nodes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNode(deleteTarget.code);
      const nextNodes = nodes.filter((n) => n.code !== deleteTarget.code);
      const nextFilteredCount = nextNodes.filter((n) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
      }).length;
      const nextTotalPages = Math.max(1, Math.ceil(nextFilteredCount / PAGE_SIZE));
      setNodes(nextNodes);
      setPage((p) => Math.min(p, nextTotalPages));
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
      <DeviceNodeLayout>
        <div className="device-search-bar">
          <input
            type="text"
            placeholder="按节点名称或code搜索"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="device-search-bar-actions">
            <button type="button" className="btn-panel" onClick={() => void loadNodes()}>
              ⟳ 刷新
            </button>
            <button
              type="button"
              className="btn-panel primary"
              onClick={() => setView({ kind: 'create' })}
            >
              + 新建节点
            </button>
          </div>
        </div>

        <div className="device-panel-grid">
          {loading && (
            <div className="device-empty-state">
              <div className="icon">⏳</div>
              <p>加载中...</p>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="device-empty-state">
              <div className="icon">📡</div>
              <p>{search ? '未找到匹配节点' : '暂无节点'}</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>点击「+ 新建节点」按钮创建设备节点</p>
            </div>
          )}
          {!loading &&
            pageItems.map((node) => (
              <DeviceNodeCard
                key={node.code}
                node={node}
                onEdit={(n) => setView({ kind: 'edit', code: n.code })}
                onDelete={setDeleteTarget}
                onSimulate={(n) => setView({ kind: 'simulate', code: n.code, from: 'list' })}
              />
            ))}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="device-pagination">
            <button
              type="button"
              className="btn-panel"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <span className="device-pagination-info">
              第 {currentPage} / {totalPages} 页 · 共 {filtered.length} 个
            </span>
            <button
              type="button"
              className="btn-panel"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        )}

        {deleteTarget && (
          <div className="device-modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div
              className="device-modal-box"
              style={{ maxWidth: 380 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="device-modal-hdr">
                <h2>! 确认移除</h2>
                <button type="button" onClick={() => setDeleteTarget(null)}>
                  ✕
                </button>
              </div>
              <div className="device-modal-bd" style={{ textAlign: 'center', padding: '24px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  确定移除{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    {deleteTarget.name} [{deleteTarget.code}]
                  </strong>
                  ？
                </p>
                <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>此操作不可撤销</p>
              </div>
              <div className="device-modal-ft">
                <button type="button" className="btn-panel" onClick={() => setDeleteTarget(null)}>
                  取消
                </button>
                <button
                  type="button"
                  className="btn-panel danger"
                  onClick={() => void confirmDelete()}
                  style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                >
                  确认移除
                </button>
              </div>
            </div>
          </div>
        )}
      </DeviceNodeLayout>
    </div>
  );
}

function SimulateView({ nodeCode, onBack }: { nodeCode: string; onBack: () => void }) {
  const [node, setNode] = useState<NodeMeta | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getNode(nodeCode)
      .then((detail) => {
        if (cancelled) return;
        setNode(detail.node);
        setHtmlContent(detail.files.html);
        setJsContent(detail.files.js);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load node');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeCode]);

  return (
    <div className="h-full min-h-0 overflow-auto rounded-lg border border-border/60 bg-card shadow-sm">
      <DeviceNodeLayout
        title="设备模拟"
        subtitle={node ? node.name : 'Device Simulation'}
        leftContent={
          <button type="button" onClick={onBack} className="btn-panel">
            ← 返回
          </button>
        }
      >
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
            ⏳ 加载节点信息...
          </div>
        )}

        {error && (
          <div style={{ padding: 40, color: 'var(--red)', fontSize: 13 }}>! ERROR: {error}</div>
        )}

        {node && !loading && (
          <DeviceSimulatorPanel node={node} htmlContent={htmlContent} jsContent={jsContent} />
        )}
      </DeviceNodeLayout>
    </div>
  );
}
