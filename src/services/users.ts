import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export async function userService(c: Context) {
  try {
    const user_id = c.req.param('user_id') || null;
    await new Promise(resolve => setTimeout(resolve, 3000));
    c.set('response', { data: `User id: ${user_id} `, success: true, message: 'Users fetched successfully' })
    return;
  } catch (error) {
    throw new HTTPException(500, { message: 'Error while fetching users' })
  }
}
