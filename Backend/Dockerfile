# Dockerfile pour le backend Node.js
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 5001

# Démarrer l'application
CMD ["node", "server.js"]