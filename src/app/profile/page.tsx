'use client'

import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Loader2,
  Save,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  Building2,
  BadgeCheck,
  ShieldCheck,
  Clock,
  User,
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  avatar?: string
  createdAt: string
  employeeProfile?: {
    employeeId: string
    department: string
    designation: string
    isActive: boolean
  }
  vendorProfile?: {
    companyName: string
    vendorId: string
    isApproved: boolean
    category: string
  }
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
  ADMIN: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  STAFF: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EMPLOYEE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  VENDOR: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  CUSTOMER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const AVATAR_GRADIENTS: Record<string, string> = {
  SUPER_ADMIN: 'from-red-600 to-orange-600',
  ADMIN: 'from-orange-500 to-amber-500',
  STAFF: 'from-blue-500 to-cyan-500',
  EMPLOYEE: 'from-indigo-500 to-blue-500',
  VENDOR: 'from-violet-500 to-purple-500',
  CUSTOMER: 'from-emerald-500 to-teal-500',
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Profile form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          setProfile(res.user)
          setEditName(res.user.name || '')
          setEditPhone(res.user.phone || '')
        } else {
          setError(res.message || 'Failed to load profile')
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      })
      const data = await res.json()
      if (data.success) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
        if (profile) setProfile({ ...profile, name: editName, phone: editPhone })
        setTimeout(() => setProfileMsg(null), 3000)
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Failed to save' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'All password fields are required' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({
        type: 'error',
        text: 'New password must be at least 8 characters',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setSavingPassword(true)
    setPasswordMsg(null)
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordMsg(null), 3000)
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Failed to change password' })
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-zinc-400">{error || 'Profile not found'}</p>
        </div>
      </div>
    )
  }

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const avatarGradient =
    AVATAR_GRADIENTS[profile.role] || 'from-zinc-600 to-zinc-500'
  const roleColor =
    ROLE_COLORS[profile.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            Account
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">My Profile</h1>
        </div>

        {/* Avatar + Identity Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div
              className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
            >
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">{profile.email}</p>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${roleColor}`}
                >
                  {profile.role}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {profile.phone && (
                  <p className="text-xs text-zinc-600">{profile.phone}</p>
                )}
                <p className="text-xs text-zinc-600">Member since {memberSince}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Card */}
        {profile.role === 'EMPLOYEE' && profile.employeeProfile && (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Employee Details
                </h3>
                <p className="text-xs text-zinc-500">
                  Your organizational information
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Employee ID
                </p>
                <p className="text-sm font-mono text-zinc-300">
                  {profile.employeeProfile.employeeId}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Department
                </p>
                <p className="text-sm text-zinc-300">
                  {profile.employeeProfile.department || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Designation
                </p>
                <p className="text-sm text-zinc-300">
                  {profile.employeeProfile.designation || '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Card */}
        {profile.role === 'VENDOR' && profile.vendorProfile && (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Vendor Details
                </h3>
                <p className="text-xs text-zinc-500">
                  Your business information
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Company
                </p>
                <p className="text-sm text-zinc-300">
                  {profile.vendorProfile.companyName}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Vendor ID
                </p>
                <p className="text-sm font-mono text-zinc-300">
                  {profile.vendorProfile.vendorId}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                  Status
                </p>
                {profile.vendorProfile.isApproved ? (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Approved</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              Personal Information
            </h2>
          </div>

          {profileMsg && (
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {profileMsg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Lock className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Change Password
              </h2>
              <p className="text-xs text-zinc-500">
                Use a strong password with at least 8 characters
              </p>
            </div>
          </div>

          {passwordMsg && (
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {passwordMsg.text}
            </div>
          )}

          <div className="space-y-4">
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Your current password"
            />
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters"
            />
            <PasswordField
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat new password"
            />
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium border border-white/[0.06] transition-all disabled:opacity-50"
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
