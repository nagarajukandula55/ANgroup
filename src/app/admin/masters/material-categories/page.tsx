"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  FolderTree,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface MaterialCategory {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  parentCategory?: { _id: string; name: string; code?: string } | null;
  unit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  materialCount?: number;
}

interface ModalState {
  type: "add" | "edit" | "delete" | null;
  category?: MaterialCategory;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  parentCategory: string;
  unit: string;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  name: "",
  code: "",
  description: "",
  parentCategory: "",
  unit: "",
  isActive: true,
};

export default function MaterialCategoriesPage() {
  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      const res = await fetch(`/api/material-categories?${params}`);
      const data = await res.json();
      if (data.success) setCategories(data.data ?? []);
    } catch {
      showToast("Failed to load categories", false);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ── filtered list ─────────────────────────────────── */
  const filtered = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.code?.toLowerCase() ?? "").includes(q) ||
      (c.description?.toLowerCase() ?? "").includes(q)
    );
  });

  /* ── modal helpers ──────────────────────────────────── */
  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError("");
    setModal({ type: "add" });
  };

  const openEdit = (category: MaterialCategory) => {
    setFormData({
      name: category.name,
      code: category.code ?? "",
      description: category.description ?? "",
      parentCategory:
        typeof category.parentCategory === "object" && category.parentCategory
          ? category.parentCategory._id
          : "",
      unit: category.unit ?? "",
      isActive: category.isActive,
    });
    setFormError("");
    setModal({ type: "edit", category });
  };

  const openDelete = (category: MaterialCategory) => {
    setDeleteConfirmName("");
    setModal({ type: "delete", category });
  };

  const closeModal = () => setModal({ type: null });

  /* ── submit add / edit ──────────────────────────────── */
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        businessId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        parentCategory: formData.parentCategory || undefined,
        unit: formData.unit.trim() || undefined,
        isActive: formData.isActive,
      };

      let res: Response;
      if (modal.type === "add") {
        res = await fetch("/api/material-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/material-categories/${modal.category!._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error ?? "Something went wrong.");
        return;
      }

      showToast(
        modal.type === "add"
          ? "Category created successfully."
          : "Category updated successfully."
      );
      closeModal();
      fetchCategories();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!modal.category) return;
    if (deleteConfirmName !== modal.category.name) {
      setFormError("Category name does not match.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(
        `/api/material-categories/${modal.category._id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error ?? "Failed to delete.");
        return;
      }
      showToast("Category deleted.");
      closeModal();
      fetchCategories();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── parent options (exclude self on edit) ────────────── */
  const parentOptions = categories.filter(
    (c) => modal.type !== "edit" || c._id !== modal.category?._id
  );

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Material Categories
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage categories used to classify materials and inventory items.
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100">
          <Plus size={15} />
          Add Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Categories</p>
          <p className="text-2xl font-semibold text-white">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 mb-1">Active</p>
          <p className="text-2xl font-semibold text-emerald-400">
            {categories.filter((c) => c.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 mb-1">Inactive</p>
          <p className="text-2xl font-semibold text-zinc-400">
            {categories.filter((c) => !c.isActive).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code or description…"
          className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Name</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium hidden sm:table-cell">Code</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium hidden md:table-cell">Description</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium hidden lg:table-cell">Parent</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Status</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-12 text-center text-zinc-500">Loading…</div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-12 text-center">
                    <FolderTree size={32} className="mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm mb-4">
                      {search ? "No categories match your search." : "No material categories yet."}
                    </p>
                    {!search && (
                      <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 mx-auto"
                      >
                        <Plus size={14} />
                        Add First Category
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((cat) => (
                <tr key={cat._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Layers size={13} className="text-blue-400" />
                      </div>
                      <span className="text-white font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {cat.code ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-zinc-400 bg-white/[0.04]">
                        {cat.code}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-zinc-400 text-xs line-clamp-1 max-w-xs">
                      {cat.description || <span className="text-zinc-600">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {cat.parentCategory ? (
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <ChevronRight size={12} className="text-zinc-600" />
                        {cat.parentCategory.name}
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">Root</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {cat.isActive ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-zinc-400 bg-white/[0.04]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">
          Showing {filtered.length} of {categories.length} categories
        </p>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      {(modal.type === "add" || modal.type === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">
                {modal.type === "add" ? "Add Material Category" : "Edit Material Category"}
              </h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Category Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Raw Materials"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Code */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. RM-01"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category…"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* Parent Category */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Parent Category</label>
                <select
                  value={formData.parentCategory}
                  onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none"
                >
                  <option value="">None (Root Category)</option>
                  {parentOptions.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Default Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. kg, pcs, m"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3">
                <div>
                  <p className="text-sm text-white">Active</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Inactive categories won&apos;t appear in material forms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    formData.isActive ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button onClick={closeModal} className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
              >
                {submitting
                  ? "Saving…"
                  : modal.type === "add"
                  ? "Create Category"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      {modal.type === "delete" && modal.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">Delete Category</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium mb-0.5">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-zinc-400">
                    Deleting{" "}
                    <span className="text-white font-medium">
                      {modal.category.name}
                    </span>{" "}
                    will remove it permanently. Materials using this category may be
                    affected.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Type{" "}
                  <span className="text-white font-medium">
                    {modal.category.name}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => {
                    setDeleteConfirmName(e.target.value);
                    setFormError("");
                  }}
                  placeholder="Category name"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting || deleteConfirmName !== modal.category.name}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Deleting…" : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm shadow-xl transition-all ${
            toast.ok
              ? "bg-zinc-900 border-white/[0.08] text-white"
              : "bg-red-950 border-red-500/30 text-red-300"
          }`}
        >
          {toast.ok ? (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          ) : (
            <AlertTriangle size={13} className="text-red-400" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
