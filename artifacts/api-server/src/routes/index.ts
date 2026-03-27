import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai/index";
import agentRouter from "./agent/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/agent", agentRouter);

export default router;
