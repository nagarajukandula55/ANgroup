"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Building2,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Users,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";

interface Vendor {
  _id: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  gstNumber?: string;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface ModalState {
  type: "add" | "edit" | "delete" | null;
  vendor?: Vendor;
}

interface FormData {
  companyName: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPincode: string;
  gstNumber: string;
}

const emptyForm: FormData = {
  companyName: "",
  email: "",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressPincode: "",
  gstNumber: "",
};

export default function VendorsPage() {
  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVendors = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/vendors?${params}`);
      const data = await res.json();
      if (data.success) setVendors(data.data || []);
    } catch {
      showToast("Failed to load vendors", false);
    } finally {
      setLoading(false);
    }
  }, [businessId, search]);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const openAdd = () => {
    setFormData(emptyForm);
    setFormError("");
    setModal({ type: "add" });
  };

  const openEdit = (vendor: Vendor) => {
    setFormData({
      companyName: vendor.companyName,
      email: vendor.email || "",
      phone: vendor.phone || "",
      addressStreet: vendor.address?.street || "",
      addressCity: vendor.address?.city || "",
      addressState: vendor.address?.state || "",
      addressPincode: vendor.address?.pincode || "",
      gstNumber: vendor.gstNumber || "",
    });
    setFormError("");
    setModal({ type: "edit", vendor });
  };

  const openDelete = (vendor: Vendor) => {
    setDeleteConfirmName("");
    setModal({ type: "delete", vendor });
  };

  const closeModal = () => {
    setModal({ type: null });
    setFormError("");
  };

  const buildPayload = () => ({
    companyName: formData.companyName.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    address: {
      street: formData.addressStreet.trim(),
      city: formData.addressCity.trim(),
      state: formData.addressState.trim(),
      pincode: formData.addressPincode.trim(),
      country: "India",
    },
    gstNumber: formData.gstNumber.trim(),
    businessId,
  });

  const handleSubmitAdd = async () => {
    if (!formData.companyName.trim()) {
      setFormError("Vendor name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create vendor.");
        return;
      }
      showToast("Vendor created successfully.");
      closeModal();
      fetchVendors();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!formData.companyName.trim()) {
      setFormError("Vendor name is required.");
      return;
    }
    if (!modal.vendor) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/vendors/${modal.vendor._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to update vendor.");
        return;
      }
      showToast("Vendor updated successfully.");
      closeModal();
      fetchVendors();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.vendor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendors/${modal.vendor._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Failed to delete vendor.", false);
        closeModal();
        return;
      }
      showToast("Vendor deleted.");
      closeModal();
      fetchVendors();
    } catch {
      showToast("Network error.", false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (vendor: Vendor) => {
    try {
      const res = await fetch(`/api/vendors/${vendor._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !vendor.isApproved }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Vendor ${!vendor.isApproved ? "activated" : "deactivated"}.`
        );
        fetchVendors();
      }
    } catch {
      showToast("Failed to update status.", false);
    }
  };

  const filtered = vendors.filter((v) =>
    search
      ? v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.email?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const activeCount = vendors.filter((v) => v.isApproved).length;

  const formatAddress = (vendor: Vendor) => {
    const a = vendor.address;
    if (!a) return "—";
    const parts = [a.street, a.city, a.state, a.pincode].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

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
          <h1 className="text-xl font-semibold text-white">Vendors</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage supplier and vendor accounts
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <Users size={14} />
            Total Vendors
          </div>
          <p className="text-2xl font-semibold text-white">{vendors.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <UserCheck size={14} />
            Active Vendors
          </div>
          <p className="text-2xl font-semibold text-emerald-400">
            {activeCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Building2 size={24} className="text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">No vendors found</p>
            <p className="text-sm text-zinc-500 mt-1">
              {search
                ? "Try a different search term."
                : "Get started by adding your first vendor."}
            </p>
          </div>
          {!search && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100"
            >
              <Plus size={16} />
              Add Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  Vendor Name
                </th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  GST Number
                </th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((vendor) => (
                <tr
                  key={vendor._id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-zinc-500" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {vendor.companyName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {vendor.email ? (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <Mail size={12} className="text-zinc-600 flex-shrink-0" />
                        {vendor.email}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {vendor.phone ? (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <Phone size={12} className="text-zinc-600 flex-shrink-0" />
                        {vendor.phone}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {vendor.gstNumber ? (
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-zinc-600 flex-shrink-0" />
                        <span className="text-sm text-zinc-300 font-mono">
                          {vendor.gstNumber}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {formatAddress(vendor) !== "—" ? (
                      <div className="flex items-start gap-1.5">
                        <MapPin
                          size={12}
                          className="text-zinc-600 flex-shrink-0 mt-0.5"
                        />
                        <span className="text-sm text-zinc-400 truncate">
                          {formatAddress(vendor)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(vendor)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                        vendor.isApproved
                          ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      {vendor.isApproved ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(vendor)}
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                        title="Edit vendor"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => openDelete(vendor)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete vendor"
                      >
                        <Trash2 size={13} />
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
        <VendorModal
          title={modal.type === "add" ? "Add Vendor" : "Edit Vendor"}
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={modal.type === "add" ? handleSubmitAdd : handleSubmitEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {modal.type === "delete" && modal.vendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">
                Delete Vendor
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-zinc-400">
                This action cannot be undone. Type{" "}
                <span className="text-white font-medium">
                  {modal.vendor.companyName}
                </span>{" "}
                to confirm deletion.
              </p>
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={modal.vendor.companyName}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
              />
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={
                  deleteConfirmName !== modal.vendor.companyName || submitting
                }
                className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Deleting…" : "Delete Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorModal({
  title,
  formData,
  setFormData,
  formError,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  formData: FormData;
  setFormData: (d: FormData) => void;
  formError: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: keyof FormData, value: string) =>
    setFormData({ ...formData, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Vendor Name */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Vendor Name <span className="text-red-400">*</span>
            </label>
            <input
              value={formData.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. Acme Supplies Pvt. Ltd."
              autoFocus
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Email</label>
              <input
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                type="email"
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Phone</label>
              <input
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* GST Number */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              GST Number
            </label>
            <input
              value={formData.gstNumber}
              onChange={(e) =>
                update("gstNumber", e.target.value.toUpperCase())
              }
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 font-mono"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Street Address
            </label>
            <input
              value={formData.addressStreet}
              onChange={(e) => update("addressStreet", e.target.value)}
              placeholder="123 Industrial Area, Phase 2"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">City</label>
              <input
                value={formData.addressCity}
                onChange={(e) => update("addressCity", e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">State</label>
              <input
                value={formData.addressState}
                onChange={(e) => update("addressState", e.target.value)}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">
                Pincode
              </label>
              <input
                value={formData.addressPincode}
                onChange={(e) => update("addressPincode", e.target.value)}
                placeholder="400001"
                maxLength={6}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle size={14} />
              {formError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : title}
          </button>
        </div>
      </div>
    </div>
  );
}
