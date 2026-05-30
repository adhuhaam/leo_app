import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAuthRouter from "./dev-auth";
import authRouter, { requireAuth, usersRouter } from "./auth";
import passportsRouter from "./passports";
import companiesRouter from "./companies";
import clientsRouter from "./clients";
import expenseCategoriesRouter from "./expense-categories";
import expensesRouter from "./expenses";
import loaRouter from "./loa";
import loaOptionsRouter from "./loa-options";
import billingRouter from "./billing";
import systemPublicRouter, { systemProtectedRouter } from "./system";
import deploymentTypesRouter from "./deployment-types";
import { authenticateJwt } from "../lib/auth";
import { loadUserProfile } from "../lib/rbac";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(devAuthRouter);
router.use(systemPublicRouter);

// JWT auth chain for all protected routes
router.use(authenticateJwt);
router.use(loadUserProfile);

// Auth status (requires valid JWT)
router.use(authRouter);
router.use(usersRouter);

// Protected business routes
router.use(requireAuth);
router.use(systemProtectedRouter);
router.use(deploymentTypesRouter);
router.use(passportsRouter);
router.use(companiesRouter);
router.use(clientsRouter);
router.use(expenseCategoriesRouter);
router.use(expensesRouter);
router.use(loaRouter);
router.use(loaOptionsRouter);
router.use(billingRouter);

export default router;
