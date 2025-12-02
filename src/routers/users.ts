import { Hono } from 'hono';

import { getUser } from "../controllers/users.js";

const router = new Hono();

router.get('/:user_id', getUser);

export default router;
