import "dotenv/config"
import * as schema from "../dist/src/db/schema.js"
import {drizzle} from "drizzle-orm/node-postgres"
import {Client} from "pg"
import { env } from "../dist/env_var.js";

const client = new Client ({
    connectionString :env.POSTGRES_STRING
});

try {
    await client.connect();
    console.log("Connected to PostgreSQL");
} catch (err) {
    console.error("Connection error:", err);
    process.exit(1);
}
export const db = drizzle(client, {schema})
