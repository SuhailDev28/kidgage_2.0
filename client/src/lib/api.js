// client/src/lib/api.js
import axios from "axios";
import { getToken, logout } from "./auth.js";

const rootBase = String(
  import.meta.env.VITE_API_BASE || "http://localhost:5001/api",
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: rootBase,
  withCredentials: false,
});

export const publicApi = axios.create({
  baseURL: `${rootBase}/public`,
  withCredentials: false,
});

function attachToken(config) {
  const token = getToken();

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

function isPublicUrl(url = "") {
  const text = String(url || "");

  return (
    text.startsWith("/public/") ||
    text.startsWith("public/") ||
    text.startsWith("/settings") ||
    text.startsWith("/content-pages") ||
    text.startsWith("/legal") ||
    text.startsWith("/terms") ||
    text.startsWith("/privacy") ||
    text.includes("/public/settings") ||
    text.includes("/public/content-pages") ||
    text.includes("/public/legal") ||
    text.includes("/public/terms") ||
    text.includes("/public/privacy")
  );
}

function normalizeAxiosError(error, fallback = "Request failed") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

api.interceptors.request.use(attachToken);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");

    const isLoginRequest = url.includes("/login");
    const isRegisterRequest = url.includes("/register");
    const hasToken = Boolean(getToken());

    /*
      Logout only when:
      - user already has token
      - server says token is invalid/expired
      - request is not login/register/public
    */
    if (
      status === 401 &&
      hasToken &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isPublicUrl(url)
    ) {
      logout();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

publicApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

/* -------------------------------------------------------------------------- */
/* RESPONSE HELPER                                                            */
/* -------------------------------------------------------------------------- */

function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((error) => {
      throw new Error(normalizeAxiosError(error));
    });
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      qs.set(key, String(value));
    }
  });

  const text = qs.toString();
  return text ? `?${text}` : "";
}

function requireId(id, label = "ID") {
  const value = String(id || "").trim();

  if (!value) {
    throw new Error(`${label} is required`);
  }

  return value;
}

/* -------------------------------------------------------------------------- */
/* NOTIFICATIONS                                                              */
/* -------------------------------------------------------------------------- */

api.notifications = function notifications(params = {}) {
  return unwrap(api.get(`/notifications${buildQuery(params)}`));
};

api.notificationUnreadCount = function notificationUnreadCount() {
  return unwrap(api.get("/notifications/unread-count"));
};

api.notificationStats = function notificationStats() {
  return unwrap(api.get("/notifications/stats"));
};

api.markNotificationRead = function markNotificationRead(id) {
  return unwrap(
    api.patch(`/notifications/${requireId(id, "Notification ID")}/read`),
  );
};

api.markNotificationUnread = function markNotificationUnread(id) {
  return unwrap(
    api.patch(`/notifications/${requireId(id, "Notification ID")}/unread`),
  );
};

api.markAllNotificationsRead = function markAllNotificationsRead() {
  return unwrap(api.patch("/notifications/mark-all-read"));
};

api.deleteNotification = function deleteNotification(id) {
  return unwrap(
    api.delete(`/notifications/${requireId(id, "Notification ID")}`),
  );
};

/* -------------------------------------------------------------------------- */
/* ACADEMY PAYMENTS                                                           */
/* -------------------------------------------------------------------------- */

api.academyPayments = function academyPayments(params = {}) {
  return unwrap(api.get(`/academy/payments${buildQuery(params)}`));
};

api.academyPaymentDetails = function academyPaymentDetails(id) {
  return unwrap(api.get(`/academy/payments/${requireId(id, "Payment ID")}`));
};

/* -------------------------------------------------------------------------- */
/* ACADEMY SETTLEMENTS                                                        */
/* -------------------------------------------------------------------------- */

api.academySettlementSummary = function academySettlementSummary() {
  return unwrap(api.get("/academy/settlement-summary"));
};

api.academySettlements = function academySettlements(params = {}) {
  return unwrap(api.get(`/academy/settlements${buildQuery(params)}`));
};

api.academySettlementDetails = function academySettlementDetails(id) {
  return unwrap(
    api.get(`/academy/settlements/${requireId(id, "Settlement ID")}`),
  );
};
/* -------------------------------------------------------------------------- */
/* ACTIVITY PACKAGES / COURSE PACKAGES                                        */
/* -------------------------------------------------------------------------- */

api.activityPackages = function activityPackages(params = {}) {
  return unwrap(api.get(`/activity-packages${buildQuery(params)}`));
};

api.activityPackageDetails = function activityPackageDetails(id) {
  return unwrap(
    api.get(`/activity-packages/${requireId(id, "Package ID")}`),
  );
};

api.createActivityPackage = function createActivityPackage(payload = {}) {
  const body = {
    ...payload,
    minAge: Number(payload.minAge ?? 0),
    maxAge: Number(payload.maxAge ?? 18),
  };

  return unwrap(api.post("/activity-packages", body));
};

