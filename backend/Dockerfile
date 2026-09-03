FROM node:18-bullseye

# Install build dependencies for native modules (sqlite3)
RUN apt-get update \
    && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Rebuild sqlite3 for this linux/arm64 image and remove dev dependencies
ENV npm_config_build_from_source=sqlite3
RUN npm prune --production \
    && npm rebuild sqlite3 --build-from-source --verbose

EXPOSE 3010

CMD ["npm", "run", "start:prod"]
