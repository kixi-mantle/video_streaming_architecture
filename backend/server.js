import { fileURLToPath } from "url";
import uploadRoutes from "./routes/upload.js"
import express from 'express';
import path from "path";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express();


app.use(express.json())
app.use(express.static(path.join(__dirname ,"..", "frontend")))
app.use('/upload' , uploadRoutes)
app.listen(3000, () => console.log('Server started on port 3000'));
