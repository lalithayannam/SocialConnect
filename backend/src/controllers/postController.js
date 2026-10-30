import Post from "../models/Post.js";
import User from "../models/User.js";

export async function getPosts(req, res) {
  try {
    const query = {};
    if (req.query.feed === "following") {
      const me = await User.findById(req.userId).select("following");
      query.user = { $in: [...(me?.following || []), req.userId] };
    }
    if (req.query.feed === "saved") {
      const me = await User.findById(req.userId).select("savedPosts");
      query._id = { $in: me?.savedPosts || [] };
    }
    const posts = await Post.find(query)
      .populate("user", "name username avatar")
      .populate("comments.user", "name username avatar")
      .sort({ createdAt: -1 }).limit(100);
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function createPost(req, res) {
  try {
    const { content, image } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : "";
    const mediaType = req.file ? (req.file.mimetype.startsWith("video/") ? "video" : "image") : "";
    if (!content?.trim() && !mediaUrl && !image?.trim()) return res.status(400).json({ message: "Add text, a photo, or a video to publish a post." });
    const post = await Post.create({ user: req.userId, content: content || "", image: image || "", mediaUrl, mediaType });
    res.status(201).json(await post.populate("user", "name username avatar"));
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function toggleLike(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const index = post.likes.findIndex(id => id.toString() === req.userId.toString());
    if (index >= 0) post.likes.splice(index, 1); else post.likes.push(req.userId);
    await post.save();
    res.json({ likes: post.likes });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function addComment(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment cannot be empty" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.userId, text });
    await post.save();
    await post.populate("comments.user", "name username avatar");
    res.status(201).json(post.comments.at(-1));
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function toggleSave(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const me = await User.findById(req.userId);
    const exists = me.savedPosts.some(id => id.equals(post._id));
    if (exists) me.savedPosts.pull(post._id); else me.savedPosts.push(post._id);
    await me.save();
    res.json({ saved: !exists });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.userId.toString()) return res.status(403).json({ message: "You can only delete your own posts" });
    await post.deleteOne();
    await User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } });
    res.json({ message: "Post deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
}
