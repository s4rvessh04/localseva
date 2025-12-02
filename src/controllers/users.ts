import type { Context } from 'hono'

import { userService } from "../services/users.js";

export async function getUser(c: Context) {
  await userService(c);
}

