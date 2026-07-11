import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  googleId: text("google_id").unique(),
  email: text("email").unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  email: text("email"),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
});
