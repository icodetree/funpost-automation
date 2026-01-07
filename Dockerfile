FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV HEADLESS=true

EXPOSE 3001

CMD ["npm", "start"]
