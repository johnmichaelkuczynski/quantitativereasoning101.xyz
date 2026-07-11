import { Router, type IRouter } from "express";
import healthRouter from "./health";
import courseRouter from "./course";
import assignmentsRouter from "./assignments";
import practiceRouter from "./practice";
import tutorRouter from "./tutor";
import detectionRouter from "./detection";
import analyticsRouter from "./analytics";
import practiceAssignmentsRouter from "./practice-assignments";
import assessmentsRouter from "./assessments";
import diagnosticsRouter from "./diagnostics";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Health is public so uptime checks don't need a session.
router.use(healthRouter);

// Everything below is per-user data and requires a signed-in Clerk user.
// requireAuth populates req.userId, which every handler uses to scope queries.
router.use(requireAuth);
router.use(courseRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(analyticsRouter);
router.use(practiceAssignmentsRouter);
router.use(assessmentsRouter);
router.use(diagnosticsRouter);

export default router;
