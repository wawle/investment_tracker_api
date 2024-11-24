# Adım 1: Node.js'i içeren bir temel imaj seçiyoruz
FROM node:23 AS build

# Adım 2: Çalışma dizinini oluşturuyoruz
WORKDIR /app

# Adım 3: package.json ve package-lock.json dosyalarını kopyalıyoruz
COPY package*.json ./

# Adım 4: Bağımlılıkları yüklüyoruz
RUN npm install

# Adım 5: Proje dosyalarını kopyalıyoruz
COPY . .

# Adım 6: TypeScript dosyalarını derliyoruz
RUN npm run build


# Adım 7: Çalışma aşaması (yani, final imajı)
FROM node:23-slim

WORKDIR /app

# Adım 8: Derlenmiş dosyaları kopyalıyoruz
COPY --from=build /app/dist /app

# Adım 9: Bağımlılıkları tekrar kopyalıyoruz
COPY --from=build /app/node_modules /app/node_modules

# Adım 10: API'yi çalıştırıyoruz
CMD ["node", "dist/server.js"]

# Adım 11: Docker'ın dışarıya açacağı portu belirliyoruz
EXPOSE 4000
