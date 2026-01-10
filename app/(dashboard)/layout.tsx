import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 no-scrollbar pb-32 lg:pb-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
