import PageHeader from "@/components/admin/PageHeader";

export default function UnitsPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Units"
        subtitle="Manage measurement units"
      />

      <div className="rounded-2xl border border-white/10 p-6">
        Units Module
      </div>
    </div>
  );
}
