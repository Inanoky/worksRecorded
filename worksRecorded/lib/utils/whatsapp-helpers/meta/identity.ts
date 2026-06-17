import { prisma } from "@/lib/utils/db";
import { normalizeMetaPhone } from "@/lib/utils/whatsapp-helpers/meta/sender";

const prismaAny = prisma as any;

export type MetaWebhookIdentity = {
  phone: string | null;
  waId: string | null;
  bsuid: string | null;
  parentBsuid: string | null;
  username: string | null;
  businessPhoneNumberId: string;
  wabaId: string | null;
};

export type ResolvedWhatsAppIdentity = {
  identity: any | null;
  user: any | null;
  worker: any | null;
  webhookIdentity: MetaWebhookIdentity;
  identityKey: string | null;
  replyTarget: string | null;
  fromForHandlers: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return null;
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))] as NonNullable<T>[];
}

function replyPhoneFrom(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const phone = normalizeMetaPhone(value);
    if (phone) return phone;
  }
  return null;
}

export function phoneLookupValues(phone: string | null | undefined) {
  const digits = normalizeMetaPhone(phone);
  if (!digits) return [];
  return unique([digits, `+${digits}`, `whatsapp:+${digits}`, `whatsapp:${digits}`]);
}

export function extractMetaWebhookIdentity(args: {
  value: any;
  message?: any;
  businessPhoneNumberId: string;
}): MetaWebhookIdentity {
  const contact = Array.isArray(args.value?.contacts) ? args.value.contacts[0] : null;
  const messageContact = Array.isArray(args.message?.contacts) ? args.message.contacts[0] : null;
  const sharedPhone = Array.isArray(messageContact?.phones)
    ? firstString(messageContact.phones[0]?.wa_id, messageContact.phones[0]?.phone)
    : null;

  const phone = normalizeMetaPhone(
    firstString(args.message?.from, contact?.wa_id, sharedPhone)
  );

  return {
    phone,
    waId: normalizeMetaPhone(firstString(contact?.wa_id, args.message?.from, sharedPhone)),
    bsuid: firstString(args.message?.from_user_id, contact?.user_id),
    parentBsuid: firstString(args.message?.from_parent_user_id, contact?.parent_user_id),
    username: firstString(contact?.profile?.username),
    businessPhoneNumberId: args.businessPhoneNumberId,
    wabaId: asString(args.value?.metadata?.waba_id) || null,
  };
}

async function findExistingIdentity(identity: MetaWebhookIdentity) {
  const OR: Record<string, unknown>[] = [];

  if (identity.parentBsuid) {
    OR.push({
      businessPhoneNumberId: identity.businessPhoneNumberId,
      parentBsuid: identity.parentBsuid,
    });
  }

  if (identity.bsuid) {
    OR.push({
      businessPhoneNumberId: identity.businessPhoneNumberId,
      bsuid: identity.bsuid,
    });
  }

  if (identity.phone) {
    OR.push({
      businessPhoneNumberId: identity.businessPhoneNumberId,
      phone: identity.phone,
    });
  }

  if (!OR.length || !prismaAny.whatsAppIdentity) return null;

  return prismaAny.whatsAppIdentity.findFirst({
    where: { OR },
    include: {
      user: { include: { organization: { include: { sites: true } } } },
      worker: true,
    },
  });
}

async function findWorkerByPhone(phone: string | null) {
  const values = phoneLookupValues(phone);
  if (!values.length) return null;
  return prisma.workers.findFirst({
    where: { OR: values.map((value) => ({ phone: value })) },
  });
}

async function findUserByPhone(phone: string | null) {
  const values = phoneLookupValues(phone);
  if (!values.length) return null;
  return prisma.user.findFirst({
    where: { OR: values.map((value) => ({ phone: value })) },
    include: {
      organization: {
        include: {
          sites: true,
        },
      },
    },
  });
}

function identityData(identity: MetaWebhookIdentity, links?: { userId?: string | null; workerId?: string | null }) {
  return {
    provider: "meta",
    phone: identity.phone,
    waId: identity.waId,
    bsuid: identity.bsuid,
    parentBsuid: identity.parentBsuid,
    username: identity.username,
    businessPhoneNumberId: identity.businessPhoneNumberId,
    wabaId: identity.wabaId,
    status: links?.userId || links?.workerId ? "active" : "pending",
    userId: links?.userId || null,
    workerId: links?.workerId || null,
  };
}

