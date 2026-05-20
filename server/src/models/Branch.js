import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true },
  name: { type: String, required: true, trim: true },
  address: String,
  city: String,
  mapLink: String,
  contactNumber: String,
  status: { type: String, enum: ["ACTIVE","INACTIVE"], default: "ACTIVE" }
},{timestamps:true});

export default mongoose.model("Branch", branchSchema);
