import { route, requireUserId, HttpError } from '../lib/http.js';
import {
  acceptInvite,
  cancelInvite,
  declineInvite,
  getView,
  invitePartner,
  invitePartnerFromShare,
  unlinkPartner,
} from '../lib/users.js';

const actions = {
  invite: (userId, body) => invitePartner(userId, body.email),
  'invite-share': (userId, body) => invitePartnerFromShare(userId, body.token),
  accept: (userId, body) => acceptInvite(userId, body.id),
  decline: (userId, body) => declineInvite(userId, body.id),
  cancel: (userId) => cancelInvite(userId),
  unlink: (userId) => unlinkPartner(userId),
};

export default route({
  async POST(req) {
    const userId = requireUserId(req);
    const action = actions[req.body?.action];
    if (!action) throw new HttpError(400, 'Ação inválida.');
    await action(userId, req.body);
    return getView(userId);
  },
});
