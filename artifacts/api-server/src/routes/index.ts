import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter, { requireAuth } from "./auth";
import passportsRouter from "./passports";
import companiesRouter from "./companies";
import clientsRouter from "./clients";
import expenseCategoriesRouter from "./expense-categories";
import expensesRouter from "./expenses";
import loaRouter from "./loa";
import loaOptionsRouter from "./loa-options";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// Everything below requires a valid session
router.use(requireAuth);
router.use(passportsRouter);
router.use(companiesRouter);
router.use(clientsRouter);
router.use(expenseCategoriesRouter);
router.use(expensesRouter);
router.use(loaRouter);
router.use(loaOptionsRouter);

export default router;
