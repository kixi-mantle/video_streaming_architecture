
import { exec } from "child_process";
import path from "path";
import { fileURLToPath} from "url";
import { eq } from "drizzle-orm";
import util  from "util";
import client from "./redisConnection.js";
import { db } from "../src/index.js";
import { uploaded_vid } from "../dist/src/db/schema.js";
import { warn } from "console";


const execPromise = util.promisify(exec);
const __filename =fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootdir = path.join(__dirname , "..")



export async function transcodeToHLS(uploadId, fileInfo){

    const inputPath = path.join(rootdir , 'videos' ,`${uploadId}`);
    const outputDir = path.join(rootdir, 'hls' , `${fileInfo.id}`);

       return new Promise((resolve , reject) => {
           const cmd = `

           ffmpeg -i "${inputPath}" -progress pipe:1 -stats \ -filter_complex "
           [0:v]split=3[v0][v1][v2];
           [v0]scale=-2:720[v0out];
           [v1]scale=-2:480[v1out];
           [v2]scale=-2:360[v2out]
           " \
               -map "[v0out]" -map 0:a -c:v:0 libx264 -b:v:0 3000k -maxrate:v:0 3200k -bufsize:v:0 6000k -c:a:0 aac -ar 48000 -b:a:0 128k \
               -map "[v1out]" -map 0:a -c:v:1 libx264 -b:v:1 1500k -maxrate:v:1 1600k -bufsize:v:1 3000k -c:a:1 aac -ar 48000 -b:a:1 128k \
               -map "[v2out]" -map 0:a -c:v:2 libx264 -b:v:2 800k  -maxrate:v:2 900k  -bufsize:v:2 1800k -c:a:2 aac -ar 48000 -b:a:2 96k \
               -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
               -preset veryfast -g 48 -sc_threshold 0 \
               -hls_time 10 -hls_list_size 0 -hls_segment_filename "${outputDir}/out_%v/segment_%03d.ts" \
               -master_pl_name master.m3u8 \
           "${outputDir}/out_%v/prog_index.m3u8" 
           `;


            const process = exec(cmd);
           let stdoutBuffer = '';
           let lastProgressUpdate = 0 ;

           process.stdout.on('data' , async(chunk)=>{
               stdoutBuffer += chunk.toString();
               const lines = stdoutBuffer.split('\n');
               stdoutBuffer = lines.pop()

               const progressData = {};
               lines.forEach(line => {
                const [key , val] = line.split('=');
                   if(key && val) progressData[key.trim()] = val.trim()
               });

               if(progressData.out_time_ms) {
                   const outTimeSeconds = parseInt(progressData.out_time_ms, 10)/1000000
                const rawPercent = (outTimeSeconds / fileInfo.duration) * 100;
                const progressPercent = Math.min(100, Math.round(rawPercent));
                   
                   if(progressPercent- lastProgressUpdate > 5){
                       lastProgressUpdate = progressPercent;
                       await client.set(`video:${fileInfo.id}` , progressPercent)
                        await client.publish(`video:${fileInfo.id}:updates` , JSON.stringify({
        videoId: fileInfo.id,
        progress: progressPercent
    }))
                   }
               }
           })

           process.on('close' , async(code) =>{
               if(code === 0) {

                       await client.set(`video:${fileInfo.id}` , 100)
                                        
                        await client.publish(`video:${fileInfo.id}:updates` , JSON.stringify({
        videoId: fileInfo.id,
        progress: 100,
    }))
                   await db.update(uploaded_vid).set({status : "completed"}).where(eq(uploaded_vid.id , fileInfo.id));
                    
                 await client.del(`video:${fileInfo.id}`)
                   resolve();
               } else{
                   reject(new Error(`ffmpeg exited with code ${code}`))
               }
           })

    }) 
}

export async function getVideoDuration(filePath){

    try{
        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}" `
        )
        return parseFloat(stdout);
    } catch (error) {
        console.error('Error getting video duration: ', error);
        throw error;
    }
}
