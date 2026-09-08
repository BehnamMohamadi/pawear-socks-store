const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");
const schema = new Schema(
  {
    firstname: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    lastname: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    phonenumber: { type: String, required: true, unique: true, match: /^09\d{9}$/ },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      set: (v) => v || undefined,
    },
    password: { type: String, select: false, minlength: 8 },
    tokenVersion: { type: Number, default: 0, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    accountStatus: {
      status: {
        type: String,
        enum: ["active", "deactivated", "suspended"],
        default: "active",
      },
      reason: { type: String, default: null },
      at: { type: Date, default: null },
      by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  },
);
schema.pre("save", async function () {
  if (this.isModified("password") && this.password)
    this.password = await bcrypt.hash(this.password, 12);
});
schema.methods.comparePassword = function (candidate) {
  return this.password
    ? bcrypt.compare(candidate, this.password)
    : Promise.resolve(false);
};
module.exports = model("User", schema);
