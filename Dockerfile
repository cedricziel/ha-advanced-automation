FROM rust:1.75-slim as builder

WORKDIR /app
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/src ./backend/src

WORKDIR /app/backend
RUN cargo build --release

FROM node:20-slim as frontend-builder

WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend ./
RUN npm run build

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/backend/target/release/ha-advanced-automation ./
COPY --from=frontend-builder /app/frontend/build ./frontend/build

ENV PORT=3001
EXPOSE 3001

CMD ["./ha-advanced-automation"]
