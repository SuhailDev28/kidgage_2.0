// server/src/models/AcademySetting.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const BranchSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    mapUrl: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
  },
  { _id: true },
);

const WorkingHourSchema = new Schema(
  {
    day: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },
    enabled: { type: Boolean, default: true },
    open: { type: String, trim: true, default: "09:00" },
    close: { type: String, trim: true, default: "21:00" },
    breakEnabled: { type: Boolean, default: false },
    breakStart: { type: String, trim: true, default: "13:00" },
    breakEnd: { type: String, trim: true, default: "14:00" },
  },
  { _id: false },
);

const GallerySchema = new Schema(
  {
    image: { type: String, default: "" },
    title: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
  },
  { _id: true },
);

const AcademySettingSchema = new Schema(
  {
    academyId: {
      type: Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      unique: true,
    },

    academyProfile: {
      academyName: { type: String, trim: true, default: "" },
      legalName: { type: String, trim: true, default: "" },
      slug: { type: String, trim: true, lowercase: true, default: "" },
      category: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      whatsapp: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "Qatar" },
      city: { type: String, trim: true, default: "Doha" },
      address: { type: String, trim: true, default: "" },
      mapUrl: { type: String, trim: true, default: "" },
      licenseNumber: { type: String, trim: true, default: "" },
      taxNumber: { type: String, trim: true, default: "" },
    },

    branding: {
      accentColor: { type: String, trim: true, default: "#e11d2e" },
      secondaryColor: { type: String, trim: true, default: "#111827" },
      fontFamily: { type: String, trim: true, default: "Inter" },
      logo: { type: String, default: "" },
      coverImage: { type: String, default: "" },
      favicon: { type: String, default: "" },
      publicTagline: { type: String, trim: true, default: "" },
      loginTitle: { type: String, trim: true, default: "Welcome back" },
      loginSubtitle: {
        type: String,
        trim: true,
        default: "Manage bookings, slots, children, and academy operations.",
      },
    },

    bookingRules: {
      bookingEnabled: { type: Boolean, default: true },
      parentCanBook: { type: Boolean, default: true },
      parentCanCancel: { type: Boolean, default: true },
      allowWaitlist: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
      requireChildAgeValidation: { type: Boolean, default: true },
      requireMedicalInfo: { type: Boolean, default: false },
      minAdvanceHours: { type: Number, default: 2, min: 0 },
      maxAdvanceDays: { type: Number, default: 30, min: 0 },
      cancellationCutoffHours: { type: Number, default: 12, min: 0 },
      maxBookingsPerChildPerDay: { type: Number, default: 2, min: 1 },
      maxActiveBookingsPerChild: { type: Number, default: 10, min: 1 },
      slotHoldMinutes: { type: Number, default: 10, min: 1 },
      bookingConfirmationMode: {
        type: String,
        enum: ["AUTO", "PAYMENT_REQUIRED", "ADMIN_APPROVAL"],
        default: "AUTO",
      },
    },

    payment: {
      currency: { type: String, trim: true, uppercase: true, default: "QAR" },
      onlinePaymentEnabled: { type: Boolean, default: true },
      cashPaymentEnabled: { type: Boolean, default: true },
      bankTransferEnabled: { type: Boolean, default: false },
      paymentRequiredToConfirm: { type: Boolean, default: true },
      allowPartialPayment: { type: Boolean, default: false },
      registrationFeeEnabled: { type: Boolean, default: false },
      registrationFee: { type: Number, default: 0, min: 0 },
      taxEnabled: { type: Boolean, default: false },
      taxPercent: { type: Number, default: 0, min: 0 },
      invoicePrefix: { type: String, trim: true, default: "INV" },
      receiptPrefix: { type: String, trim: true, default: "RCP" },
      paymentInstructions: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      bankAccountName: { type: String, trim: true, default: "" },
      iban: { type: String, trim: true, default: "" },
    },

    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      whatsappEnabled: { type: Boolean, default: true },
      notifyOnNewBooking: { type: Boolean, default: true },
      notifyOnCancellation: { type: Boolean, default: true },
      notifyOnPayment: { type: Boolean, default: true },
      notifyOnSlotChange: { type: Boolean, default: true },
      notifyBeforeClass: { type: Boolean, default: true },
      reminderHoursBeforeClass: { type: Number, default: 24, min: 0 },
      adminEmails: { type: String, trim: true, default: "" },
      notificationFooter: {
        type: String,
        trim: true,
        default: "Thank you for choosing our academy.",
      },
    },

    publicProfile: {
      isPublic: { type: Boolean, default: true },
      showPrices: { type: Boolean, default: true },
      showBranches: { type: Boolean, default: true },
      showGallery: { type: Boolean, default: true },
      showTrainerNames: { type: Boolean, default: true },
      seoTitle: { type: String, trim: true, default: "" },
      seoDescription: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      tiktok: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
    },

    branches: {
      type: [BranchSchema],
      default: [
        {
          name: "Main Branch",
          phone: "",
          address: "",
          mapUrl: "",
          active: true,
        },
      ],
    },

    workingHours: {
      type: [WorkingHourSchema],
      default: [
        { day: "Sunday", enabled: true, open: "09:00", close: "21:00" },
        { day: "Monday", enabled: true, open: "09:00", close: "21:00" },
        { day: "Tuesday", enabled: true, open: "09:00", close: "21:00" },
        { day: "Wednesday", enabled: true, open: "09:00", close: "21:00" },
        { day: "Thursday", enabled: true, open: "09:00", close: "21:00" },
        { day: "Friday", enabled: false, open: "09:00", close: "21:00" },
        { day: "Saturday", enabled: true, open: "09:00", close: "21:00" },
      ],
    },

    gallery: {
      type: [GallerySchema],
      default: [],
    },

    staffContacts: {
      managerName: { type: String, trim: true, default: "" },
      managerEmail: { type: String, trim: true, lowercase: true, default: "" },
      managerPhone: { type: String, trim: true, default: "" },
      financeEmail: { type: String, trim: true, lowercase: true, default: "" },
      supportEmail: { type: String, trim: true, lowercase: true, default: "" },
      emergencyPhone: { type: String, trim: true, default: "" },
    },

    policies: {
      termsText: { type: String, trim: true, default: "" },
      cancellationPolicy: { type: String, trim: true, default: "" },
      refundPolicy: { type: String, trim: true, default: "" },
      privacyPolicy: { type: String, trim: true, default: "" },
      healthAndSafetyPolicy: { type: String, trim: true, default: "" },
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

AcademySettingSchema.index({ "academyProfile.slug": 1 });
AcademySettingSchema.index({ "publicProfile.isPublic": 1 });

export default mongoose.models.AcademySetting ||
  mongoose.model("AcademySetting", AcademySettingSchema);
