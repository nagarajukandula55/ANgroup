"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Tag,
  Edit2,
  Trash2,
  X,
  ImageOff,
  Package,
  CheckCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";

interface Brand {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModalState {
  type: "add" | "edit" | "delete" | null;
  brand?: Brand;
}

export default function BrandsPage() {
  const { businessId } = useActiveBusinessId();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBrands = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/brands?${params}`);
      const data = await res.json();
      if (data.success) setBrands(data.brands);
    } catch {
      showToast("Failed to load brands", false);
    } finally {
      setLoading(false);
    }
  }, [businessId, search]);

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300);
    return () => clearTimeout(timer);
  }, [fetchBrands]);

  const openAdd = () => {
    setFormData({ name: "", description: "", logoUrl: "" });
    setFormError("");
    setModal({ type: "add" });
  };

  const openEdit = (brand: Brand) => {
    setFormData({
      name: brand.name,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
    });
    setFormError("");
    setModal({ type: "edit", brand });
  };

  const openDelete = (brand: Brand) => {
    setDeleteConfirmName("");
    setModal({ type: "delete", brand });
  };

  const closeModal = () => {
    setModal({ type: null });
    setFormError("");
  };

  const handleSubmitAdd = async () => {
    if (!formData.name.trim()) {
      setFormError("Brand name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim(),
          businessId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create brand.");
        return;
      }
      showToast("Brand created successfully.");
      closeModal();
      fetchBrands();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!formData.name.trim()) {
      setFormError("Brand name is required.");
      return;
    }
    if (!modal.brand) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/brands/${modal.brand._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to update brand.");
        return;
      }
      showToast("Brand updated successfully.");
      closeModal();
      fetchBrands();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.brand) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/brands/${modal.brand._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Failed to delete brand.", false);
        closeModal();
        return;
      }
      showToast("Brand deleted.");
      closeModal();
      fetchBrands();
    } catch {
      showToast("Network error.", false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (brand: Brand) => {
    try {
      const res = await fetch(`/api/brands/${brand._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Brand ${!brand.isActive ? "activated" : "deactivated"}.`);
        fetchBrands();
      }
    } catch {
      showToast("Failed to update status.", false);
    }
  };

  const activeBrands = brands.filter((b) => b.isActive);
  const inactiveBrands = brands.filter((b) => !b.isActive);

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
          <h1 className="text-xl font-semibold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage product brands and their details
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
          <Plus size={16} />
          Add Brand
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Layers size={14} />
            Total Brands
          </div>
          <p className="text-2xl font-semibold text-gray-900">{brands.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CheckCircle size={14} />
            Active
          </div>
          <p className="text-2xl font-semibold text-emerald-400">{activeBrands.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Package size={14} />
            Inactive
          </div>
          <p className="text-2xl font-semibold text-gray-500">{inactiveBrands.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands…"
          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading…</div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
            <Tag size={24} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-900 font-medium">No brands found</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? "Try a different search term." : "Get started by adding your first brand."}
            </p>
          </div>
          {!search && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
              <Plus size={16} />
              Add Brand
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand._id}
              brand={brand}
              onEdit={openEdit}
              onDelete={openDelete}
              onToggleActive={toggleActive}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modal.type === "add" && (
        <BrandModal
          title="Add Brand"
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmitAdd}
          existingLogos={Array.from(new Set(brands.map((b) => b.logoUrl).filter((u): u is string => !!u)))}
        />
      )}

      {/* Edit Modal */}
      {modal.type === "edit" && modal.brand && (
        <BrandModal
          title="Edit Brand"
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmitEdit}
          existingLogos={Array.from(new Set(brands.map((b) => b.logoUrl).filter((u): u is string => !!u)))}
        />
      )}

      {/* Delete Modal */}
      {modal.type === "delete" && modal.brand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">Delete Brand</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">
                This action cannot be undone. Type{" "}
                <span className="text-gray-900 font-medium">{modal.brand.name}</span>{" "}
                to confirm deletion.
              </p>
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={modal.brand.name}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500/40"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={closeModal} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmName !== modal.brand.name || submitting}
                className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Deleting…" : "Delete Brand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandCard({
  brand,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  brand: Brand;
  onEdit: (b: Brand) => void;
  onDelete: (b: Brand) => void;
  onToggleActive: (b: Brand) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3 hover:border-gray-300 transition-colors group">
      {/* Logo */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {brand.logoUrl && !imgError ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImageOff size={18} className="text-gray-600" />
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(brand)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(brand)}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">{brand.name}</h3>
        </div>
        {brand.description ? (
          <p className="text-xs text-gray-500 line-clamp-2">{brand.description}</p>
        ) : (
          <p className="text-xs text-gray-700 italic">No description</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={() => onToggleActive(brand)}
          className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
            brand.isActive
              ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "text-gray-500 bg-white hover:bg-gray-100"
          }`}
          title={brand.isActive ? "Click to deactivate" : "Click to activate"}
        >
          {brand.isActive ? "Active" : "Inactive"}
        </button>
        <span className="text-xs text-gray-600">
          {new Date(brand.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function BrandModal({
  title,
  formData,
  setFormData,
  formError,
  submitting,
  onClose,
  onSubmit,
  existingLogos,
}: {
  title: string;
  formData: { name: string; description: string; logoUrl: string };
  setFormData: (d: { name: string; description: string; logoUrl: string }) => void;
  formError: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  existingLogos: string[];
}) {
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  useEffect(() => {
    setLogoPreviewError(false);
  }, [formData.logoUrl]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", `brand-logo-${Date.now()}`);
      fd.append("category", "brand-logo");
      const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data?.asset?.fileUrl) {
        setFormData({ ...formData, logoUrl: data.asset.fileUrl });
      }
    } catch {
      /* preview error state below already covers a broken URL */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Logo preview */}
          {formData.logoUrl && (
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                {!logoPreviewError ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain p-2"
                    onError={() => setLogoPreviewError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageOff size={20} className="text-gray-600" />
                    <span className="text-xs text-gray-600">Invalid URL</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Brand Name <span className="text-red-400">*</span>
            </label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tata, Bosch, Samsung"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the brand…"
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Logo (optional)</label>
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading ? "Uploading…" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {existingLogos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowExisting((s) => !s)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Choose Existing
                </button>
              )}
            </div>

            {showExisting && existingLogos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
                {existingLogos.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, logoUrl: url });
                      setShowExisting(false);
                    }}
                    className="w-12 h-12 rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-gray-400"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}

            <input
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="Or paste a logo URL directly"
              className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle size={14} />
              {formError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : title}
          </button>
        </div>
      </div>
    </div>
  );
}
