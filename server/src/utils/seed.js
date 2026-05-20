import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Academy from "../models/Academy.js";
import Activity from "../models/Activity.js";
import Blog from "../models/Blog.js";
import Branch from "../models/Branch.js";
import Category from "../models/Category.js";
import Event from "../models/Event.js";
import Schedule from "../models/Schedule.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";

dotenv.config();

function atTime(date, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function run() {
  await connectDB();

  await Promise.all([
    Academy.deleteMany({}),
    Branch.deleteMany({}),
    Category.deleteMany({}),
    Activity.deleteMany({}),
    User.deleteMany({}),
    Blog.deleteMany({}),
    Event.deleteMany({}),
    Schedule.deleteMany({}),
    Slot.deleteMany({}),
  ]);

  const sports = await Category.create({ name: "Sports", slug: "sports" });
  const academy = await Academy.create({
    name: "Aspire Kids Academy",
    slug: "aspire-kids-academy",
    description: "Fun classes for active kids.",
    city: "Doha",
    isFeatured: true,
    status: "ACTIVE",
  });
  const branch = await Branch.create({
    academyId: academy._id,
    name: "The Pearl Branch",
    city: "Doha",
    address: "The Pearl, Doha",
    status: "ACTIVE",
  });
  const activity = await Activity.create({
    academyId: academy._id,
    branchIds: [branch._id],
    categoryId: sports._id,
    title: "Kids Gymnastics",
    slug: "kids-gymnastics",
    shortDescription: "Balance, movement, and fun.",
    description: "A structured gymnastics program for children.",
    minAge: 4,
    maxAge: 12,
    price: 120,
    featured: true,
    status: "PUBLISHED",
  });

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const schedule = await Schedule.create({
    academyId: academy._id,
    activityId: activity._id,
    branchId: branch._id,
    title: "Evening Batch",
    startDate,
    endDate,
    daysOfWeek: [1,3,5],
    startTime: "16:00",
    endTime: "17:00",
    capacity: 12,
    recurrenceType: "WEEKLY",
    status: "ACTIVE",
  });

  for (let i = 0; i < 7; i++) {
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + i);
    await Slot.create({
      academyId: academy._id,
      activityId: activity._id,
      branchId: branch._id,
      scheduleId: schedule._id,
      slotDate: atTime(slotDate, "16:00"),
      startTime: "16:00",
      endTime: "17:00",
      capacity: 12,
      bookedCount: 0,
      status: "AVAILABLE",
    });
  }

  await Blog.create({ title: "KidGage at Web Summit", slug: "kidgage-at-web-summit", excerpt: "How KidGage is rethinking kids activity discovery.", status: "PUBLISHED" });
  await Event.create({ title: "Cinema Under The Stars", slug: "cinema-under-the-stars", venue: "MIA Park", city: "Doha", eventDate: new Date(), status: "PUBLISHED" });

  const passwordHash = await bcrypt.hash("Admin123!", 10);
  await User.create({ role: "SUPER_ADMIN", fullName: "Super Admin", email: "superadmin@kidgage.com", passwordHash });
  await User.create({ role: "ACADEMY_ADMIN", academyId: academy._id, fullName: "Academy Admin", email: "academy@kidgage.com", passwordHash });
  await User.create({ role: "PARENT", fullName: "Parent Demo", email: "parent@kidgage.com", passwordHash });

  console.log("Seed complete");
  process.exit(0);
}

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
