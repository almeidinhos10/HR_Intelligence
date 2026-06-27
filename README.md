# HR Intelligence

Base fullstack para o projeto:
- Frontend: React (Vite)
- Backend: Node.js + Express
- Base de dados: MongoDB (Mongoose)

## Estrutura

- `frontend/` app React
- `backend/` API Express

## Requisitos

- Node.js 20+
- MongoDB local ou MongoDB Atlas

## Setup rápido

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita o `.env` com a tua `MONGODB_URI`.
Define tambem `JWT_SECRET`.

```bash
npm run dev
```

API em `http://localhost:5000`.

### 2) Frontend

Noutro terminal:

```bash
cd frontend
npm install
npm run dev
```

App em `http://localhost:5173`.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`

## Perfis e Permissoes

- `colaborador`: pode autenticar, sem acesso a gestao de colaboradores.
- `gestor`: pode listar, criar e atualizar colaboradores.
- `administrador`: mesmas permissoes de gestor + remover colaboradores.

## Modulo 4.1 - Gestao de Colaboradores

Implementado:
- Criacao e edicao de perfis.
- Informacao contratual.
- Historico profissional.
- Associacao a equipas e departamentos.
- Registo de competencias.
- Registo de certificacoes.
