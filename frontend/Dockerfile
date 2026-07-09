# Frontend runtime image for local and containerized Next.js development.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so source edits do not invalidate the package layer.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
