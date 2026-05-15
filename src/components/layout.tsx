import Sidebar from "./sidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen overflow-hidden text-white">

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-[180px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-[180px]" />
      </div>

      <Sidebar />

      <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
        <div className="min-h-[calc(100vh-2rem)] rounded-[42px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-3xl">
          <div className="p-6 md:p-8 lg:p-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
