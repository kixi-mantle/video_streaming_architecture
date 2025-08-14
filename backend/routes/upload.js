import express from "express";
import  {db} from '../src/index.js'
import fs   from "fs"
import { eq, sql } from "drizzle-orm";
import path, { dirname } from "path"
import { fileURLToPath } from 'url'
import { uploads , uploaded_vid } from "../dist/src/db/schema.js";
import { getVideoDuration, transcodeToHLS } from "../scripts/transcodeToHls.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
const upload_dir = path.join(__dirname, '..' , 'uploads')
const final_dir = path.join(__dirname , '..' ,'videos')


router.post('/init' , async(req, res)=> {
    const {filename , totalChunks , new_name} = req.body 
    const result = await db
    .insert(uploads)
    .values({ original_filename : filename , total_chunks : totalChunks  })
    .returning()

    const uploadId = result[0].id  
    fs.mkdirSync(path.join(upload_dir , uploadId))
    res.json({uploadId})
})

router.post('/:uploadId/finalize' , async(req, res)=>{

    const {uploadId} = req.params

    const result = await db.select().from(uploads).where(eq(uploads.id , uploadId))
    const upload = result[0]

    if(!upload || upload.received_chunks !== upload.total_chunks) {
        return res.status(400).json({error : 'Upload incomplete'})
    }
    
    const filename = `${uploadId}-${upload.original_filename}`
    const dirPath = path.join(upload_dir , uploadId)
    const finalPath = path.join(final_dir , filename)
    const writeStream = fs.createWriteStream(finalPath)


    for (let i = 0 ; i < upload.total_chunks; i++) {
        const chunkPath = path.join(dirPath , `${i}`)
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data)
    }

    writeStream.end()
    
    writeStream.on('finish' , async()=> {
        const stats = fs.statSync(finalPath)
        await db 
        .update(uploads)
        .set({
            status : 'complete',
            size : stats.size,
            updated_at : new Date()
        })
         .where(eq(uploads.id , uploadId))
        const duration = await getVideoDuration(finalPath)
       const uploaded_result =  await db
        .insert(uploaded_vid)
        .values({
            name : upload.original_filename ,
            duration : Number(duration), 
        }).returning()
        fs.rm(dirPath , {recursive : true , force : true} , (err)=>{
            if (err) throw err

        })
        transcodeToHLS(filename,uploaded_result[0])
        res.json({message : 'upload complete'})
    })

})

router.post('/:uploadId/:chunkIndex' , (req ,res)=> {
    const {uploadId , chunkIndex} =req.params

    const dirPath = path.join(upload_dir , uploadId)
    const chunkPath = path.join(dirPath , `${chunkIndex}`)
    const writeStream = fs.createWriteStream(chunkPath)

    req.pipe(writeStream)

    writeStream.on('finish' , async()=>{

        await db
        .update(uploads)
        .set({ updated_at : new Date(),
       received_chunks : sql`${uploads.received_chunks} + 1` 
        })
        .where(eq(uploads.id , uploadId))
        res.sendStatus(200)

        writeStream.on('error' , () => {
            res.sendStatus(500);
        })
    })

})

export default router 
