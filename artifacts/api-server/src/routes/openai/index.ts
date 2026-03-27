import { Router, type IRouter } from "express";
import conversationsRouter from "./conversations";
import imageRouter from "./image";

const router: IRouter = Router();

router.use(conversationsRouter);
router.use(imageRouter);

export default router;
