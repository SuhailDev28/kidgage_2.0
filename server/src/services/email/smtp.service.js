import crypto from "crypto";
import nodemailer from "nodemailer";

import SmtpSetting from "../../models/SmtpSetting.js";

const ALGORITHM = "aes-256-gcm";

function getSecretKey() {
  const raw = String(
    process.env.SMTP_SECRET_KEY || process.env.JWT_SECRET || "",
  ).trim();

  if (!raw) {
    throw new Error(
      "SMTP_SECRET_KEY or JWT_SECRET is required for SMTP encryption.",
    );
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSmtpPassword(value = "") {
  const text = String(value || "");

  if (!text) return "";

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSmtpPassword(value = "") {
  const text = String(value || "");

  if (!text) return "";

  const [ivText, tagText, encryptedText] = text.split(":");

  if (!ivText || !tagText || !encryptedText) return "";

  const iv = Buffer.from(ivText, "base64");
  const tag = Buffer.from(tagText, "base64");
  const encrypted = Buffer.from(encryptedText, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function getGlobalSmtpSetting() {
  let setting = await SmtpSetting.findOne({ key: "GLOBAL" });

  if (!setting) {
    setting = await SmtpSetting.create({
      key: "GLOBAL",
      enabled: false,
      provider: "CUSTOM",
      host: "",
      port: 587,
      secure: false,
      username: "",
      fromName: "KidGage",
      fromEmail: "",
      replyTo: "",
    });
  }

  return setting;
}

export function sanitizeSmtpSetting(setting) {
  if (!setting) return null;

  const row =
    typeof setting.toObject === "function" ? setting.toObject() : setting;

  return {
    _id: row._id,
    key: row.key,
    enabled: Boolean(row.enabled),
    provider: row.provider || "CUSTOM",
    host: row.host || "",
    port: Number(row.port || 587),
    secure: Boolean(row.secure),
    username: row.username || "",
    hasPassword: Boolean(row.passwordEncrypted),
    fromName: row.fromName || "KidGage",
    fromEmail: row.fromEmail || "",
    replyTo: row.replyTo || "",
    lastTestedAt: row.lastTestedAt || null,
    lastTestStatus: row.lastTestStatus || "NOT_TESTED",
    lastTestMessage: row.lastTestMessage || "",
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

export async function buildSmtpTransporter() {
  const setting = await getGlobalSmtpSetting();

  if (!setting.enabled) {
    throw new Error("SMTP is disabled.");
  }

  if (!setting.host) {
    throw new Error("SMTP host is missing.");
  }

  if (!setting.username) {
    throw new Error("SMTP username is missing.");
  }

  const password = decryptSmtpPassword(setting.passwordEncrypted);

  if (!password) {
    throw new Error("SMTP password is missing.");
  }

  return nodemailer.createTransport({
    host: setting.host,
    port: Number(setting.port || 587),
    secure: Boolean(setting.secure),
    auth: {
      user: setting.username,
      pass: password,
    },
  });
}

export async function sendKidgageEmail({ to, subject, html, text, replyTo }) {
  const setting = await getGlobalSmtpSetting();
  const transporter = await buildSmtpTransporter();

  const fromEmail = setting.fromEmail || setting.username;
  const fromName = setting.fromName || "KidGage";

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
    replyTo: replyTo || setting.replyTo || fromEmail,
  });
}
