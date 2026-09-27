import express, { Application, Request, Response } from "express";
import cors from "cors";
import bookmarkRoutes from "./routes/bookmark.routes";

const app: Application = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Express Bookmark API is running smoothly!",
  });
});

app.use("/api/bookmarks", bookmarkRoutes);

export default app;
