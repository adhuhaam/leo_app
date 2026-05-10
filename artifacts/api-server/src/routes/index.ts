import { Router, type IRouter } from "express";
import healthRouter from "./health";
import passportsRouter from "./passports";
import companiesRouter from "./companies";
import loaRouter from "./loa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(passportsRouter);
router.use(companiesRouter);
router.use(loaRouter);

export default router;
