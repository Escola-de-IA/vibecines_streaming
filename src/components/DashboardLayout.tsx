import { ReactNode, useState } from 'react';
import { Navbar } from './Navbar';
import { DashboardSidebar } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen w-full bg-background selection:bg-primary/20">
      <Navbar />
      <DashboardSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main
        className={`pt-16 md:pt-20 pb-20 md:pb-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:pl-[240px]' : 'lg:pl-[72px]'
        } overflow-x-hidden`}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
