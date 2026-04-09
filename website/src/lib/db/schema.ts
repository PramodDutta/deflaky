import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const planEnum = pgEnum("plan", ["free", "pro", "solo", "team"]);
export const testStatusEnum = pgEnum("test_status", ["pass", "fail", "skip"]);
export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "member", "viewer"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  plan: planEnum("plan").default("free").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team members junction table
export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: teamRoleEnum("role").default("member").notNull(),
  invitedBy: uuid("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  apiToken: varchar("api_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test runs table
export const testRuns = pgTable("test_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  command: text("command").notNull(),
  iterations: integer("iterations").notNull(),
  totalTests: integer("total_tests").notNull(),
  flakeScore: decimal("flake_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test results table
export const testResults = pgTable("test_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  testRunId: uuid("test_run_id")
    .notNull()
    .references(() => testRuns.id, { onDelete: "cascade" }),
  testName: varchar("test_name", { length: 500 }).notNull(),
  filePath: text("file_path"),
  status: testStatusEnum("status").notNull(),
  durationMs: integer("duration_ms"),
  runIndex: integer("run_index").notNull(),
});
