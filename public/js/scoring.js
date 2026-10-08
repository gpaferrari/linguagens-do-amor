// Regras de cálculo do teste. Usado no navegador e na API (a API recalcula, não confia no cliente).
import { QUESTIONS } from './quiz-data.js';
import { LANG_CODES } from './languages.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function isValidAnswers(answers) {
  return (
    Array.isArray(answers) && answers.length === QUESTIONS.length && answers.every((a) => LETTERS.includes(a))
  );
}

// Conta quantas vezes cada sigla apareceu nas respostas.
export function score(answers) {
  const scores = Object.fromEntries(LANG_CODES.map((code) => [code, 0]));
  answers.forEach((letter, i) => {
    const option = QUESTIONS[i].options.find((o) => o.letter === letter);
    scores[option.lang] += 1;
  });
  return scores;
}

// Siglas ordenadas da maior para a menor pontuação.
export function rank(scores) {
  return [...LANG_CODES].sort((a, b) => scores[b] - scores[a]);
}

// Afinidade = quão parecidos são os dois perfis (0 a 100).
// A soma das diferenças vai de 0 (idênticos) a 60 (nenhuma resposta em comum).
export function compare(scoresA, scoresB) {
  const total = QUESTIONS.length * 2;
  const diff = LANG_CODES.reduce((sum, code) => sum + Math.abs(scoresA[code] - scoresB[code]), 0);
  const [primaryA] = rank(scoresA);
  const [primaryB] = rank(scoresB);
  return {
    affinity: Math.round(100 - (diff / total) * 100),
    samePrimary: primaryA === primaryB,
  };
}
