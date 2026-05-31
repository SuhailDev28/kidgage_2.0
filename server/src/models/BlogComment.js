import mongoose from "mongoose";

const BLOG_COMMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SPAM"];

const blogCommentSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      required: true,
      index: true,
    },

    blogTitle: {
      type: String,
      default: "",
      trim: true,
    },

    blogSlug: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    status: {
      type: String,
      enum: BLOG_COMMENT_STATUSES,
      default: "PENDING",
      index: true,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

blogCommentSchema.index({ createdAt: -1 });
blogCommentSchema.index({ blogId: 1, createdAt: -1 });

const BlogComment =
  mongoose.models.BlogComment ||
  mongoose.model("BlogComment", blogCommentSchema);

export default BlogComment;