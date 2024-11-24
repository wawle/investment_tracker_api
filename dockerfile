# Step 1: Use a Node.js base image for building the project
FROM node:23 AS build

# Step 2: Set the working directory to /app
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Step 4: Install project dependencies (including devDependencies)
RUN npm install

# Step 5: Copy the rest of the project files (excluding files listed in .dockerignore)
COPY . .

# Step 6: Run TypeScript build
RUN npm run build   

# Step 7: Create a smaller runtime image (based on a slim version of Node)
FROM node:23-slim

# Set working directory in the runtime image
WORKDIR /app

# Step 8: Copy compiled JavaScript files from the build image
COPY --from=build /app/dist /app

# Step 9: Copy node_modules from the build image to the runtime image
COPY --from=build /app/node_modules /app/node_modules

# Step 10: Start the application (assuming compiled files are in the "dist" folder)
CMD ["node", "server.js"]

# Step 11: Expose the application port
EXPOSE 4000
