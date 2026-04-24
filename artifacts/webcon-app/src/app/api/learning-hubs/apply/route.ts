import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  hubApplicationsTable,
  learningHubsTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

const INAPPROPRIATE_TERMS = [
  /sex/i, /porn/i, /nude/i, /xxx/i, /fuck/i, /shit/i, /bitch/i, /nigger/i,
  /racist/i, /hate/i, /kill/i, /drug/i, /scam/i, /fraud/i,
];

const DUPLICATE_CHECK_TERMS = ["hub", "test", "asdf", "qwerty", "lorem"];

function isInappropriateName(name: string): boolean {
  return INAPPROPRIATE_TERMS.some(re => re.test(name));
}

function isSuspiciousName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (lower.length < 3) return true;
  if (DUPLICATE_CHECK_TERMS.some(t => lower === t)) return true;
  if (/^[0-9\s\-_]+$/.test(lower)) return true;
  return false;
}

async function sendHubAccessEmail(
  email: string,
  firstName: string,
  hubId: number,
  accessToken: string,
  siteUrl: string
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const dashboardLink = `${siteUrl}/learning-hub/dashboard?token=${accessToken}&hub=${hubId}`;

  await transporter.sendMail({
    from: `"EduBridge Learning" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your Learning Hub is ready — Access your dashboard",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 700; color: #0f0f0f; margin-bottom: 8px;">Your Learning Hub is live</h1>
        <p style="font-size: 14px; color: #555; margin-bottom: 24px;">Hi ${firstName},</p>
        <p style="font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 24px;">
          Your Learning Hub application has been received and your dashboard is now ready. 
          You can start adding knowledge documents to power your agents.
        </p>
        <p style="font-size: 13px; color: #888; margin-bottom: 8px;">
          Note: Your documents will be reviewed by our team to ensure quality. 
          Submissions containing false information will result in a permanent account ban.
        </p>
        <a href="${dashboardLink}" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background: #0f0f0f; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Access My Dashboard →
        </a>
        <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
          This link takes you directly to your Learning Hub dashboard. 
          Keep it saved — it auto-logs you in.
        </p>
      </div>
    `,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName, gender, dateOfBirth, gmailAddress, state, university,
      degreeStatus, nin, fieldOfStudy, expertiseLevel, targetLevel,
      hubTitle, hubDescription, hubDomain,
      passportPhotoUrl, degreeEvidenceUrl, studentEvidenceUrl,
    } = body;

    // Validate required fields
    const required = { fullName, gender, dateOfBirth, gmailAddress, state, university, degreeStatus, nin, fieldOfStudy, expertiseLevel, targetLevel, hubTitle };
    for (const [key, val] of Object.entries(required)) {
      if (!val?.trim()) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }

    // Hub name validation
    if (isInappropriateName(hubTitle)) {
      return NextResponse.json({ error: "Hub name contains inappropriate content. Please choose an educational name." }, { status: 400 });
    }
    if (isSuspiciousName(hubTitle)) {
      return NextResponse.json({ error: "Hub name is not suitable. Please use a clear, descriptive educational title." }, { status: 400 });
    }

    // Check for duplicate application from same user
    const existingApp = await db
      .select()
      .from(hubApplicationsTable)
      .where(eq(hubApplicationsTable.userId, session.userId))
      .limit(1);

    if (existingApp.length > 0) {
      return NextResponse.json({ error: "You already have a Learning Hub application. Each user can only create one hub." }, { status: 409 });
    }

    // Check for duplicate hub title
    const existingHub = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.title, hubTitle.trim()))
      .limit(1);

    if (existingHub.length > 0) {
      return NextResponse.json({ error: "A Learning Hub with this name already exists. Please choose a unique title." }, { status: 409 });
    }

    // Create the hub and access token
    const accessToken = uuidv4();
    const [hub] = await db
      .insert(learningHubsTable)
      .values({
        creatorId: session.userId,
        title: hubTitle.trim(),
        description: hubDescription?.trim() || null,
        domain: hubDomain || "general",
        accessCost: 50,
        agentCost: 200,
        isPublic: true,
        status: "active",
        accessToken,
      })
      .returning();

    // Record the application
    await db.insert(hubApplicationsTable).values({
      userId: session.userId,
      fullName: fullName.trim(),
      gender,
      dateOfBirth,
      gmailAddress: gmailAddress.trim().toLowerCase(),
      state,
      university,
      degreeStatus,
      nin: nin.trim(),
      fieldOfStudy,
      expertiseLevel,
      targetLevel,
      hubTitle: hubTitle.trim(),
      hubDescription: hubDescription?.trim() || null,
      hubDomain: hubDomain || "general",
      passportPhotoUrl: passportPhotoUrl || null,
      degreeEvidenceUrl: degreeEvidenceUrl || null,
      studentEvidenceUrl: studentEvidenceUrl || null,
      status: "pending",
      hubId: hub.id,
    });

    // Get user details for email
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    // Send access email — auto-detect origin from the incoming request
    const siteUrl = new URL(request.url).origin;
    try {
      await sendHubAccessEmail(
        user.email,
        user.firstName || fullName.split(" ")[0],
        hub.id,
        accessToken,
        siteUrl
      );
    } catch (emailErr) {
      console.error("Failed to send hub access email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      hubId: hub.id,
      accessToken,
      message: "Application submitted! Check your email for your dashboard link.",
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    let hub = null;

    if (token) {
      const [h] = await db
        .select()
        .from(learningHubsTable)
        .where(and(eq(learningHubsTable.accessToken, token), eq(learningHubsTable.creatorId, session.userId)))
        .limit(1);
      hub = h;
    } else {
      const [h] = await db
        .select()
        .from(learningHubsTable)
        .where(eq(learningHubsTable.creatorId, session.userId))
        .limit(1);
      hub = h;
    }

    if (!hub) {
      return NextResponse.json({ hub: null });
    }

    const [app] = await db
      .select()
      .from(hubApplicationsTable)
      .where(eq(hubApplicationsTable.userId, session.userId))
      .limit(1);

    return NextResponse.json({ hub, application: app || null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
