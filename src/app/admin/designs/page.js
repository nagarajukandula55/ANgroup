import Link from "next/link";

export default function DesignsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Design Templates
        </h1>

        <Link
          href="/admin/designs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Design
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        No designs found.
      </div>
    </div>
  );
}
