# 💞 Linguagens do Amor

Teste das 5 linguagens do amor para noivos, baseado no material do curso de noivos.
Cada pessoa cria uma conta, faz o teste (30 questões), e o resultado fica salvo com a data.
Casais podem vincular as contas para ver a comparação e o **match** de cada teste.

- HTML + CSS + JavaScript puro (ES modules), sem build e sem dependências
- API em funções serverless da Vercel (`api/`)
- "Banco de dados": arquivos JSON em um repositório GitHub **privado**, via GitHub API

## Estrutura

```
public/            front-end estático (servido pela Vercel)
  js/quiz-data.js  30 questões + gabarito (gerado do PDF)
  js/scoring.js    cálculo do resultado e do match (usado no front e na API)
  js/store.js      estado global (Observer + Singleton)
  js/app.js        router por hash (#/teste, #/casal…)
  js/views/        uma tela por arquivo
api/               funções serverless: auth, me, tests, partner
lib/
  users.js         regras de conta, testes e casal
  auth.js          senha (scrypt) e token assinado (HMAC)
  storage/         Strategy: GitHub (produção) ou pasta local (dev/testes)
tests/             node --test
```

Cada conta vira um arquivo `users/<sha256(email)>.json` no repositório de dados, com os testes dentro.

## Rodando localmente

Requer Node 22+.

```bash
npm run dev
```

Abre em http://localhost:3000. Sem `.env`, os dados ficam na pasta `.data/` (ignorada pelo git).
Para testar contra o GitHub localmente, copie `.env.example` para `.env` e preencha.

```bash
npm test
```

## Publicando

### 1. Repositório de dados (privado)

Este repositório do código é público, então **os dados ficam em outro repositório, privado**
(senão nomes, e-mails e resultados ficariam públicos).

1. Crie um repositório privado, ex.: `seu-usuario/linguagens-do-amor-data`, com um README (para existir a branch `main`).
2. Crie um token em **GitHub → Settings → Developer settings → Fine-grained tokens**:
   - Repository access: *Only select repositories* → só o repositório de dados
   - Permissions → Repository → **Contents: Read and write**

O token nunca vai para o navegador: só as funções da Vercel o usam.

### 2. Vercel

1. Importe este repositório na Vercel (framework preset: *Other*, sem build).
2. Em **Settings → Environment Variables**, adicione:

| Variável        | Valor                                                        |
| --------------- | ------------------------------------------------------------ |
| `GITHUB_TOKEN`  | o token fine-grained                                         |
| `GITHUB_REPO`   | `seu-usuario/linguagens-do-amor-data`                        |
| `GITHUB_BRANCH` | `main`                                                       |
| `AUTH_SECRET`   | texto aleatório longo (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`) |

3. Deploy.

## Limitações conhecidas (escolhas de simplicidade)

- Cada gravação vira um commit no repositório de dados. Ótimo para um curso/grupo; para milhares de usuários, troque a strategy em `lib/storage/` por um banco de verdade.
- Sem recuperação de senha nem limite de tentativas de login.
- Para vincular o casal, a outra pessoa precisa já ter conta (o convite é pelo e-mail da conta).
