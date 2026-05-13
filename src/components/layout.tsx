import Sidebar from './sidebar'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#07111f] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_30%),linear-gradient(to_bottom,#07111f,#091221)]">
        {children}
      </main>
    </div>
  )
}
