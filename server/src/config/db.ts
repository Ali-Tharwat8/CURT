import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("❌ DATABASE_URL is not defined in .env file");
}

import * as schema from "@/db/schema.js";

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

console.log("📦 Supabase Database client initialized")