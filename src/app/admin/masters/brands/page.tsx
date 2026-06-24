import PageHeader from "@/components/admin/PageHeader";

export default function BrandsPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Brands"
        subtitle="Manage product brands"
      />

      <div className="rounded-2xl border border-white/10 p-6">
        Brands Module
      </div>
    </div>
  );
}
