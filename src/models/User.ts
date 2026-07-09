import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ENUMS
 * =======================================================*/

export enum UserRoleLegacy {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
  // VENDOR was already assumed valid by several call sites (register/vendor
  // and vendors/[id]/finalize both set role: "VENDOR"; profile/page.tsx
  // reads `profile.role === 'VENDOR'` to show the vendor card) but was
  // missing from this enum, so every one of those saves threw a mongoose
  // validation error — vendor self-registration was fully broken. Finer-
  // grained roles (EMPLOYEE, MANAGER) are intentionally NOT added here —
  // see admin/users/route.ts's own comment — those go through the newer
  // Role/UserRole + BusinessMember RBAC system instead.
  VENDOR = "VENDOR",
}

export enum AuthProvider {
  CREDENTIALS = "credentials",
  GOOGLE = "google",
  MICROSOFT = "microsoft",
}

/* =========================================================
 * BUSINESS ACCESS (Legacy - Temporary)
 * =======================================================*/

export interface IUserBusinessAccess {
  businessId: string;
  accessKeys: string[];
  isActive: boolean;
}

/* =========================================================
 * USER DOCUMENT
 * =======================================================*/

export interface IUser extends Document {
  /* Identity */
  name: string;
  email: string;
  username?: string;
  phone?: string;
  password?: string;

  avatar?: string;

  authProvider: AuthProvider;

  isActive: boolean;
  isEmailVerified: boolean;

  /* Legacy (kept for compatibility) */
  role: UserRoleLegacy;

  /* Legacy (kept until BusinessMember migration) */
  businessAccess: IUserBusinessAccess[];

  /* Default Context */
  defaultOrganizationId?: Types.ObjectId;
  defaultBusinessId?: Types.ObjectId;

  /* Security */
  failedLoginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt?: Date;
  lastLogin?: Date;

  /* Password reset — single-use, time-boxed. Only the sha256 hash of the
   * token is stored; the raw token is emailed once and never persisted. */
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;

  /* Soft Delete */
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const UserSchema = new Schema<IUser>(
  {
    /* ================= Identity ================= */

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
      // No `default: null` — MongoDB's sparse index only skips a document
      // where this field is genuinely ABSENT. An explicit null is still
      // indexed, so a default of null meant every user created without a
      // username collided with every other one on that shared null value.
      // Every creation path must now supply a real value (see
      // lib/auth/generateUserId.ts) instead of relying on a default.
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      select: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.CREDENTIALS,
      index: true,
    },

    /* ================= Status ================= */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    /* ================= Legacy Role ================= */

    role: {
      type: String,
      enum: Object.values(UserRoleLegacy),
      default: UserRoleLegacy.CUSTOMER,
    },

    /* ================= Legacy Business Access ================= */

    businessAccess: [
      {
        businessId: {
          type: String,
          required: true,
        },

        accessKeys: {
          type: [String],
          default: [],
        },

        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    /* ================= Default Context ================= */

    defaultOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },

    defaultBusinessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },

    /* ================= Security ================= */

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },

    /* ================= Soft Delete ================= */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
 * INDEXES
 * =======================================================*/

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ isActive: 1 });
// defaultBusinessId/defaultOrganizationId already get an index via
// `index: true` on their field definitions above — the explicit
// .index() calls that used to be here were exact duplicates and
// triggered Mongoose's "duplicate schema index" warning at startup.

/* =========================================================
 * VIRTUALS
 * =======================================================*/

UserSchema.virtual("isLocked").get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

/* =========================================================
 * MODEL
 * =======================================================*/

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
