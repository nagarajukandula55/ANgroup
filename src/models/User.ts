import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: String,

    email: {
      type: String,
      unique: true,
    },

    password: String,

    role: String,

    permissions: [String],

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.User ||
  mongoose.model('User', UserSchema)
