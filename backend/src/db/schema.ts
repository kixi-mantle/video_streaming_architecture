import { pgTable , uuid , text , integer , timestamp, numeric  } from "drizzle-orm/pg-core";


const recievetype = ["uploading", "processing", "complete" , "failed"] as const

export type status = typeof recievetype[number]  

export const uploads = pgTable("uploads" , {
    id :uuid("id").primaryKey().defaultRandom(),
    original_filename: text("original_filename").notNull(),
  total_chunks: integer("total_chunks").notNull(),
  received_chunks: integer("received_chunks").default(0),
  size: integer("size"), // Store bytes
  status: text("status", {
    enum: ["uploading", "processing", "complete", "failed"],
  }).default("uploading"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})


export const uploaded_vid = pgTable("uploaded_vid" , {
    id : uuid("id").primaryKey().defaultRandom(),
    name : text().notNull(),
    status : text("status" , {
        enum : ["processing", "completed"  , "failed"],
    }).default("processing"),
 duration : numeric().notNull()
})

