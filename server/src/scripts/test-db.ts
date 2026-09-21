import { db } from "@/config/db.js";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT NOW() as current_time;`);
    console.log("✅ Supabase PostgreSQL Connected Successfully!");
    console.log("🕒 Database Server Time:", result[0]?.current_time);
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Database Connection Error:", error.message);
    process.exit(1);
  }
}

testConnection();
