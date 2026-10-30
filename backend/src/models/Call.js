import mongoose from "mongoose";
const signalSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["offer", "answer", "ice", "hangup", "reject"], required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });
const callSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  callee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["audio", "video"], default: "video" },
  status: { type: String, enum: ["ringing", "active", "rejected", "ended", "missed"], default: "ringing" },
  signals: [signalSchema],
  endedAt: { type: Date, default: null }
}, { timestamps: true });
callSchema.index({ caller: 1, callee: 1, createdAt: -1 });
export default mongoose.model("Call", callSchema);
