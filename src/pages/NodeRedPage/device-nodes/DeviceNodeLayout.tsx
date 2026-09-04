import type { ReactNode } from 'react';

import './device-iframe.css';

interface DeviceNodeLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function DeviceNodeLayout({
  title,
  subtitle,
  children,
  leftContent,
  rightContent,
}: DeviceNodeLayoutProps) {
  const hasSideSlots = Boolean(leftContent || rightContent);

  return (
    <div className="device-page">
      {title ? (
        <header
          className={
            hasSideSlots ? 'device-page-header device-page-header--centered' : 'device-page-header'
          }
        >
          {hasSideSlots ? (
            <>
              <div className="device-page-header-left">{leftContent}</div>
              <div className="device-page-header-center">
                <h2>{title}</h2>
                {subtitle ? <span className="device-page-subtitle">{subtitle}</span> : null}
              </div>
              <div className="device-page-header-actions">{rightContent}</div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2>{title}</h2>
                {subtitle ? <span className="device-page-subtitle">{subtitle}</span> : null}
              </div>
              {rightContent ? <div className="device-page-header-actions">{rightContent}</div> : null}
            </>
          )}
        </header>
      ) : null}
      {children}
    </div>
  );
}
