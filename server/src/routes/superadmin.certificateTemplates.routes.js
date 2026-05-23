// server/src/routes/superadmin.certificateTemplates.routes.js

import express from "express";
import path from "path";
import fs from "fs";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import CertificateTemplate from "../models/CertificateTemplate.js";

import {
  uploadCertificateTemplate,
  fileToPublicPath,
} from "../utils/upload.js";

import { UPLOAD_ROOT } from "../app.js";

const router = express.Router();

const TEMPLATE_TYPE = "COURSE_COMPLETION";

function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.auth?._id ||
    req.auth?.id ||
    null
  );
}

function getFileType(file) {
  const mime = String(file?.mimetype || "").toLowerCase();
  const ext = path.extname(file?.originalname || "").toLowerCase();

  if (mime === "application/pdf" || ext === ".pdf") {
    return "PDF";
  }

  return "IMAGE";
}

function getDiskPathFromPublicUrl(fileUrl = "") {
  const raw = String(fileUrl || "").trim();

  if (!raw.startsWith("/uploads/")) {
    return "";
  }

  const relativePath = raw.replace(/^\/uploads\/+/, "");
  return path.join(UPLOAD_ROOT, relativePath);
}

function deleteUploadedFile(fileUrl = "") {
  try {
    const diskPath = getDiskPathFromPublicUrl(fileUrl);

    if (!diskPath) return;

    if (!diskPath.startsWith(UPLOAD_ROOT)) {
      return;
    }

    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch {
    // Do not block API response if file cleanup fails.
  }
}

/**
 * GET /api/super-admin/certificate-templates
 * List course completion certificate templates.
 */
router.get(
  "/certificate-templates",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const templates = await CertificateTemplate.find({
        type: TEMPLATE_TYPE,
      })
        .sort({ isActive: -1, createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/super-admin/certificate-templates/active
 * Get active course completion certificate template.
 */
router.get(
  "/certificate-templates/active",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const template = await CertificateTemplate.findOne({
        type: TEMPLATE_TYPE,
        isActive: true,
      }).lean();

      return res.json({
        success: true,
        data: template || null,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/super-admin/certificate-templates
 * Upload a new certificate template.
 *
 * FormData:
 * - title: string
 * - makeActive: "true" | "false"
 * - template: file
 */
router.post(
  "/certificate-templates",
  auth,
  requireRole("SUPER_ADMIN"),
  uploadCertificateTemplate.single("template"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Certificate template file is required",
        });
      }

      const title =
        String(req.body.title || "").trim() ||
        "Course Completion Certificate";

      const makeActive =
        String(req.body.makeActive || "").trim().toLowerCase() === "true";

      if (makeActive) {
        await CertificateTemplate.updateMany(
          { type: TEMPLATE_TYPE },
          { $set: { isActive: false } },
        );
      }

      const template = await CertificateTemplate.create({
        title,
        type: TEMPLATE_TYPE,
        fileUrl: fileToPublicPath(req.file, "certificate-templates"),
        fileType: getFileType(req.file),
        isActive: makeActive,
        uploadedBy: getUserId(req),
      });

      return res.status(201).json({
        success: true,
        message: "Certificate template uploaded successfully",
        data: template,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/super-admin/certificate-templates/:id/activate
 * Set selected template as active.
 */
router.patch(
  "/certificate-templates/:id/activate",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const template = await CertificateTemplate.findById(req.params.id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Certificate template not found",
        });
      }

      await CertificateTemplate.updateMany(
        { type: TEMPLATE_TYPE },
        { $set: { isActive: false } },
      );

      template.isActive = true;
      await template.save();

      return res.json({
        success: true,
        message: "Certificate template activated",
        data: template,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/super-admin/certificate-templates/:id
 * Rename template.
 */
router.patch(
  "/certificate-templates/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Template title is required",
        });
      }

      const template = await CertificateTemplate.findByIdAndUpdate(
        req.params.id,
        { $set: { title } },
        { new: true },
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Certificate template not found",
        });
      }

      return res.json({
        success: true,
        message: "Certificate template updated",
        data: template,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/super-admin/certificate-templates/:id
 * Delete template record and its uploaded file.
 */
router.delete(
  "/certificate-templates/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const template = await CertificateTemplate.findByIdAndDelete(
        req.params.id,
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Certificate template not found",
        });
      }

      deleteUploadedFile(template.fileUrl);

      return res.json({
        success: true,
        message: "Certificate template deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;