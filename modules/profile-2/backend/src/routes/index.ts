/**
 * Profile-2 路由索引
 */

import { Router } from 'express';
import sessionRouter from './session.js';
import userRouter from './user.js';
import systemRouter from './system.js';

const router = Router();

router.use('/session', sessionRouter);
router.use('/user', userRouter);
router.use('/system', systemRouter);

export default router;
