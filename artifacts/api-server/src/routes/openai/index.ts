import { Router, type IRouter } from "express";
import conversationsRouter from "./conversations";
import imageRouter from "./image";
import audioRouter from "./audio";

const router: IRouter = Router();

router.use(conversationsRouter);
router.use(imageRouter);
router.use(audioRouter);

export default router;
