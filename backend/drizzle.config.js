
import "dotenv/config"
import { defineConfig } from "drizzle-kit";
import { env } from "./dist/env_var.js";


export default  defineConfig({
    schema : "src/db/schema.ts",
    out : "./drizzle",
    dialect : "postgresql",
    dbCredentials : {
       url : env.POSTGRES_STRING  
    }
})

