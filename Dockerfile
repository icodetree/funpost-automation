FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=3001
ENV HEADLESS=true

EXPOSE 3001

CMD ["npm", "start"]
