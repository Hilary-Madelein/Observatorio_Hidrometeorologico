# backend/observatorio_api/Dockerfile
FROM node:18-slim AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

# 1) Instalamos curl y netcat
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

# 2) Copiamos package*.json e instalamos sólo deps de prod
COPY package*.json ./
RUN npm ci --only=production

# 3) Copiamos el resto del código
COPY . .

# 4) Preparamos el entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3006

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
