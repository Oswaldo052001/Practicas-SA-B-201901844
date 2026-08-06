import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/authRoutes";
import recursoRoutes from "./routes/recursoRoutes";

dotenv.config();

const app = express();
const PUERTO = process.env.PORT || 3002;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api", recursoRoutes);

app.listen(PUERTO, () => {
  console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
});