import type { NodeMeta } from './api';

interface DeviceNodeCardProps {
  node: NodeMeta;
  onEdit: (node: NodeMeta) => void;
  onDelete: (node: NodeMeta) => void;
  onSimulate: (node: NodeMeta) => void;
}

export function DeviceNodeCard({ node, onEdit, onDelete, onSimulate }: DeviceNodeCardProps) {
  const allPins = [...(node.inputPins ?? []), ...(node.outputPins ?? [])];
  const commands = node.commands ?? [];
  const isSerial = (node.deviceKind ?? '').toLowerCase() === 'serial';
  const kindLabel = isSerial ? '串口类型' : '引脚类型';

  return (
    <div className="dev-panel">
      <div className="panel-top">
        <div className="panel-title">
          {node.name} ({node.code})
        </div>
        <div className="panel-actions-btn">
          <button type="button" title="Simulate" onClick={() => onSimulate(node)}>
            ▶
          </button>
          <button type="button" title="Edit" onClick={() => onEdit(node)}>
            ✎
          </button>
          <button type="button" title="Delete" className="del" onClick={() => onDelete(node)}>
            ✕
          </button>
        </div>
      </div>
      <div className="panel-body">
        {!isSerial && allPins.length > 0 && (
          <div className="pin-strip">
            <span className="pin-label">PINS：</span>
            {allPins.map((pin, i) => (
              <span key={i} className="pin-module">
                {pin.name}({pin.type})
              </span>
            ))}
          </div>
        )}
        <div className="cmd-strip">
          {commands.length > 0 ? (
            <>
              <span className="cmd-label">ACTS：</span>
              {commands.map((cmd) => (
                <span key={cmd} className="cmd-tag">
                  {cmd}
                </span>
              ))}
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>No commands defined</span>
          )}
        </div>
      </div>
      <div className="panel-footer">
        <span className="panel-footer-kind">类型：{kindLabel}</span>
        <span className="panel-footer-stats">
          {isSerial
            ? `ACTS： ${commands.length}`
            : `PINS： ${allPins.length} | ACTS： ${commands.length}`}
        </span>
      </div>
    </div>
  );
}
