# Intelligent Data Insights (ONZE Tecnologia)

Plataforma de inteligência de dados, análise preditiva e deteção de anomalias para o mercado angolano.

---

## Como o projeto está organizado

Monorepo gerido com **pnpm workspaces**:

```
intelligent-data-insights-main/
├── artifacts/
│   ├── eleven-tech/        ← FRONTEND (o site em si)
│   ├── api-server/         ← BACKEND (a API)
│   └── mockup-sandbox/     ← protótipos/testes visuais
├── lib/
│   ├── db/                     ← Schema Drizzle ORM + seed de utilizadores
│   ├── api-client-react/       ← Cliente gerado para o frontend
│   ├── api-spec/               ← Especificação OpenAPI
│   ├── api-zod/                ← Validação de dados
│   ├── replit-auth-web/        ← Hook de autenticação do frontend (useAuth)
│   ├── integrations/                    ← Integrações genéricas
│   ├── integrations-openai-ai-react/    ← IA no frontend
│   └── integrations-openai-ai-server/   ← IA no backend
├── docker-compose.yml       ← PostgreSQL em container (opcional, ver abaixo)
└── scripts/
```

### Fluxo de autenticação

O login é feito por **email e senha**, verificados diretamente na base de dados (sem depender de nenhum serviço externo):

```
Navegador (Frontend, porta 5000)
        ↓  POST /api/login { email, password }
Backend / API (porta 8080)
        ↓  bcrypt.compare + consulta à tabela "users"
PostgreSQL (porta 5432 ou 5433, ver abaixo)
```

A sessão fica guardada na tabela `sessions` (base de dados), e o browser recebe um cookie `sid` httpOnly.

Existe também um ecrã de **gestão de utilizadores** (`/admin`, acessível a contas com papel "Administrador"), com criação, edição e eliminação de contas, lista de sessões ativas e registo de auditoria.

---

## Pré-requisitos

1. **Node.js** 20+ — https://nodejs.org
2. **pnpm** — `npm install -g pnpm`
3. **Git**
4. Base de dados PostgreSQL — duas opções, escolhe uma:
   - **Opção A — Docker** (recomendado, mais simples): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - **Opção B — Instalação local**: [PostgreSQL 16+](https://www.postgresql.org/download/)

> **Windows:** pode ser necessário liberar a execução de scripts uma vez:
> ```
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

## Configuração inicial (uma vez só)

### 1. Instalar dependências

```bash
pnpm install
```

> Se pedir `pnpm approve-builds`, aprova os pacotes sugeridos (`esbuild`, `core-js`).

### 2. Preparar a base de dados

#### Opção A — Docker (recomendado)

Com o Docker Desktop aberto e a correr, na raiz do projeto:

```bash
docker compose up -d
```

Isto cria um container PostgreSQL, já configurado, disponível em `localhost:5433` (porta escolhida para não colidir com uma instalação local do Postgres, se existir), com:
- utilizador: `postgres`
- senha: `postgres`
- base de dados: `intelligent_data_insights`

Para verificar que está a correr:
```bash
docker ps
```

Para desligar (mantém os dados guardados):
```bash
docker compose down
```

Para desligar **e apagar todos os dados** (recomeçar do zero):
```bash
docker compose down -v
```

#### Opção B — PostgreSQL instalado localmente

```bash
psql -U postgres
```
```sql
CREATE DATABASE intelligent_data_insights;
\q
```

### 3. Criar as tabelas e os utilizadores de demonstração

```bash
cd lib/db
```

**Se usaste Docker (Opção A):**
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/intelligent_data_insights"
```

**Se usaste PostgreSQL local (Opção B):**
```powershell
$env:DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/intelligent_data_insights"
```

*(Mac/Linux: usa `export` em vez de `$env:`)*

```bash
pnpm run push
pnpm run seed
```

Isto cria 2 contas de demonstração:

| Email | Senha | Papel |
|---|---|---|
| `demo@eleventech.ao` | `Demo2026!` | Analista |
| `admin@eleventech.ao` | `Admin2026!` | Administrador |

---

## Ligar o projeto no dia a dia

> Se usaste Docker para a base de dados, garante que o container está ligado antes de arrancar o backend: `docker compose up -d`

### Terminal 1 — Backend

```bash
cd artifacts/api-server
```
**Windows (com Docker, porta 5433):**
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/intelligent_data_insights"
$env:NODE_ENV="development"
$env:PORT=8080
pnpm run build
pnpm run start
```
**Windows (com PostgreSQL local, porta 5432):**
```powershell
$env:DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/intelligent_data_insights"
$env:NODE_ENV="development"
$env:PORT=8080
pnpm run build
pnpm run start
```

Pronto quando aparecer `Server listening, port: 8080`.

### Terminal 2 — Frontend

```bash
cd artifacts/eleven-tech
```
**Windows:**
```powershell
$env:PORT=5000
$env:BASE_PATH="/"
pnpm run dev
```

Acede em `http://localhost:5000`.

---

## Arquitetura técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Framer Motion, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Autenticação | Sessões próprias (cookie `sid`) + bcryptjs + rate limiting no login |
| Base de Dados | PostgreSQL + Drizzle ORM (local ou em Docker) |
| IA | Integração própria com modelos OpenAI (`lib/integrations-openai-ai-*`) |
| Gestão de dependências | pnpm workspaces (monorepo) |

---

## Notas importantes

- **Este projeto já não depende da Replit.** O login foi originalmente feito via OIDC da Replit; foi substituído por autenticação própria (email + senha com bcrypt), e os plugins de desenvolvimento específicos da Replit foram removidos do `vite.config.ts`.
- **Nunca commitar** senhas reais nem ficheiros `.env` com credenciais — o `.gitignore` já cobre isto, mas convém ter atenção redobrada com a `DATABASE_URL`.
- A senha padrão do PostgreSQL no `docker-compose.yml` (`postgres` / `postgres`) é suficiente porque a base de dados só é acessível dentro da rede local do Docker — mas não a reutilizes para serviços expostos publicamente.
- Se aparecerem erros do tipo `Cannot find module '@rollup/rollup-...'`, `lightningcss...` ou `@tailwindcss/oxide...` ao rodar `pnpm run dev` (fora do Docker), é um problema conhecido de dependências opcionais binárias específicas do sistema operativo:
  ```bash
  pnpm add -D @rollup/rollup-win32-x64-msvc -w
  pnpm add -D lightningcss-win32-x64-msvc -w
  pnpm add -D @tailwindcss/oxide-win32-x64-msvc -w
  ```
  (ajusta o sufixo do pacote conforme o teu sistema operativo)
- Se o `drizzle-kit push` falhar com "No schema files found" mesmo o ficheiro existindo, confirma que `lib/db/drizzle.config.ts` aponta para `schema: "./src/schema/index.ts"` como string simples, e não `path.join(__dirname, ...)` — no Windows isso gera barras invertidas que quebram a resolução de glob do drizzle-kit.

---

## Próximos passos sugeridos

- Testes automatizados básicos (rotas de autenticação, gestão de utilizadores).
- Containerizar também o frontend e o backend, para um `docker compose up` único subir o projeto inteiro (útil para deploy).

---

## Contacto

**ONZE Tecnologia**
Luanda, Angola
