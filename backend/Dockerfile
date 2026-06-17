# Use official Node.js image (non-alpine for better compatibility with Prisma engine)
FROM node:20

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

# Push database schema and start server
CMD npx prisma db push && npm start
