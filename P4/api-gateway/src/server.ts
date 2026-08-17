import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import gatewayRoutes from "./routes/gatewayRoutes";

const app = express();

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

app.use("/", gatewayRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ estado: "activo", servicio: "api-gateway" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`api-gateway escuchando en el puerto ${PORT}`);
});
