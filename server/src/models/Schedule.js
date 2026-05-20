import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  waitlistCapacity: { type: Number, default: 0 },
  bookingCutoffHours: { type: Number, default: 2 },
  cancellationCutoffHours: { type: Number, default: 12 },
  recurrenceType: { type: String, enum: ["ONE_TIME","WEEKLY","CUSTOM"], default: "WEEKLY" },
  status: { type: String, enum: ["ACTIVE","INACTIVE"], default: "ACTIVE" }
},{timestamps:true});

export default mongoose.model("Schedule", scheduleSchema);
