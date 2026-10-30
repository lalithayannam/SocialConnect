import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  fundraiser: { type: mongoose.Schema.Types.ObjectId, ref: "Fundraiser", required: true, index: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["created", "paid", "failed"], default: "created", index: true },
  razorpayOrderId: { type: String, unique: true, sparse: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  emailSentAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Donation", donationSchema);
