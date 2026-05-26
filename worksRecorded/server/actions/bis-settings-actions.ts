"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
  deleteUserBisTokens,
  exchangeBisAuthorizationCode,
  fetchBisCaseConstructionRounds,
  getSiteBisConfig,
  getUserBisTokenByUserId,
  setSiteBisConfig,
  setSiteBisConstructionRound,
  upsertUserBisToken,
} from "@/server/actions/BIS/service";

export async function disconnectBisAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const user = await requireUser();
  await deleteUserBisTokens(user.id);

  if (siteId) {
    await orgCheck(user.id, siteId);
    await setSiteBisConfig(siteId, {
      bisCaseId: null,
      bisCaseNumber: null,
      bisCaseName: null,
      bisCaseStage: null,
      bisConstructionRoundId: null,
      bisConstructionRoundName: null,
      bisConstructionRoundNumber: null,
      bisConstructionRoundStatus: null,
    });
    revalidatePath(`/dashboard/sites/${siteId}/settings`);
    revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
    revalidatePath(`/dashboard/sites/${siteId}/BIS`);
    redirect(`/dashboard/sites/${siteId}/settings?bis=disconnected`);
  }

  redirect("/dashboard/settings?bis=disconnected");
}

export async function assignBisCaseToSiteAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const bisCaseId = String(formData.get("bisCaseId") ?? "");
  const bisCaseNumber = String(formData.get("bisCaseNumber") ?? "");
  const bisCaseName = String(formData.get("bisCaseName") ?? "");
  const bisCaseStage = String(formData.get("bisCaseStage") ?? "");

  if (!siteId || !bisCaseId) {
    throw new Error("Missing BIS case selection");
  }

  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const [site, token] = await Promise.all([
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
  ]);

  if (!token) {
    throw new Error("Connect BIS before assigning a case");
  }

  if (site?.bisCaseId) {
    throw new Error("BIS case has already been selected for this site");
  }

  await setSiteBisConfig(siteId, {
    bisCaseId,
    bisCaseNumber: bisCaseNumber || null,
    bisCaseName: bisCaseName || null,
    bisCaseStage: bisCaseStage || null,
    bisConstructionRoundId: null,
    bisConstructionRoundName: null,
    bisConstructionRoundNumber: null,
    bisConstructionRoundStatus: null,
  });

  revalidatePath(`/dashboard/sites/${siteId}/settings`);
  revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  redirect(`/dashboard/sites/${siteId}/settings?bis=case-selected`);
}

export async function setBisConstructionRoundForSiteAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const roundId = String(formData.get("bisConstructionRoundId") ?? "");

  if (!siteId) {
    throw new Error("Missing site id");
  }

  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const [site, token] = await Promise.all([
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
  ]);

  if (!token?.accessToken) {
    throw new Error("Connect BIS before selecting a construction round");
  }

  if (!site?.bisCaseId) {
    throw new Error("Select a BIS case before selecting a construction round");
  }

  if (!roundId) {
    await setSiteBisConstructionRound(siteId, {
      id: null,
      name: null,
      roundNumber: null,
      status: null,
    });
  } else {
    const rounds = await fetchBisCaseConstructionRounds(token.accessToken, site.bisCaseId);
    const selectedRound = rounds.find((round) => round.id === roundId);

    if (!selectedRound) {
      throw new Error("Selected construction round is not available in this BIS case");
    }

    await setSiteBisConstructionRound(siteId, selectedRound);
  }

  revalidatePath(`/dashboard/sites/${siteId}/settings`);
  revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  redirect(`/dashboard/sites/${siteId}/settings?bis=round-selected`);
}

export async function completeBisManualAuthorizationAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const manualAuthorizationCode = String(formData.get("authorizationCode") ?? "").trim();
  const user = await requireUser();

  if (!siteId) {
    throw new Error("Missing site id");
  }

  await orgCheck(user.id, siteId);

  const authorizationCode = manualAuthorizationCode || process.env.BIS_AUTHORIZATION_CODE;

  if (!authorizationCode) {
    throw new Error("Missing authorization code. Paste one manually or set BIS_AUTHORIZATION_CODE in environment");
  }

  const tokens = await exchangeBisAuthorizationCode(authorizationCode);
  await upsertUserBisToken(user.id, tokens.access_token, tokens.refresh_token);

  revalidatePath(`/dashboard/sites/${siteId}/settings`);
  revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  redirect(`/dashboard/sites/${siteId}/settings?bis=connected`);
}
