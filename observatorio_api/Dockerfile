FROM node:18-alpine AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

# instalamos sólo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# copiamos el código
COPY . .

# compilaciones (si usas TypeScript o similar) irían aquí
# RUN npm run build

EXPOSE 3006

# comando de arranque (ajusta si usas un script distinto)
CMD ["npm", "start"]
