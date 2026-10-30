import Call from "../models/Call.js";
import User from "../models/User.js";
const participant = (call, id) => String(call.caller) === String(id) || String(call.callee) === String(id);
export async function activeCalls(req, res) {
  const calls = await Call.find({ $or: [{ caller: req.userId }, { callee: req.userId }], status: { $in: ["ringing", "active"] } }).sort({ createdAt: -1 }).limit(10).populate("caller", "name username avatar").populate("callee", "name username avatar");
  res.json(calls);
}
export async function startCall(req, res) {
  if (String(req.params.userId) === String(req.userId)) return res.status(400).json({ message: "You cannot call yourself" });
  const callee = await User.findById(req.params.userId).select("_id");
  if (!callee) return res.status(404).json({ message: "User not found" });
  const existing = await Call.findOne({ $or: [{ caller: req.userId, callee: callee._id }, { caller: callee._id, callee: req.userId }], status: { $in: ["ringing", "active"] } });
  if (existing) return res.status(409).json({ message: "There is already an active call with this person", callId: existing._id });
  const call = await Call.create({ caller: req.userId, callee: callee._id, type: req.body.type === "audio" ? "audio" : "video", status: "ringing" });
  await call.populate("caller", "name username avatar"); await call.populate("callee", "name username avatar");
  res.status(201).json(call);
}
export async function getCall(req, res) {
  const call = await Call.findById(req.params.id).populate("caller", "name username avatar").populate("callee", "name username avatar");
  if (!call) return res.status(404).json({ message: "Call not found" });
  if (!participant(call, req.userId)) return res.status(403).json({ message: "Not a participant in this call" });
  res.json(call);
}
export async function signalCall(req, res) {
  const call = await Call.findById(req.params.id);
  if (!call) return res.status(404).json({ message: "Call not found" });
  if (!participant(call, req.userId)) return res.status(403).json({ message: "Not a participant in this call" });
  const { kind, data } = req.body;
  if (!["offer", "answer", "ice", "hangup", "reject"].includes(kind)) return res.status(400).json({ message: "Invalid call signal" });
  if (["hangup", "reject"].includes(kind)) { call.status = kind === "reject" ? "rejected" : "ended"; call.endedAt = new Date(); }
  else {
    call.signals.push({ from: req.userId, kind, data: data ?? null });
    if (kind === "answer") call.status = "active";
  }
  await call.save();
  res.json({ ok: true, status: call.status });
}
export async function callHistory(req, res) {
  const calls = await Call.find({ $or: [{ caller: req.userId }, { callee: req.userId }], status: { $in: ["ended", "rejected", "missed"] } }).sort({ createdAt: -1 }).limit(30).populate("caller", "name username avatar").populate("callee", "name username avatar");
  res.json(calls);
}