api.updateActivityPackage = function updateActivityPackage(id, payload = {}) {
  const body = {
    ...payload,
  };

  if (payload.minAge !== undefined) {
    body.minAge = Number(payload.minAge ?? 0);
  }

  if (payload.maxAge !== undefined) {
    body.maxAge = Number(payload.maxAge ?? 18);
  }

  return unwrap(
    api.put(`/activity-packages/${requireId(id, "Package ID")}`, body),
  );
};

api.deleteActivityPackage = function deleteActivityPackage(id) {
  return unwrap(
    api.delete(`/activity-packages/${requireId(id, "Package ID")}`),
  );
};

api.toggleActivityPackageStatus = function toggleActivityPackageStatus(
  id,
  active,
) {
  return unwrap(
    api.patch(`/activity-packages/${requireId(id, "Package ID")}/status`, {
      active: Boolean(active),
    }),
  );
};

/* -------------------------------------------------------------------------- */
/* PUBLIC SETTINGS / CONTENT                                                  */
/* -------------------------------------------------------------------------- */

api.publicSettings = function publicSettings() {
  return unwrap(api.get("/public/settings"));
};

publicApi.settings = function publicSettingsViaPublicApi() {
  return unwrap(publicApi.get("/settings"));
};

api.publicContentPage = function publicContentPage(slug) {
  return unwrap(api.get(`/public/content-pages/${requireId(slug, "Slug")}`));
};

publicApi.contentPage = function publicContentPageViaPublicApi(slug) {
  return unwrap(publicApi.get(`/content-pages/${requireId(slug, "Slug")}`));
};

api.publicLegalPage = function publicLegalPage(type) {
  return unwrap(api.get(`/public/legal/${requireId(type, "Legal page type")}`));
};

publicApi.legalPage = function publicLegalPageViaPublicApi(type) {
  return unwrap(publicApi.get(`/legal/${requireId(type, "Legal page type")}`));
};

api.publicTerms = function publicTerms() {
  return unwrap(api.get("/public/terms-and-conditions"));
};

publicApi.terms = function publicTermsViaPublicApi() {
  return unwrap(publicApi.get("/terms-and-conditions"));
};

api.publicPrivacy = function publicPrivacy() {
  return unwrap(api.get("/public/privacy-policy"));
};

publicApi.privacy = function publicPrivacyViaPublicApi() {
  return unwrap(publicApi.get("/privacy-policy"));
};

/* -------------------------------------------------------------------------- */
/* SUPER ADMIN ACTIVITY APPROVALS                                             */
/* -------------------------------------------------------------------------- */

api.superAdminActivityApprovals = function superAdminActivityApprovals(
  params = {},
) {
  return unwrap(
    api.get(`/super-admin/activity-approvals${buildQuery(params)}`),
  );
};

api.approveActivity = function approveActivity(id) {
  return unwrap(
    api.patch(
      `/super-admin/activity-approvals/${requireId(
        id,
        "Activity ID",
      )}/approve`,
    ),
  );
};

api.rejectActivity = function rejectActivity(id, reason = "") {
  return unwrap(
    api.patch(
      `/super-admin/activity-approvals/${requireId(
        id,
        "Activity ID",
      )}/reject`,
      { reason },
    ),
  );
};

/*
  Usage:

  api.get("/super-admin/bookings")
  api.get("/parent/history")

  publicApi.get("/settings")
  publicApi.get("/content-pages/privacy-policy")
  publicApi.get("/content-pages/terms-and-conditions")
  publicApi.get("/privacy-policy")
  publicApi.get("/terms-and-conditions")


  Public settings helpers:
  api.publicSettings()
  publicApi.settings()
  api.publicContentPage("privacy-policy")
  publicApi.contentPage("terms-and-conditions")

  Super admin activity approval helpers:
  api.superAdminActivityApprovals({ status: "PENDING_APPROVAL" })
  api.approveActivity(activityId)
  api.rejectActivity(activityId, reason)

  Notification helpers:
  api.notifications({ page: 1, limit: 15, status: "UNREAD" })
  api.notificationUnreadCount()
  api.notificationStats()
  api.markNotificationRead(id)
  api.markNotificationUnread(id)
  api.markAllNotificationsRead()
  api.deleteNotification(id)

  Academy payment helpers:
  api.academyPayments({ page: 1, limit: 20, status: "PAID" })
  api.academyPaymentDetails(id)

  Academy settlement helpers:
  api.academySettlementSummary()
  api.academySettlements({ page: 1, limit: 20, status: "PAID" })
  api.academySettlementDetails(id)

  Do not use:
  publicApi.get("/public/settings")
  publicApi.get("/public/content-pages/privacy-policy")
*/
