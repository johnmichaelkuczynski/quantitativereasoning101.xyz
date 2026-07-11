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
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(courseRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(analyticsRouter);
router.use(practiceAssignmentsRouter);
router.use(assessmentsRouter);
router.use(diagnosticsRouter);
router.use(adminRouter);

export default router;
