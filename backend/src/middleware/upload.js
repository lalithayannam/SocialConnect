import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(here, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const fileFilter = (_req, file, cb) => {
  const allowed = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|ogg))$/i;
  if (allowed.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image (JPG, PNG, GIF, WEBP) and video (MP4, WEBM, MOV, OGG) files are allowed."));
};
export default multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
