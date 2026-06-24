import PageHeader from "@/components/admin/PageHeader";

export default function VendorsPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Vendors"
        subtitle="Manage suppliers and vendors"
      />

      <div className="rounded-2xl border border-white/10 p-6">
        Vendors Module
      </div>
    </div>
  );
}
