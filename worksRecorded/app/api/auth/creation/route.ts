import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { ensureTgemAccessDefaults } from "@/lib/tgem-invoice-approval/access";
import { prisma } from "@/lib/utils/db";

export async function GET() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  console.log("➡️ Authenticated user from Kinde:", user);

  if (!user || !user.id) {
    console.error("❌ No user returned from Kinde.");
    throw new Error("Something went wrong");
  }

  let createdNewUser = false;
  console.log("🔍 Checking if user exists in DB by ID...");
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    console.log("ℹ️ No existing user by ID. Checking for pending user by email...");

    const pending = await prisma.user.findFirst({
      where: {
        email: user.email ?? "",
        status: "pending",
      },
      select: { id: true, organizationId: true },
    });

    if (pending) {
      console.log("🟠 Found pending user:", pending);

      dbUser = await prisma.$transaction(async (tx) => {
        let orgId = pending.organizationId;

        if (!orgId) {
          console.log("🏗️ Pending record has no organization — creating new one...");
          const org = await tx.organization.create({
            data: { name: user.email ?? "" },
            select: { id: true },
          });
          orgId = org.id;
        }

        console.log("🗑️ Deleting pending user record:", pending.id);
        await tx.user.delete({ where: { id: pending.id } });

        console.log("🧱 Creating active user from pending record...");
        const created = await tx.user.create({
          data: {
            id: user.id,
            email: user.email ?? "",
            firstName: user.given_name ?? "",
            lastName: user.family_name ?? "",
            organizationId: orgId,
            profileImage:
              user.picture ?? `https://avatar.vercel.sh/rauchg${user.given_name}`,
            status: "active",
          },
        });

        await ensureTgemAccessDefaults(tx, {
          organizationId: orgId,
          actorUserId: created.id,
          userIds: [created.id],
        });

        return created;
      });

      console.log("✅ Pending user migrated to active user:", dbUser.id);
    } else {
      console.log("🆕 No pending user. Creating brand new org + user...");

      dbUser = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: user.email ?? "" },
          select: { id: true },
        });

        console.log("🏗️ New organization created:", organization.id);

        const created = await tx.user.create({
          data: {
            id: user.id,
            firstName: user.given_name ?? "",
            lastName: user.family_name ?? "",
            email: user.email ?? "",
            organizationId: organization.id,
            profileImage:
              user.picture ?? `https://avatar.vercel.sh/rauchg${user.given_name}`,
            status: "active",
          },
        });

        await ensureTgemAccessDefaults(tx, {
          organizationId: organization.id,
          actorUserId: created.id,
          userIds: [created.id],
        });

        return created;
      });

      console.log("🎉 New user created:", dbUser.id);
      createdNewUser = true;
    }
  } else {
    console.log("✅ User already exists in DB:", dbUser.id);
  }

  const base =
    process.env.NODE_ENV === "production"
      ? "https://worksrecorded.com"
      : "http://localhost:3000";

  const path = createdNewUser ? "/dashboard/welcome" : "/dashboard";

  console.log("🔀 Redirecting to:", `${base}${path}`);

  return NextResponse.redirect(`${base}${path}`);
}
