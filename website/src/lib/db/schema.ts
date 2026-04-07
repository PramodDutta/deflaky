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
export const planEnum = pgEnum("plan", ["free", "solo", "team"]);
export const testStatusEnum = pgEnum("test_status", ["pass", "fail", "skip"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  plan: planEnum("plan").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
