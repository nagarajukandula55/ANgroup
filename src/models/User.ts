import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ENUMS
 * =======================================================*/

export enum UserRoleLegacy {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
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
  /** sha256 hash of the raw reset token (see api/auth/reset-password/request) — never the raw token itself. */
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
      default: null,
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

    // Was missing entirely -- api/auth/reset-password/request+confirm set
    // and query these, but since Mongoose defaults to strict schemas, an
    // undeclared field silently never persists on .save(), which made the
    // whole password-reset flow a no-op (token "saved" but never actually
    // written, so the confirm step could never find it). select: false
    // since the hash shouldn't come back on normal user queries, same
    // pattern as `password` above.
    resetPasswordTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
      default: null,
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
