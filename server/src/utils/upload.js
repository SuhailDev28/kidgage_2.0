import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOAD_ROOT } from "../app.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFolderName(value = "general") {
  return (
    String(value || "general")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "general"
  );
}

function safeExtension(originalName = "") {
  const ext = path.extname(originalName || "").toLowerCase();

  const allowed = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
  ]);

  return allowed.has(ext) ? ext : "";
}

function makeFileName(file, folder = "file") {
  const ext = safeExtension(file?.originalname || "");
  const prefix = safeFolderName(folder);
  const unique = `${Date.now()}-${crypto.randomInt(100000000, 999999999)}`;

  return `${prefix}-${unique}${ext}`;
}

function isImageMime(mime = "") {
  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ].includes(String(mime || "").toLowerCase());
}

function isDocumentMime(mime = "") {
  return [
    "application/pdf",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ].includes(String(mime || "").toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* Factory                                                                    */
/* -------------------------------------------------------------------------- */

export function createUploader({
  folder = "general",
  fileTypes = "images",
  maxSizeMb = 5,
} = {}) {
  const safeFolder = safeFolderName(folder);
  const uploadDir = ensureDir(path.join(UPLOAD_ROOT, safeFolder));

  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadDir);
    },

    filename(_req, file, cb) {
      cb(null, makeFileName(file, safeFolder));
    },
  });

  const fileFilter = (_req, file, cb) => {
    const mime = String(file?.mimetype || "").toLowerCase();

    if (fileTypes === "images" && !isImageMime(mime)) {
      return cb(new Error("Only image files are allowed"));
    }

    if (fileTypes === "documents" && !isDocumentMime(mime)) {
      return cb(new Error("Only document files are allowed"));
    }

    if (
      fileTypes === "images-and-documents" &&
      !isImageMime(mime) &&
      !isDocumentMime(mime)
    ) {
      return cb(new Error("Only image and document files are allowed"));
    }

    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: Number(maxSizeMb || 5) * 1024 * 1024,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Public URL helpers                                                         */
/* -------------------------------------------------------------------------- */

export function fileToPublicPath(file, folder = "general") {
  if (!file?.filename) return "";

  const safeFolder = safeFolderName(folder);

  return `/uploads/${safeFolder}/${file.filename}`;
}

export function filesToPublicPaths(files, folder = "general") {
  if (!Array.isArray(files)) return [];

  return files
    .map((file) => fileToPublicPath(file, folder))
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Ready-made uploaders                                                       */
/* -------------------------------------------------------------------------- */

export const uploadActivityImage = createUploader({
  folder: "activities",
  fileTypes: "images",
  maxSizeMb: 5,
});

/**
 * IMPORTANT:
 * Existing KidGage category URLs use:
 * /uploads/category/filename.jpeg
 *
 * So keep this folder as "category", not "categories".
 */
export const uploadCategoryImage = createUploader({
  folder: "category",
  fileTypes: "images",
  maxSizeMb: 5,
});

export const uploadAcademyLogo = createUploader({
  folder: "academy-logos",
  fileTypes: "images",
  maxSizeMb: 5,
});

export const uploadBannerImage = createUploader({
  folder: "banners",
  fileTypes: "images",
  maxSizeMb: 5,
});

export const uploadBlogImage = createUploader({
  folder: "blogs",
  fileTypes: "images",
  maxSizeMb: 5,
});

export const uploadAppSettingAsset = createUploader({
  folder: "settings",
  fileTypes: "images",
  maxSizeMb: 5,
});

export const uploadDocument = createUploader({
  folder: "documents",
  fileTypes: "documents",
  maxSizeMb: 10,
});

export const uploadCertificateTemplate = createUploader({
  folder: "certificate-templates",
  fileTypes: "images-and-documents",
  maxSizeMb: 15,
});