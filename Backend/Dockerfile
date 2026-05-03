FROM node:18-slim

WORKDIR /app

# Copier package.json d'abord (meilleur cache)
COPY package*.json ./

# Installer les dépendances
RUN npm ci --production

# Copier le code source
COPY . .

# Créer le dossier uploads
RUN mkdir -p uploads/kyc uploads/agent_applications

# Exposer le port
EXPOSE 5000

# Démarrer l'application
CMD ["node", "server.js"]