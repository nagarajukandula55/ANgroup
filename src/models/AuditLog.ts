import mongoose from "mongoose";

const AuditLogSchema =
  new mongoose.Schema(
    {
      entityType: String,

      entityId: String,

      action: String,

      by: String,

      before: Object,

      after: Object,

      ip: String,
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.AuditLog ||
  mongoose.model(
    "AuditLog",
    AuditLogSchema
  );
