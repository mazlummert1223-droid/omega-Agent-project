import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import agentRouter from "./agent/index";
import videoRouter from "./video";
import searchRouter from "./search";
import ltxRouter from "./ltx";
import securityRouter from "./security";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/agent", agentRouter);
router.use("/video", videoRouter);
router.use("/search", searchRouter);
router.use("/ltx", ltxRouter);
router.use("/security", securityRouter);
router.use("/files", filesRouter);

export default router;
