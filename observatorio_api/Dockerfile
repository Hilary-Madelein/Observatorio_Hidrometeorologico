FROM node:18-bullseye AS builder

WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY . .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3006

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
