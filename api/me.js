import { route, requireUserId } from '../lib/http.js';
import { getView } from '../lib/users.js';

export default route({
  GET: (req) => getView(requireUserId(req)),
});
