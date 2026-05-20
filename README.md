# KidGage Ready-to-Deploy Starter

KidGage is a multi-academy kids activity booking platform built with React, Express, and MongoDB.

## Stack
- React + Vite
- Tailwind CSS
- Express.js
- MongoDB + Mongoose
- JWT auth
- Docker-ready deployment

## Roles
- SUPER_ADMIN
- ACADEMY_ADMIN
- MANAGER
- STAFF
- PARENT
- CHILD

## Run locally

### 1) Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2) Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Docker
From project root:
```bash
docker compose up --build
```

## Seed demo data
```bash
cd server
npm install
npm run seed
```
