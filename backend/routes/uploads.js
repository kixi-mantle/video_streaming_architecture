import express from "express";
import { uploaded_vid } from "../dist/src/db/schema.js"
import { db } from "../src/index.js";


const router = express.Router()

router.get("/" , async(req , res)=> {
  const videos = await db.select().from(uploaded_vid);

const plainVideos = videos.map(video => ({
  id: video.id.toString(),  // convert UUID to string
  name: video.name,
  status: video.status
}));
    res.json({data : plainVideos})
})

export default router
