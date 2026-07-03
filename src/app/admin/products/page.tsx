"use client";

import React, { useState, useEffect } from "react";

interface Product {
  _id?: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unit: string;
  basePrice: number;
  taxRate: number;
  hsnCode: string;
  stock: number;
  reorderLevel: number;
  images: string[];
  status: "active" | "inactive";
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  slug: string;
}

const emptyProduct: Product = {
  name: "",
  sku: "",
  category: "",
  description: "",
  unit: "Nos",
  basePrice: 0,
  taxRate: 0,
  hsnCode: "",
  stock: 0,
  reorderLevel: 0,
  images: [],
  status: "active",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  slug: "",
};

function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "inventory" | "seo">("info");
  const [formData, setFormData] = useState<Product>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) throw new Error("Failed to fetch user");
        const meData = await meRes.json();
        const bid = meData.businessId || meData.user?.businessId || null;
        setBusinessId(bid);
        if (bid) {
          await fetchProducts(bid);
        }
      } catch {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function fetchProducts(bid: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?businessId=${bid}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openAddForm() {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setActiveTab("info");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormData({
      ...product,
      images: product.images || [],
    });
    setActiveTab("info");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyProduct);
  }

  function handleNameChange(name: string) {
    const newSlug = buildSlug(name);
    setFormData((prev) => {
      const slugWasEmpty = !prev.slug;
      const slugMatchesAuto = prev.slug === buildSlug(prev.name);
      return {
        ...prev,
        name,
        slug: slugWasEmpty || slugMatchesAuto ? newSlug : prev.slug,
      };
    });
  }

  function handleAutoSEO() {
    const name = formData.name;
    const category = formData.category;
    const desc = formData.description;
    setFormData((prev) => ({
      ...prev,
      metaTitle: `${name} - ${category}`,
      metaDescription: `Buy ${name} online. ${desc.slice(0, 100)}${desc.length > 100 ? "..." : ""}`,
      keywords: `${name}, ${category}, buy ${name} online`,
      slug: buildSlug(name),
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const imagesValue = formData.images;
      const imagesArray =
        typeof imagesValue === "string"
          ? (imagesValue as string)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : imagesValue;

      const payload = {
        ...formData,
        images: imagesArray,
        businessId,
      };

      let res: Response;
      if (editingProduct?._id) {
        res = await fetch(`/api/products/${editingProduct._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Failed to save product");
      }

      showToast(
        editingProduct ? "Product updated successfully" : "Product created successfully",
        "success"
      );
      closeForm();
      if (businessId) await fetchProducts(businessId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save product", "error");
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = products.length;
  const activeCount = products.filter((p) => p.status === "active").length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalSKUs = products.length;

  const imagesRaw =
    Array.isArray(formData.images)
      ? formData.images.join(", ")
      : (formData.images as unknown as string) || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
          </div>
          <button
            onClick={openAddForm}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Products</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{totalCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Out of Stock</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{outOfStockCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total SKUs</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2">{totalSKUs}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="border border-gray-200 rounded-lg text-sm text-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              {products.length === 0
                ? "No products yet. Add your first product."
                : "No products match your filters."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Product Name / SKU
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    HSN Code
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product._id || product.sku} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{product.sku || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{product.category || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      ₹{product.basePrice.toLocaleString("en-IN")}
                      {product.taxRate > 0 && (
                        <span className="text-xs text-gray-400 ml-1">+ GST {product.taxRate}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{product.stock}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{product.hsnCode || "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {product.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditForm(product)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title="Edit product"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-over Panel */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closeForm}
          />

          {/* Panel */}
          <div
            className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
              showForm ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
              {(["info", "inventory", "seo"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-sm font-medium mr-1 transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "info" ? "Product Info" : tab === "inventory" ? "Inventory" : "SEO"}
                </button>
              ))}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* TAB: Product Info */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="e.g. PRD-001"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value="">Select category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Food & Beverages">Food &amp; Beverages</option>
                      <option value="Cosmetics">Cosmetics</option>
                      <option value="Pharmaceuticals">Pharmaceuticals</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Books">Books</option>
                      <option value="Sports">Sports</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="Product description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value="Nos">Nos</option>
                      <option value="Kg">Kg</option>
                      <option value="Litre">Litre</option>
                      <option value="Metre">Metre</option>
                      <option value="Box">Box</option>
                      <option value="Carton">Carton</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.basePrice}
                        onChange={(e) =>
                          setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Tax Rate</label>
                    <select
                      value={formData.taxRate}
                      onChange={(e) =>
                        setFormData({ ...formData, taxRate: parseFloat(e.target.value) })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="e.g. 8471"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as "active" | "inactive",
                        })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB: Inventory */}
              {activeTab === "inventory" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.reorderLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Alert when stock falls below this</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
                    <textarea
                      rows={3}
                      value={imagesRaw}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          images: e.target.value as unknown as string[],
                        })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter image URLs separated by commas
                    </p>
                  </div>
                </div>
              )}

              {/* TAB: SEO */}
              {activeTab === "seo" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAutoSEO}
                      className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      Auto-generate SEO
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Page title for search engines"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.metaTitle.length}/60 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description
                    </label>
                    <textarea
                      rows={3}
                      maxLength={160}
                      value={formData.metaDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, metaDescription: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="Brief description for search results"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.metaDescription.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keywords{" "}
                      <span className="text-gray-400 font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                    {formData.keywords && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.keywords
                          .split(",")
                          .map((kw) => kw.trim())
                          .filter(Boolean)
                          .map((kw, i) => (
                            <span
                              key={i}
                              className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md"
                            >
                              {kw}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="product-url-slug"
                    />
                    {formData.slug && (
                      <p className="text-xs text-gray-400 mt-1">
                        URL preview: /products/{formData.slug}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {saving
                  ? "Saving..."
                  : editingProduct
                  ? "Save Changes"
                  : "Create Product"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
