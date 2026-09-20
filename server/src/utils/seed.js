/**
 * Seed script - creates demo accounts for local development/testing.
 *
 * Run with: npm run seed
 *
 * Provides ready-made "editor" and "writer" accounts with known
 * credentials, so role authorization can be tested without going
 * through the signup form (see auth.controller.js for how registration
 * assigns roles).
 *
 * Idempotent: running it multiple times will not create duplicates.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

const SALT_ROUNDS = 10;

const DEMO_USERS = [
  {
    name: "Demo Editor",
    email: "editor@example.com",
    password: "Editor@123",
    role: "editor",
  },
  {
    name: "Demo Writer",
    email: "writer@example.com",
    password: "Writer@123",
    role: "writer",
  },
];

const seed = async () => {
  await connectDB();

  for (const demoUser of DEMO_USERS) {
    const email = demoUser.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`Skipped (already exists): ${email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(demoUser.password, SALT_ROUNDS);

    await User.create({
      name: demoUser.name,
      email,
      passwordHash,
      role: demoUser.role,
    });

    console.log(`Created: ${email} (${demoUser.role})`);
  }

  console.log("Seeding complete.");
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});