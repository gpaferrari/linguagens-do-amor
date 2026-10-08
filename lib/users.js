// Cada conta é um arquivo users/<id>.json, onde id = sha256(email). Assim não precisamos de índice.
import { createHash, randomUUID } from 'node:crypto';
import { getStorage, updateJson } from './storage/index.js';
import { HttpError } from './http.js';
import { createShareToken, hashPassword, verifyPassword, verifyShareToken } from './auth.js';
import { compare, isValidAnswers, rank, score } from '../public/js/scoring.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[a-f0-9]{32}$/;

const now = () => new Date().toISOString();
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
const idFromEmail = (email) => createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 32);
const pathOf = (id) => `users/${id}.json`;
const summary = (user) => ({ id: user.id, name: user.name, email: user.email, at: now() });
const notFound = () => new HttpError(404, 'Conta não encontrada.');

async function findUser(id) {
  if (!ID_RE.test(id ?? '')) return null;
  return (await getStorage().read(pathOf(id)))?.data ?? null;
}

async function getUser(id) {
  const user = await findUser(id);
  if (!user) throw notFound();
  return user;
}

function updateUser(id, mutate) {
  return updateJson(pathOf(id), (user) => {
    if (!user) throw notFound();
    mutate(user);
    return user;
  });
}

// Para limpezas no "outro lado" (convites, vínculo): se a conta sumiu, não há o que limpar.
async function updateUserIfExists(id, mutate) {
  try {
    await updateUser(id, mutate);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

function withoutInviteFrom(fromId) {
  return (user) => {
    user.invites.received = user.invites.received.filter((invite) => invite.id !== fromId);
  };
}

// ---------- Conta ----------

export async function register({ name, email, password }) {
  const cleanName = String(name ?? '').trim();
  const cleanEmail = normalizeEmail(email);
  if (cleanName.length < 2 || cleanName.length > 60) throw new HttpError(400, 'Informe um nome entre 2 e 60 caracteres.');
  if (!EMAIL_RE.test(cleanEmail)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (String(password ?? '').length < 6) throw new HttpError(400, 'A senha precisa ter pelo menos 6 caracteres.');

  const id = idFromEmail(cleanEmail);
  const passwordHash = hashPassword(String(password));
  return updateJson(pathOf(id), (existing) => {
    if (existing) throw new HttpError(409, 'Já existe uma conta com esse e-mail.');
    return {
      id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: now(),
      partner: null,
      invites: { sent: null, received: [] },
      tests: [],
    };
  });
}

export async function login({ email, password }) {
  const user = await findUser(idFromEmail(email));
  if (!user || !verifyPassword(String(password ?? ''), user.passwordHash)) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  return user;
}

// O que o front recebe: a própria conta (sem hash) e um resumo do par vinculado.
export async function getView(userId) {
  const { passwordHash, ...user } = await getUser(userId);
  const partner = user.partner && (await findUser(user.partner.id));
  const latest = partner?.tests.at(-1);
  user.tests = user.tests.map((test) => ({ ...test, shareToken: createShareToken(user.id, test.id) }));
  return {
    user,
    partner: partner && {
      id: partner.id,
      name: partner.name,
      since: user.partner.since,
      latestTest: latest ? { id: latest.id, date: latest.date, scores: latest.scores, ranking: latest.ranking } : null,
    },
  };
}

// ---------- Testes ----------

export async function saveTest(userId, answers) {
  if (!isValidAnswers(answers)) throw new HttpError(400, 'Responda todas as 30 questões.');
  const me = await getUser(userId);
  const scores = score(answers);
  const test = { id: randomUUID(), date: now(), answers, scores, ranking: rank(scores), match: null };

  const partner = me.partner && (await findUser(me.partner.id));
  const partnerTest = partner?.tests.at(-1);
  if (partnerTest) {
    test.match = {
      partnerId: partner.id,
      partnerName: partner.name,
      partnerTestId: partnerTest.id,
      partnerTestDate: partnerTest.date,
      partnerRanking: partnerTest.ranking,
      ...compare(scores, partnerTest.scores),
    };
  }

  await updateUser(userId, (user) => user.tests.push(test));
  return test;
}

export async function deleteTest(userId, testId) {
  await updateUser(userId, (user) => {
    user.tests = user.tests.filter((test) => test.id !== testId);
  });
}

// ---------- Link de compartilhamento ----------

// Resultado público de um link. viewerId (opcional) diz se quem abre é o dono ou o par.
export async function getSharedResult(token, viewerId) {
  const { userId, testId } = verifyShareToken(token) ?? {};
  const owner = await findUser(userId);
  const test = owner?.tests.find((t) => t.id === testId);
  if (!test) throw new HttpError(404, 'Esse resultado não está mais disponível.');
  const viewer = viewerId && viewerId !== owner.id ? await findUser(viewerId) : null;
  return {
    name: owner.name,
    date: test.date,
    scores: test.scores,
    ranking: test.ranking,
    isMine: viewerId === owner.id,
    isPartner: Boolean(viewerId) && owner.partner?.id === viewerId,
    invited: viewer?.invites.sent?.id === owner.id,
  };
}

// ---------- Casal ----------

export async function invitePartner(userId, email) {
  const target = await findUser(idFromEmail(email));
  if (!target) throw new HttpError(404, 'Não encontramos uma conta com esse e-mail. Peça para a pessoa criar a conta primeiro.');
  return inviteUser(userId, target);
}

// Convite feito a partir do link de resultado que a outra pessoa compartilhou.
export async function invitePartnerFromShare(userId, token) {
  const target = await findUser(verifyShareToken(token)?.userId);
  if (!target) throw new HttpError(404, 'Link inválido ou expirado.');
  return inviteUser(userId, target);
}

async function inviteUser(userId, target) {
  const me = await getUser(userId);
  if (target.id === me.id) throw new HttpError(400, 'Você não pode convidar a si mesmo(a).');
  if (me.partner?.id === target.id) return;
  if (me.partner) throw new HttpError(400, 'Você já está vinculado(a) a alguém.');
  if (target.partner) throw new HttpError(400, 'Essa pessoa já está vinculada a outra conta.');

  // A outra pessoa já tinha me convidado: vincula direto.
  if (me.invites.received.some((invite) => invite.id === target.id)) return acceptInvite(userId, target.id);

  if (me.invites.sent && me.invites.sent.id !== target.id) {
    await updateUserIfExists(me.invites.sent.id, withoutInviteFrom(me.id));
  }
  await updateUser(target.id, (user) => {
    withoutInviteFrom(me.id)(user);
    user.invites.received.push(summary(me));
  });
  await updateUser(me.id, (user) => {
    user.invites.sent = summary(target);
  });
}

export async function acceptInvite(userId, fromId) {
  const me = await getUser(userId);
  if (!me.invites.received.some((invite) => invite.id === fromId)) throw new HttpError(404, 'Convite não encontrado.');

  const from = await findUser(fromId);
  const stillValid = from && !from.partner && !me.partner && from.invites.sent?.id === me.id;
  if (!stillValid) {
    await updateUser(me.id, withoutInviteFrom(fromId));
    throw new HttpError(410, 'Esse convite não está mais válido.');
  }

  const since = now();
  if (me.invites.sent) await updateUserIfExists(me.invites.sent.id, withoutInviteFrom(me.id));
  await updateUser(from.id, (user) => {
    user.partner = { id: me.id, name: me.name, since };
    user.invites.sent = null;
  });
  await updateUser(me.id, (user) => {
    user.partner = { id: from.id, name: from.name, since };
    user.invites = { sent: null, received: [] };
  });
}

export async function declineInvite(userId, fromId) {
  await updateUser(userId, withoutInviteFrom(fromId));
  await updateUserIfExists(fromId, (user) => {
    if (user.invites.sent?.id === userId) user.invites.sent = null;
  });
}

export async function cancelInvite(userId) {
  const me = await getUser(userId);
  if (me.invites.sent) await updateUserIfExists(me.invites.sent.id, withoutInviteFrom(userId));
  await updateUser(userId, (user) => {
    user.invites.sent = null;
  });
}

export async function unlinkPartner(userId) {
  const me = await getUser(userId);
  if (me.partner) {
    await updateUserIfExists(me.partner.id, (user) => {
      if (user.partner?.id === userId) user.partner = null;
    });
  }
  await updateUser(userId, (user) => {
    user.partner = null;
  });
}
