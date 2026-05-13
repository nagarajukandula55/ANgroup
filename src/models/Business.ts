import mongoose from 'mongoose'

const BusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },

    type: {
      type: String,
      required: true,
    },

    description: String,

    logo: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Business ||
  mongoose.model('Business', BusinessSchema)
