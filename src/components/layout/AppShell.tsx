import { Outlet } from 'react-router';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { DemoToolbar } from '../DemoToolbar';
import { GroupChatWidget } from '../chat/GroupChatWidget';
import { useAppStore } from '../../store/useAppStore';

export function AppShell() {
  const demoMode = useAppStore((s) => s.demoMode);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(234,244,255) 0%, rgb(234,244,255) 100%)',
      }}
    >
      {/* Ambient background glow blobs (matching LoginPage style) */}
      <div className="absolute top-[-64px] left-[-64px] size-72 rounded-full bg-[rgba(166,215,255,0.6)] blur-[40px] pointer-events-none" />
      <div className="absolute right-[-80px] top-1/4 w-96 h-96 rounded-full bg-[rgba(166,215,255,0.4)] blur-[40px] pointer-events-none" />
      <div className="absolute bottom-[-64px] left-1/3 h-80 w-1/3 rounded-full bg-[rgba(166,215,255,0.25)] blur-[40px] pointer-events-none" />

      {/* Main App Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Topbar />
        {demoMode && <DemoToolbar />}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main id="main-content" className="flex-1 overflow-y-auto p-6 md:p-8">
            <Outlet />
          </main>
        </div>
        {/* Floating Group Chat Widget */}
        <GroupChatWidget />
      </div>
    </div>
  );
}
