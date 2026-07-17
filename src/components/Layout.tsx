import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import Header from '@/components/Header';

function ManagedLayoutContent() {
  const { pathname } = useLocation();
  const { open, setOpen } = useSidebar();
  const autoCollapsedRef = useRef(false);
  const manuallyControlledRef = useRef(false);
  const isNodeRedRouteRef = useRef(false);

  useEffect(() => {
    const markManualControl = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key.toLowerCase() !== 'b' || (!event.ctrlKey && !event.metaKey)) return;
      } else if (!(event.target instanceof Element) || !event.target.closest('[data-sidebar="trigger"], [data-sidebar="rail"]')) {
        return;
      }
      manuallyControlledRef.current = true;
    };
    document.addEventListener('click', markManualControl);
    document.addEventListener('keydown', markManualControl);
    return () => {
      document.removeEventListener('click', markManualControl);
      document.removeEventListener('keydown', markManualControl);
    };
  }, []);

  useEffect(() => {
    if (pathname === '/nodered') {
      if (!isNodeRedRouteRef.current) {
        manuallyControlledRef.current = false;
        autoCollapsedRef.current = open;
        isNodeRedRouteRef.current = true;
        if (open) setOpen(false);
      }
      return;
    }
    if (isNodeRedRouteRef.current) {
      if (autoCollapsedRef.current && !manuallyControlledRef.current) setOpen(true);
      autoCollapsedRef.current = false;
      isNodeRedRouteRef.current = false;
    }
  }, [open, pathname, setOpen]);

  return <>
    <AppSidebar />
    <SidebarInset className="flex flex-col min-w-0 overflow-x-hidden">
      <Header />
      <main className="flex-1 w-full overflow-y-auto px-4 md:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </SidebarInset>
  </>;
}

export function Layout() {
  return (
    <SidebarProvider>
      <ManagedLayoutContent />
    </SidebarProvider>
  );
}
