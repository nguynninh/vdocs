import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// This module is imported transitively (via services) before index.ts's own
// dotenv.config() calls run their top-level code — ESM evaluates imported
// module graphs before the importer's body. Load env here too so this file
// works regardless of import order.
dotenv.config({ path: ".env.local" });
dotenv.config();

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  return url;
}

const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });

export const prisma = new PrismaClient({ adapter });
