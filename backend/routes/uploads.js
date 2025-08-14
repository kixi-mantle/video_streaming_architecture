import express from "express";
import { uploaded_vid } from "../dist/src/db/schema.js"


const router = express.Router()

router.get("/" , (req , res)=> {
  const uploaded_videos = db.select().from(uploaded_vid);

    res.json({data : uploaded_videos})
})

export default router
