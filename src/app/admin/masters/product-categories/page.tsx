import PageHeader from "@/components/admin/PageHeader";

export default function ProductCategoriesPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Product Categories"
        subtitle="Manage product categories"
      />

      <div className="rounded-2xl border border-white/10 p-6">
        Product Categories Module
      </div>
    </div>
  );
}
