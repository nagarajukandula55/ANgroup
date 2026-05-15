import Sidebar from './sidebar'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-transparent text-white">

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/8 blur-[160px]" />
      </div>

      <Sidebar />

      <main className="relative z-10 flex-1 overflow-y-auto p-8 lg:p-10">
        <div className="min-h-[calc(100vh-2rem)] rounded-[36px] border border-white/10 bg-white/[0.025] shadow-2xl backdrop-blur-2xl">
          <div className="p-6 lg:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
