import { Hono } from 'hono';

import userRouter from "./users.js";

const router = new Hono();

router.route('/users', userRouter);

export default router;
