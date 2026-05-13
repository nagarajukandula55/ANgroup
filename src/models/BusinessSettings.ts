import mongoose, { Schema, models, model } from 'mongoose'

const BusinessSettingsSchema = new Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    currency: {
      type: String,
      default: 'INR',
    },

    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },

    language: {
      type: String,
      default: 'en',
    },

    invoicePrefix: {
      type: String,
      default: 'INV',
    },

    orderPrefix: {
      type: String,
      default: 'ORD',
    },

    financialYear: {
      type: String,
      default: '2025-26',
    },
  },
  {
    timestamps: true,
  }
)

export default models.BusinessSettings ||
  model('BusinessSettings', BusinessSettingsSchema)
