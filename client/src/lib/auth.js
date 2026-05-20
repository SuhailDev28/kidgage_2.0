// client/src/lib/auth.js

const TOKEN_KEY = "kidgage_token";
const USER_KEY = "kidgage_user";
const SELECTED_ACADEMY_KEY = "kidgage_selected_academy";

/**
 * Correct storage rule for your requirement:
 *
 * - Auth token/user: localStorage
 *   Reason: Super Admin, Academy 1, Academy 2 tabs must stay logged in after refresh.
 *
 * - Selected academy: sessionStorage only
 *   Reason: each tab can have a different academy context.
 *
 * Best practice:
 * - For Super Admin opening academies, use URL:
 *   /super-admin/academies/:academyId/dashboard
 *
 * - Do not store selected academy in localStorage.
 */

function safeLocalGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function safeLocalRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function normalizeId(value) {
  return String(value || "").trim();
}

function pickToken(payload = {}) {
  return normalizeId(
    payload?.token ||
      payload?.accessToken ||
      payload?.data?.token ||
      payload?.data?.accessToken ||
      "",
  );
}

function pickUser(payload = {}) {
  return payload?.user || payload?.data?.user || null;
}

export function saveSession(payload = {}) {
  const token = pickToken(payload);
  const user = pickUser(payload);

  if (!token) return null;

  safeLocalSet(TOKEN_KEY, token);

  if (user) {
    safeLocalSet(USER_KEY, JSON.stringify(user));
  }

  // Keep academy selection tab-specific only.
  safeSessionRemove(SELECTED_ACADEMY_KEY);
  safeLocalRemove(SELECTED_ACADEMY_KEY);

  return {
    token,
    user,
  };
}

export function getToken() {
  return normalizeId(safeLocalGet(TOKEN_KEY) || "");
}

export function getUser() {
  const raw = safeLocalGet(USER_KEY);
  return safeJsonParse(raw, null);
}

export function getRole() {
  return normalizeRole(getUser()?.role);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function isParent() {
  return isLoggedIn() && getRole() === "PARENT";
}

export function isSuperAdmin() {
  return isLoggedIn() && getRole() === "SUPER_ADMIN";
}

export function isAcademyAdmin() {
  const role = getRole();

  return (
    isLoggedIn() &&
    [
      "ACADEMY_ADMIN",
      "ADMIN",
      "PROVIDER_ADMIN",
      "ACADEMY_MANAGER",
      "ACADEMY_STAFF",
    ].includes(role)
  );
}

export function isAdminLike() {
  return isSuperAdmin() || isAcademyAdmin();
}

export function getAcademyIdFromUser(user = getUser()) {
  return normalizeId(
    user?.academyId?._id ||
      user?.academyId?.id ||
      user?.academyId ||
      user?.academy?._id ||
      user?.academy?.id ||
      user?.academy ||
      user?.academy_id ||
      user?.providerId ||
      "",
  );
}

/**
 * Selected academy is sessionStorage only.
 * This prevents Academy 1 tab and Academy 2 tab from overwriting each other.
 */
export function setSelectedAcademy(academy) {
  if (!academy) {
    clearSelectedAcademy();
    return;
  }

  if (typeof academy === "string") {
    const id = normalizeId(academy);
    if (!id) return;

    safeSessionSet(SELECTED_ACADEMY_KEY, id);
    safeLocalRemove(SELECTED_ACADEMY_KEY);
    return;
  }

  safeSessionSet(SELECTED_ACADEMY_KEY, JSON.stringify(academy));
  safeLocalRemove(SELECTED_ACADEMY_KEY);
}

export function getSelectedAcademy() {
  const raw = safeSessionGet(SELECTED_ACADEMY_KEY);

  if (!raw) return "";

  const parsed = safeJsonParse(raw, null);

  return parsed || raw;
}

export function getSelectedAcademyId() {
  const selected = getSelectedAcademy();

  return normalizeId(
    selected?._id ||
      selected?.id ||
      selected?.academyId ||
      selected?.value ||
      selected ||
      "",
  );
}

export function clearSelectedAcademy() {
  safeSessionRemove(SELECTED_ACADEMY_KEY);
  safeLocalRemove(SELECTED_ACADEMY_KEY);
}

/**
 * URL academy ID should be preferred.
 * Example:
 * getEffectiveAcademyId(academyIdFromParams)
 */
export function getEffectiveAcademy(urlAcademyId = "") {
  const academyIdFromUrl = normalizeId(urlAcademyId);

  if (academyIdFromUrl) {
    return academyIdFromUrl;
  }

  if (isSuperAdmin()) {
    return getSelectedAcademyId() || "";
  }

  return getAcademyIdFromUser();
}

export function getEffectiveAcademyId(urlAcademyId = "") {
  return getEffectiveAcademy(urlAcademyId);
}

export function getAcademyScopedHeaders(urlAcademyId = "") {
  const academyId = getEffectiveAcademy(urlAcademyId);

  if (!academyId) return {};

  return {
    "x-academy-id": academyId,
  };
}

export function updateStoredUser(patch = {}) {
  const currentUser = getUser() || {};
  const nextUser = {
    ...currentUser,
    ...patch,
  };

  safeLocalSet(USER_KEY, JSON.stringify(nextUser));

  return nextUser;
}

export function clearAuth() {
  safeLocalRemove(TOKEN_KEY);
  safeLocalRemove(USER_KEY);

  safeSessionRemove(SELECTED_ACADEMY_KEY);
  safeLocalRemove(SELECTED_ACADEMY_KEY);
}

export function logout() {
  clearAuth();
}
