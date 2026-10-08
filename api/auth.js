import { route, HttpError } from '../lib/http.js';
import { createToken } from '../lib/auth.js';
import { getView, login, register } from '../lib/users.js';

const actions = { register, login };

export default route({
  async POST(req) {
    const action = actions[req.body?.action];
    if (!action) throw new HttpError(400, 'Ação inválida.');
    const user = await action(req.body);
    return { token: createToken(user.id), ...(await getView(user.id)) };
  },
});
