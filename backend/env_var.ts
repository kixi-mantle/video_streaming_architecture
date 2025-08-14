import "dotenv/config"
import  {createEnv} from "@t3-oss/env-core"
import {z} from "zod"



export const env = createEnv({
    server : {
        POSTGRES_STRING  : z.string(),
        REDIS_PASS : z.string(),
        
    },
    runtimeEnv : process.env
    
})
