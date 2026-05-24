import { Router } from "express";

import EmailTemplate from "../models/EmailTemplate.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendKidgageEmail } from "../services/email/smtp.service.js";

import {
  DEFAULT_EMAIL_TEMPLATES,
  renderTemplateHtml,
  renderTemplateString,
  seedDefaultEmailTemplates,
} from "../services/email/emailTemplate.service.js";

const router = Router();

router.use(auth);
router.use(requireRole("SUPER_ADMIN"));

function normalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getDefaultTemplate(key) {
  const normalizedKey = normalizeKey(key);
  return DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === normalizedKey);
}

function sampleVariables(template = {}) {
  const defaults = {
    siteName: "KidGage",
    name: "Parent Name",
    email: "parent@example.com",
    subject: "Need help with booking",
    message: "Hello KidGage team, I need help with my booking.",
    parentName: "Aisha Parent",
    childName: "Sara",
    activityName: "Kids Swimming Class",
    academyName: "Happy Kids Academy",
    bookingId: "KG-2026-001",
    bookingDate: "24 May 2026",
    amount: "250.00",
    currency: "QAR",
    location: "Doha",
    fullName: "Ahmed Manager",
    phone: "+974 0000 0000",
  };

  const variables = {};

  (template.variables || []).forEach((key) => {
    variables[key] = defaults[key] || `Sample ${key}`;
  });

  return variables;
}

router.post("/email-templates/seed", async (_req, res, next) => {
  try {
    const templates = await seedDefaultEmailTemplates();

    return res.json({
      success: true,
      message: "Default email templates seeded successfully.",
      templates,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/email-templates", async (req, res, next) => {
  try {
    await seedDefaultEmailTemplates();

    const category = cleanText(req.query?.category).toUpperCase();
    const search = cleanText(req.query?.search);

    const filter = {};

    if (category && category !== "ALL") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { key: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const templates = await EmailTemplate.find(filter)
      .sort({ category: 1, name: 1 })
      .lean();

    return res.json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/email-templates/:id", async (req, res, next) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/email-templates/:id", async (req, res, next) => {
  try {
    const name = cleanText(req.body?.name);
    const description = cleanText(req.body?.description);
    const category = cleanText(req.body?.category).toUpperCase();
    const subject = cleanText(req.body?.subject);
    const html = String(req.body?.html || "").trim();
    const text = String(req.body?.text || "").trim();
    const variables = Array.isArray(req.body?.variables)
      ? req.body.variables.map(cleanText).filter(Boolean)
      : [];
    const active = req.body?.active !== false;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Template name is required.",
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Email subject is required.",
      });
    }

    if (!html) {
      return res.status(400).json({
        success: false,
        message: "HTML template is required.",
      });
    }

    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          description,
          category,
          subject,
          html,
          text,
          variables,
          active,
        },
      },
      { new: true },
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.json({
      success: true,
      message: "Email template updated successfully.",
      template,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/email-templates/:id/reset", async (req, res, next) => {
  try {
    const current = await EmailTemplate.findById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    const defaultTemplate = getDefaultTemplate(current.key);

    if (!defaultTemplate) {
      return res.status(400).json({
        success: false,
        message: "No default design found for this template.",
      });
    }

    current.name = defaultTemplate.name;
    current.description = defaultTemplate.description;
    current.category = defaultTemplate.category;
    current.subject = defaultTemplate.subject;
    current.html = defaultTemplate.html;
    current.text = defaultTemplate.text;
    current.variables = defaultTemplate.variables;
    current.active = true;

    await current.save();

    return res.json({
      success: true,
      message: "Template reset to default design.",
      template: current,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/email-templates/:id/preview", async (req, res, next) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    const variables =
      req.body?.variables && typeof req.body.variables === "object"
        ? req.body.variables
        : sampleVariables(template);

    return res.json({
      success: true,
      subject: renderTemplateString(template.subject, variables),
      html: renderTemplateHtml(template.html, variables),
      text: renderTemplateString(template.text, variables),
      variables,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/email-templates/:id/test", async (req, res, next) => {
  try {
    const testEmail = cleanText(req.body?.testEmail).toLowerCase();

    if (!testEmail || !isEmail(testEmail)) {
      return res.status(400).json({
        success: false,
        message: "Valid test email is required.",
      });
    }

    const template = await EmailTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    const variables =
      req.body?.variables && typeof req.body.variables === "object"
        ? req.body.variables
        : sampleVariables(template);

    const subject = renderTemplateString(template.subject, variables);
    const html = renderTemplateHtml(template.html, variables);
    const text = renderTemplateString(template.text, variables);

    await sendKidgageEmail({
      to: testEmail,
      subject,
      html,
      text,
    });

    return res.json({
      success: true,
      message: `Test email sent to ${testEmail}.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
