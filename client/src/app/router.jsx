// client/src/router/AppRouter.jsx

import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import SuperAdminLayout from "../layouts/SuperAdminLayout.jsx";
import ThemeLoader from "../ThemeLoader.jsx";

import {
  isLoggedIn,
  isSuperAdmin,
  isAcademyAdmin,
  isParent,
} from "../lib/auth.js";

/* Shared Pages */
import NotificationsPage from "../pages/shared/NotificationsPage.jsx";

/* Public Pages */
import HomePage from "../pages/public/HomePage.jsx";
import ActivitiesPage from "../pages/public/ActivitiesPage.jsx";
import PublicAcademiesPage from "../pages/public/AcademiesPage.jsx";
import PublicAcademyDetailsPage from "../pages/public/PublicAcademyDetailsPage.jsx";
import LoginPage from "../pages/public/LoginPage.jsx";
import RegisterPage from "../pages/public/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/public/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../pages/public/ResetPasswordPage.jsx";
import AcademyRegisterPage from "../pages/public/AcademyRegisterPage.jsx";
import TermsPage from "../pages/public/TermsPage.jsx";
import PrivacyPage from "../pages/public/PrivacyPage.jsx";
import ContactPage from "../pages/public/ContactPage.jsx";
import BlogDetailsPage from "../pages/public/BlogDetailsPage.jsx";
import BlogsPage from "../pages/public/BlogsPage.jsx";
import ActivityDetailsPage from "../pages/public/ActivityDetailsPage.jsx";
import EventsPage from "../pages/public/EventsPage.jsx";
import KidgageFallbackPage from "../pages/public/KidgageFallbackPage.jsx";

/* Payment */
import MyFatoorahEmbedPage from "../pages/payment/MyFatoorahEmbedPage.jsx";
import PaymentResultPage from "../pages/payment/PaymentResultPage.jsx";
import BookingSuccessPage from "../pages/payment/BookingSuccessPage.jsx";

/* Parent */
import ParentLayout from "../layouts/ParentLayout.jsx";
import ParentDashboardPage from "../pages/parent/DashboardPage.jsx";
import ParentBookingHistory from "../pages/parent/ParentBookingHistory.jsx";
import ParentProfilePage from "../pages/parent/ProfilePage.jsx";
import ParentSettingsPage from "../pages/parent/SettingsPage.jsx";
import ParentChildrenPage from "../pages/parent/ParentChildrenPage.jsx";

/* Academy */
import AcademyLayout from "../layouts/AcademyLayout.jsx";
import AcademyDashboardPage from "../pages/academy/AcademyDashboard.jsx";
import AcademyActivitiesPage from "../pages/academy/AcademyActivitiesPage.jsx";
import ActivityPackagesSlotsPage from "../pages/academy/ActivityPackagesSlotsPage.jsx";
import BookingEnquiriesPage from "../pages/academy/BookingEnquiriesPage.jsx";
import AcademyProfilePage from "../pages/academy/AcademyProfilePage.jsx";
import AcademySettingsPage from "../pages/academy/AcademySettingsPage.jsx";
import AcademySettlementsPage from "../pages/academy/SettlementsPage.jsx";
import AttendancePage from "../pages/academy/AttendancePage.jsx";

/* Super Admin */
import SuperAdminDashboardPage from "../pages/superadmin/DashboardPage.jsx";
import SuperAdminOnboardingPage from "../pages/superadmin/SuperAdminOnboarding.jsx";
import SuperAdminPlaceholderPage from "../pages/superadmin/PlaceholderPage.jsx";
import SuperAdminAcademiesPage from "../pages/superadmin/AcademiesPage.jsx";
import AcademyDetailsPage from "../pages/superadmin/AcademyDetailsPage.jsx";
import EditAcademyPage from "../pages/superadmin/EditAcademyPage.jsx";
import BannersPage from "../pages/superadmin/BannersPage.jsx";
import CategoriesPage from "../pages/superadmin/CategoriesPage.jsx";
import EventPostersPage from "../pages/superadmin/EventPostersPage.jsx";
import KidgageNewsPage from "../pages/superadmin/KidgageNewsPage.jsx";
import RequestsPage from "../pages/superadmin/RequestsPage.jsx";
import SettingsPage from "../pages/superadmin/SettingsPage.jsx";
import SuperAdminPaymentsPage from "../pages/superadmin/SuperAdminPayments.jsx";
import SettlementsPage from "../pages/superadmin/SettlementsPage.jsx";
import SuperAdminBookingEnquiriesPage from "../pages/superadmin/BookingEnquiriesPage.jsx";
import SuperAdminActivitiesPage from "../pages/superadmin/SuperAdminActivitiesPage.jsx";
import ActivityApprovalsPage from "../pages/superadmin/ActivityApprovalsPage.jsx";
import SuperAdminParentsPage from "../pages/superadmin/ParentsPage.jsx";
import SuperAdminReportsPage from "../pages/superadmin/SuperAdminReportsPage.jsx";
import ContentPagesManager from "../pages/superadmin/ContentPagesManager.jsx";
import SuperAdminChildrenPage from "../pages/superadmin/ChildrenPage.jsx";
import CertificateTemplatesPage from "../pages/superadmin/CertificateTemplatesPage.jsx";
import SmtpSettingsPage from "../pages/superadmin/SmtpSettingsPage.jsx";
import EmailTemplatesPage from "../pages/superadmin/EmailTemplatesPage.jsx";
import SuperAdminVouchersPage from "../pages/superadmin/SuperAdminVouchersPage.jsx";

