import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import agentRouter from "./agent/index";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/agent", agentRouter);
router.use("/video", videoRouter);

export default router;