async function upsertIdentity(identity: MetaWebhookIdentity, links?: { userId?: string | null; workerId?: string | null }) {
  if (!prismaAny.whatsAppIdentity) return null;

  const existing = await findExistingIdentity(identity);
  const data = identityData(identity, links);

  if (existing) {
    return prismaAny.whatsAppIdentity.update({
      where: { id: existing.id },
      data: {
        provider: data.provider,
        phone: data.phone || existing.phone,
        waId: data.waId || existing.waId,
        bsuid: data.bsuid || existing.bsuid,
        parentBsuid: data.parentBsuid || existing.parentBsuid,
        username: data.username || existing.username,
        businessPhoneNumberId: data.businessPhoneNumberId || existing.businessPhoneNumberId,
        wabaId: data.wabaId || existing.wabaId,
        userId: links?.userId ?? existing.userId,
        workerId: links?.workerId ?? existing.workerId,
        status: links?.userId || links?.workerId || existing.userId || existing.workerId ? "active" : "pending",
      },
      include: {
        user: { include: { organization: { include: { sites: true } } } },
        worker: true,
      },
    });
  }

  return prismaAny.whatsAppIdentity.create({
    data,
    include: {
      user: { include: { organization: { include: { sites: true } } } },
      worker: true,
    },
  });
}

export async function resolveMetaWhatsAppIdentity(identity: MetaWebhookIdentity): Promise<ResolvedWhatsAppIdentity> {
  const existing = await findExistingIdentity(identity);
  let user = existing?.user || null;
  let worker = existing?.worker || null;
  let storedIdentity = existing;

  if (!user && !worker && identity.phone) {
    worker = await findWorkerByPhone(identity.phone);
    if (!worker) user = await findUserByPhone(identity.phone);
  }

  if (identity.bsuid || identity.parentBsuid || existing) {
    storedIdentity = await upsertIdentity(identity, {
      userId: user?.id || existing?.userId || null,
      workerId: worker?.id || existing?.workerId || null,
    });
    user = storedIdentity?.user || user;
    worker = storedIdentity?.worker || worker;
  }

  const replyPhone = replyPhoneFrom(
    identity.phone,
    storedIdentity?.phone,
    storedIdentity?.waId,
    user?.phone,
    worker?.phone
  );
  const identityKey = identity.parentBsuid || identity.bsuid || replyPhone;
  const replyTarget = replyPhone || identity.parentBsuid || identity.bsuid;
  const fromForHandlers = replyPhone
    ? `whatsapp:+${replyPhone}`
    : identity.parentBsuid || identity.bsuid || null;

  return {
    identity: storedIdentity,
    user,
    worker,
    webhookIdentity: identity,
    identityKey,
    replyTarget,
    fromForHandlers,
  };
}

export async function applyMetaUserIdUpdate(args: {
  businessPhoneNumberId: string;
  previousBsuid?: string | null;
  currentBsuid?: string | null;
  previousParentBsuid?: string | null;
  currentParentBsuid?: string | null;
  phone?: string | null;
}) {
  if (!prismaAny.whatsAppIdentity) return;
  const previousBsuid = asString(args.previousBsuid);
  const currentBsuid = asString(args.currentBsuid);
  const previousParentBsuid = asString(args.previousParentBsuid);
  const currentParentBsuid = asString(args.currentParentBsuid);
  const previousClauses = [
    previousBsuid ? { bsuid: previousBsuid } : undefined,
    previousParentBsuid ? { parentBsuid: previousParentBsuid } : undefined,
  ].filter(Boolean);

  if (!previousClauses.length) return;

  const existing = await prismaAny.whatsAppIdentity.findFirst({
    where: {
      businessPhoneNumberId: args.businessPhoneNumberId,
      OR: previousClauses,
    },
  });

  if (!existing) return;

  await prismaAny.whatsAppIdentity.update({
    where: { id: existing.id },
    data: {
      bsuid: currentBsuid || existing.bsuid,
      parentBsuid: currentParentBsuid || existing.parentBsuid,
      phone: normalizeMetaPhone(args.phone) || existing.phone,
    },
  });
}
