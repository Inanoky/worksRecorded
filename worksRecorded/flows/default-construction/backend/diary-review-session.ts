import "server-only";
import type { AgentInputItem, Session } from "@openai/agents";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";

export class DiaryReviewSession implements Session {
  private items: AgentInputItem[] = [];
  private loaded = false;

  constructor(
    private readonly runId: string,
    private readonly leaseToken: string,
  ) {}

  async getSessionId() {
    return `construction-diary-review:${this.runId}`;
  }

  async getItems(limit?: number) {
    await this.load();
    return limit === undefined
      ? [...this.items]
      : limit <= 0
        ? []
        : this.items.slice(-limit);
  }

  private async load() {
    if (this.loaded) return;
    const row = await prisma.constructionDiaryReviewRun.findFirst({
      where: { id: this.runId, leaseToken: this.leaseToken, status: "running" },
      select: { sessionItems: true },
    });
    if (!row) throw new Error("REVIEW_SESSION_LEASE_LOST");
    this.items = Array.isArray(row.sessionItems)
      ? (row.sessionItems as AgentInputItem[])
      : [];
    this.loaded = true;
  }

  private async persist(items: AgentInputItem[]) {
    const changed = await prisma.constructionDiaryReviewRun.updateMany({
      where: { id: this.runId, leaseToken: this.leaseToken, status: "running" },
      data: {
        sessionItems: JSON.parse(
          JSON.stringify(items),
        ) as Prisma.InputJsonValue,
      },
    });
    if (changed.count !== 1) throw new Error("REVIEW_SESSION_LEASE_LOST");
    this.items = items;
  }

  async addItems(items: AgentInputItem[]) {
    await this.load();
    await this.persist([...this.items, ...items]);
  }
  async popItem() {
    await this.load();
    const item = this.items.at(-1);
    await this.persist(this.items.slice(0, -1));
    return item;
  }
  async clearSession() {
    await this.persist([]);
  }
}
