import mongoose from "mongoose";

const GoodsReceiptItemSchema = new mongoose.Schema(
{
  goodsReceiptId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"GoodsReceipt",
    required:true,
    index:true
  },

  materialId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Material",
    required:true
  },

  materialCode:String,

  materialName:String,

  unit:String,

  orderedQuantity:{
    type:Number,
    default:0
  },

  receivedQuantity:{
    type:Number,
    default:0
  },

  acceptedQuantity:{
    type:Number,
    default:0
  },

  rejectedQuantity:{
    type:Number,
    default:0
  },

  unitRate:{
    type:Number,
    default:0
  },

  lineTotal:{
    type:Number,
    default:0
  },

  remarks:String

},
{
  timestamps:true
});

GoodsReceiptItemSchema.index({
  goodsReceiptId:1
});

export default
mongoose.models.GoodsReceiptItem ||
mongoose.model(
"GoodsReceiptItem",
GoodsReceiptItemSchema
);
