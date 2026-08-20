import { db } from "./client";
import {
  adminUsers,
  membershipPlans,
  members,
  creditPacks,
  classSessions,
  bookings,
  accessCredentials,
  accessLogs,
  payments,
} from "./schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { addDays, addHours } from "date-fns";

function id() {
  return randomUUID();
}

async function main() {
  console.log("Seeding Fitvibe database...");

  // --- Admin user -----------------------------------------------------
  const ethanId = id();
  await db.insert(adminUsers).values({
    id: ethanId,
    name: "Ethan Raharjo Joseph",
    email: "ethan@fitvibe.my",
    passwordHash: await bcrypt.hash("changeme-fitvibe", 10),
    role: "owner",
  });

  // --- Membership plans -------------------------------------------------
  // Mirrors the Spark / Forge / 1-on-1 / Founding Member / SJGC-rate
  // structure from Fitvibe_Project_Management_Launch_Sprint_v5.
  const plan = {
    spark6: id(),
    spark10: id(),
    forge10: id(),
    forge20: id(),
    oneOnOne: id(),
    founding: id(),
    sjgc: id(),
  };

  await db.insert(membershipPlans).values([
    {
      id: plan.spark6,
      name: "Spark — Starter (6 credits)",
      description: "Small-group mobility & balance sessions, max 4 per class.",
      classCapacity: 4,
      priceRM: 320,
      creditsIncluded: 6,
      validityDays: 30,
    },
    {
      id: plan.spark10,
      name: "Spark — Standard (10 credits)",
      description: "Small-group mobility & balance sessions, max 4 per class.",
      classCapacity: 4,
      priceRM: 500,
      creditsIncluded: 10,
      validityDays: 60,
    },
    {
      id: plan.forge10,
      name: "Forge — Standard (10 credits)",
      description: "Group strength training, max 8 per class.",
      classCapacity: 8,
      priceRM: 450,
      creditsIncluded: 10,
      validityDays: 60,
    },
    {
      id: plan.forge20,
      name: "Forge — Extended (20 credits)",
      description: "Group strength training, max 8 per class.",
      classCapacity: 8,
      priceRM: 800,
      creditsIncluded: 20,
      validityDays: 90,
    },
    {
      id: plan.oneOnOne,
      name: "1-on-1 ForEva Assessment & Training",
      description: "Private specialist sessions with Ethan.",
      classCapacity: 1,
      priceRM: 150,
      creditsIncluded: 1,
      validityDays: 30,
    },
    {
      id: plan.founding,
      name: "Founding Member — Forever Pass",
      description: "Limited to 20 slots. Locked-in rate for life. Sign-up by 30 Sep 2026.",
      classCapacity: 8,
      priceRM: 1200,
      creditsIncluded: 30,
      validityDays: 90,
      isFoundingMemberOffer: true,
    },
    {
      id: plan.sjgc,
      name: "SJGC Partner Rate",
      description: "Preferential rate for SJGC / Strong Beyond 50 community members.",
      classCapacity: 8,
      priceRM: 400,
      creditsIncluded: 10,
      validityDays: 60,
    },
  ]);

  // --- Class sessions (sample timetable, next 2 weeks) -------------------
  const now = new Date();
  const classDefs = [
    { title: "Spark — Mobility & Balance", plan: plan.spark10, cap: 4, hour: 8 },
    { title: "Forge — Strength Foundations", plan: plan.forge10, cap: 8, hour: 10 },
    { title: "Spark — Gentle Flow", plan: plan.spark10, cap: 4, hour: 16 },
    { title: "Forge — Strength Progressions", plan: plan.forge10, cap: 8, hour: 17 },
  ];
  const classIds: string[] = [];
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const day = addDays(now, dayOffset);
    if (day.getDay() === 0) continue; // closed Sundays
    for (const c of classDefs) {
      const start = new Date(day);
      start.setHours(c.hour, 0, 0, 0);
      const cid = id();
      classIds.push(cid);
      await db.insert(classSessions).values({
        id: cid,
        title: c.title,
        membershipPlanId: c.plan,
        startTime: start,
        endTime: addHours(start, 1),
        capacity: c.cap,
        instructor: "Ethan",
        recurrenceRule: "FREQ=DAILY;EXCLUDE=SUNDAY",
      });
    }
  }

  // --- Sample members (representing the 27 Strong Beyond 50 migration) ---
  const sampleMembers = [
    { name: "Siti Aminah", email: "siti.aminah@example.com", phone: "+60123456701", plan: plan.founding },
    { name: "Razif Ismail", email: "razif.ismail@example.com", phone: "+60123456702", plan: plan.spark10 },
    { name: "Grace Tan", email: "grace.tan@example.com", phone: "+60123456703", plan: plan.forge10 },
    { name: "David Lim", email: "david.lim@example.com", phone: "+60123456704", plan: plan.sjgc },
  ];

  for (const m of sampleMembers) {
    const memberId = id();
    await db.insert(members).values({
      id: memberId,
      fullName: m.name,
      email: m.email,
      phone: m.phone,
      emergencyContactName: "Emergency Contact",
      emergencyContactPhone: "+60123456799",
      chronicConditionFlags: JSON.stringify([]),
      waiverSignedAt: new Date(),
      pdpaConsentAt: new Date(),
      status: "active",
      membershipPlanId: m.plan,
      source: "Strong Beyond 50 migration",
    });

    const planRow = [
      plan.founding, plan.spark10, plan.forge10, plan.sjgc,
    ].includes(m.plan);
    const creditsTotal = m.plan === plan.founding ? 30 : m.plan === plan.forge10 ? 10 : m.plan === plan.sjgc ? 10 : 10;

    const packId = id();
    const payId = id();
    await db.insert(payments).values({
      id: payId,
      memberId,
      amountRM: 400,
      method: "duitnow",
      referenceNote: "Migrated historical payment",
      status: "approved",
      approvedAt: new Date(),
      approvedByAdminId: ethanId,
    });
    await db.insert(creditPacks).values({
      id: packId,
      memberId,
      membershipPlanId: m.plan,
      creditsTotal,
      creditsRemaining: creditsTotal - 2,
      expiresAt: addDays(now, 45),
      status: "active",
      paymentId: payId,
    });

    // Issue a QR access credential (Ethan's preferred method)
    const credId = id();
    await db.insert(accessCredentials).values({
      id: credId,
      memberId,
      type: "qr",
      credentialToken: `FVQ-${randomUUID()}`,
      status: "active",
    });

    // A sample booking against the first upcoming class
    if (classIds[0]) {
      await db.insert(bookings).values({
        id: id(),
        memberId,
        classSessionId: classIds[0],
        creditPackId: packId,
        status: "booked",
      });
    }

    // A sample access log entry
    await db.insert(accessLogs).values({
      id: id(),
      credentialId: credId,
      memberId,
      direction: "entry",
      result: "granted",
      reason: "active",
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    // postgres.js keeps the connection open otherwise, which would hang the script.
    process.exit(0);
  });
