import mongoose, { Schema, models, model } from 'mongoose'

const BusinessSchema = new Schema(
  {
    businessCode: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    legalName: {
      type: String,
    },

    brandName: {
      type: String,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },

    businessType: {
      type: String,
      required: true,
    },

    industry: {
      type: String,
    },

    description: {
      type: String,
    },

    logo: {
      type: String,
    },

    website: {
      type: String,
    },

    email: {
      type: String,
    },

    phone: {
      type: String,
    },

    gstNumber: {
      type: String,
    },

    panNumber: {
      type: String,
    },

    legalEntityType: {
      type: String,
    },

    active: {
      type: Boolean,
      default: true,
    },

    aiEnabled: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
    },

    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export default models.Business || model('Business', BusinessSchema)
