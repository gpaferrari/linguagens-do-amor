import { route, optionalUserId } from '../lib/http.js';
import { getSharedResult } from '../lib/users.js';

// Público: qualquer pessoa com o link vê o resultado. Se estiver logada, sabemos se é o dono ou o par.
export default route({
  GET: (req) => getSharedResult(req.query.t, optionalUserId(req)),
});
