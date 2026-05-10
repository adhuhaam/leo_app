import { Router, type IRouter } from "express";
import healthRouter from "./health";
import passportsRouter from "./passports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(passportsRouter);

export default router;
