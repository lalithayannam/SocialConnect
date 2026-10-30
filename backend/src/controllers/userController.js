import User from "../models/User.js";
import Post from "../models/Post.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

export async function searchUsers(req, res) {
  const q = req.query.q || "";
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } }
    ]
  }).select("name username avatar bio followers following").limit(20);
  res.json(users);
}

export async function getProfile(req, res) {
  const user = await User.findOne({ username: req.params.username }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 }).populate("user", "name username avatar");
  res.json({ user, posts });
}

export async function toggleFollow(req, res) {
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);
  if (!target || !me) return res.status(404).json({ message: "User not found" });
  if (target._id.equals(me._id)) return res.status(400).json({ message: "You cannot follow yourself" });

  const following = me.following.some(id => id.equals(target._id));
  if (following) {
    me.following.pull(target._id);
    target.followers.pull(me._id);
  } else {
    me.following.push(target._id);
    target.followers.push(me._id);
  }
  await Promise.all([me.save(), target.save()]);
  res.json({ following: !following, followers: target.followers.length });
}


export async function getMe(req, res) {
  const user = await User.findById(req.userId).select("-password").populate("followers", "name username avatar").populate("following", "name username avatar");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}

export async function updateProfile(req, res) {
  const name = String(req.body.name || "").trim();
  const bio = String(req.body.bio || "").trim();
  if (!name || name.length > 80) return res.status(400).json({ message: "Name is required and must be under 80 characters" });
  if (bio.length > 300) return res.status(400).json({ message: "Bio must be 300 characters or fewer" });
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.name = name;
  user.bio = bio;
  if (req.file) {
    if (!req.file.mimetype.startsWith("image/")) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Profile pictures must be images" });
    }
    const oldAvatar = user.avatar;
    user.avatar = `/uploads/${req.file.filename}`;
    if (oldAvatar?.startsWith("/uploads/")) {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const oldPath = path.resolve(here, "../../uploads", path.basename(oldAvatar));
      fs.unlink(oldPath, () => {});
    }
  }
  await user.save();
  const safe = user.toObject(); delete safe.password;
  res.json(safe);
}
