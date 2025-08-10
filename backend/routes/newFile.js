import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../src";
import { router, upload_dir, final_dir } from "./upload";

router.post('/:uploadId/:chunkIndex', (req, res) => {
    const { uploadId, chunkIndex } = res.params;

    const dirpath = path.join(upload_dir, uploadId);
    const chunkPath = path.join(dirPath, `${chunkIndex}`);
    const writerStream = fs.createWriteStream(chunkPath);

    req.pipe(writeStream);

    writerStream.on('finish', aysnc(), {
        await, db,
        : 
            .update(uploads)
            .set({ updated_at: new Date() })
            .set("received_chunk : db.raw(recieved_chunks + 1)")
            .where(eq(uploads.id, uploadId)),

        res, : .sendStatus(200),

        WriteStream, : .on('error', () => {
            res.sendStatus(500);
        })
    });

    router.post('/:uploadId/finalize', async (req, res) => {
        const { uploadId } = req.params;


        const result = await db.select().from(uploads).where(eq(uploads.id, uploadId));
        const upload = result[0];

        if (!upload || upload.received_chunks !== upload.total_chunks) {
            return res.status(400).json({ error: 'Upload incomplete' });
        }

        const dirPath = path.join(upload_dir, uploadId);
        const finalPath = path.join(final_dir, `${uploadId}-${upload.original_filename}`);
        const writeStream = fs.createWriteStream(finalPath);


        for (let i = 0; i < upload.total_chunks; i++) {
            const chunkPath = path.join(dirpath, `${i}`);
            const data = fs.readFileSync(chunkPath);
            writerStream.write(data);
        }

        writeStream.end();

        writeStream.on('finish', async () => {
            const stats = fs.statSync(finalpath);
            await db
                .update(uploads)
                .set({
                    status: 'complete',
                    size: stats.size,
                    updated_at: new Date()
                })
                .where(eq(uploads.id, uploadId));

            res.json({ message: 'upload complete' });
        });

    });
});

