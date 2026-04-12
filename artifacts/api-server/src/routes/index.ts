import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import agentsRouter from "./agents";
import chatRouter from "./chat";
import creditsRouter from "./credits";
import workspaceRouter from "./workspace";
import scheduleRouter from "./schedule";
import projectsRouter from "./projects";
import whatsappRouter from "./whatsapp";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(agentsRouter);
router.use(chatRouter);
router.use(creditsRouter);
router.use(workspaceRouter);
router.use(scheduleRouter);
router.use(projectsRouter);
router.use(whatsappRouter);
router.use(analyticsRouter);

export default router;
