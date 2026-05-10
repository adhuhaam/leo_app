import { Router, type IRouter } from "express";
import healthRouter from "./health";
import passportsRouter from "./passports";
import companiesRouter from "./companies";
import loaRouter from "./loa";
import loaOptionsRouter from "./loa-options";

const router: IRouter = Router();

router.use(healthRouter);
router.use(passportsRouter);
router.use(companiesRouter);
router.use(loaRouter);
router.use(loaOptionsRouter);

export default router;
