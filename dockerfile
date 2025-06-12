# Step 1: Use a Node.js base image for building the project
FROM node:23 AS build

# Step 2: Set working directory
WORKDIR /app

# Step 3: Set yarn registry (to avoid DNS/network issues)
RUN yarn config set registry https://registry.npmjs.org

# Step 4: Copy dependency files
COPY package*.json ./

# Step 5: Enable corepack and ensure yarn is working correctly
RUN corepack enable && corepack prepare yarn@stable --activate

# Step 6: Install dependencies
RUN yarn install --frozen-lockfile

# Step 7: Copy all project files
COPY . .

# Step 8: Build TypeScript
RUN yarn build

# Step 9: Create a smaller runtime image
FROM node:23-slim

# Step 10: Set working directory
WORKDIR /app

# Step 11: Install system dependencies (for Puppeteer/Chrome)
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  lsb-release \
  && rm -rf /var/lib/apt/lists/*

# Step 12: Install Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

# Step 13: Copy build output and deps
COPY --from=build /app/dist /app
COPY --from=build /app/package*.json /app/
COPY --from=build /app/node_modules /app/node_modules

# Step 14: Use only production dependencies (optional, since node_modules already copied)
# RUN yarn install --production --frozen-lockfile

# Step 15: Expose port and set entrypoint
EXPOSE 4000
CMD ["node", "server.js"]
