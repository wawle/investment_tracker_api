# Step 1: Use a Node.js base image for building the project
FROM node:23 AS build

# Step 2: Set the working directory to /app
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Step 4: Install project dependencies (including devDependencies)
RUN yarn

# Step 5: Copy the rest of the project files (excluding files listed in .dockerignore)
COPY . .

# Step 6: Run TypeScript build
RUN yarn build   

# Step 7: Create a smaller runtime image (based on a slim version of Node)
FROM node:23-slim

# Step 8: Set working directory in the runtime image
WORKDIR /app

# Step 9: Install dependencies for running Chrome
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

# Step 10: Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Step 11: Copy compiled JavaScript files from the build image
COPY --from=build /app/dist /app

# Step 12: Copy node_modules from the build image to the runtime image
COPY --from=build /app/node_modules /app/node_modules

# Step 13: Copy package.json files
COPY --from=build /app/package*.json /app/

# Step 14: Install only production dependencies
RUN yarn --production

# Step 15: Start the application (assuming compiled files are in the "dist" folder)
CMD ["node", "server.js"]

# Step 16: Expose the application port
EXPOSE 4000
