"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Package,
  FolderTree,
  ImageIcon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import BusinessScopeControl from "@/components/catalog/BusinessScopeControl";

interface ProductCategory {
  _id: string;
  name: string;
  description?: string;
  parentId?: { _id: string; name: string } | null;
  imageUrl?: string;
  isActive: boolean;
  productCount: number;
  businessScope?: "SINGLE" | "MULTIPLE" | "ALL";
  businessIds?: string[];
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  parentId: string;
  imageUrl: string;
  businessScope: "SINGLE" | "MULTIPLE" | "ALL";
  businessIds: string[];
}

type ModalType = "add" | "edit" | "delete" | null;

interface ModalState {
  type: ModalType;
  category?: ProductCategory;
}

export default function ProductCategoriesPage() {
  const { businessId } = useActiveBusinessId();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    parentId: "",
    imageUrl: "",
    businessScope: "SINGLE",
    businessIds: [],
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCategories = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/product-categories?${params}`);
      const data = await res.json();
      if (data.success) setCategories(data.categories);
    } catch {
      showToast("Failed to load categories", false);
    } finally {
      setLoading(false);
    }
  }, [businessId, search]);

  useEffect(() => {
    const timer = setTimeout(fetchCategories, 300);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  const openAdd = () => {
    setFormData({ name: "", description: "", parentId: "", imageUrl: "", businessScope: "SINGLE", businessIds: [] });
    setFormError("");
    setModal({ type: "add" });
  };

  const openEdit = (cat: ProductCategory) => {
    setFormData({
      name: cat.name,
      description: cat.description || "",
      parentId: cat.parentId?._id || "",
      imageUrl: cat.imageUrl || "",
      businessScope: cat.businessScope || "SINGLE",
      businessIds: cat.businessIds || [],
    });
    setFormError("");
    setModal({ type: "edit", category: cat });
  };

  const openDelete = (cat: ProductCategory) => {
    setDeleteConfirmName("");
    setModal({ type: "delete", category: cat });
  };

  const closeModal = () => {
    setModal({ type: null });
    setFormError("");
  };

  const handleSubmitAdd = async () => {
    if (!formData.name.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
          imageUrl: formData.imageUrl.trim(),
          businessId,
          businessScope: formData.businessScope,
          businessIds: formData.businessIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create category.");
        return;
      }
      showToast("Category created successfully.");
      closeModal();
      fetchCategories();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!formData.name.trim()) {
      setFormError("Category name is required.");
      return;
    }
    if (!modal.category) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/product-categories/${modal.category._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
          imageUrl: formData.imageUrl.trim(),
          businessScope: formData.businessScope,
          businessIds: formData.businessIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to update category.");
        return;
      }
      showToast("Category updated successfully.");
      closeModal();
      fetchCategories();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.category) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/product-categories/${modal.category._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Failed to delete category.", false);
        closeModal();
        return;
      }
      showToast("Category deleted.");
      closeModal();
      fetchCategories();
    } catch {
      showToast("Network error.", false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (cat: ProductCategory) => {
    try {
      const res = await fetch(`/api/product-categories/${cat._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Category ${!cat.isActive ? "activated" : "deactivated"}.`);
        fetchCategories();
      }
    } catch {
      showToast("Failed to update status.", false);
    }
  };

  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.isActive).length;
  const rootCount = categories.filter((c) => !c.parentId).length;

  // Categories available as parent options (exclude current editing category)
  const parentOptions = categories.filter(
    (c) => modal.category ? c._id !== modal.category._id : true
  );

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
            toast.ok
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {toast.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Product Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organise your product catalogue with hierarchical categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Layers size={14} />
            Total Categories
          </div>
          <p className="text-2xl font-semibold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CheckCircle size={14} />
            Active
          </div>
          <p className="text-2xl font-semibold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <FolderTree size={14} />
            Root Categories
          </div>
          <p className="text-2xl font-semibold text-blue-400">{rootCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
            <Layers size={24} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-900 font-medium">No categories found</p>
            <p className="text-sm text-gray-500 mt-1">
              {search
                ? "Try a different search term."
                : "Get started by adding your first product category."}
            </p>
          </div>
          {!search && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">
                  Parent
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr
                  key={cat._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Name + image + description */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {cat.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <ImageIcon size={14} className="text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {cat.name}
                        </p>
                        {cat.description && (
                          <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Parent */}
                  <td className="px-4 py-3">
                    {cat.parentId ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ChevronRight size={12} className="text-gray-600" />
                        {cat.parentId.name}
                      </div>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-500 bg-white">
                        Root
                      </span>
                    )}
                  </td>

                  {/* Product count */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Package size={12} className="text-gray-600" />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          cat.productCount > 0
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-gray-500 bg-white"
                        }`}
                      >
                        {cat.productCount}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(cat)}
                      className="flex items-center gap-1.5 group"
                      title={cat.isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      {cat.isActive ? (
                        <>
                          <ToggleRight
                            size={18}
                            className="text-emerald-400 group-hover:text-emerald-300"
                          />
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                            Active
                          </span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft
                            size={18}
                            className="text-gray-600 group-hover:text-gray-500"
                          />
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-500 bg-white">
                            Inactive
                          </span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => openDelete(cat)}
                        className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal.type === "add" || modal.type === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.type === "add" ? "Add Category" : "Edit Category"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Category Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Electronics, Apparel…"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Brief description of this category…"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              {/* Parent Category */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Parent Category
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, parentId: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none"
                >
                  <option value="">— None (Root Category) —</option>
                  {parentOptions.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.parentId ? `↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Leave empty to create a root-level category.
                </p>
              </div>

              {/* Image URL */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Image URL
                </label>
                <input
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                  }
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
                {formData.imageUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <p className="text-xs text-gray-500">Image preview</p>
                  </div>
                )}
              </div>

              <BusinessScopeControl
                value={{ businessScope: formData.businessScope, businessIds: formData.businessIds }}
                onChange={(v) => setFormData((p) => ({ ...p, ...v }))}
              />

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={
                  modal.type === "add" ? handleSubmitAdd : handleSubmitEdit
                }
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? (
                  "Saving…"
                ) : modal.type === "add" ? (
                  <>
                    <Plus size={14} />
                    Create Category
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal.type === "delete" && modal.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                Delete Category
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <AlertCircle
                  size={18}
                  className="text-red-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Delete &quot;{modal.category.name}&quot;?
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This action cannot be undone. Any sub-categories will be
                    promoted to root level. Products using this category will
                    retain their category label.
                  </p>
                  {modal.category.productCount > 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      Warning: {modal.category.productCount} product
                      {modal.category.productCount !== 1 ? "s" : ""} currently
                      assigned to this category.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Type <span className="font-mono text-gray-600">{modal.category.name}</span> to confirm
                </label>
                <input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={modal.category.name}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={
                  submitting ||
                  deleteConfirmName !== modal.category.name
                }
                className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Deleting…" : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
