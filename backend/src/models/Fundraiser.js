import mongoose from "mongoose";

const fundraiserSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  cause: { type: String, required: true, enum: ["Community project", "Education", "Health", "Environment", "Emergency relief", "Other"] },
  targetAmount: { type: Number, required: true, min: 1 },
  raisedAmount: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  verificationNote: { type: String, default: "Awaiting review" },
  status: { type: String, enum: ["active", "completed", "closed"], default: "active" }
}, { timestamps: true });

fundraiserSchema.index({ status: 1, deadline: 1, verified: 1 });
export default mongoose.model("Fundraiser", fundraiserSchema);
