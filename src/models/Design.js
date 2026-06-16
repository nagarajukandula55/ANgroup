import mongoose from "mongoose";

const DesignSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    width: Number,
    height: Number,

    canvasJson: Object,

    status: {
        type: String,
        default: "Draft"
    }
},
{
    timestamps: true
}
);

export default mongoose.models.Design ||
mongoose.model("Design", DesignSchema);
