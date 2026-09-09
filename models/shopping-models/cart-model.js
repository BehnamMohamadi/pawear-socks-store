const { Schema, model } = require("mongoose");
const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    revision: { type: Number, default: 0 },
    items: {
      type: [
        {
          itemType: { type: String, enum: ["Product", "Box"], required: true },
          size:{type:String,default:'free-size',maxlength:30},
          item: { type: Schema.Types.ObjectId, required: true },
          quantity: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
            validate: Number.isSafeInteger,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);
module.exports = model("Cart", cartSchema);
