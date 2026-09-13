# Same Chromium + fonts everywhere, so posters render identically on any organiser's machine.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx playwright install chromium
COPY . .
ENTRYPOINT ["npm", "run", "build", "--"]
CMD ["data/example.json"]
