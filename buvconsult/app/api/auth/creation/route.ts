import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/db";

export async function GET() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    throw new Error("Something went wrong");
  }

  let createdNewUser = false;

  // If user doesn't exist by ID, check for a pending record by email
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    const pending = await prisma.user.findFirst({
      where: {
        email: user.email ?? "",
        status: "pending",
      },
      select: { id: true, organizationId: true },
    });

    if (pending) {
      // Replace pending record with the authenticated user id
      dbUser = await prisma.$transaction(async (tx) => {
        // capture org from pending, or create if missing
        let orgId = pending.organizationId;
        if (!orgId) {
          const org = await tx.organization.create({
            data: { name: user.email ?? "" },
            select: { id: true },
          });
          orgId = org.id;
        }

        // delete pending user
        await tx.user.delete({ where: { id: pending.id } });

        // create active user with correct id
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

        return created;
      });
    } else {
      // proceed as normal (no pending by email) -> create org + user
      const organization = await prisma.organization.create({
        data: { name: user.email ?? "" },
        select: { id: true },
      });

      dbUser = await prisma.user.create({
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

      createdNewUser = true;
    }
  }

  const base =
    process.env.NODE_ENV === "production"
      ? "https://buvconsult.com"
      : "http://localhost:3000";

  const path = createdNewUser ? "/dashboard/welcome" : "/dashboard";
  return NextResponse.redirect(`${base}${path}`);
}
