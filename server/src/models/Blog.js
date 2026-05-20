import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", default: null },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  image: String,
  excerpt: String,
  content: String,
  status: { type: String, enum: ["PUBLISHED","DRAFT","ARCHIVED"], default: "PUBLISHED" }
},{timestamps:true});

export default mongoose.model("Blog", blogSchema);
