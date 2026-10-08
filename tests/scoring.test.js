import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../public/js/quiz-data.js';
import { compare, isValidAnswers, rank, score } from '../public/js/scoring.js';

const answersFor = (lang) => QUESTIONS.map((q) => q.options.find((o) => o.lang === lang).letter);

test('cada questão tem as 5 linguagens no gabarito', () => {
  for (const q of QUESTIONS) assert.deepEqual(q.options.map((o) => o.lang).sort(), ['AS', 'PA', 'RP', 'TF', 'TQ']);
});

test('conta as siglas e ordena', () => {
  const scores = score(answersFor('TQ'));
  assert.deepEqual(scores, { PA: 0, TQ: 30, RP: 0, AS: 0, TF: 0 });
  assert.equal(rank(scores)[0], 'TQ');
});

test('valida respostas', () => {
  assert.equal(isValidAnswers(answersFor('PA')), true);
  assert.equal(isValidAnswers(['A']), false);
  assert.equal(isValidAnswers(Array(30).fill('F')), false);
});

test('afinidade vai de 0 a 100', () => {
  const pa = score(answersFor('PA'));
  assert.deepEqual(compare(pa, pa), { affinity: 100, samePrimary: true });
  assert.deepEqual(compare(pa, score(answersFor('TF'))), { affinity: 0, samePrimary: false });
});