function SuperAdminGuard({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AcademyGuard({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAcademyAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function ParentGuard({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!isParent()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AppRouter() {
  return (
    <>
      <ThemeLoader />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/" element={<HomePage />} />

          <Route path="/academies" element={<PublicAcademiesPage />} />
          <Route
            path="/academies/:slug"
            element={<PublicAcademyDetailsPage />}
          />

          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/activities/:slug" element={<ActivityDetailsPage />} />

          <Route path="/events" element={<EventsPage />} />

          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/blogs/:slug" element={<BlogDetailsPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/provider-joining-form"
            element={<AcademyRegisterPage />}
          />

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* PAYMENT ROUTES - public for parent + guest checkout */}
          <Route
            path="/payment/myfatoorah/:bookingId"
            element={<MyFatoorahEmbedPage />}
          />
          <Route path="/payment/myfatoorah" element={<MyFatoorahEmbedPage />} />

          <Route
            path="/payment/success/:bookingId"
            element={<BookingSuccessPage />}
          />

          <Route
            path="/payment/booking-success/:bookingId"
            element={<BookingSuccessPage />}
          />

          <Route
            path="/booking/success/:bookingId"
            element={<BookingSuccessPage />}
          />

          <Route
            path="/payment/success"
            element={<PaymentResultPage type="success" />}
          />
          <Route
            path="/payment/failed"
            element={<PaymentResultPage type="failed" />}
          />
          <Route
            path="/payment/pending"
            element={<PaymentResultPage type="pending" />}
          />
        </Route>

        {/* PARENT ROUTES */}
        <Route
          path="/parent"
          element={
            <ParentGuard>
              <ParentLayout />
            </ParentGuard>
          }
        >
          <Route index element={<Navigate to="/parent/dashboard" replace />} />

          <Route path="dashboard" element={<ParentDashboardPage />} />
          <Route path="bookings" element={<ParentBookingHistory />} />
          <Route path="payments" element={<ParentBookingHistory />} />
          <Route path="children" element={<ParentChildrenPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ParentProfilePage />} />
          <Route path="settings" element={<ParentSettingsPage />} />

          <Route path="*" element={<KidgageFallbackPage />} />
        </Route>

        {/* ACADEMY ADMIN ROUTES */}
        <Route
          path="/academy"
          element={
            <AcademyGuard>
              <AcademyLayout />
            </AcademyGuard>
          }
        >
          <Route index element={<Navigate to="/academy/dashboard" replace />} />

          <Route path="dashboard" element={<AcademyDashboardPage />} />
          <Route path="activities" element={<AcademyActivitiesPage />} />
          <Route
            path="activities/:id/manage"
            element={<ActivityPackagesSlotsPage />}
          />
          <Route path="bookings" element={<BookingEnquiriesPage />} />
          <Route path="settlements" element={<AcademySettlementsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<AcademyProfilePage />} />
          <Route path="settings" element={<AcademySettingsPage />} />
          <Route path="attendance" element={<AttendancePage />} />

          <Route path="*" element={<KidgageFallbackPage />} />
        </Route>

        {/* SUPER ADMIN ROUTES */}
        <Route
          path="/super-admin"
          element={
            <SuperAdminGuard>
              <SuperAdminLayout />
            </SuperAdminGuard>
          }
        >
          <Route
            index
            element={<Navigate to="/super-admin/dashboard" replace />}
          />

          <Route path="dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="onboarding" element={<SuperAdminOnboardingPage />} />

          <Route path="academies" element={<SuperAdminAcademiesPage />} />
          <Route path="academies/:id" element={<AcademyDetailsPage />} />
          <Route path="academies/:id/edit" element={<EditAcademyPage />} />

          <Route
            path="branches"
            element={<SuperAdminPlaceholderPage title="Branches" />}
          />

          <Route path="activities" element={<SuperAdminActivitiesPage />} />
          <Route
            path="activity-approvals"
            element={<ActivityApprovalsPage />}
          />

          <Route path="bookings" element={<SuperAdminBookingEnquiriesPage />} />
          <Route path="payments" element={<SuperAdminPaymentsPage />} />
          <Route path="vouchers" element={<SuperAdminVouchersPage />} />
          <Route path="settlements" element={<SettlementsPage />} />

          <Route path="parents" element={<SuperAdminParentsPage />} />
          <Route path="children" element={<SuperAdminChildrenPage />} />

          <Route
            path="staff"
            element={<SuperAdminPlaceholderPage title="Staff" />}
          />

          <Route path="events" element={<EventPostersPage />} />
          <Route path="blogs" element={<KidgageNewsPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="categories" element={<CategoriesPage />} />

          <Route
            path="certificate-templates"
            element={<CertificateTemplatesPage />}
          />

          <Route path="content-pages" element={<ContentPagesManager />} />

          <Route path="requests" element={<RequestsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<SuperAdminReportsPage />} />

          <Route
            path="logs"
            element={<SuperAdminPlaceholderPage title="Audit Logs" />}
          />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="smtp-settings" element={<SmtpSettingsPage />} />
          <Route path="email-templates" element={<EmailTemplatesPage />} />

          <Route path="*" element={<KidgageFallbackPage />} />
        </Route>

        {/* GLOBAL FALLBACK */}
        <Route path="*" element={<KidgageFallbackPage />} />
      </Routes>
    </>
  );
}