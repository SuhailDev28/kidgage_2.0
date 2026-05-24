import { Router } from "express";

import SmtpSetting from "../models/SmtpSetting.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import {
  encryptSmtpPassword,
  getGlobalSmtpSetting,
  sanitizeSmtpSetting,
  buildSmtpTransporter,
} from "../services/email/smtp.service.js";

const router = Router();

router.use(auth);
router.use(requireRole("SUPER_ADMIN"));

function cleanEmail(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

router.get("/smtp-settings", async (_req, res, next) => {
  try {
    const setting = await getGlobalSmtpSetting();

    return res.json({
      success: true,
      settings: sanitizeSmtpSetting(setting),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/smtp-settings", async (req, res, next) => {
  try {
    const enabled = String(req.body?.enabled || "false") === "true";
    const secure = String(req.body?.secure || "false") === "true";

    const provider = cleanText(req.body?.provider || "CUSTOM").toUpperCase();
    const host = cleanText(req.body?.host);
    const port = Number(req.body?.port || 587);
    const username = cleanText(req.body?.username);
    const password = String(req.body?.password || "");
    const fromName = cleanText(req.body?.fromName || "KidGage");
    const fromEmail = cleanEmail(req.body?.fromEmail);
    const replyTo = cleanEmail(req.body?.replyTo);

    if (enabled && !host) {
      return res.status(400).json({
        success: false,
        message: "SMTP host is required when SMTP is enabled.",
      });
    }

    if (enabled && (!Number.isFinite(port) || port <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Valid SMTP port is required.",
      });
    }

    if (enabled && !username) {
      return res.status(400).json({
        success: false,
        message: "SMTP username is required when SMTP is enabled.",
      });
    }

    if (fromEmail && !isEmail(fromEmail)) {
      return res.status(400).json({
        success: false,
        message: "Valid from email is required.",
      });
    }

    if (replyTo && !isEmail(replyTo)) {
      return res.status(400).json({
        success: false,
        message: "Valid reply-to email is required.",
      });
    }

    const current = await getGlobalSmtpSetting();

    const update = {
      enabled,
      provider: [
        "CUSTOM",
        "GMAIL",
        "OUTLOOK",
        "ZOHO",
        "SENDGRID",
        "MAILGUN",
      ].includes(provider)
        ? provider
        : "CUSTOM",
      host,
      port,
      secure,
      username,
      fromName,
      fromEmail,
      replyTo,
    };

    if (password && password !== "********") {
      update.passwordEncrypted = encryptSmtpPassword(password);
    } else if (!current.passwordEncrypted && enabled) {
      return res.status(400).json({
        success: false,
        message: "SMTP password is required when SMTP is enabled.",
      });
    }

    const setting = await SmtpSetting.findOneAndUpdate(
      { key: "GLOBAL" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({
      success: true,
      message: "SMTP settings updated successfully.",
      settings: sanitizeSmtpSetting(setting),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/smtp-settings/test", async (req, res, next) => {
  try {
    const testEmail = cleanEmail(req.body?.testEmail);

    if (!testEmail || !isEmail(testEmail)) {
      return res.status(400).json({
        success: false,
        message: "Valid test recipient email is required.",
      });
    }

    const setting = await getGlobalSmtpSetting();

    try {
      const transporter = await buildSmtpTransporter();

      await transporter.verify();

      const fromEmail = setting.fromEmail || setting.username;
      const fromName = setting.fromName || "KidGage";

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: testEmail,
        subject: "KidGage SMTP Test Email",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
            <h2 style="color:#ec7a3b">KidGage SMTP Test Successful</h2>
            <p>Your SMTP configuration is working correctly.</p>
            <p>This message was sent from the KidGage Super Admin SMTP settings module.</p>
          </div>
        `,
        text: "KidGage SMTP test successful. Your SMTP configuration is working correctly.",
      });

      setting.lastTestedAt = new Date();
      setting.lastTestStatus = "SUCCESS";
      setting.lastTestMessage = `Test email sent to ${testEmail}.`;
      await setting.save();

      return res.json({
        success: true,
        message: "Test email sent successfully.",
        settings: sanitizeSmtpSetting(setting),
      });
    } catch (smtpError) {
      setting.lastTestedAt = new Date();
      setting.lastTestStatus = "FAILED";
      setting.lastTestMessage = smtpError?.message || "SMTP test failed.";
      await setting.save();

      return res.status(400).json({
        success: false,
        message: setting.lastTestMessage,
        settings: sanitizeSmtpSetting(setting),
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
