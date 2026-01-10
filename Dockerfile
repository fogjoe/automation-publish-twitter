# Base image with Playwright and browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.49.0-focal

# Set timezone
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Start command
CMD ["pnpm", "start"]
