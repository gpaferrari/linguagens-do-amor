import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setStorage } from '../lib/storage/index.js';
import { FileStorage } from '../lib/storage/file.js';
import { QUESTIONS } from '../public/js/quiz-data.js';
import * as users from '../lib/users.js';

const answersFor = (lang) => QUESTIONS.map((q) => q.options.find((o) => o.lang === lang).letter);

before(async () => {
  setStorage(new FileStorage({ dir: await mkdtemp(join(tmpdir(), 'lda-')) }));
});

test('fluxo completo do casal', async () => {
  const ana = await users.register({ name: 'Ana', email: 'Ana@Email.com', password: '123456' });
  const bia = await users.register({ name: 'Bia', email: 'bia@email.com', password: '123456' });

  await assert.rejects(users.register({ name: 'Ana', email: 'ana@email.com', password: '123456' }), { status: 409 });
  await assert.rejects(users.login({ email: 'ana@email.com', password: 'errada' }), { status: 401 });
  assert.equal((await users.login({ email: ' ANA@email.com ', password: '123456' })).id, ana.id);

  const first = await users.saveTest(ana.id, answersFor('PA'));
  assert.equal(first.match, null);

  await users.invitePartner(ana.id, 'bia@email.com');
  let biaView = await users.getView(bia.id);
  assert.equal(biaView.user.invites.received[0].name, 'Ana');

  await users.acceptInvite(bia.id, ana.id);
  biaView = await users.getView(bia.id);
  assert.equal(biaView.partner.name, 'Ana');
  assert.equal(biaView.partner.latestTest.id, first.id);
  assert.equal(biaView.partner.latestTest.answers, undefined);

  const second = await users.saveTest(bia.id, answersFor('PA'));
  assert.equal(second.match.partnerName, 'Ana');
  assert.equal(second.match.affinity, 100);

  await users.unlinkPartner(ana.id);
  assert.equal((await users.getView(bia.id)).partner, null);

  await users.deleteTest(bia.id, second.id);
  assert.equal((await users.getView(bia.id)).user.tests.length, 0);
});

test('convite cruzado vincula direto', async () => {
  const c = await users.register({ name: 'Caio', email: 'caio@email.com', password: '123456' });
  const d = await users.register({ name: 'Duda', email: 'duda@email.com', password: '123456' });
  await users.invitePartner(c.id, 'duda@email.com');
  await users.invitePartner(d.id, 'caio@email.com');
  assert.equal((await users.getView(c.id)).partner.name, 'Duda');
  await assert.rejects(users.invitePartner(c.id, 'ninguem@email.com'), { status: 404 });
});

test('link de compartilhamento', async () => {
  const eva = await users.register({ name: 'Eva', email: 'eva@email.com', password: '123456' });
  const fabio = await users.register({ name: 'Fábio', email: 'fabio@email.com', password: '123456' });
  await users.saveTest(eva.id, answersFor('TF'));
  const { shareToken } = (await users.getView(eva.id)).user.tests[0];

  const shared = await users.getSharedResult(shareToken);
  assert.equal(shared.name, 'Eva');
  assert.equal(shared.ranking[0], 'TF');
  assert.equal(shared.answers, undefined);
  assert.equal((await users.getSharedResult(shareToken, eva.id)).isMine, true);

  const forged = shareToken.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
  await assert.rejects(users.getSharedResult(forged), { status: 404 });

  await users.invitePartnerFromShare(fabio.id, shareToken);
  assert.equal((await users.getView(eva.id)).user.invites.received[0].name, 'Fábio');
  assert.equal((await users.getSharedResult(shareToken, fabio.id)).invited, true);
  await users.acceptInvite(eva.id, fabio.id);
  assert.equal((await users.getSharedResult(shareToken, fabio.id)).isPartner, true);
});
