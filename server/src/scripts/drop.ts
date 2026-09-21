import { db } from "@/config/db.js";
import { sql } from "drizzle-orm";

async function clearData() {
  console.log("🧹 Clearing all table data (Truncate)...");
  try {
    // Truncate in cascade order to clear all rows while keeping table structures intact
    await db.execute(sql`
      TRUNCATE TABLE 
        tasks, 
        project_members, 
        projects, 
        refresh_tokens, 
        profiles, 
        users 
      RESTART IDENTITY CASCADE;
    `);
    console.log("✅ All tables cleared successfully! The database is clean and ready for seeding.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error clearing data:", error.message);
    process.exit(1);
  }
}

clearData();
