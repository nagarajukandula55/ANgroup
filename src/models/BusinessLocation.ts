import mongoose, { Schema, models, model } from 'mongoose'

const BusinessLocationSchema = new Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    addressLine1: String,

    addressLine2: String,

    city: String,

    state: String,

    country: String,

    pincode: String,

    latitude: Number,

    longitude: Number,
  },
  {
    timestamps: true,
  }
)

export default models.BusinessLocation ||
  model('BusinessLocation', BusinessLocationSchema)
