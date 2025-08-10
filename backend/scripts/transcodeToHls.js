
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises"
import { fileURLToPath} from "url";


const __filename =fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootdir = path.join(__dirname , "..")


export async function transcodeToHLS(uploadId){

    const inputPath = path.join(rootdir , 'videos' ,`${uploadId}`);
    const outputDir = path.join(rootdir, 'hls' , uploadId);


    const cmd = `
   
ffmpeg -i "${inputPath}" -filter_complex "
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

    return new Promise((resolve , reject) => {
        exec(cmd , (err , stdout , stderr) => {

            if(err){
                console.error("FFmpeg error:", stderr);
                return reject(err)
            }
            console.log("Transcoding done for" , uploadId)
            resolve()
        })
    }) 
}


