import { db } from "@/config/db.js";
import { sql } from "drizzle-orm";

async function dropAllTables() {
  console.log("💣 Dropping all database tables and custom enums...");
  try {
    await db.execute(sql`
      -- Drop all tables with CASCADE
      DROP TABLE IF EXISTS "tasks" CASCADE;
      DROP TABLE IF EXISTS "project_members" CASCADE;
      DROP TABLE IF EXISTS "projects" CASCADE;
      DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
      DROP TABLE IF EXISTS "profiles" CASCADE;
      DROP TABLE IF EXISTS "users" CASCADE;

      -- Drop Drizzle migration journal table if present
      DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;

      -- Drop custom enum types
      DROP TYPE IF EXISTS "project_role" CASCADE;
      DROP TYPE IF EXISTS "task_priority" CASCADE;
      DROP TYPE IF EXISTS "task_status" CASCADE;
    `);

    console.log("✅ All tables and enum types have been dropped completely! Database is blank.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error dropping tables:", error.message);
    process.exit(1);
  }
}

dropAllTables();
