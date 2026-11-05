# Stage 1: Builder - Chỉ dùng để cài đặt thư viện
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Dùng npm ci thay cho npm install để cài đúng version trong package-lock.json
RUN npm ci 
COPY . .

# Stage 2: Production - Tạo image siêu nhẹ và bảo mật
FROM node:18-alpine
WORKDIR /app

# Khai báo môi trường production để Node.js tối ưu hiệu năng
ENV NODE_ENV=production

# Chép code và thư viện đã build từ stage 1 sang
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.js ./

# YÊU CẦU BẮT BUỘC: Không chạy quyền root. Dùng user 'node' có sẵn của image.
USER node

# YÊU CẦU BẮT BUỘC: Khai báo Healthcheck để hệ thống tự biết app sống hay chết
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

EXPOSE 3002
CMD ["node", "index.js"]