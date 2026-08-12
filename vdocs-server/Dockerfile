FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "--experimental-strip-types", "src/index.ts"]
