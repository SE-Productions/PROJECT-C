import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";

const fullSchema = { ...schema };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    instance = drizzle(env.databaseUrl, {
      schema: fullSchema,
    });
  }
  return instance;
}
