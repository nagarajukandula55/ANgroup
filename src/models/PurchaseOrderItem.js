import mongoose from "mongoose";

const PurchaseOrderItemSchema = new mongoose.Schema(
{
    /* =========================================================
       RELATION
    ========================================================= */

    purchaseOrderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"PurchaseOrder",
        required:true,
        index:true
    },

    businessId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Business",
        required:true,
        index:true
    },

    /* =========================================================
       MATERIAL
    ========================================================= */

    materialId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Material",
        required:true,
        index:true
    },

    materialCode:{
        type:String,
        trim:true
    },

    materialName:{
        type:String,
        trim:true
    },

    vendorMaterialCode:{
        type:String,
        trim:true
    },

    hsnCode:String,

    /* =========================================================
       QUANTITY
    ========================================================= */

    orderedQuantity:{
        type:Number,
        required:true,
        min:0
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

    pendingQuantity:{
        type:Number,
        default:0
    },

    unit:{
        type:String,
        required:true
    },

    /* =========================================================
       COMMERCIAL
    ========================================================= */

    unitPrice:{
        type:Number,
        default:0
    },

    discountPercent:{
        type:Number,
        default:0
    },

    discountAmount:{
        type:Number,
        default:0
    },

    taxPercent:{
        type:Number,
        default:0
    },

    taxAmount:{
        type:Number,
        default:0
    },

    lineTotal:{
        type:Number,
        default:0
    },

    /* =========================================================
       DELIVERY
    ========================================================= */

    expectedDeliveryDate:Date,

    leadTimeDays:{
        type:Number,
        default:0
    },

    /* =========================================================
       QUALITY
    ========================================================= */

    qcRequired:{
        type:Boolean,
        default:false
    },

    qcStatus:{
        type:String,
        enum:[
            "PENDING",
            "PASSED",
            "FAILED"
        ],
        default:"PENDING"
    },

    /* =========================================================
       REMARKS
    ========================================================= */

    remarks:String,

    active:{
        type:Boolean,
        default:true
    }

},
{
    timestamps:true
}
);

/* =========================================================
   INDEXES
========================================================= */

PurchaseOrderItemSchema.index({
    purchaseOrderId:1,
    materialId:1
});

PurchaseOrderItemSchema.index({
    materialId:1
});

PurchaseOrderItemSchema.index({
    businessId:1,
    materialId:1
});

export default
mongoose.models.PurchaseOrderItem ||
mongoose.model(
"PurchaseOrderItem",
PurchaseOrderItemSchema
);
