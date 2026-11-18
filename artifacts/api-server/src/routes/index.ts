import { Router, type IRouter } from "express";
import cmsRouter from "./cms";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cmsRouter);

export default router;
