import { Router, type IRouter } from "express";
import { getSecurityStats } from "../middleware/security";

const router: IRouter = Router();

router.get("/stats", (_req, res) => {
  res.json(getSecurityStats());
});

export default router;
