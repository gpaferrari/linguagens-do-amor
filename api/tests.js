import { route, requireUserId } from '../lib/http.js';
import { deleteTest, getView, saveTest } from '../lib/users.js';

export default route({
  async POST(req) {
    const userId = requireUserId(req);
    const test = await saveTest(userId, req.body?.answers);
    return { test, ...(await getView(userId)) };
  },

  async DELETE(req) {
    const userId = requireUserId(req);
    await deleteTest(userId, req.query.id);
    return getView(userId);
  },
});
