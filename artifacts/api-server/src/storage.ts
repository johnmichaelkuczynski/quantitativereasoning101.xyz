import { db, usersTable, visitsTable } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";

export type AuthUser = typeof usersTable.$inferSelect;

export const storage = {
  async getUserById(id: number): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return user;
  },

  async getUserByGoogleId(googleId: string): Promise<AuthUser | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId))
      .limit(1);
    return user;
  },

  async getUserByEmail(email: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return user;
  },

  async createUserWithGoogle(data: {
    username: string;
    googleId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<AuthUser> {
    const [user] = await db
      .insert(usersTable)
      .values({
        username: data.username,
        googleId: data.googleId,
        email: data.email,
        displayName: data.displayName,
      })
      .returning();
    return user;
  },

  async updateUserGoogle(
    id: number,
    data: { googleId?: string; displayName?: string | null },
  ): Promise<AuthUser> {
    const [user] = await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();
    return user;
  },

  async recordVisit(userId: number, email: string | null): Promise<void> {
    await db.insert(visitsTable).values({ userId, email });
  },

  async getVisits(limit: number): Promise<{ id: number; email: string | null; visitedAt: Date }[]> {
    return db
      .select({
        id: visitsTable.id,
        email: visitsTable.email,
        visitedAt: visitsTable.visitedAt,
      })
      .from(visitsTable)
      .orderBy(desc(visitsTable.visitedAt))
      .limit(limit);
  },

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    const rows = since
      ? await db
          .select({ visitedAt: visitsTable.visitedAt })
          .from(visitsTable)
          .where(gte(visitsTable.visitedAt, since))
      : await db.select({ visitedAt: visitsTable.visitedAt }).from(visitsTable);
    return rows.map((r) => r.visitedAt);
  },
};
