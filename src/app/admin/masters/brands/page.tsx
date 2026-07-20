"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  FolderTree,
  Smartphone,
} from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import BusinessScopeControl, { type BusinessScopeValue } from "@/components/catalog/BusinessScopeControl";
import { CategoryTree } from "@/components/shared/CategoryTree";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS, type DeviceCategory } from "@/core/catalog/deviceCategory";

interface Brand {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  parentId?: string | null;
  category?: DeviceCategory | null;
  productCategoryId?: string | null;
  businessScope?: "SINGLE" | "MULTIPLE" | "ALL";
  businessIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProductCategoryOption {
  _id: string;
  name: string;
  parentId?: { _id: string; name: string } | null;
}

interface SeriesOption {
  _id: string;
  name: string;
  brandId: string;
  isActive: boolean;
}

interface ModelOption {
  _id: string;
  name: string;
  brandId: string;
  seriesId?: string | null;
  isActive: boolean;
}

// Synthetic tree row used only for the Tree view -- Category, Series and
// Model don't natively have a "parentId" pointing at a Brand's own tree
// slot, so these are given prefixed synthetic ids/parentIds
// ("cat:"/"series:"/"model:") purely so CategoryTree (which only
// understands one flat parentId-linked list) can render the full
// Category -> Brand -> Series -> Model hierarchy without being rewritten.
// "kind" drives which icon/actions render for each row (see renderIcon/
// renderActions below) -- a Category row is a device-type grouping only
// (no edit/delete), a Brand row keeps the existing modal-based edit/
// delete, Series/Model rows get their own inline rename+delete against
// their own APIs.
interface TreeRow {
  _id: string;
  name: string;
  parentId?: string | null;
  isActive?: boolean;
  kind: "category" | "brand" | "series" | "model";
}

const CATEGORY_NODE_PREFIX = "cat:";
const SERIES_NODE_PREFIX = "series:";
const MODEL_NODE_PREFIX = "model:";

interface ModalState {
  type: "add" | "edit" | "delete" | null;
  brand?: Brand;
}

interface SeriesModalState {
  open: boolean;
  brandId: string;
  brandName: string;
}

interface ModelModalState {
  open: boolean;
  mode: "add" | "edit";
  brandId: string;
  brandName: string;
  seriesId: string; // "" = no series (direct under brand)
  model?: ModelOption;
}

export default function BrandsPage() {
  const { businessId } = useActiveBusinessId();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "tree">("table");
  const [categoryFilter, setCategoryFilter] = useState<DeviceCategory | "">("");
  const [productCategories, setProductCategories] = useState<ProductCategoryOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [seriesModal, setSeriesModal] = useState<SeriesModalState | null>(null);
  const [modelModal, setModelModal] = useState<ModelModalState | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    parentId: "",
    category: "" as DeviceCategory | "",
    productCategoryId: "",
    businessScope: "SINGLE" as "SINGLE" | "MULTIPLE" | "ALL",
    businessIds: [] as string[],
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBrands = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId, includeInactive: "true" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/brands?${params}`);
      const data = await res.json();
      if (data.success) setBrands(data.brands);
    } catch {
      showToast("Failed to load brands", false);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300);
    return () => clearTimeout(timer);
  }, [fetchBrands]);

  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/product-categories?businessId=${businessId}&includeInactive=true`)
      .then((r) => r.json())
      .then((d) => d.success && setProductCategories(d.categories || []))
      .catch(() => {});
  }, [businessId]);

  // Both Table and Tree views need the full Series and DeviceModel lists
  // (not just Brands), fetched once per business, unfiltered by brand, and
  // nested/grouped client-side below.
  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/series?businessId=${businessId}&includeInactive=true`)
      .then((r) => r.json())
      .then((d) => d.success && setSeriesOptions(d.series || []))
      .catch(() => {});
    fetch(`/api/device-models?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => d.success && setModelOptions(d.models || []))
      .catch(() => {});
  }, [businessId]);

  // Only device types that actually have a top-level (non-sub-branded)
  // brand under them get a Category row in the Tree view -- otherwise
  // every one of the 47 device types would show up as a permanently-empty
  // folder there, which is just noise for a business that only sells a
  // handful of them. The Table view below intentionally does the opposite
  // (always shows every category) so admins can add the very first brand
  // into any category without hunting.
  const usedCategories = new Set(brands.filter((b) => !b.parentId && b.category).map((b) => b.category as DeviceCategory));

  // Category -> Brand -> Series -> Model, all in one flat parentId-linked
  // list CategoryTree can nest: Category rows are synthetic (device-type
  // grouping only, no underlying document), Brand rows nest under their
  // Category (or their parent Brand, for sub-branded lines), Series rows
  // nest under their Brand, Model rows nest under their Series (or, if the
  // model has no seriesId, directly under its Brand).
  const treeRows: TreeRow[] = [
    ...DEVICE_CATEGORIES.filter((c) => usedCategories.has(c)).map((c): TreeRow => ({
      _id: `${CATEGORY_NODE_PREFIX}${c}`,
      name: DEVICE_CATEGORY_LABELS[c],
      parentId: null,
      kind: "category",
    })),
    ...brands.map((b): TreeRow => ({
      _id: b._id,
      name: b.name,
      parentId: b.parentId || (b.category ? `${CATEGORY_NODE_PREFIX}${b.category}` : null),
      isActive: b.isActive,
      kind: "brand",
    })),
    ...seriesOptions.map((s): TreeRow => ({
      _id: `${SERIES_NODE_PREFIX}${s._id}`,
      name: s.name,
      parentId: s.brandId,
      isActive: s.isActive,
      kind: "series",
    })),
    ...modelOptions.map((m): TreeRow => ({
      _id: `${MODEL_NODE_PREFIX}${m._id}`,
      name: m.name,
      // Series is optional now -- a model with no seriesId attaches
      // directly under its Brand instead of a Series node.
      parentId: m.seriesId ? `${SERIES_NODE_PREFIX}${m.seriesId}` : m.brandId,
      isActive: m.isActive,
      kind: "model",
    })),
  ];

  const refreshSeriesAndModels = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/series?businessId=${businessId}&includeInactive=true`)
      .then((r) => r.json())
      .then((d) => d.success && setSeriesOptions(d.series || []))
      .catch(() => {});
    fetch(`/api/device-models?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => d.success && setModelOptions(d.models || []))
      .catch(() => {});
  }, [businessId]);

  const renameSeries = async (row: TreeRow | SeriesOption) => {
    const id = "kind" in row ? row._id.slice(SERIES_NODE_PREFIX.length) : row._id;
    const name = window.prompt("Rename series", row.name);
    if (!name || !name.trim() || name.trim() === row.name) return;
    const res = await fetch(`/api/series/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Failed to rename series.", false);
      return;
    }
    showToast("Series renamed.");
    refreshSeriesAndModels();
  };

  const deleteSeries = async (row: TreeRow | SeriesOption) => {
    const id = "kind" in row ? row._id.slice(SERIES_NODE_PREFIX.length) : row._id;
    if (!window.confirm(`Delete series "${row.name}"? Models under it will need to be reassigned.`)) return;
    const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Failed to delete series.", false);
      return;
    }
    showToast("Series deleted.");
    refreshSeriesAndModels();
  };

  const renameModel = async (row: TreeRow | ModelOption) => {
    const id = "kind" in row ? row._id.slice(MODEL_NODE_PREFIX.length) : row._id;
    const name = window.prompt("Rename model", row.name);
    if (!name || !name.trim() || name.trim() === row.name) return;
    const res = await fetch(`/api/device-models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Failed to rename model.", false);
      return;
    }
    showToast("Model renamed.");
    refreshSeriesAndModels();
  };

  const deleteModel = async (row: TreeRow | ModelOption) => {
    if (!window.confirm(`Delete model "${row.name}"?`)) return;
    const id = "kind" in row ? row._id.slice(MODEL_NODE_PREFIX.length) : row._id;
    const res = await fetch(`/api/device-models/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Failed to delete model.", false);
      return;
    }
    showToast("Model deleted.");
    refreshSeriesAndModels();
  };

  // One-click fix for catalog data that predates the Series level (models
  // with no seriesId that an admin would rather see grouped under a named
  // Series) -- see /api/series/backfill's own header comment. Series is no
  // longer mandatory, so this is offered as a convenience, not a repair.
  const runBackfill = async () => {
    if (!businessId) return;
    setBackfilling(true);
    try {
      const res = await fetch(`/api/series/backfill?businessId=${businessId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Backfill failed.", false);
        return;
      }
      const { seriesCreated, modelsBackfilled } = data.summary;
      showToast(
        seriesCreated === 0 && modelsBackfilled === 0
          ? "Nothing to group -- every model already has a Series or is intentionally direct."
          : `Created ${seriesCreated} Series, linked ${modelsBackfilled} models.`
      );
      refreshSeriesAndModels();
    } catch {
      showToast("Network error.", false);
    } finally {
      setBackfilling(false);
    }
  };

  // Populates the curated Indian-market starter catalog (all categories --
  // see src/core/catalog/seedCatalogData.ts) for the active business, from
  // the browser, using the server's own DB connection -- no local script /
  // .env.local access needed. Idempotent: safe to click more than once.
  const runSeedCatalog = async () => {
    if (!businessId) return;
    if (!window.confirm("Add the curated starter catalog (brands, series, models across all categories) for this business? This only adds what's missing -- existing data is never overwritten or removed.")) {
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/seed-catalog?businessId=${businessId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Seeding failed.", false);
        return;
      }
      const { brandsCreated, brandsBackfilled, seriesCreated, modelsCreated } = data.summary;
      showToast(
        brandsCreated === 0 && brandsBackfilled === 0 && seriesCreated === 0 && modelsCreated === 0
          ? "Already seeded -- nothing new to add."
          : `Added ${brandsCreated} brands, ${seriesCreated} series, ${modelsCreated} models.`
      );
      fetchBrands();
      refreshSeriesAndModels();
    } catch {
      showToast("Network error.", false);
    } finally {
      setSeeding(false);
    }
  };

  const openAdd = (category?: DeviceCategory) => {
    setFormData({ name: "", description: "", logoUrl: "", parentId: "", category: category || "", productCategoryId: "", businessScope: "SINGLE", businessIds: [] });
    setFormError("");
    setModal({ type: "add" });
  };

  const openEdit = (brand: Brand) => {
    setFormData({
      name: brand.name,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
      parentId: brand.parentId || "",
      category: brand.category || "",
      productCategoryId: brand.productCategoryId || "",
      businessScope: brand.businessScope || "SINGLE",
      businessIds: brand.businessIds || [],
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
          parentId: formData.parentId || undefined,
          category: formData.category || undefined,
          productCategoryId: formData.productCategoryId || undefined,
          businessId,
          businessScope: formData.businessScope,
          businessIds: formData.businessIds,
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
          parentId: formData.parentId || null,
          category: formData.category || null,
          productCategoryId: formData.productCategoryId || null,
          businessScope: formData.businessScope,
          businessIds: formData.businessIds,
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

  // ---- Series modal (create only -- rename/delete reuse the existing
  // prompt/confirm flows above, wired into both Table and Tree views) ----
  const openAddSeries = (brand: { _id: string; name: string }) => {
    setSeriesModal({ open: true, brandId: brand._id, brandName: brand.name });
  };
  const closeSeriesModal = () => setSeriesModal(null);
  const submitSeriesModal = async (name: string) => {
    if (!seriesModal || !name.trim() || !businessId) return;
    const res = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), brandId: seriesModal.brandId, businessId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Failed to create series.", false);
      return;
    }
    showToast("Series created.");
    closeSeriesModal();
    refreshSeriesAndModels();
  };

  // ---- Model modal (create + edit -- reuses same POST/PUT device-models
  // endpoints the old Models page used, now with optional seriesId) ----
  const openAddModel = (brand: { _id: string; name: string }, seriesId = "") => {
    setModelModal({ open: true, mode: "add", brandId: brand._id, brandName: brand.name, seriesId });
  };
  const openEditModel = (brand: { _id: string; name: string }, model: ModelOption) => {
    setModelModal({ open: true, mode: "edit", brandId: brand._id, brandName: brand.name, seriesId: model.seriesId || "", model });
  };
  const closeModelModal = () => setModelModal(null);
  const submitModelModal = async (name: string, seriesId: string, isActive: boolean) => {
    if (!modelModal || !name.trim() || !businessId) return;
    const isEdit = modelModal.mode === "edit" && modelModal.model;
    const url = isEdit ? `/api/device-models/${modelModal.model!._id}` : "/api/device-models";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit
      ? { name: name.trim(), seriesId: seriesId || null, isActive }
      : { name: name.trim(), brandId: modelModal.brandId, seriesId: seriesId || null, businessId };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || `Failed to ${isEdit ? "update" : "create"} model.`, false);
      return;
    }
    showToast(isEdit ? "Model updated." : "Model created.");
    closeModelModal();
    refreshSeriesAndModels();
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
          <h1 className="text-xl font-semibold text-gray-900">Brands &amp; Models</h1>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            The single catalog manager: every Device Category, the Brands under it, each Brand's
            optional Series (product lines), and every Model/Variant. Category is a fixed,
            platform-wide picklist -- pick it while adding a Brand below, there's no separate
            "Add Category" step. Series is optional: if a brand has no meaningful product line,
            add its Models directly to the brand with no Series at all.
          </p>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 shrink-0">
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

      {/* Device Category filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setCategoryFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            categoryFilter === "" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          All Categories
        </button>
        {DEVICE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              categoryFilter === c ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {DEVICE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category, brand, series or model…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
        </div>
        <button
          onClick={runSeedCatalog}
          disabled={seeding}
          title="Add the curated Indian-market starter catalog (brands, series, models across all categories) -- only adds what's missing, never overwrites existing data"
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 shrink-0"
        >
          {seeding ? "Seeding…" : "Seed Standard Catalog"}
        </button>
        {view === "tree" && (
          <button
            onClick={runBackfill}
            disabled={backfilling}
            title="Group any model that has no Series yet under a newly created 'General' Series -- Series is optional, so this is a convenience, not a requirement"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 shrink-0"
          >
            {backfilling ? "Fixing…" : "Group Unassigned Models"}
          </button>
        )}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Table
          </button>
          <button
            onClick={() => setView("tree")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === "tree" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Tree
          </button>
        </div>
      </div>

      {/* Table view -- one row per leaf Model, grouped by Category > Brand >
          Series, with every category (even empty ones) always shown as its
          own section so admins can add the first Brand anywhere without
          hunting. */}
      {view === "table" && (
        <CatalogTable
          brands={brands}
          seriesOptions={seriesOptions}
          modelOptions={modelOptions}
          categoryFilter={categoryFilter}
          search={search}
          loading={loading}
          onAddBrand={openAdd}
          onEditBrand={openEdit}
          onDeleteBrand={openDelete}
          onAddSeries={openAddSeries}
          onRenameSeries={renameSeries}
          onDeleteSeries={deleteSeries}
          onAddModel={openAddModel}
          onEditModel={openEditModel}
          onDeleteModel={deleteModel}
        />
      )}

      {/* Tree view -- collapsible/expandable, multi-root, full
          Category -> Brand -> Series -> Model hierarchy. Each row kind
          gets its own icon and its own actions: Category rows are a
          grouping only (no actions), Brand rows keep the existing
          modal-based edit/delete, Series/Model rows rename/delete inline
          against their own APIs. */}
      {!loading && brands.length > 0 && view === "tree" && (
        <CategoryTree
          items={treeRows}
          defaultOpenDepth={1}
          onEdit={(item) => {
            const brand = brands.find((b) => b._id === item._id);
            if (brand) openEdit(brand);
          }}
          onDelete={(item) => {
            const brand = brands.find((b) => b._id === item._id);
            if (brand) openDelete(brand);
          }}
          renderIcon={(item) => {
            const cls = "w-3.5 h-3.5 shrink-0";
            switch (item.kind) {
              case "category":
                return <FolderTree className={`${cls} text-gray-400`} />;
              case "brand":
                return <Tag className={`${cls} text-gray-500`} />;
              case "series":
                return <Layers className={`${cls} text-indigo-400`} />;
              case "model":
                return <Smartphone className={`${cls} text-emerald-500`} />;
              default:
                return null;
            }
          }}
          renderActions={(item) => {
            if (item.kind === "category") return null;
            if (item.kind === "brand") {
              const brand = brands.find((b) => b._id === item._id);
              return (
                <>
                  <button
                    onClick={() => brand && openEdit(brand)}
                    className="text-gray-400 hover:text-gray-700 shrink-0"
                    title="Edit brand"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => brand && openDelete(brand)}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Delete brand"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              );
            }
            if (item.kind === "series") {
              return (
                <>
                  <button onClick={() => renameSeries(item)} className="text-gray-400 hover:text-gray-700 shrink-0" title="Rename series">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSeries(item)} className="text-gray-400 hover:text-red-500 shrink-0" title="Delete series">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              );
            }
            // model
            return (
              <>
                <button onClick={() => renameModel(item)} className="text-gray-400 hover:text-gray-700 shrink-0" title="Rename model">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteModel(item)} className="text-gray-400 hover:text-red-500 shrink-0" title="Delete model">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            );
          }}
        />
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
          parentOptions={brands}
          productCategories={productCategories}
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
          parentOptions={brands.filter((b) => b._id !== modal.brand!._id)}
          productCategories={productCategories}
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

      {/* Series create modal */}
      {seriesModal?.open && (
        <SeriesModal
          brandName={seriesModal.brandName}
          onClose={closeSeriesModal}
          onSubmit={submitSeriesModal}
        />
      )}

      {/* Model create/edit modal */}
      {modelModal?.open && (
        <ModelModal
          state={modelModal}
          seriesOptions={seriesOptions.filter((s) => s.brandId === modelModal.brandId)}
          onClose={closeModelModal}
          onSubmit={submitModelModal}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table view
// ---------------------------------------------------------------------------

interface LeafRow {
  key: string;
  category: DeviceCategory;
  brand: Brand;
  series: SeriesOption | null;
  model: ModelOption | null; // null = placeholder "no models yet" row
  isFirstOfGroup: boolean; // first row in a contiguous Category+Brand+Series run
}

function CatalogTable({
  brands,
  seriesOptions,
  modelOptions,
  categoryFilter,
  search,
  loading,
  onAddBrand,
  onEditBrand,
  onDeleteBrand,
  onAddSeries,
  onRenameSeries,
  onDeleteSeries,
  onAddModel,
  onEditModel,
  onDeleteModel,
}: {
  brands: Brand[];
  seriesOptions: SeriesOption[];
  modelOptions: ModelOption[];
  categoryFilter: DeviceCategory | "";
  search: string;
  loading: boolean;
  onAddBrand: (category?: DeviceCategory) => void;
  onEditBrand: (b: Brand) => void;
  onDeleteBrand: (b: Brand) => void;
  onAddSeries: (b: { _id: string; name: string }) => void;
  onRenameSeries: (s: SeriesOption) => void;
  onDeleteSeries: (s: SeriesOption) => void;
  onAddModel: (b: { _id: string; name: string }, seriesId?: string) => void;
  onEditModel: (b: { _id: string; name: string }, m: ModelOption) => void;
  onDeleteModel: (m: ModelOption) => void;
}) {
  const q = search.trim().toLowerCase();

  const categories = categoryFilter ? [categoryFilter] : DEVICE_CATEGORIES;

  // Group brands (top-level only -- sub-brands render nested under a
  // top-level brand's own section via their own category, same as Tree)
  // by category.
  const brandsByCategory = useMemo(() => {
    const map = new Map<DeviceCategory, Brand[]>();
    for (const c of DEVICE_CATEGORIES) map.set(c, []);
    for (const b of brands) {
      if (!b.category) continue;
      map.get(b.category)?.push(b);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [brands]);

  const seriesByBrand = useMemo(() => {
    const map = new Map<string, SeriesOption[]>();
    for (const s of seriesOptions) {
      if (!map.has(s.brandId)) map.set(s.brandId, []);
      map.get(s.brandId)!.push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [seriesOptions]);

  const modelsByBrandSeries = useMemo(() => {
    // key: brandId + "|" + (seriesId || "")
    const map = new Map<string, ModelOption[]>();
    for (const m of modelOptions) {
      const key = `${m.brandId}|${m.seriesId || ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [modelOptions]);

  function matchesSearch(categoryLabel: string, brandName: string, seriesName: string | null, modelName: string | null) {
    if (!q) return true;
    return (
      categoryLabel.toLowerCase().includes(q) ||
      brandName.toLowerCase().includes(q) ||
      (seriesName ? seriesName.toLowerCase().includes(q) : false) ||
      (modelName ? modelName.toLowerCase().includes(q) : false)
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryLabel = DEVICE_CATEGORY_LABELS[category];
        const categoryBrands = (brandsByCategory.get(category) || []).filter((b) => !b.parentId);

        // Pre-compute whether this category has any row matching search --
        // if searching and nothing matches, collapse the whole section.
        let categoryHasMatch = !q || categoryLabel.toLowerCase().includes(q);
        if (!categoryHasMatch) {
          for (const brand of categoryBrands) {
            if (brand.name.toLowerCase().includes(q)) {
              categoryHasMatch = true;
              break;
            }
            const brandSeries = seriesByBrand.get(brand._id) || [];
            for (const s of brandSeries) {
              if (s.name.toLowerCase().includes(q)) categoryHasMatch = true;
            }
            const allBrandModels = modelOptions.filter((m) => m.brandId === brand._id);
            for (const m of allBrandModels) {
              if (m.name.toLowerCase().includes(q)) categoryHasMatch = true;
            }
          }
        }
        if (!categoryHasMatch) return null;

        return (
          <div key={category} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Category section header -- always shown, even with zero brands */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FolderTree size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{categoryLabel}</h3>
                <span className="text-[11px] text-gray-400">
                  {categoryBrands.length} brand{categoryBrands.length === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={() => onAddBrand(category)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
              >
                <Plus size={12} /> Add Brand
              </button>
            </div>

            {categoryBrands.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400">
                No brands yet in this category —{" "}
                <button onClick={() => onAddBrand(category)} className="underline hover:text-gray-700">
                  add the first one
                </button>
                .
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Brand</th>
                    <th className="px-4 py-2 font-medium">Series</th>
                    <th className="px-4 py-2 font-medium">Model / Variant</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBrands.map((brand) => {
                    const brandMatches =
                      !q ||
                      categoryLabel.toLowerCase().includes(q) ||
                      brand.name.toLowerCase().includes(q) ||
                      (seriesByBrand.get(brand._id) || []).some((s) => s.name.toLowerCase().includes(q)) ||
                      modelOptions.some((m) => m.brandId === brand._id && m.name.toLowerCase().includes(q));
                    if (!brandMatches) return null;

                    const brandSeries = seriesByBrand.get(brand._id) || [];
                    const directModels = modelsByBrandSeries.get(`${brand._id}|`) || [];

                    // Build the rows: brand header row, then direct models
                    // (no series), then each series header + its models.
                    const rows: React.ReactNode[] = [];

                    rows.push(
                      <tr key={`brand-${brand._id}`} className="bg-gray-50/60">
                        <td className="px-4 py-2 text-xs text-gray-500" colSpan={2}>
                          <div className="flex items-center gap-2">
                            <Tag size={13} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{brand.name}</span>
                            {!brand.isActive && <span className="text-[10px] text-gray-400">(inactive)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2" colSpan={2}></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onAddSeries(brand)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
                            >
                              <Plus size={11} /> Series
                            </button>
                            <button
                              onClick={() => onAddModel(brand)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
                            >
                              <Plus size={11} /> Model
                            </button>
                            <button onClick={() => onEditBrand(brand)} className="text-gray-400 hover:text-gray-700" title="Edit brand">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => onDeleteBrand(brand)} className="text-gray-400 hover:text-red-500" title="Delete brand">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    // Direct-under-brand models (no series)
                    if (directModels.length === 0) {
                      // Only show the placeholder if there's no series either
                      // (otherwise the "no models" state is implied and this
                      // row would just be noise above the series sections).
                    } else {
                      directModels
                        .filter((m) => matchesSearch(categoryLabel, brand.name, null, m.name))
                        .forEach((m, idx) => {
                          rows.push(
                            <ModelDataRow
                              key={`model-${m._id}`}
                              categoryLabel={categoryLabel}
                              brandName={brand.name}
                              seriesLabel={null}
                              model={m}
                              muted={idx > 0}
                              onEdit={() => onEditModel(brand, m)}
                              onDelete={() => onDeleteModel(m)}
                            />
                          );
                        });
                    }
                    if (directModels.length === 0 && brandSeries.length === 0) {
                      rows.push(
                        <tr key={`noseries-noModel-${brand._id}`}>
                          <td className="px-4 py-2 text-xs text-gray-300">{categoryLabel}</td>
                          <td className="px-4 py-2 text-xs text-gray-300">{brand.name}</td>
                          <td className="px-4 py-2 text-xs text-gray-400">— (direct)</td>
                          <td className="px-4 py-2 text-xs text-gray-400 italic" colSpan={2}>
                            No models yet —{" "}
                            <button onClick={() => onAddModel(brand)} className="underline hover:text-gray-700 not-italic">
                              + Add Model
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // Series sections
                    brandSeries
                      .filter((s) => !q || brand.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (modelsByBrandSeries.get(`${brand._id}|${s._id}`) || []).some((m) => m.name.toLowerCase().includes(q)))
                      .forEach((series) => {
                        const seriesModels = (modelsByBrandSeries.get(`${brand._id}|${series._id}`) || []).filter((m) =>
                          matchesSearch(categoryLabel, brand.name, series.name, m.name)
                        );
                        rows.push(
                          <tr key={`series-${series._id}`} className="bg-gray-50/30">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-xs" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <Layers size={12} className="text-indigo-400" />
                                <span className="font-medium text-gray-700">{series.name}</span>
                                {!series.isActive && <span className="text-[10px] text-gray-400">(inactive)</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => onAddModel(brand, series._id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
                                >
                                  <Plus size={11} /> Model
                                </button>
                                <button onClick={() => onRenameSeries(series)} className="text-gray-400 hover:text-gray-700" title="Rename series">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => onDeleteSeries(series)} className="text-gray-400 hover:text-red-500" title="Delete series">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                        if (seriesModels.length === 0) {
                          rows.push(
                            <tr key={`series-empty-${series._id}`}>
                              <td className="px-4 py-2 text-xs text-gray-300">{categoryLabel}</td>
                              <td className="px-4 py-2 text-xs text-gray-300">{brand.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-300">{series.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-400 italic" colSpan={2}>
                                No models yet —{" "}
                                <button onClick={() => onAddModel(brand, series._id)} className="underline hover:text-gray-700 not-italic">
                                  + Add Model
                                </button>
                              </td>
                            </tr>
                          );
                        } else {
                          seriesModels.forEach((m, idx) => {
                            rows.push(
                              <ModelDataRow
                                key={`model-${m._id}`}
                                categoryLabel={categoryLabel}
                                brandName={brand.name}
                                seriesLabel={series.name}
                                model={m}
                                muted={idx > 0}
                                onEdit={() => onEditModel(brand, m)}
                                onDelete={() => onDeleteModel(m)}
                              />
                            );
                          });
                        }
                      });

                    return rows;
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModelDataRow({
  categoryLabel,
  brandName,
  seriesLabel,
  model,
  muted,
  onEdit,
  onDelete,
}: {
  categoryLabel: string;
  brandName: string;
  seriesLabel: string | null;
  model: ModelOption;
  muted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Full values always stay in the DOM (for search/accessibility) -- only
  // visually muted on repeats within a contiguous Category+Brand+Series run.
  const dim = muted ? "text-gray-300" : "text-gray-600";
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50">
      <td className={`px-4 py-2 text-xs ${dim}`}>{categoryLabel}</td>
      <td className={`px-4 py-2 text-xs ${dim}`}>{brandName}</td>
      <td className={`px-4 py-2 text-xs ${dim}`}>
        {seriesLabel || <span className="text-gray-400 italic">Direct</span>}
      </td>
      <td className={`px-4 py-2 text-xs ${model.isActive ? "text-gray-900" : "text-gray-400 line-through"} font-medium`}>
        {model.name}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onEdit} className="text-gray-400 hover:text-gray-700" title="Rename model">
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Delete model">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Brand modal (unchanged behaviour from the original Brands page)
// ---------------------------------------------------------------------------

function BrandModal({
  title,
  formData,
  setFormData,
  formError,
  submitting,
  onClose,
  onSubmit,
  existingLogos,
  parentOptions,
  productCategories,
}: {
  title: string;
  formData: { name: string; description: string; logoUrl: string; parentId: string; category: DeviceCategory | ""; productCategoryId: string; businessScope: "SINGLE" | "MULTIPLE" | "ALL"; businessIds: string[] };
  setFormData: (d: { name: string; description: string; logoUrl: string; parentId: string; category: DeviceCategory | ""; productCategoryId: string; businessScope: "SINGLE" | "MULTIPLE" | "ALL"; businessIds: string[] }) => void;
  formError: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  existingLogos: string[];
  parentOptions: Brand[];
  productCategories: ProductCategoryOption[];
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
            <label className="text-xs text-gray-500 block mb-1">Device Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as DeviceCategory | "" })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none"
            >
              <option value="">Uncategorized</option>
              {DEVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{DEVICE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Storefront Product Category</label>
            <select
              value={formData.productCategoryId}
              onChange={(e) => setFormData({ ...formData, productCategoryId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none"
            >
              <option value="">Untagged</option>
              {productCategories.map((c) => (
                <option key={c._id} value={c._id}>{c.parentId ? `↳ ${c.name}` : c.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Which storefront category this brand sells under -- narrows the Brand list the vendor
              product-creation wizard shows once that category is picked.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Parent Brand</label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none"
            >
              <option value="">None (top-level brand)</option>
              {parentOptions.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.parentId ? `↳ ${b.name}` : b.name}
                </option>
              ))}
            </select>
            {parentOptions.length === 0 && (
              <p className="text-[11px] text-gray-400 mt-1">
                No other brands exist yet — save this one first, then create another and pick
                this as its parent.
              </p>
            )}
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

          <BusinessScopeControl
            value={{ businessScope: formData.businessScope, businessIds: formData.businessIds }}
            onChange={(v) => setFormData({ ...formData, ...v })}
          />

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

// ---------------------------------------------------------------------------
// Series create modal (matches BrandModal's visual style)
// ---------------------------------------------------------------------------

function SeriesModal({
  brandName,
  onClose,
  onSubmit,
}: {
  brandName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Add Series</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Brand</label>
            <input
              value={brandName}
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Series Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. Galaxy S, Galaxy A"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Add Series"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model create/edit modal (matches BrandModal's visual style)
// ---------------------------------------------------------------------------

function ModelModal({
  state,
  seriesOptions,
  onClose,
  onSubmit,
}: {
  state: ModelModalState;
  seriesOptions: SeriesOption[];
  onClose: () => void;
  onSubmit: (name: string, seriesId: string, isActive: boolean) => void;
}) {
  const [name, setName] = useState(state.model?.name || "");
  const [seriesId, setSeriesId] = useState(state.seriesId || "");
  const [isActive, setIsActive] = useState(state.model?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name, seriesId, isActive);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">{state.mode === "edit" ? "Edit Model" : "Add Model"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Brand</label>
            <input
              value={state.brandName}
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Series</label>
            <select
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none"
            >
              <option value="">No series (direct under brand)</option>
              {seriesOptions.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Model / Variant Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. A35 8+128, iPhone 15 Pro Max 256GB"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              autoFocus
            />
          </div>

          {state.mode === "edit" && (
            <div className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-600">Active</span>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isActive ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : state.mode === "edit" ? "Save Changes" : "Add Model"}
          </button>
        </div>
      </div>
    </div>
  );
}
