import Message from "../models/Message.js";
import User from "../models/User.js";

export async function conversations(req, res) {
  const me = req.userId;
  const messages = await Message.find({ $or: [{ sender: me }, { recipient: me }] }).sort({ createdAt: -1 }).limit(100).populate("sender", "name username avatar").populate("recipient", "name username avatar");
  const seen = new Set(); const result = [];
  for (const m of messages) {
    const other = String(m.sender._id) === String(me) ? m.recipient : m.sender;
    if (!seen.has(String(other._id))) { seen.add(String(other._id)); result.push({ user: other, lastMessage: m, unread: String(m.recipient._id) === String(me) && !m.readAt }); }
  }
  res.json(result);
}
export async function thread(req, res) {
  const otherId = req.params.userId;
  if (String(otherId) === String(req.userId)) return res.status(400).json({ message: "You cannot chat with yourself" });
  const other = await User.findById(otherId).select("name username avatar bio");
  if (!other) return res.status(404).json({ message: "User not found" });
  const messages = await Message.find({ $or: [{ sender: req.userId, recipient: otherId }, { sender: otherId, recipient: req.userId }] }).sort({ createdAt: 1 }).limit(500).populate("sender", "name username avatar").populate("recipient", "name username avatar");
  await Message.updateMany({ sender: otherId, recipient: req.userId, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ user: other, messages });
}
export async function sendMessage(req, res) {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Message cannot be empty" });
  if (text.length > 2000) return res.status(400).json({ message: "Messages must be 2000 characters or fewer" });
  if (String(req.params.userId) === String(req.userId)) return res.status(400).json({ message: "You cannot message yourself" });
  const recipient = await User.findById(req.params.userId);
  if (!recipient) return res.status(404).json({ message: "User not found" });
  const message = await Message.create({ sender: req.userId, recipient: recipient._id, text });
  await message.populate("sender", "name username avatar"); await message.populate("recipient", "name username avatar");
  res.status(201).json(message);
}
