# Use official lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client classes
RUN npx prisma generate

# Build TypeScript source
RUN npm run build

# Expose internal port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
