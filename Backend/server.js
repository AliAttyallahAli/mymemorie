const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs');
const multer = require('multer');
const db = require('./database/db');


// Chargement des variables d'environnement
dotenv.config();

// Import des modules internes
const { initDatabase, getDb, query, run, get } = require('./database/db');

// Initialisation de l'application
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://Backend/public", // Remplacez par l'URL de votre frontend
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, 'public')));

// Port
const PORT = process.env.PORT || 5000;

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET || 'alkherpay_super_secret_key_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'alkherpay_refresh_secret_2024';


// ============================================
// UTILITAIRES
// ============================================

// Générer une référence unique de transaction
function generateTransactionReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `CASH-${year}${month}${day}-${random}`;
}

// Générer une clé privée à 6 chiffres
function generatePrivateKey() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Générer un numéro d'agence
function generateAgencyNumber() {
  const prefix = 'AG';
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${random}`;
}

// Hash de mot de passe
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Vérification de mot de passe
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Génération de token JWT
function generateTokens(userId, phone, role) {
  const accessToken = jwt.sign(
    { userId, phone, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId, phone, role },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// ============================================
// ENDPOINTS POUR LE PIN DE TRANSACTION
// ============================================

// Définir le PIN de transaction (première transaction)
app.post('/api/user/set-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  // Validation du PIN
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (user.is_pin_set) {
      return res.status(400).json({ error: 'Un PIN est déjà défini' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await run(`
      UPDATE users 
      SET transaction_pin = ?, is_pin_set = 1, pin_attempts = 0, pin_blocked_until = NULL
      WHERE id = ?
    `, [hashedPin, req.user.userId]);

    res.json({
      success: true,
      message: 'PIN de transaction défini avec succès'
    });
  } catch (error) {
    console.error('Erreur définition PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du PIN' });
  }
});

// Vérifier le PIN de transaction
app.post('/api/user/verify-transaction-pin', authenticateToken, async (req, res) => {
  const { pin, transactionId } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get(`
      SELECT id, transaction_pin, is_pin_set, pin_attempts, pin_blocked_until 
      FROM users WHERE id = ?
    `, [req.user.userId]);

    if (!user.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    // Vérifier si le PIN est bloqué
    if (user.pin_blocked_until && new Date(user.pin_blocked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.pin_blocked_until) - new Date()) / 60000);
      return res.status(403).json({
        error: `Trop de tentatives. Réessayez dans ${waitMinutes} minutes.`
      });
    }

    const isValid = await bcrypt.compare(pin, user.transaction_pin);

    if (!isValid) {
      const newAttempts = (user.pin_attempts || 0) + 1;

      if (newAttempts >= 5) {
        // Bloquer le PIN pendant 30 minutes après 5 tentatives
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await run(`
          UPDATE users SET pin_attempts = ?, pin_blocked_until = ? WHERE id = ?
        `, [newAttempts, blockedUntil.toISOString(), req.user.userId]);

        return res.status(403).json({ error: 'PIN incorrect. Compte bloqué 30 minutes.' });
      } else {
        await run('UPDATE users SET pin_attempts = ? WHERE id = ?', [newAttempts, req.user.userId]);
        return res.status(401).json({ error: `PIN incorrect. ${5 - newAttempts} tentative(s) restante(s).` });
      }
    }

    // Réinitialiser les tentatives
    await run('UPDATE users SET pin_attempts = 0, pin_blocked_until = NULL WHERE id = ?', [req.user.userId]);

    // Marquer la transaction comme validée
    if (transactionId) {
      await run('UPDATE transactions SET pin_verified = 1 WHERE id = ?', [transactionId]);
    }

    res.json({ success: true, message: 'PIN valide' });

  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Modifier le PIN (si connu)
app.post('/api/user/change-transaction-pin', authenticateToken, async (req, res) => {
  const { oldPin, newPin } = req.body;

  if (!oldPin || !newPin || !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'Le nouveau PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT transaction_pin, is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (!user.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    const isValid = await bcrypt.compare(oldPin, user.transaction_pin);

    if (!isValid) {
      return res.status(401).json({ error: 'Ancien PIN incorrect' });
    }

    const hashedNewPin = await bcrypt.hash(newPin, 10);

    await run('UPDATE users SET transaction_pin = ? WHERE id = ?', [hashedNewPin, req.user.userId]);

    res.json({ success: true, message: 'PIN modifié avec succès' });

  } catch (error) {
    console.error('Erreur modification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// Réinitialiser le PIN (admin uniquement)
app.post('/api/admin/reset-transaction-pin/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    await run(`
      UPDATE users 
      SET transaction_pin = NULL, is_pin_set = 0, pin_attempts = 0, pin_blocked_until = NULL 
      WHERE id = ?
    `, [userId]);

    res.json({ success: true, message: 'PIN réinitialisé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// Génération XML ISO 20022
function generateISO20022XML(transaction) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${transaction.reference}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${(transaction.amount / 100).toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>alkherpay System</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PAY-${transaction.reference}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>false</BtchBookg>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${(transaction.amount / 100).toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>URGP</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr>
        <Nm>Sender</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${transaction.sender_phone}</Id>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${transaction.sender_phone}</Id>
          </Othr>
        </Id>
      </DbtrAcct>
      <Cdtr>
        <Nm>Receiver</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${transaction.receiver_phone}</Id>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>${transaction.receiver_phone}</Id>
          </Othr>
        </Id>
      </CdtrAcct>
      <InstdAmt Ccy="XAF">${(transaction.net_amount / 100).toFixed(2)}</InstdAmt>
      <ChrgBr>SLEV</ChrgBr>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return xml;
}

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.user = user;
    next();
  });
}

// Middleware vérification admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

// Middleware vérification agent ou admin
function requireAgentOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Accès réservé aux agents et administrateurs' });
  }
  next();
}

// ============================================
// WEBSOCKETS (Transactions en temps réel)
// ============================================

io.on('connection', (socket) => {
  console.log('Nouveau client connecté:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.phone = decoded.phone;
      socket.join(`user_${decoded.userId}`);
      console.log(`User ${decoded.phone} authentifié sur socket`);
    } catch (err) {
      console.log('Authentification socket échouée');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

// Fonction pour envoyer une notification en temps réel
async function sendRealtimeNotification(userId, title, message, type = 'info') {
  io.to(`user_${userId}`).emit('notification', {
    title,
    message,
    type,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

// Inscription utilisateur
app.post('/api/auth/register', async (req, res) => {
  const { phone, fullname, password, province, city, address } = req.body;

  // Validation
  if (!phone || !fullname || !password || !province) {
    return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
  }

  if (!/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro est déjà enregistré' });
    }

    // Générer clé privée
    const privateKey = generatePrivateKey();
    const hashedPassword = await hashPassword(password);
    const hashedPrivateKey = await hashPassword(privateKey);

    // Créer l'utilisateur
    const result = await run(
      `INSERT INTO users (phone, fullname, password_hash, private_key_6, province, city, address, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'user')`,
      [phone, fullname, hashedPassword, hashedPrivateKey, province, city || '', address || '']
    );

    // Le trigger crée automatiquement le wallet avec 1000 FCFA

    // Générer les tokens
    const tokens = generateTokens(result.lastID, phone, 'user');

    // Enregistrer la session
    await run(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at) 
             VALUES (?, ?, ?, datetime('now', '+7 days'))`,
      [result.lastID, tokens.accessToken, tokens.refreshToken]
    );

    // Log
    await run(
      `INSERT INTO system_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [result.lastID, 'REGISTER', `Inscription du user ${phone}`]
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      private_key: privateKey, // À afficher une seule fois
      user: {
        id: result.lastID,
        phone,
        fullname,
        role: 'user'
      },
      tokens
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion par mot de passe
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
  }

  try {
    const user = await get(
      `SELECT id, phone, fullname, password_hash, role, is_active 
             FROM users WHERE phone = ?`,
      [phone]
    );

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Compte désactivé. Contactez l\'admin' });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const tokens = generateTokens(user.id, user.phone, user.role);

    // Enregistrer la session
    await run(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at) 
             VALUES (?, ?, ?, datetime('now', '+7 days'))`,
      [user.id, tokens.accessToken, tokens.refreshToken]
    );

    // Log
    await run(
      `INSERT INTO system_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [user.id, 'LOGIN', `Connexion de ${phone}`]
    );

    // Notification en temps réel
    await sendRealtimeNotification(user.id, 'Connexion', `Bienvenue ${user.fullname}`, 'info');

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname,
        role: user.role
      },
      tokens
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Connexion par clé privée
app.post('/api/auth/login-key', async (req, res) => {
  const { phone, privateKey } = req.body;

  if (!phone || !privateKey) {
    return res.status(400).json({ error: 'Téléphone et clé privée requis' });
  }

  try {
    const user = await get(
      `SELECT id, phone, fullname, private_key_6, role, is_active 
             FROM users WHERE phone = ?`,
      [phone]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const isValid = await verifyPassword(privateKey, user.private_key_6);
    if (!isValid) {
      return res.status(401).json({ error: 'Clé privée invalide' });
    }

    const tokens = generateTokens(user.id, user.phone, user.role);

    await run(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at) 
             VALUES (?, ?, ?, datetime('now', '+7 days'))`,
      [user.id, tokens.accessToken, tokens.refreshToken]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname,
        role: user.role
      },
      tokens
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Rafraîchir token
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requis' });
  }

  try {
    const session = await get('SELECT user_id FROM sessions WHERE refresh_token = ?', [refreshToken]);
    if (!session) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    const user = await get('SELECT id, phone, role FROM users WHERE id = ?', [session.user_id]);

    const newTokens = generateTokens(user.id, user.phone, user.role);

    await run(
      `UPDATE sessions SET token = ?, refresh_token = ?, expires_at = datetime('now', '+7 days') 
             WHERE refresh_token = ?`,
      [newTokens.accessToken, newTokens.refreshToken, refreshToken]
    );

    res.json(newTokens);

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du rafraîchissement' });
  }
});

// Déconnexion
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    await run('DELETE FROM sessions WHERE user_id = ?', [req.user.userId]);
    res.json({ success: true, message: 'Déconnecté' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

// ============================================
// ROUTES WALLET
// ============================================

// Obtenir le solde du wallet
app.get('/api/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await get(
      `SELECT w.balance, u.fullname, u.phone, u.province
             FROM wallets w
             JOIN users u ON w.user_id = u.id
             WHERE u.id = ?`,
      [req.user.userId]
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet non trouvé' });
    }

    res.json({
      balance: wallet.balance,
      currency: 'XAF',
      fullname: wallet.fullname,
      phone: wallet.phone,
      province: wallet.province
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du solde' });
  }
});

// Historique des transactions
app.get('/api/wallet/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const user = await get('SELECT phone FROM users WHERE id = ?', [req.user.userId]);

    const transactions = await query(
      `SELECT * FROM v_transactions_details 
             WHERE sender_phone = ? OR receiver_phone = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
      [user.phone, user.phone, parseInt(limit), parseInt(offset)]
    );

    const total = await get(
      `SELECT COUNT(*) as count FROM transactions 
             WHERE sender_phone = ? OR receiver_phone = ?`,
      [user.phone, user.phone]
    );

    res.json({
      transactions,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// ============================================
// ENDPOINTS POUR LE PIN DE TRANSACTION
// ============================================

// Définir le PIN de transaction (première transaction)
app.post('/api/user/set-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  console.log('🔐 Définition PIN pour user:', req.user.userId);

  // Validation du PIN
  if (!pin) {
    return res.status(400).json({ error: 'Le PIN est requis' });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (user && user.is_pin_set) {
      return res.status(400).json({ error: 'Un PIN est déjà défini' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await run(`
      UPDATE users 
      SET transaction_pin = ?, is_pin_set = 1, pin_attempts = 0, pin_blocked_until = NULL
      WHERE id = ?
    `, [hashedPin, req.user.userId]);

    res.json({
      success: true,
      message: 'PIN de transaction défini avec succès'
    });

  } catch (error) {
    console.error('Erreur définition PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du PIN' });
  }
});

// Vérifier le PIN de transaction
app.post('/api/user/verify-transaction-pin', authenticateToken, async (req, res) => {
  const { pin, transactionId } = req.body;

  console.log('🔐 Vérification PIN pour user:', req.user.userId);

  if (!pin) {
    return res.status(400).json({ error: 'Le PIN est requis' });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get(`
      SELECT id, transaction_pin, is_pin_set, pin_attempts, pin_blocked_until 
      FROM users WHERE id = ?
    `, [req.user.userId]);

    if (!user || !user.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    // Vérifier si le PIN est bloqué
    if (user.pin_blocked_until && new Date(user.pin_blocked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.pin_blocked_until) - new Date()) / 60000);
      return res.status(403).json({
        error: `Trop de tentatives. Réessayez dans ${waitMinutes} minutes.`
      });
    }

    const isValid = await bcrypt.compare(pin, user.transaction_pin);

    if (!isValid) {
      const newAttempts = (user.pin_attempts || 0) + 1;

      if (newAttempts >= 5) {
        // Bloquer le PIN pendant 30 minutes après 5 tentatives
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await run(`
          UPDATE users SET pin_attempts = ?, pin_blocked_until = ? WHERE id = ?
        `, [newAttempts, blockedUntil.toISOString(), req.user.userId]);

        return res.status(403).json({ error: 'PIN incorrect. Compte bloqué 30 minutes.' });
      } else {
        await run('UPDATE users SET pin_attempts = ? WHERE id = ?', [newAttempts, req.user.userId]);
        return res.status(401).json({ error: `PIN incorrect. ${5 - newAttempts} tentative(s) restante(s).` });
      }
    }

    // Réinitialiser les tentatives
    await run('UPDATE users SET pin_attempts = 0, pin_blocked_until = NULL WHERE id = ?', [req.user.userId]);

    // Marquer la transaction comme validée (optionnel)
    if (transactionId) {
      await run('UPDATE transactions SET pin_verified = 1 WHERE id = ?', [transactionId]);
    }

    res.json({ success: true, message: 'PIN valide' });

  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Modifier le PIN (si connu)
app.post('/api/user/change-transaction-pin', authenticateToken, async (req, res) => {
  const { oldPin, newPin } = req.body;

  if (!oldPin || !newPin) {
    return res.status(400).json({ error: 'Ancien et nouveau PIN requis' });
  }

  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'Le nouveau PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT transaction_pin, is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (!user || !user.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    const isValid = await bcrypt.compare(oldPin, user.transaction_pin);

    if (!isValid) {
      return res.status(401).json({ error: 'Ancien PIN incorrect' });
    }

    const hashedNewPin = await bcrypt.hash(newPin, 10);

    await run('UPDATE users SET transaction_pin = ? WHERE id = ?', [hashedNewPin, req.user.userId]);

    res.json({ success: true, message: 'PIN modifié avec succès' });

  } catch (error) {
    console.error('Erreur modification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// backend/server.js - Ajouter ces endpoints

// ============================================
// GESTION DU PIN UTILISATEUR
// ============================================

// Vérifier si l'utilisateur a un PIN
app.get('/api/user/pin-status', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT is_pin_set FROM users WHERE id = ?', [req.user.userId]);
    res.json({ hasPin: user?.is_pin_set === 1 });
  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Définir le PIN (première fois ou réinitialisation par admin)
app.post('/api/user/set-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const hashedPin = await bcrypt.hash(pin, 10);

    await run(`
      UPDATE users 
      SET transaction_pin = ?, is_pin_set = 1, pin_attempts = 0, pin_blocked_until = NULL
      WHERE id = ?
    `, [hashedPin, req.user.userId]);

    // Créer une notification de confirmation
    await run(`
      INSERT INTO notifications (user_id, title, message, type, category, created_at)
      VALUES (?, '🔐 PIN sécurisé', 'Votre code PIN a été défini avec succès', 'success', 'security', CURRENT_TIMESTAMP)
    `, [req.user.userId]);

    res.json({ success: true, message: 'PIN défini avec succès' });

  } catch (error) {
    console.error('Erreur définition PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du PIN' });
  }
});

// Vérifier le PIN avant transaction
app.post('/api/user/verify-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN invalide' });
  }

  try {
    const user = await get(`
      SELECT transaction_pin, is_pin_set, pin_attempts, pin_blocked_until 
      FROM users WHERE id = ?
    `, [req.user.userId]);

    if (!user?.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    // Vérifier le blocage
    if (user.pin_blocked_until && new Date(user.pin_blocked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.pin_blocked_until) - new Date()) / 60000);
      return res.status(403).json({ error: `PIN bloqué. Réessayez dans ${waitMinutes} min.` });
    }

    const isValid = await bcrypt.compare(pin, user.transaction_pin);

    if (!isValid) {
      const newAttempts = (user.pin_attempts || 0) + 1;
      const remainingAttempts = 5 - newAttempts;

      if (newAttempts >= 5) {
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await run(`
          UPDATE users SET pin_attempts = ?, pin_blocked_until = ? WHERE id = ?
        `, [newAttempts, blockedUntil.toISOString(), req.user.userId]);

        // Notification d'alerte
        await run(`
          INSERT INTO notifications (user_id, title, message, type, category, created_at)
          VALUES (?, '⚠️ PIN bloqué', 'Trop de tentatives incorrectes. PIN bloqué 30 minutes.', 'alert', 'security', CURRENT_TIMESTAMP)
        `, [req.user.userId]);

        return res.status(403).json({ error: 'PIN bloqué 30 minutes' });
      } else {
        await run('UPDATE users SET pin_attempts = ? WHERE id = ?', [newAttempts, req.user.userId]);
        return res.status(401).json({ error: `PIN incorrect. ${remainingAttempts} tentative(s) restante(s).` });
      }
    }

    // Réinitialiser les tentatives
    await run('UPDATE users SET pin_attempts = 0, pin_blocked_until = NULL WHERE id = ?', [req.user.userId]);

    res.json({ success: true, message: 'PIN valide' });

  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Demander une réinitialisation de PIN (mot de passe oublié)
app.post('/api/user/request-pin-reset', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Créer une demande de réinitialisation
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await run(`
      INSERT INTO pin_reset_requests (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [req.user.userId, token, expiresAt.toISOString()]);

    // Notification à l'admin
    const admin = await get('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admin) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, category, metadata, created_at)
        VALUES (?, '🆘 Demande réinitialisation PIN', ?, 'alert', 'admin', ?, CURRENT_TIMESTAMP)
      `, [admin.id, `${user.fullname} (${user.phone}) demande une réinitialisation de son code PIN.`, JSON.stringify({ userId: req.user.userId, token })]);
    }

    res.json({
      success: true,
      message: 'Demande envoyée. Un administrateur vous contactera.'
    });

  } catch (error) {
    console.error('Erreur demande réinitialisation:', error);
    res.status(500).json({ error: 'Erreur lors de la demande' });
  }
});

// Admin: Réinitialiser le PIN d'un utilisateur
app.post('/api/admin/reset-user-pin/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await get('SELECT id, fullname, phone FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Réinitialiser le PIN
    await run(`
      UPDATE users 
      SET transaction_pin = NULL, is_pin_set = 0, pin_attempts = 0, pin_blocked_until = NULL
      WHERE id = ?
    `, [userId]);

    // Notification à l'utilisateur
    await run(`
      INSERT INTO notifications (user_id, title, message, type, category, created_at)
      VALUES (?, ' PIN réinitialisé', 'Votre code PIN a été réinitialisé par l administrateur. Veuillez en définir un nouveau.', 'info', 'security', CURRENT_TIMESTAMP)
    `, [userId]);

    // Log admin
    await run(`
      INSERT INTO system_logs (user_id, action, details, created_at)
      VALUES (?, 'PIN_RESET', ?, CURRENT_TIMESTAMP)
    `, [req.user.userId, `Réinitialisation du PIN de l'utilisateur ${user.fullname} (${user.phone})`]);

    res.json({
      success: true,
      message: `PIN de ${user.fullname} réinitialisé avec succès`
    });

  } catch (error) {
    console.error('Erreur réinitialisation PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// Admin: Obtenir la liste des utilisateurs sans PIN
app.get('/api/admin/users-without-pin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT id, fullname, phone, created_at
      FROM users 
      WHERE role = 'user' AND (is_pin_set = 0 OR is_pin_set IS NULL)
      ORDER BY created_at DESC
    `);

    res.json({ users: users || [] });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});
// backend/server.js - Ajouter ces endpoints

// ============================================
// GESTION DU PIN UTILISATEUR
// ============================================

// Vérifier si l'utilisateur a un PIN
app.get('/api/user/pin-status', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT is_pin_set FROM users WHERE id = ?', [req.user.userId]);
    res.json({ hasPin: user?.is_pin_set === 1 });
  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Définir le PIN (première transaction)
app.post('/api/user/set-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (user?.is_pin_set) {
      return res.status(400).json({ error: 'Un PIN est déjà défini' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await run(`
      UPDATE users 
      SET transaction_pin = ?, is_pin_set = 1, pin_attempts = 0, pin_blocked_until = NULL
      WHERE id = ?
    `, [hashedPin, req.user.userId]);

    // Notification de confirmation
    await run(`
      INSERT INTO notifications (user_id, title, message, type, category, created_at)
      VALUES (?, '🔐 PIN sécurisé', 'Votre code PIN a été défini avec succès pour sécuriser vos transactions', 'success', 'security', CURRENT_TIMESTAMP)
    `, [req.user.userId]);

    res.json({ success: true, message: 'PIN défini avec succès' });

  } catch (error) {
    console.error('Erreur définition PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du PIN' });
  }
});

// Vérifier le PIN avant transaction
app.post('/api/user/verify-transaction-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN invalide' });
  }

  try {
    const user = await get(`
      SELECT transaction_pin, is_pin_set, pin_attempts, pin_blocked_until 
      FROM users WHERE id = ?
    `, [req.user.userId]);

    if (!user?.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    // Vérifier le blocage
    if (user.pin_blocked_until && new Date(user.pin_blocked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.pin_blocked_until) - new Date()) / 60000);
      return res.status(403).json({ error: `PIN bloqué. Réessayez dans ${waitMinutes} min.` });
    }

    const isValid = await bcrypt.compare(pin, user.transaction_pin);

    if (!isValid) {
      const newAttempts = (user.pin_attempts || 0) + 1;
      const remainingAttempts = 5 - newAttempts;

      if (newAttempts >= 5) {
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await run(`
          UPDATE users SET pin_attempts = ?, pin_blocked_until = ? WHERE id = ?
        `, [newAttempts, blockedUntil.toISOString(), req.user.userId]);

        // Notification d'alerte
        await run(`
          INSERT INTO notifications (user_id, title, message, type, category, created_at)
          VALUES (?, '⚠️ PIN bloqué', 'Trop de tentatives incorrectes. PIN bloqué 30 minutes.', 'alert', 'security', CURRENT_TIMESTAMP)
        `, [req.user.userId]);

        return res.status(403).json({ error: 'PIN bloqué 30 minutes' });
      } else {
        await run('UPDATE users SET pin_attempts = ? WHERE id = ?', [newAttempts, req.user.userId]);
        return res.status(401).json({ error: `PIN incorrect. ${remainingAttempts} tentative(s) restante(s).` });
      }
    }

    // Réinitialiser les tentatives
    await run('UPDATE users SET pin_attempts = 0, pin_blocked_until = NULL WHERE id = ?', [req.user.userId]);

    res.json({ success: true, message: 'PIN valide' });

  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Modifier le PIN (si connu)
app.post('/api/user/change-transaction-pin', authenticateToken, async (req, res) => {
  const { oldPin, newPin } = req.body;

  if (!oldPin || !newPin) {
    return res.status(400).json({ error: 'Ancien et nouveau PIN requis' });
  }

  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'Le nouveau PIN doit contenir 4 chiffres' });
  }

  try {
    const user = await get('SELECT transaction_pin, is_pin_set FROM users WHERE id = ?', [req.user.userId]);

    if (!user?.is_pin_set) {
      return res.status(400).json({ error: 'Aucun PIN défini' });
    }

    const isValid = await bcrypt.compare(oldPin, user.transaction_pin);

    if (!isValid) {
      return res.status(401).json({ error: 'Ancien PIN incorrect' });
    }

    const hashedNewPin = await bcrypt.hash(newPin, 10);

    await run('UPDATE users SET transaction_pin = ?, pin_attempts = 0 WHERE id = ?', [hashedNewPin, req.user.userId]);

    await run(`
      INSERT INTO notifications (user_id, title, message, type, category, created_at)
      VALUES (?, '🔄 PIN modifié', 'Votre code PIN a été modifié avec succès', 'success', 'security', CURRENT_TIMESTAMP)
    `, [req.user.userId]);

    res.json({ success: true, message: 'PIN modifié avec succès' });

  } catch (error) {
    console.error('Erreur modification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// Admin: Obtenir les demandes de réinitialisation de PIN
app.get('/api/admin/pin-reset-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requests = await query(`
      SELECT pr.*, u.fullname, u.phone, u.email
      FROM pin_reset_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.expires_at > CURRENT_TIMESTAMP AND pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `);

    res.json({ requests: requests || [] });
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Admin: Marquer une demande comme traitée
app.put('/api/admin/pin-reset-requests/:id/process', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await run('UPDATE pin_reset_requests SET status = "processed", processed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur traitement demande:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});

// Récupérer la liste des agents actifs (public)
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await query(`
      SELECT u.id, u.fullname, u.phone, u.province, u.city, 
             a.agency_name, a.agency_address, a.agency_type
      FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' AND u.is_active = 1 AND a.is_active = 1
      ORDER BY u.fullname ASC
    `)

    res.json(agents || [])
  } catch (error) {
    console.error('Erreur récupération agents:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' })
  }
})
// backend/server.js - Endpoint public pour les agents

// Récupérer la liste des agents actifs
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await query(`
      SELECT 
        u.id, 
        u.fullname, 
        u.phone, 
        u.province, 
        u.city,
        a.agency_name, 
        a.agency_address, 
        a.agency_type
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
      ORDER BY u.fullname ASC
    `)

    res.json(agents || [])
  } catch (error) {
    console.error('Erreur récupération agents:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' })
  }
})
// backend/server.js - Ajouter ou vérifier cet endpoint

app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await query(`
      SELECT 
        u.id, 
        u.fullname, 
        u.phone, 
        u.province, 
        u.city,
        a.agency_name, 
        a.agency_address, 
        a.agency_type
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
      ORDER BY u.fullname ASC
    `)

    res.json(agents || [])
  } catch (error) {
    console.error('Erreur récupération agents:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' })
  }
})
// backend/server.js - Endpoints notifications améliorés
// backend/server.js - Corriger l'endpoint des notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0, category = 'all' } = req.query;

  try {
    // Supprimer la colonne 'data' qui n'existe pas
    let sql = `
      SELECT id, title, message, type, category, is_read, metadata, link, created_at, read_at
      FROM notifications 
      WHERE user_id = ? OR user_id IS NULL
    `;
    const params = [req.user.userId];

    if (category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = await query(sql, params);

    // Compter le nombre total
    let countSql = `
      SELECT COUNT(*) as total FROM notifications 
      WHERE user_id = ? OR user_id IS NULL
    `;
    if (category !== 'all') {
      countSql += ' AND category = ?';
    }

    const total = await get(countSql, params.slice(0, category !== 'all' ? 2 : 1));

    // Compter les non lues
    const unreadResult = await get(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [req.user.userId]);

    res.json({
      notifications: notifications || [],
      total: total?.total || 0,
      unread_count: unreadResult?.count || 0
    });

  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// Marquer une notification comme lue
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    await run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur marquage notification:', error)
    res.status(500).json({ error: 'Erreur lors du marquage' })
  }
})

// Marquer toutes les notifications comme lues
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error)
    res.status(500).json({ error: 'Erreur lors du marquage' })
  }
})

// Supprimer une notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    await run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression notification:', error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

// Supprimer toutes les notifications
app.delete('/api/notifications/all', authenticateToken, async (req, res) => {
  try {
    await run(
      'DELETE FROM notifications WHERE user_id = ?',
      [req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression toutes notifications:', error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

// Créer une notification pour un utilisateur
async function createNotification(userId, title, message, type = 'info', data = null) {
  try {
    const result = await run(`
      INSERT INTO notifications (user_id, title, message, type, data, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, title, message, type, data ? JSON.stringify(data) : null])

    // Envoyer en temps réel via Socket.IO
    const notification = {
      id: result.lastID,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
      data
    }

    io.to(`user_${userId}`).emit('new_notification', notification)

    return notification
  } catch (error) {
    console.error('Erreur création notification:', error)
    return null
  }
}

// backend/server.js - Endpoint de retrait corrigé
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  const { amount, agent_id, agent_phone, description } = req.body;

  console.log('Requête retrait reçue:', { amount, agent_id, agent_phone, user: req.user });

  // Validation des données reçues
  if (!amount) {
    return res.status(400).json({ error: 'Le montant est requis' });
  }

  const amountNum = parseInt(amount);

  if (isNaN(amountNum) || amountNum < 25) {
    return res.status(400).json({ error: 'Le montant minimum est de 25 FCFA' });
  }

  if (amountNum > 10000000) {
    return res.status(400).json({ error: 'Le montant maximum est de 10 000 000 FCFA' });
  }

  // Récupérer l'utilisateur
  const user = await get('SELECT id, phone, fullname, is_active FROM users WHERE id = ?', [req.user.userId]);

  if (!user || !user.is_active) {
    return res.status(404).json({ error: 'Utilisateur non trouvé ou compte inactif' });
  }

  // Récupérer l'agent
  let agent = null;
  if (agent_id) {
    agent = await get('SELECT id, phone, fullname FROM users WHERE id = ? AND role = "agent" AND is_active = 1', [agent_id]);
  } else if (agent_phone) {
    agent = await get('SELECT id, phone, fullname FROM users WHERE phone = ? AND role = "agent" AND is_active = 1', [agent_phone]);
  }

  if (!agent) {
    return res.status(404).json({ error: 'Agent non trouvé' });
  }

  // Vérifier le solde
  const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);

  if (!wallet || wallet.balance < amountNum) {
    return res.status(400).json({ error: 'Solde insuffisant' });
  }

  // Calculer les frais (2%)
  const fee = Math.floor(amountNum * 0.02);
  const totalAmount = amountNum + fee;

  // Récupérer le wallet admin
  const adminWallet = await get(
    `SELECT w.id FROM wallets w 
     JOIN users u ON w.user_id = u.id 
     WHERE u.role = 'admin' AND u.phone = '62787307'`
  );

  const reference = `WDR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  try {
    await run('BEGIN TRANSACTION');

    // Débiter l'utilisateur
    await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, user.id]);

    // Créditer les frais à l'admin
    if (adminWallet) {
      await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
    }

    // Enregistrer la transaction
    await run(`
      INSERT INTO transactions 
      (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'withdraw', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [reference, user.phone, agent.phone, amountNum, fee, amountNum - fee, description || '']);

    // Créer une notification pour l'utilisateur
    await run(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Retrait effectué', ?, 'transaction')
    `, [user.id, `Vous avez retiré ${amountNum.toLocaleString()} FCFA chez ${agent.fullname}`]);

    await run('COMMIT');

    res.json({
      success: true,
      reference: reference,
      amount: amountNum,
      fee: fee,
      netAmount: amountNum - fee,
      new_balance: wallet.balance - totalAmount
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('Erreur retrait:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du retrait' });
  }
});

// Endpoint pour les dépôts
app.post('/api/deposit', authenticateToken, async (req, res) => {
  const { amount, agent_id, description } = req.body

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Montant minimum de dépôt: 100 FCFA' })
  }

  try {
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId])
    const agent = await get('SELECT id, fullname, phone FROM users WHERE id = ?', [agent_id])

    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' })
    }

    const reference = generateTransactionReference()

    await run('BEGIN TRANSACTION')

    // Créditer l'utilisateur
    await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, user.id])

    // Enregistrer la transaction
    await run(`
      INSERT INTO transactions 
      (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
      VALUES (?, ?, ?, ?, 0, ?, 'deposit', 'completed', ?)
    `, [reference, agent.phone, user.phone, amount, amount, description || `Dépôt de ${amount} FCFA chez ${agent.fullname}`])

    await run('COMMIT')

    // Notification
    await sendRealtimeNotification(user.id, 'Dépôt réussi', `${amount.toLocaleString()} FCFA ont été ajoutés à votre compte`, 'transaction')

    res.json({
      success: true,
      reference,
      amount
    })

  } catch (error) {
    await run('ROLLBACK')
    console.error('Erreur dépôt:', error)
    res.status(500).json({ error: 'Erreur lors du dépôt' })
  }
})
// backend/server.js - Ajouter/modifier ces endpoints
// backend/server.js - Endpoint public pour les agents
app.get('/api/agents', async (req, res) => {
  const { city, search, limit = 50, offset = 0 } = req.query;

  console.log('📋 Requête agents reçue:', { city, search, limit, offset });

  try {
    let sql = `
      SELECT 
        u.id, 
        u.fullname, 
        u.phone, 
        u.province, 
        u.city,
        a.id as agent_id,
        a.agency_name, 
        a.agency_address, 
        a.agency_phone, 
        a.agency_type,
        a.is_active
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
    `;
    const params = [];

    if (city && city !== 'all') {
      sql += ' AND (u.city = ? OR u.province = ?)';
      params.push(city, city);
    }

    if (search) {
      sql += ' AND (u.fullname LIKE ? OR u.phone LIKE ? OR a.agency_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY a.agency_type DESC, u.fullname ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const agents = await query(sql, params);

    // Compter le total
    let countSql = `
      SELECT COUNT(*) as total 
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
    `;
    const countParams = [];

    if (city && city !== 'all') {
      countSql += ' AND (u.city = ? OR u.province = ?)';
      countParams.push(city, city);
    }

    if (search) {
      countSql += ' AND (u.fullname LIKE ? OR u.phone LIKE ? OR a.agency_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = await get(countSql, countParams);

    // Récupérer les villes disponibles
    const citiesResult = await query(`
      SELECT DISTINCT u.city, u.province 
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
        AND (u.city IS NOT NULL OR u.province IS NOT NULL)
    `);

    const cities = [...new Set(
      citiesResult.map(c => c.city || c.province).filter(Boolean)
    )];

    console.log(`✅ ${agents.length} agents trouvés dans la base`);

    res.json({
      agents: agents || [],
      total: total?.total || 0,
      cities: cities || [],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Erreur récupération agents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' });
  }
});



// ============================================
// ENDPOINTS NOTIFICATIONS AMÉLIORÉS
// ============================================

// backend/server.js - Ajouter cet endpoint

// Approuver ou rejeter une candidature (admin uniquement)
app.post('/api/admin/agent-applications/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  console.log('📋 Traitement candidature:', { id, action, rejection_reason });

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }

  try {
    const application = await get('SELECT * FROM agent_applications WHERE id = ?', [id]);

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Cette candidature a déjà été traitée' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await run(`
      UPDATE agent_applications 
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `, [newStatus, req.user.userId, rejection_reason || null, id]);

    // Si approuvé, créer le compte agent
    if (action === 'approve') {
      const tempPassword = Math.random().toString(36).slice(-8);
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const hashedKey = await bcrypt.hash(privateKey, 10);

      // Créer l'utilisateur agent
      const userResult = await run(`
        INSERT INTO users (phone, fullname, password_hash, private_key_6, province, city, email, role, is_active, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
      `, [
        application.phone,
        application.fullname,
        hashedPassword,
        hashedKey,
        application.province || 'N\'Djaména',
        application.city || null,
        application.email || null
      ]);

      // Créer l'agence
      const agencyNumber = 'AG' + Date.now().toString().slice(-6);
      await run(`
        INSERT INTO agents (user_id, agency_number, agency_name, agency_address, agency_phone, agency_type, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'secondaire', ?, CURRENT_TIMESTAMP)
      `, [
        userResult.lastID,
        agencyNumber,
        application.agency_name,
        application.agency_address,
        application.phone,
        req.user.userId
      ]);

      // Notification au nouvel agent
      await run(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, '✅ Bienvenue dans le réseau alkherpay', ?, 'success', CURRENT_TIMESTAMP)
      `, [userResult.lastID, `Félicitations ! Votre agence "${application.agency_name}" est maintenant active.`]);
    }

    // Notification à l'utilisateur
    const title = action === 'approve' ? '✅ Candidature acceptée' : '❌ Candidature rejetée';
    const message = action === 'approve'
      ? 'Félicitations ! Votre candidature pour devenir agent alkherpay a été acceptée.'
      : `Votre candidature a été rejetée. Raison: ${rejection_reason || 'Non conforme'}`;

    // Envoyer la notification (si l'utilisateur a un compte)
    const user = await get('SELECT id FROM users WHERE phone = ?', [application.phone]);
    if (user) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, ?, ?, 'alert', CURRENT_TIMESTAMP)
      `, [user.id, title, message]);
    }

    res.json({
      success: true,
      message: `Candidature ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur traitement candidature:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});


// Envoyer une notification pour toute transaction
async function sendTransactionNotification(userId, type, data) {
  let title = '';
  let message = '';
  let notifType = 'transaction';

  switch (type) {
    case 'transfer_sent':
      title = '💸 Transfert envoyé';
      message = `Vous avez envoyé ${data.amount.toLocaleString()} FCFA à ${data.receiver_name}. Frais: ${data.fee.toLocaleString()} FCFA`;
      break;
    case 'transfer_received':
      title = '💰 Transfert reçu';
      message = `Vous avez reçu ${data.amount.toLocaleString()} FCFA de ${data.sender_name}`;
      break;
    case 'deposit':
      title = '🏦 Dépôt effectué';
      message = `Vous avez déposé ${data.amount.toLocaleString()} FCFA chez ${data.agent_name || 'un agent alkherpay'}`;
      break;
    case 'withdraw':
      title = '💵 Retrait effectué';
      message = `Vous avez retiré ${data.amount.toLocaleString()} FCFA chez ${data.agent_name}. Frais: ${data.fee.toLocaleString()} FCFA`;
      break;
    case 'fee_collected':
      title = '📊 Frais prélevés';
      message = `Des frais de ${data.fee.toLocaleString()} FCFA ont été prélevés sur votre transaction`;
      break;
    default:
      title = '🔄 Transaction';
      message = `Une transaction de ${data.amount.toLocaleString()} FCFA a été effectuée`;
  }

  // Insérer la notification
  await run(`
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, title, message, notifType]);

  return { title, message, type: notifType };
}

// Endpoint pour récupérer les notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await query(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.userId]);

    res.json(notifications || []);
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.json([]);
  }
});

// Endpoint pour marquer une notification comme lue
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await run(`
      UPDATE notifications SET is_read = 1 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `, [id, req.user.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du marquage' });
  }
});

// Endpoint pour marquer toutes les notifications comme lues
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await run(`
      UPDATE notifications SET is_read = 1 
      WHERE user_id = ? OR user_id IS NULL
    `, [req.user.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du marquage' });
  }
});

// ============================================
// ENDPOINTS AGENTS DYNAMIQUES
// ============================================


// src/pages/Agents.jsx - Modifier fetchAgents

const fetchAgents = async () => {
  setLoading(true)
  try {
    const params = {
      limit: agentsPerPage,
      offset: (currentPage - 1) * agentsPerPage
    }

    if (selectedCity !== 'all') {
      params.city = selectedCity
    }

    if (searchTerm) {
      params.search = searchTerm
    }

    // Ne pas envoyer de token pour cette requête publique
    const response = await axios.get('/api/agents', { params })

    if (response.data && response.data.agents) {
      setAgents(response.data.agents)
      setTotalPages(Math.ceil(response.data.total / agentsPerPage))
      setTotalAgents(response.data.total)
      setCities(response.data.cities || [])
    } else {
      setAgents([])
      setCities([])
    }
  } catch (error) {
    console.error('Erreur chargement agents:', error)
    setAgents([])
    setCities([])
    // Ne pas afficher d'erreur pour les utilisateurs non connectés
    if (error.response?.status !== 401) {
      toast.error('Erreur lors du chargement des agents')
    }
  } finally {
    setLoading(false)
  }
}
// Récupérer tous les agents actifs
app.get('/api/agents', async (req, res) => {
  const { city, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT u.id, u.fullname, u.phone, u.province, u.city,
             a.agency_name, a.agency_address, a.agency_phone, a.agency_type,
             a.commission_rate, a.is_active
      FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' AND u.is_active = 1 AND a.is_active = 1
    `;
    const params = [];

    if (city && city !== 'all') {
      sql += ' AND (u.city = ? OR u.province = ?)';
      params.push(city, city);
    }

    if (search) {
      sql += ' AND (u.fullname LIKE ? OR u.phone LIKE ? OR a.agency_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY a.agency_type DESC, u.fullname ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const agents = await query(sql, params);

    // Compter le total
    let countSql = `
      SELECT COUNT(*) as total FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' AND u.is_active = 1 AND a.is_active = 1
    `;
    const countParams = [];

    if (city && city !== 'all') {
      countSql += ' AND (u.city = ? OR u.province = ?)';
      countParams.push(city, city);
    }

    const total = await get(countSql, countParams);

    // Récupérer les villes disponibles
    const cities = await query(`
      SELECT DISTINCT u.city, u.province 
      FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' AND u.is_active = 1 AND a.is_active = 1
      AND (u.city IS NOT NULL OR u.province IS NOT NULL)
    `);

    res.json({
      agents,
      total: total?.total || 0,
      cities: cities.map(c => c.city || c.province).filter(Boolean),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erreur récupération agents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' });
  }
});

// Récupérer les horaires d'un agent
app.get('/api/agents/:id/schedule', async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await get(`
      SELECT * FROM agent_schedules 
      WHERE agent_id = ?
    `, [id]);

    if (!schedule) {
      // Horaires par défaut
      res.json({
        monday: { open: '08:00', close: '18:00', closed: false },
        tuesday: { open: '08:00', close: '18:00', closed: false },
        wednesday: { open: '08:00', close: '18:00', closed: false },
        thursday: { open: '08:00', close: '18:00', closed: false },
        friday: { open: '08:00', close: '18:00', closed: false },
        saturday: { open: '09:00', close: '13:00', closed: false },
        sunday: { open: null, close: null, closed: true }
      });
    } else {
      res.json(schedule);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des horaires' });
  }
});

// Récupérer les avis sur un agent
app.get('/api/agents/:id/reviews', async (req, res) => {
  const { id } = req.params;

  try {
    const reviews = await query(`
      SELECT r.*, u.fullname as user_name
      FROM agent_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.agent_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [id]);

    const stats = await get(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM agent_reviews
      WHERE agent_id = ? AND status = 'approved'
    `, [id]);

    res.json({
      reviews: reviews || [],
      stats: stats || { average_rating: 0, total_reviews: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
});

// Ajouter un avis sur un agent
app.post('/api/agents/:id/review', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Note invalide' });
  }

  try {
    await run(`
      INSERT INTO agent_reviews (agent_id, user_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [id, req.user.userId, rating, comment || null]);

    res.json({ success: true, message: 'Avis ajouté avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' });
  }
});

// Télécharger XML ISO 20022 d'une transaction
app.get('/api/transaction/:reference/xml', authenticateToken, async (req, res) => {
  const { reference } = req.params;

  try {
    const user = await get('SELECT phone FROM users WHERE id = ?', [req.user.userId]);

    const transaction = await get(
      `SELECT * FROM transactions 
             WHERE reference = ? AND (sender_phone = ? OR receiver_phone = ?)`,
      [reference, user.phone, user.phone]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=transaction_${reference}.xml`);
    res.send(transaction.xml_iso20022);

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// ============================================
// ROUTES QR CODE
// ============================================

// Générer QR code pour un utilisateur
app.get('/api/qr/generate/:phone', authenticateToken, async (req, res) => {
  const { phone } = req.params;
  const { amount } = req.query;

  try {
    const qrData = JSON.stringify({
      type: 'transfer',
      recipient: phone,
      amount: amount || null,
      currency: 'XAF'
    });

    const qrCode = await QRCode.toDataURL(qrData);

    res.json({ qrCode, data: qrData });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
  }
});

// Scanner QR code
app.post('/api/qr/scan', authenticateToken, async (req, res) => {
  const { qrData } = req.body;

  try {
    const data = JSON.parse(qrData);

    if (data.type === 'transfer') {
      // Initier un transfert vers le destinataire
      const transferReq = {
        receiver_phone: data.recipient,
        amount: data.amount || 0
      };

      // Rediriger vers l'API de transfert
      req.body = transferReq;
      // (Appeler la logique de transfert)
    }

    res.json({ success: true, data });

  } catch (error) {
    res.status(400).json({ error: 'QR code invalide' });
  }
});
// ============================================
// ROUTES ADMIN - TRANSFERTS
// ============================================

// ✅ Endpoint /api/transfer CORRIGÉ
app.post('/api/transfer', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { receiver_phone, amount, description } = req.body;

    // Variable pour suivre la transaction
    let transactionActive = false;

    // Validation
    if (!receiver_phone || !amount) {
        return res.status(400).json({ 
            success: false,
            error: 'Destinataire et montant requis' 
        });
    }

    const amountNum = parseInt(amount);
    if (amountNum < 25) {
        return res.status(400).json({ 
            success: false,
            error: 'Le montant minimum est de 25 FCFA' 
        });
    }

    try {
        // 1. Récupérer l'expéditeur
        const sender = await get(
            'SELECT id, phone, fullname, is_active FROM users WHERE id = ?', 
            [userId]
        );

        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'Expéditeur non trouvé'
            });
        }

        if (sender.is_active !== 1) {
            return res.status(403).json({
                success: false,
                error: 'Votre compte est inactif'
            });
        }

        // 2. Vérifier le solde
        const senderWallet = await get(
            'SELECT id, balance FROM wallets WHERE user_id = ?', 
            [sender.id]
        );

        if (!senderWallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet non trouvé'
            });
        }

        const fee = Math.floor(amountNum * 0.02);
        const totalAmount = amountNum + fee;

        if (senderWallet.balance < totalAmount) {
            return res.status(400).json({ 
                success: false,
                error: `Solde insuffisant. Vous avez ${senderWallet.balance} FCFA, besoin de ${totalAmount} FCFA` 
            });
        }

        // 3. Récupérer le destinataire
        const receiver = await get(
            'SELECT id, phone, fullname, is_active FROM users WHERE phone = ?', 
            [receiver_phone]
        );

        if (!receiver) {
            return res.status(404).json({ 
                success: false,
                error: 'Destinataire non trouvé' 
            });
        }

        if (receiver.id === sender.id) {
            return res.status(400).json({ 
                success: false,
                error: 'Vous ne pouvez pas vous envoyer d\'argent à vous-même' 
            });
        }

        if (receiver.is_active !== 1) {
            return res.status(403).json({
                success: false,
                error: 'Le compte du destinataire est inactif'
            });
        }

        // 4. Récupérer le wallet admin
        const adminWallet = await get(
            `SELECT w.id FROM wallets w
             JOIN users u ON w.user_id = u.id
             WHERE u.role = 'admin' AND u.phone = '62787307'`
        );

        // 5. Vérifier le wallet du destinataire
        let receiverWallet = await get(
            'SELECT id, balance FROM wallets WHERE user_id = ?', 
            [receiver.id]
        );

        if (!receiverWallet) {
            // Créer un wallet pour le destinataire
            await run(
                'INSERT INTO wallets (user_id, balance) VALUES (?, 0)',
                [receiver.id]
            );
            receiverWallet = await get(
                'SELECT id, balance FROM wallets WHERE user_id = ?',
                [receiver.id]
            );
        }

        // 6. Générer une référence unique
        const reference = `TRF${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // 7. Générer XML ISO 20022
        const xml = generateISO20022XML({
            reference,
            sender_phone: sender.phone,
            receiver_phone: receiver.phone,
            amount: amountNum,
            net_amount: amountNum,
            fee: fee
        });

        // 8. Démarrer la transaction
        console.log('🔄 Début de la transaction...');
        await run('BEGIN TRANSACTION');
        transactionActive = true;

        // 9. Débiter l'expéditeur
        await run(
            'UPDATE wallets SET balance = balance - ? WHERE user_id = ?',
            [totalAmount, sender.id]
        );

        // 10. Créditer le destinataire
        await run(
            'UPDATE wallets SET balance = balance + ? WHERE user_id = ?',
            [amountNum, receiver.id]
        );

        // 11. Créditer les frais à l'admin
        if (adminWallet) {
            await run(
                'UPDATE wallets SET balance = balance + ? WHERE id = ?',
                [fee, adminWallet.id]
            );
        }

        // 12. Enregistrer la transaction
        const transactionResult = await run(`
            INSERT INTO transactions 
            (reference, sender_phone, receiver_phone, amount, fee, net_amount, 
             type, status, xml_iso20022, description, created_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, 'transfer', 'completed', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            reference, 
            sender.phone, 
            receiver.phone, 
            amountNum, 
            fee, 
            amountNum, 
            xml, 
            description || 'Transfert AlkherPay'
        ]);

        // 13. Valider la transaction
        await run('COMMIT');
        transactionActive = false;
        console.log('✅ Transaction validée');

        // 14. Récupérer le nouveau solde
        const newBalance = await get(
            'SELECT balance FROM wallets WHERE user_id = ?',
            [sender.id]
        );

        // 15. Envoyer les notifications
        await sendNotification(
            sender.id,
            '💸 Transfert effectué',
            `Vous avez transféré ${amountNum.toLocaleString()} FCFA à ${receiver.fullname}. Frais: ${fee} FCFA`,
            'success',
            'transfer',
            { 
                amount: amountNum, 
                fee: fee, 
                receiver: receiver.fullname,
                receiver_phone: receiver.phone,
                reference: reference,
                new_balance: newBalance?.balance || 0
            }
        );

        await sendNotification(
            receiver.id,
            '💰 Réception de fonds',
            `Vous avez reçu ${amountNum.toLocaleString()} FCFA de ${sender.fullname}`,
            'success',
            'transfer',
            { 
                amount: amountNum, 
                sender: sender.fullname,
                sender_phone: sender.phone,
                reference: reference,
                new_balance: (await get('SELECT balance FROM wallets WHERE user_id = ?', [receiver.id]))?.balance || 0
            }
        );

        // 16. ✅ Réponse avec l'objet transaction correct
        res.json({
            success: true,
            message: 'Transfert effectué avec succès',
            transaction: {
                reference: reference,
                amount: amountNum,
                fee: fee,
                total: totalAmount,
                receiver: receiver.fullname,
                receiver_phone: receiver.phone,
                new_balance: newBalance?.balance || 0,
                completed_at: new Date().toISOString()
            }
        });

    } catch (error) {
        // 17. Annuler en cas d'erreur
        if (transactionActive) {
            try {
                await run('ROLLBACK');
                console.log('✅ Rollback effectué');
            } catch (rollbackError) {
                console.error('❌ Erreur rollback:', rollbackError);
            }
        }
        console.error('❌ Erreur transfert:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Erreur lors du transfert' 
        });
    }
});

// ============================================
// FONCTION DE NOTIFICATION CORRIGÉE
// ============================================

async function sendNotification(userId, title, message, type, category = 'info', metadata = {}) {
    try {
        // Vérifier si l'utilisateur existe
        const user = await get('SELECT id FROM users WHERE id = ?', [userId]);
        if (!user) {
            console.log(`⚠️ Utilisateur ${userId} non trouvé pour la notification`);
            return null;
        }

        const result = await run(`
            INSERT INTO notifications (user_id, title, message, type, category, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, title, message, type, category, JSON.stringify(metadata)]);

        // Envoyer via WebSocket si disponible
        if (global.io) {
            global.io.to(`user_${userId}`).emit('notification', {
                id: result.lastID,
                title,
                message,
                type,
                category,
                metadata,
                timestamp: new Date().toISOString()
            });
        }

        return result.lastID;
    } catch (error) {
        console.error('❌ Erreur envoi notification:', error);
        return null;
    }
}

// ============================================
// GÉNÉRATION XML ISO 20022
// ============================================

function generateISO20022XML(data) {
    const { reference, sender_phone, receiver_phone, amount, net_amount, fee } = data;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
    <FIToFICstmrCdtTrf>
        <GrpHdr>
            <MsgId>${reference}</MsgId>
            <CreDtTm>${new Date().toISOString()}</CreDtTm>
            <NbOfTxs>1</NbOfTxs>
            <SttlmInf>
                <SttlmMtd>CLRG</SttlmMtd>
            </SttlmInf>
        </GrpHdr>
        <CdtTrfTxInf>
            <PmtId>
                <InstrId>${reference}</InstrId>
                <EndToEndId>${reference}</EndToEndId>
            </PmtId>
            <Amt>
                <InstdAmt Ccy="XAF">${amount}</InstdAmt>
            </Amt>
            <ChrgBr>DEBT</ChrgBr>
            <Dbtr>
                <Nm>${sender_phone}</Nm>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <IBAN>${sender_phone}</IBAN>
                </Id>
            </DbtrAcct>
            <Cdtr>
                <Nm>${receiver_phone}</Nm>
            </Cdtr>
            <CdtrAcct>
                <Id>
                    <IBAN>${receiver_phone}</IBAN>
                </Id>
            </CdtrAcct>
            <RmtInf>
                <Ustrd>${reference}</Ustrd>
            </RmtInf>
        </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
</Document>`;
}

// ============================================
// GESTION DE L'INSTANCE IO GLOBALE
// ============================================

// Dans l'initialisation de Socket.IO
let globalIo = null;

io.on('connection', (socket) => {
    globalIo = io;
    
    // Authentifier l'utilisateur
    const userId = socket.handshake.auth.userId;
    if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 Utilisateur ${userId} connecté`);
    }
    
    socket.on('disconnect', () => {
        console.log('👤 Utilisateur déconnecté');
    });
});

// ============================================
// ENDPOINTS POUR LES AGENTS (PAGE PUBLIQUE)
// ============================================

// Récupérer tous les agents actifs (public)
// backend/server.js - Modifier l'endpoint /api/agents (supprimer authenticateToken)

// Récupérer tous les agents actifs (PUBLIC - sans authentification)
app.get('/api/agents', async (req, res) => {
  const { city, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT 
        u.id, 
        u.fullname, 
        u.phone, 
        u.province, 
        u.city,
        u.email,
        a.id as agent_id,
        a.agency_name, 
        a.agency_address, 
        a.agency_phone, 
        a.agency_type,
        a.commission_rate, 
        a.is_active,
        a.created_at
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
    `;
    const params = [];

    if (city && city !== 'all') {
      sql += ' AND (u.city = ? OR u.province = ?)';
      params.push(city, city);
    }

    if (search) {
      sql += ' AND (u.fullname LIKE ? OR u.phone LIKE ? OR a.agency_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY a.agency_type DESC, u.fullname ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const agents = await query(sql, params);

    // Compter le total
    let countSql = `
      SELECT COUNT(*) as total 
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
    `;
    const countParams = [];

    if (city && city !== 'all') {
      countSql += ' AND (u.city = ? OR u.province = ?)';
      countParams.push(city, city);
    }

    if (search) {
      countSql += ' AND (u.fullname LIKE ? OR u.phone LIKE ? OR a.agency_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = await get(countSql, countParams);

    // Récupérer les villes disponibles
    const citiesResult = await query(`
      SELECT DISTINCT u.city, u.province 
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'agent' 
        AND u.is_active = 1 
        AND a.is_active = 1
        AND (u.city IS NOT NULL OR u.province IS NOT NULL)
    `);

    const cities = [...new Set(
      citiesResult.map(c => c.city || c.province).filter(Boolean)
    )];

    // Ajouter les évaluations
    for (let agent of agents) {
      const ratingResult = await get(`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as total_reviews
        FROM agent_reviews
        WHERE agent_id = ? AND status = 'approved'
      `, [agent.agent_id]);

      agent.rating = ratingResult?.average_rating ? parseFloat(ratingResult.average_rating).toFixed(1) : null;
      agent.reviews_count = ratingResult?.total_reviews || 0;
    }

    res.json({
      agents: agents || [],
      total: total?.total || 0,
      cities: cities,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Erreur récupération agents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' });
  }
});

// Récupérer les détails d'un agent spécifique
app.get('/api/agents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const agent = await get(`
      SELECT 
        u.id, u.fullname, u.phone, u.province, u.city, u.email,
        a.id as agent_id, a.agency_name, a.agency_address, a.agency_phone, 
        a.agency_type, a.commission_rate, a.created_at
      FROM users u
      INNER JOIN agents a ON u.id = a.user_id
      WHERE u.id = ? AND u.role = 'agent' AND u.is_active = 1 AND a.is_active = 1
    `, [id]);

    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    // Récupérer les évaluations
    const ratingResult = await get(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews
      FROM agent_reviews
      WHERE agent_id = ? AND status = 'approved'
    `, [agent.id]);

    agent.rating = ratingResult?.average_rating ? parseFloat(ratingResult.average_rating).toFixed(1) : null;
    agent.reviews_count = ratingResult?.total_reviews || 0;

    res.json(agent);

  } catch (error) {
    console.error('Erreur récupération agent:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
  }
});

// Récupérer les horaires d'un agent
app.get('/api/agents/:id/schedule', async (req, res) => {
  const { id } = req.params;

  try {
    let schedule = await get(`
      SELECT * FROM agent_schedules 
      WHERE agent_id = ?
    `, [id]);

    if (!schedule) {
      // Horaires par défaut
      schedule = {
        monday: { open: '08:00', close: '18:00', closed: false },
        tuesday: { open: '08:00', close: '18:00', closed: false },
        wednesday: { open: '08:00', close: '18:00', closed: false },
        thursday: { open: '08:00', close: '18:00', closed: false },
        friday: { open: '08:00', close: '18:00', closed: false },
        saturday: { open: '09:00', close: '13:00', closed: false },
        sunday: { open: null, close: null, closed: true }
      };
    }

    res.json(schedule);

  } catch (error) {
    console.error('Erreur récupération horaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des horaires' });
  }
});

// Récupérer les avis d'un agent
app.get('/api/agents/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const reviews = await query(`
      SELECT 
        r.*, 
        u.fullname as user_name,
        u.phone as user_phone
      FROM agent_reviews r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.agent_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    const stats = await get(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM agent_reviews
      WHERE agent_id = ? AND status = 'approved'
    `, [id]);

    res.json({
      reviews: reviews || [],
      stats: stats || {
        average_rating: 0,
        total_reviews: 0,
        five_stars: 0, four_stars: 0, three_stars: 0, two_stars: 0, one_star: 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
});

// Ajouter un avis sur un agent (authentifié requis)
app.post('/api/agents/:id/review', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Note invalide (1-5)' });
  }

  try {
    // Vérifier que l'agent existe
    const agent = await get(`
      SELECT id FROM agents WHERE user_id = ?
    `, [id]);

    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    // Vérifier que l'utilisateur n'a pas déjà laissé un avis
    const existingReview = await get(`
      SELECT id FROM agent_reviews 
      WHERE agent_id = ? AND user_id = ? AND status = 'approved'
    `, [agent.id, req.user.userId]);

    if (existingReview) {
      return res.status(400).json({ error: 'Vous avez déjà laissé un avis pour cet agent' });
    }

    await run(`
      INSERT INTO agent_reviews (agent_id, user_id, rating, comment, status, created_at)
      VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
    `, [agent.id, req.user.userId, rating, comment || null]);

    res.status(201).json({
      success: true,
      message: 'Avis ajouté avec succès'
    });

  } catch (error) {
    console.error('Erreur ajout avis:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' });
  }
});

// ============================================
// ENDPOINTS POUR DEVENIR AGENT
// ============================================



// Configuration multer pour l'upload de documents
const agentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'agent_applications');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `agent-app-${uniqueSuffix}${ext}`);
  }
});

const agentFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const agentUpload = multer({
  storage: agentStorage,
  fileFilter: agentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Soumettre une candidature pour devenir agent
app.post('/api/become-agent', agentUpload.fields([
  { name: 'id_card', maxCount: 1 },
  { name: 'business_license', maxCount: 1 }
]), async (req, res) => {
  const {
    fullname, phone, email, agency_name, agency_address,
    city, province, experience, motivation, id_card_number
  } = req.body;

  const files = req.files;

  // Validation
  if (!fullname || !phone || !agency_name || !agency_address || !motivation) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  if (phone && !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide (8 chiffres)' });
  }

  try {
    // Créer la table si elle n'existe pas
    await run(`
      CREATE TABLE IF NOT EXISTS agent_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        agency_name TEXT NOT NULL,
        agency_address TEXT NOT NULL,
        city TEXT,
        province TEXT,
        experience TEXT,
        motivation TEXT NOT NULL,
        id_card_number TEXT,
        id_card_path TEXT,
        business_license_path TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `);

    // Insérer la candidature
    const result = await run(`
      INSERT INTO agent_applications (
        fullname, phone, email, agency_name, agency_address,
        city, province, experience, motivation, id_card_number,
        id_card_path, business_license_path, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [
      fullname, phone, email || null, agency_name, agency_address,
      city || null, province || null, experience || null, motivation,
      id_card_number || null,
      files?.id_card ? files.id_card[0].path : null,
      files?.business_license ? files.business_license[0].path : null
    ]);

    // Notification à l'admin
    const admin = await get('SELECT id FROM users WHERE role = "admin" AND phone = "62787307"');
    if (admin) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, 'Nouvelle candidature agent', ?, 'alert', CURRENT_TIMESTAMP)
      `, [admin.id, `${fullname} a postulé pour devenir agent alkherpay`]);
    }

    res.status(201).json({
      success: true,
      message: 'Candidature envoyée avec succès',
      application_id: result.lastID
    });

  } catch (error) {
    console.error('Erreur soumission candidature:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la candidature' });
  }
});

// Récupérer toutes les candidatures d'agents (admin uniquement)
app.get('/api/admin/agent-applications', authenticateToken, requireAdmin, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT * FROM agent_applications
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const applications = await query(sql, params);

    const total = await get(`
      SELECT COUNT(*) as count FROM agent_applications
      ${status && status !== 'all' ? 'WHERE status = ?' : ''}
    `, status && status !== 'all' ? [status] : []);

    res.json({
      applications: applications || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Erreur récupération candidatures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Approuver ou rejeter une candidature (admin uniquement)
app.post('/api/admin/agent-applications/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }

  try {
    const application = await get('SELECT * FROM agent_applications WHERE id = ?', [id]);

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Cette candidature a déjà été traitée' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await run(`
      UPDATE agent_applications 
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `, [newStatus, req.user.userId, rejection_reason || null, id]);

    // Si approuvé, créer le compte agent
    if (action === 'approve') {
      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-8);
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const hashedKey = await bcrypt.hash(privateKey, 10);

      // Créer l'utilisateur agent
      const userResult = await run(`
        INSERT INTO users (phone, fullname, password_hash, private_key_6, province, city, email, role, is_active, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
      `, [application.phone, application.fullname, hashedPassword, hashedKey, application.province || 'N\'Djaména', application.city || null, application.email || null]);

      // Créer l'agence
      const agencyNumber = 'AG' + Date.now().toString().slice(-6);
      await run(`
        INSERT INTO agents (user_id, agency_number, agency_name, agency_address, agency_phone, agency_type, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'secondaire', ?, CURRENT_TIMESTAMP)
      `, [userResult.lastID, agencyNumber, application.agency_name, application.agency_address, application.phone, req.user.userId]);

      // Notification au nouveau agent
      await run(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, 'Bienvenue dans le réseau alkherpay', ?, 'success', CURRENT_TIMESTAMP)
      `, [userResult.lastID, `Félicitations ! Votre agence "${application.agency_name}" est maintenant active.`]);
    }

    // Notification à l'utilisateur
    const title = action === 'approve' ? '✅ Candidature acceptée' : '❌ Candidature rejetée';
    const message = action === 'approve'
      ? 'Félicitations ! Votre candidature pour devenir agent alkherpay a été acceptée.'
      : `Votre candidature a été rejetée. Raison: ${rejection_reason || 'Non conforme'}`;

    // Ici, envoyer la notification par SMS ou email si possible

    res.json({
      success: true,
      message: `Candidature ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    console.error('Erreur traitement candidature:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});

// Télécharger un document de candidature (admin uniquement)
app.get('/api/admin/agent-applications/:id/download/:type', authenticateToken, requireAdmin, async (req, res) => {
  const { id, type } = req.params;

  try {
    const application = await get('SELECT * FROM agent_applications WHERE id = ?', [id]);

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    let filePath = null;
    let filename = '';

    if (type === 'id_card') {
      filePath = application.id_card_path;
      filename = `cni_${application.fullname}.pdf`;
    } else if (type === 'business_license') {
      filePath = application.business_license_path;
      filename = `registre_${application.agency_name}.pdf`;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.download(filePath, filename);

  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// Récupérer tous les utilisateurs
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { role, is_active, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `SELECT u.*, w.balance 
                   FROM users u
                   LEFT JOIN wallets w ON u.id = w.user_id
                   WHERE 1=1`;
    const params = [];

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (is_active !== undefined) {
      sql += ' AND u.is_active = ?';
      params.push(parseInt(is_active));
    }

    if (search) {
      sql += ' AND (u.phone LIKE ? OR u.fullname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await query(sql, params);

    const total = await get(
      `SELECT COUNT(*) as count FROM users u WHERE 1=1 ${role ? 'AND role = ?' : ''}`,
      role ? [role] : []
    );

    res.json({
      users,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});


//=============================================//
//
//================================================
// ============================================
// BACKEND - GESTION COMPLÈTE DES UTILISATEURS
// ============================================

// ============================================
// 1. MODIFICATION D'UN UTILISATEUR (ADMIN)
// ============================================

app.put('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { fullname, email, province, city, address, role, is_active } = req.body;

  console.log('📝 Modification utilisateur:', { userId, fullname, role });

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Construire la requête dynamiquement
    const updates = [];
    const params = [];

    if (fullname !== undefined) {
      updates.push('fullname = ?');
      params.push(fullname);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (province !== undefined) {
      updates.push('province = ?');
      params.push(province);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (role !== undefined && ['user', 'agent', 'admin'].includes(role)) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log de l'action
    await run(`
            INSERT INTO system_logs (user_id, action, details, created_at)
            VALUES (?, 'USER_UPDATED', ?, CURRENT_TIMESTAMP)
        `, [req.user.userId, `Utilisateur ${userId} modifié par admin`]);

    res.json({ success: true, message: 'Utilisateur modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. RÉINITIALISATION DE LA CLÉ PRIVÉE (ADMIN)
// ============================================

app.post('/api/admin/users/:userId/reset-key', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('🔑 Réinitialisation clé privée:', { userId });

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer une nouvelle clé privée à 6 chiffres
    const newPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(newPrivateKey, 10);

    // Mettre à jour la clé privée
    await run('UPDATE users SET private_key_6 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedKey, userId]);

    // Journaliser l'action
    await run(`
            INSERT INTO system_logs (user_id, action, details, created_at)
            VALUES (?, 'PRIVATE_KEY_RESET', ?, CURRENT_TIMESTAMP)
        `, [req.user.userId, `Réinitialisation clé privée pour ${user.phone}`]);

    // Créer une notification pour l'utilisateur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '🔑 Clé privée réinitialisée', 
                    'Votre clé privée a été réinitialisée par l administrateur.', 
                    'security', CURRENT_TIMESTAMP)
        `, [userId]);

    res.json({
      success: true,
      message: 'Clé privée réinitialisée avec succès',
      new_private_key: newPrivateKey,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('❌ Erreur réinitialisation clé privée:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 4. SUPPRESSION D'UN UTILISATEUR (ADMIN)
// ============================================

// ============================================
// ADMIN - SUPPRIMER UN UTILISATEUR (AVEC CASCADE)
// ============================================
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('🗑️ Suppression utilisateur:', { userId });

  try {
    // Vérifier que l'utilisateur existe
    const user = await db.get('SELECT id, phone, fullname, role FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Empêcher la suppression du dernier admin
    if (user.role === 'admin') {
      const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer le dernier administrateur'
        });
      }
    }

    // Démarrer la transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Supprimer les notifications de l'utilisateur
      await db.run('DELETE FROM notifications WHERE user_id = ?', [userId]);
      console.log('✅ Notifications supprimées');

      // 2. Supprimer les sessions de l'utilisateur
      await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
      console.log('✅ Sessions supprimées');

      // 3. Supprimer les logs de l'utilisateur
      await db.run('DELETE FROM system_logs WHERE user_id = ?', [userId]);
      console.log('✅ Logs supprimés');

      // 4. Supprimer les demandes KYC de l'utilisateur
      await db.run('DELETE FROM kyc_requests WHERE user_id = ?', [userId]);
      console.log('✅ Demandes KYC supprimées');

      // 5. Supprimer les documents KYC de l'utilisateur
      await db.run('DELETE FROM kyc_documents WHERE user_id = ?', [userId]);
      console.log('✅ Documents KYC supprimés');

      // 6. Supprimer les paiements de factures de l'utilisateur
      await db.run('DELETE FROM bill_payments WHERE payer_id = ?', [userId]);
      console.log('✅ Paiements de factures supprimés');

      // 7. Supprimer les réservations de voyages de l'utilisateur
      await db.run('DELETE FROM bookings WHERE user_id = ?', [userId]);
      console.log('✅ Réservations supprimées');

      // 8. Supprimer les investissements de l'utilisateur
      await db.run('DELETE FROM investments WHERE investor_id = ?', [userId]);
      console.log('✅ Investissements supprimés');

      // 9. Supprimer les avis de l'utilisateur
      await db.run('DELETE FROM agent_reviews WHERE user_id = ?', [userId]);
      console.log('✅ Avis supprimés');

      // 10. Supprimer les paiements de taxes de l'utilisateur
      await db.run('DELETE FROM tax_payments WHERE payer_id = ?', [userId]);
      console.log('✅ Paiements de taxes supprimés');

      // 11. Supprimer le wallet de l'utilisateur
      await db.run('DELETE FROM wallets WHERE user_id = ?', [userId]);
      console.log('✅ Wallet supprimé');

      // 12. Si l'utilisateur est un agent, supprimer son entreprise associée
      if (user.role === 'agent') {
        // Supprimer l'entreprise de service
        await db.run('DELETE FROM service_companies WHERE user_id = ?', [userId]);
        console.log('✅ Entreprise de service supprimée');

        // Supprimer l'agence de voyage
        await db.run('DELETE FROM travel_agencies WHERE user_id = ?', [userId]);
        console.log('✅ Agence de voyage supprimée');

        // Supprimer le bureau de taxe
        await db.run('DELETE FROM tax_offices WHERE user_id = ?', [userId]);
        console.log('✅ Bureau de taxe supprimé');
      }

      // 13. Supprimer les transactions de l'utilisateur
      // Récupérer le téléphone de l'utilisateur
      const userPhone = user.phone;
      await db.run('DELETE FROM transactions WHERE sender_phone = ? OR receiver_phone = ?', [userPhone, userPhone]);
      console.log('✅ Transactions supprimées');

      // 14. Supprimer l'utilisateur lui-même
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
      console.log('✅ Utilisateur supprimé');

      // Valider la transaction
      await db.run('COMMIT');

      // Journaliser l'action (après la suppression, utilisation d'un log système)
      try {
        await db.run(`
                    INSERT INTO system_logs (user_id, action, details, created_at)
                    VALUES (?, 'USER_DELETED', ?, CURRENT_TIMESTAMP)
                `, [req.user.userId, `Suppression de l'utilisateur ${user.fullname} (${user.phone})`]);
      } catch (logError) {
        console.log('⚠️ Erreur log (non bloquante):', logError.message);
      }

      res.json({
        success: true,
        message: `Utilisateur ${user.fullname} supprimé avec succès`
      });

    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// ============================================
// 5. MODIFICATION D'UN AGENT (ADMIN)
// ============================================

app.put('/api/admin/agents/:agentId', authenticateToken, requireAdmin, async (req, res) => {
  const { agentId } = req.params;
  const { fullname, province, agency_name, agency_address, agency_phone, agency_type, is_active } = req.body;

  console.log('📝 Modification agent:', { agentId, fullname });

  try {
    // Vérifier que l'agent existe
    const agent = await get('SELECT id FROM users WHERE id = ? AND role = "agent"', [agentId]);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    // Mettre à jour l'utilisateur
    const updates = [];
    const params = [];

    if (fullname !== undefined) {
      updates.push('fullname = ?');
      params.push(fullname);
    }
    if (province !== undefined) {
      updates.push('province = ?');
      params.push(province);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(agentId);
      await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Mettre à jour les informations de l'agence
    const agentUpdates = [];
    const agentParams = [];

    if (agency_name !== undefined) {
      agentUpdates.push('agency_name = ?');
      agentParams.push(agency_name);
    }
    if (agency_address !== undefined) {
      agentUpdates.push('agency_address = ?');
      agentParams.push(agency_address);
    }
    if (agency_phone !== undefined) {
      agentUpdates.push('agency_phone = ?');
      agentParams.push(agency_phone);
    }
    if (agency_type !== undefined) {
      agentUpdates.push('agency_type = ?');
      agentParams.push(agency_type);
    }

    if (agentUpdates.length > 0) {
      agentParams.push(agentId);
      await run(`UPDATE agents SET ${agentUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, agentParams);
    }

    res.json({ success: true, message: 'Agent modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 6. TOGGLE STATUT D'UN UTILISATEUR (ACTIVER/DÉSACTIVER)
// ============================================

app.put('/api/admin/users/:userId/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { is_active } = req.body;

  console.log('🔄 Changement statut utilisateur:', { userId, is_active });

  try {
    const user = await get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la désactivation de son propre compte
    if (parseInt(userId) === req.user.userId && !is_active) {
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
    }

    // Empêcher la désactivation du dernier admin
    if (user.role === 'admin' && !is_active) {
      const adminCount = await get('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1');
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Impossible de désactiver le dernier administrateur actif' });
      }
    }

    await run('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active ? 1 : 0, userId]);

    const statusText = is_active ? 'activé' : 'désactivé';

    // Créer une notification
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '👤 Compte ${statusText}', 
                    'Votre compte a été ${statusText} par l\'administrateur.', 
                    'account', CURRENT_TIMESTAMP)
        `, [userId]);

    res.json({ success: true, message: `Utilisateur ${statusText} avec succès` });

  } catch (error) {
    console.error('❌ Erreur changement statut:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 7. TOGGLE STATUT D'UN AGENT (ADMIN)
// ============================================

app.put('/api/admin/agents/:agentId/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  const { agentId } = req.params;
  const { is_active } = req.body;

  try {
    const agent = await get('SELECT id FROM users WHERE id = ? AND role = "agent"', [agentId]);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    await run('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active ? 1 : 0, agentId]);

    const statusText = is_active ? 'activé' : 'désactivé';

    res.json({ success: true, message: `Agent ${statusText} avec succès` });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 8. RÉCUPÉRATION DES UTILISATEURS (AVEC FILTRES)
// ============================================

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { role, is_active, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT u.*, w.balance 
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE 1=1
        `;
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (is_active !== undefined) {
      sql += ' AND u.is_active = ?';
      params.push(parseInt(is_active));
    }

    if (search) {
      sql += ' AND (u.phone LIKE ? OR u.fullname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count FROM users u
            WHERE 1=1
            ${role && role !== 'all' ? 'AND role = ?' : ''}
            ${is_active !== undefined ? 'AND is_active = ?' : ''}
            ${search ? 'AND (phone LIKE ? OR fullname LIKE ?)' : ''}
        `, params.slice(0, -2));

    res.json({
      success: true,
      users: users || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// 9. RÉCUPÉRATION D'UN UTILISATEUR SPÉCIFIQUE
// ============================================

app.get('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await get(`
            SELECT u.*, w.balance 
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.id = ?
        `, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 10. CRÉATION D'UN UTILISATEUR (ADMIN)
// ============================================

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, password, email, province, city, address, role } = req.body;

  // Validation
  if (!phone || !fullname || !password) {
    return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
  }

  if (!/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }

  const validRoles = ['user', 'admin', 'agent'];
  const userRole = validRoles.includes(role) ? role : 'user';

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Générer clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPrivateKey = await bcrypt.hash(privateKey, 10);

    // Créer l'utilisateur
    const result = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, province, city, address, email, role, is_active, is_verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
        `, [phone, fullname, hashedPassword, hashedPrivateKey, province || null, city || null, address || null, email || null, userRole]);

    // Journaliser
    await run(`
            INSERT INTO system_logs (user_id, action, details, created_at)
            VALUES (?, 'USER_CREATED', ?, CURRENT_TIMESTAMP)
        `, [req.user.userId, `Création de l'utilisateur ${fullname} (${phone})`]);

    res.status(201).json({
      success: true,
      user: {
        id: result.lastID,
        phone,
        fullname,
        role: userRole,
        private_key: privateKey
      }
    });

  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    res.status(500).json({ error: error.message });
  }
});
// Récupérer la clé privée d'un utilisateur
app.get('/api/admin/users/:userId/key', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    // Vérifier que l'admin est bien celui qui a le droit
    const admin = await get('SELECT phone FROM users WHERE id = ?', [req.user.userId]);

    if (admin.phone !== '62787307') {
      return res.status(403).json({ error: 'Seul l\'admin principal peut récupérer les clés' });
    }

    // Dans un vrai système, il faudrait déchiffrer la clé
    // Ici on génère une nouvelle clé
    const newPrivateKey = generatePrivateKey();
    const hashedKey = await hashPassword(newPrivateKey);

    await run('UPDATE users SET private_key_6 = ? WHERE id = ?', [hashedKey, userId]);

    // Log
    await run(
      `INSERT INTO system_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user.userId, 'KEY_RECOVERY', `Récupération clé user ${userId}`]
    );

    res.json({
      private_key: newPrivateKey,
      message: 'Nouvelle clé générée avec succès'
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la clé' });
  }
});

// Bloquer/Débloquer un utilisateur
app.put('/api/admin/users/:userId/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { is_active } = req.body;

  try {
    await run('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);

    res.json({ success: true, message: `Utilisateur ${is_active ? 'débloqué' : 'bloqué'}` });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du changement de statut' });
  }
});

// Créer un agent
app.post('/api/admin/agents', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, password, province, agency_name, agency_address, agency_phone, agency_type } = req.body;

  try {
    // Créer l'utilisateur agent
    const privateKey = generatePrivateKey();
    const hashedPassword = await hashPassword(password);
    const hashedPrivateKey = await hashPassword(privateKey);

    const result = await run(
      `INSERT INTO users (phone, fullname, password_hash, private_key_6, province, role) 
             VALUES (?, ?, ?, ?, ?, 'agent')`,
      [phone, fullname, hashedPassword, hashedPrivateKey, province]
    );

    // Créer les informations agent
    const agencyNumber = generateAgencyNumber();
    await run(
      `INSERT INTO agents (user_id, agency_number, agency_name, agency_address, agency_phone, agency_type, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [result.lastID, agencyNumber, agency_name, agency_address, agency_phone || phone, agency_type || 'secondaire', req.user.userId]
    );

    res.status(201).json({
      success: true,
      message: 'Agent créé avec succès',
      agent: {
        id: result.lastID,
        phone,
        fullname,
        agency_number: agencyNumber,
        private_key: privateKey
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'agent' });
  }
});

// Récupérer les annonces
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await query(
      `SELECT * FROM announcements 
             WHERE is_active = 1 
             AND (expires_at IS NULL OR expires_at > datetime('now'))
             ORDER BY created_at DESC`
    );

    res.json(announcements);

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
  }
});

// Publier une annonce (admin)
app.post('/api/admin/announce', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, facebook_link, whatsapp_link, telegram_link, website_link, expires_at } = req.body;

  try {
    const result = await run(
      `INSERT INTO announcements (title, content, facebook_link, whatsapp_link, telegram_link, website_link, created_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content, facebook_link, whatsapp_link, telegram_link, website_link, req.user.userId, expires_at || null]
    );

    res.status(201).json({
      success: true,
      message: 'Annonce publiée',
      announcement_id: result.lastID
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la publication' });
  }
});

// Récupérer les provinces
app.get('/api/provinces', async (req, res) => {
  try {
    const provinces = await query('SELECT * FROM provinces ORDER BY name');
    res.json(provinces);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des provinces' });
  }
});
// ============================================
// ENDPOINTS ADDITIONNELS
// ============================================

// Obtenir le profil de l'utilisateur connecté
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await get(
      `SELECT id, phone, fullname, province, city, address, role, is_active, created_at 
       FROM users WHERE id = ?`,
      [req.user.userId]
    )

    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId])

    res.json({
      ...user,
      balance: wallet?.balance || 0
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' })
  }
})

// Mettre à jour le profil
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { fullname, city, address } = req.body

  try {
    await run(
      'UPDATE users SET fullname = ?, city = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullname, city, address, req.user.userId]
    )

    res.json({ success: true, message: 'Profil mis à jour' })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' })
  }
})

// Changer le mot de passe
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body

  try {
    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.userId])

    const isValid = await verifyPassword(oldPassword, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' })
    }

    const hashedPassword = await hashPassword(newPassword)
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.userId])

    res.json({ success: true, message: 'Mot de passe modifié' })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' })
  }
})

// backend/server.js - Ajouter ces endpoints si manquants

// Statistiques admin
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await get('SELECT COUNT(*) as count FROM users WHERE role = "user"')
    const totalAgents = await get('SELECT COUNT(*) as count FROM users WHERE role = "agent"')
    const totalTransactions = await get('SELECT COUNT(*) as count FROM transactions WHERE status = "completed"')
    const totalVolume = await get('SELECT SUM(amount) as total FROM transactions WHERE status = "completed"')
    const totalFees = await get('SELECT SUM(fee) as total FROM transactions WHERE status = "completed"')

    const adminWallet = await get(
      `SELECT w.balance FROM wallets w 
             JOIN users u ON w.user_id = u.id 
             WHERE u.role = 'admin' AND u.phone = '62787307'`
    )

    res.json({
      users: totalUsers?.count || 0,
      agents: totalAgents?.count || 0,
      transactions: totalTransactions?.count || 0,
      volume: totalVolume?.total || 0,
      fees: totalFees?.total || 0,
      adminWalletBalance: adminWallet?.balance || 0
    })
  } catch (error) {
    console.error('Erreur stats:', error)
    res.json({
      users: 0,
      agents: 0,
      transactions: 0,
      volume: 0,
      fees: 0,
      adminWalletBalance: 0
    })
  }
})

// Liste des utilisateurs avec pagination
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { role, is_active, search, limit = 50, offset = 0 } = req.query

  try {
    let sql = `SELECT u.*, w.balance 
                   FROM users u
                   LEFT JOIN wallets w ON u.id = w.user_id
                   WHERE 1=1`
    const params = []

    if (role) {
      sql += ' AND u.role = ?'
      params.push(role)
    }

    if (is_active !== undefined) {
      sql += ' AND u.is_active = ?'
      params.push(parseInt(is_active))
    }

    if (search) {
      sql += ' AND (u.phone LIKE ? OR u.fullname LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const users = await query(sql, params)

    // Compter le total
    let countSql = 'SELECT COUNT(*) as count FROM users WHERE 1=1'
    const countParams = []
    if (role) {
      countSql += ' AND role = ?'
      countParams.push(role)
    }
    const total = await get(countSql, countParams)

    res.json({
      users: users || [],
      total: total?.count || 0
    })
  } catch (error) {
    console.error('Erreur chargement users:', error)
    res.json({ users: [], total: 0 })
  }
})


// Dépôt par agent
app.post('/api/deposit', authenticateToken, requireAgentOrAdmin, async (req, res) => {
  const { user_phone, amount, description } = req.body

  if (!user_phone || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Téléphone et montant requis' })
  }

  try {
    const user = await get('SELECT id, phone, fullname FROM users WHERE phone = ? AND is_active = 1', [user_phone])

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const reference = generateTransactionReference()
    const xml = generateISO20022XML({
      reference,
      sender_phone: req.user.phone,
      receiver_phone: user.phone,
      amount,
      net_amount: amount,
      fee: 0
    })

    await run('BEGIN TRANSACTION')

    // Créditer l'utilisateur
    await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, user.id])

    // Enregistrer la transaction
    await run(
      `INSERT INTO transactions 
       (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, xml_iso20022, description)
       VALUES (?, ?, ?, ?, 0, ?, 'deposit', 'completed', ?, ?)`,
      [reference, req.user.phone, user.phone, amount, amount, xml, description || `Dépôt effectué par agent ${req.user.fullname}`]
    )

    await run('COMMIT')

    // Notification
    await sendRealtimeNotification(user.id, 'Dépôt reçu', `${amount.toLocaleString()} FCFA ont été déposés sur votre compte`, 'transaction')

    res.json({
      success: true,
      reference,
      amount,
      user: user.fullname
    })

  } catch (error) {
    await run('ROLLBACK')
    console.error(error)
    res.status(500).json({ error: 'Erreur lors du dépôt' })
  }
})

// Retrait par agent
app.post('/api/withdraw', authenticateToken, requireAgentOrAdmin, async (req, res) => {
  const { user_phone, amount } = req.body

  if (!user_phone || !amount || amount < 25) {
    return res.status(400).json({ error: 'Montant minimum de retrait: 25 FCFA' })
  }

  try {
    const user = await get('SELECT id, phone, fullname, is_active FROM users WHERE phone = ?', [user_phone])

    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const userWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [user.id])

    if (userWallet.balance < amount) {
      return res.status(400).json({ error: 'Solde insuffisant' })
    }

    const fee = Math.floor(amount * 0.02)
    const totalAmount = amount + fee

    const adminWallet = await get(
      `SELECT w.id FROM wallets w JOIN users u ON w.user_id = u.id WHERE u.role = 'admin' AND u.phone = '62787307'`
    )

    const reference = generateTransactionReference()
    const xml = generateISO20022XML({
      reference,
      sender_phone: user.phone,
      receiver_phone: req.user.phone,
      amount,
      net_amount: amount - fee,
      fee
    })

    await run('BEGIN TRANSACTION')

    // Débiter l'utilisateur
    await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, user.id])

    // Créditer les frais à l'admin
    await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id])

    await run(
      `INSERT INTO transactions 
       (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, xml_iso20022)
       VALUES (?, ?, ?, ?, ?, ?, 'withdraw', 'completed', ?)`,
      [reference, user.phone, req.user.phone, amount, fee, amount - fee, xml]
    )

    await run('COMMIT')

    await sendRealtimeNotification(user.id, 'Retrait effectué', `${amount.toLocaleString()} FCFA ont été retirés. Frais: ${fee} FCFA`, 'transaction')

    res.json({
      success: true,
      reference,
      amount,
      fee,
      netReceived: amount - fee
    })

  } catch (error) {
    await run('ROLLBACK')
    console.error(error)
    res.status(500).json({ error: 'Erreur lors du retrait' })
  }
})

// Obtenir les détails d'une transaction
app.get('/api/transaction/:reference', authenticateToken, async (req, res) => {
  const { reference } = req.params

  try {
    const transaction = await get(
      `SELECT * FROM v_transactions_details WHERE reference = ?`,
      [reference]
    )

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' })
    }

    // Vérifier que l'utilisateur est concerné
    if (transaction.sender_phone !== req.user.phone && transaction.receiver_phone !== req.user.phone && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' })
    }

    res.json(transaction)
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération' })
  }
})
// ============================================
// ENDPOINTS PARAMÈTRES
// ============================================

// Obtenir les préférences de l'utilisateur
app.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const prefs = await get(
      'SELECT preferences FROM users WHERE id = ?',
      [req.user.userId]
    )

    const defaultPrefs = {
      language: 'fr',
      theme: 'dark',
      notifications: {
        email: true,
        sms: true,
        push: true,
        transaction: true,
        promo: true
      },
      quickActions: true,
      defaultTransferMessage: ''
    }

    let userPrefs = defaultPrefs
    if (prefs && prefs.preferences) {
      try {
        userPrefs = { ...defaultPrefs, ...JSON.parse(prefs.preferences) }
      } catch (e) { }
    }

    res.json(userPrefs)
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des préférences' })
  }
})

// Mettre à jour les préférences de l'utilisateur
app.post('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    await run(
      'UPDATE users SET preferences = ? WHERE id = ?',
      [JSON.stringify(req.body), req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des préférences' })
  }
})

// Obtenir les paramètres de l'application (admin uniquement)
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await get('SELECT * FROM app_settings WHERE id = 1')

    if (!settings) {
      // Paramètres par défaut
      settings = {
        min_transaction: 25,
        max_transaction: 10000000,
        transfer_fee: 2,
        deposit_fee: 0,
        withdrawal_fee: 2,
        referral_bonus: 500,
        maintenance_mode: 0,
        allow_international: 0
      }
    }

    res.json({
      minTransaction: settings.min_transaction,
      maxTransaction: settings.max_transaction,
      transferFee: settings.transfer_fee,
      depositFee: settings.deposit_fee,
      withdrawalFee: settings.withdrawal_fee,
      referralBonus: settings.referral_bonus,
      maintenanceMode: settings.maintenance_mode === 1,
      allowInternationalTransfer: settings.allow_international === 1
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' })
  }
})

// Mettre à jour les paramètres de l'application (admin uniquement)
app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  const {
    minTransaction,
    maxTransaction,
    transferFee,
    depositFee,
    withdrawalFee,
    referralBonus,
    maintenanceMode,
    allowInternationalTransfer
  } = req.body

  try {
    // Créer la table si elle n'existe pas
    await run(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY,
        min_transaction INTEGER DEFAULT 25,
        max_transaction INTEGER DEFAULT 10000000,
        transfer_fee INTEGER DEFAULT 2,
        deposit_fee INTEGER DEFAULT 0,
        withdrawal_fee INTEGER DEFAULT 2,
        referral_bonus INTEGER DEFAULT 500,
        maintenance_mode INTEGER DEFAULT 0,
        allow_international INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)


    res.json({ success: true, message: 'Paramètres mis à jour' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' })
  }
})
// ============================================
// ENDPOINT CONTACT
// ============================================

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body

  if (!name || !message) {
    return res.status(400).json({ error: 'Nom et message requis' })
  }

  try {
    // Créer la table si elle n'existe pas
    await run(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Sauvegarder le message
    await run(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email || null, phone || null, subject || null, message]
    )

    // Notification à l'admin (optionnel)
    const admin = await get('SELECT id FROM users WHERE role = "admin" AND phone = "62787307"')
    if (admin) {
      await run(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, 'alert')`,
        [admin.id, 'Nouveau message contact', `${name}: ${message.substring(0, 100)}...`]
      )
    }

    res.json({ success: true, message: 'Message envoyé avec succès' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors de l\'envoi' })
  }
})
// ============================================
// ENDPOINTS NOTIFICATIONS
// ============================================

// Obtenir toutes les notifications de l'utilisateur
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.userId]
    )

    // Si la table est vide, retourner un tableau vide
    res.json(notifications || [])
  } catch (error) {
    console.error('Erreur récupération notifications:', error)
    // En cas d'erreur, retourner un tableau vide pour ne pas bloquer l'UI
    res.json([])
  }
})

// Marquer une notification comme lue
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    const result = await run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, req.user.userId]
    )

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur marquage notification:', error)
    res.status(500).json({ error: 'Erreur lors du marquage' })
  }
})

// Marquer toutes les notifications comme lues
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL',
      [req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error)
    res.status(500).json({ error: 'Erreur lors du marquage' })
  }
})

// Créer une notification (pour les événements système)
app.post('/api/notifications', authenticateToken, async (req, res) => {
  const { user_id, title, message, type, link } = req.body

  // Seul l'admin peut créer des notifications pour d'autres utilisateurs
  if (user_id && user_id !== req.user.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' })
  }

  try {
    const targetUserId = user_id || req.user.userId

    await run(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [targetUserId, title, message, type || 'info', link || null]
    )

    // Envoyer en temps réel via Socket.IO
    io.to(`user_${targetUserId}`).emit('notification', {
      title,
      message,
      type: type || 'info',
      timestamp: new Date().toISOString()
    })

    res.status(201).json({ success: true })
  } catch (error) {
    console.error('Erreur création notification:', error)
    res.status(500).json({ error: 'Erreur lors de la création' })
  }
})

// Supprimer une notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    await run(
      'DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, req.user.userId]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression notification:', error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})
// Vérifier le solde d'un utilisateur (admin)
app.get('/api/admin/user/:phone/balance', authenticateToken, requireAdmin, async (req, res) => {
  const { phone } = req.params

  try {
    const user = await get('SELECT id, fullname FROM users WHERE phone = ?', [phone])

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [user.id])

    res.json({
      user: user.fullname,
      phone,
      balance: wallet?.balance || 0
    })
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification' })
  }
})
// Dans server.js - Vérifiez que cet endpoint existe
app.get('/api/provinces', async (req, res) => {
  try {
    const provinces = await query('SELECT id, name FROM provinces ORDER BY name')

    // S'assurer que la réponse est un tableau
    if (!provinces || !Array.isArray(provinces)) {
      return res.json([])
    }

    res.json(provinces)
  } catch (error) {
    console.error('Erreur chargement provinces:', error)
    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur
    res.json([])
  }
})
// backend/server.js - Ajouter cet endpoint
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur existe toujours
    const user = await get('SELECT id, phone, fullname, role, is_active FROM users WHERE id = ?', [req.user.userId])

    if (!user || !user.is_active) {
      return res.json({ valid: false })
    }

    res.json({ valid: true, user })
  } catch (error) {
    res.json({ valid: false })
  }
})
// backend/server.js - Ajouter ces endpoints

// ============================================
// ENDPOINTS BLOG
// ============================================

// Obtenir tous les articles publiés
app.get('/api/blog/posts', async (req, res) => {
  const { limit = 12, offset = 0, category, search } = req.query

  try {
    let sql = `
            SELECT bp.*, u.fullname as author_fullname
            FROM blog_posts bp
            LEFT JOIN users u ON bp.author_id = u.id
            WHERE bp.status = 'published'
        `
    const params = []

    if (category && category !== 'all') {
      sql += ' AND bp.category = ?'
      params.push(category)
    }

    if (search) {
      sql += ' AND (bp.title LIKE ? OR bp.content LIKE ? OR bp.excerpt LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY bp.published_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const posts = await query(sql, params)

    // Compter le total
    let countSql = 'SELECT COUNT(*) as total FROM blog_posts WHERE status = "published"'
    const countParams = []

    if (category && category !== 'all') {
      countSql += ' AND category = ?'
      countParams.push(category)
    }

    if (search) {
      countSql += ' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)'
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const total = await get(countSql, countParams)

    res.json({
      posts,
      total: total.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Erreur chargement articles:', error)
    res.status(500).json({ error: 'Erreur lors du chargement des articles' })
  }
})

// Obtenir un article par son slug
app.get('/api/blog/posts/:slug', async (req, res) => {
  const { slug } = req.params

  try {
    const post = await get(`
            SELECT bp.*, u.fullname as author_fullname
            FROM blog_posts bp
            LEFT JOIN users u ON bp.author_id = u.id
            WHERE bp.slug = ? AND bp.status = 'published'
        `, [slug])

    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé' })
    }

    // Incrémenter le compteur de vues
    await run('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [post.id])

    res.json(post)
  } catch (error) {
    console.error('Erreur chargement article:', error)
    res.status(500).json({ error: 'Erreur lors du chargement de l\'article' })
  }
})

// Créer un article (admin uniquement)
app.post('/api/blog/posts', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, excerpt, category, tags, image_url, status } = req.body

  if (!title || !content) {
    return res.status(400).json({ error: 'Titre et contenu requis' })
  }

  try {
    // Générer le slug
    const slug = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Vérifier si le slug existe déjà
    const existing = await get('SELECT id FROM blog_posts WHERE slug = ?', [slug])
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    const author = await get('SELECT fullname FROM users WHERE id = ?', [req.user.userId])

    const result = await run(`
            INSERT INTO blog_posts 
            (title, slug, content, excerpt, category, tags, image_url, author_id, author_name, status, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      title, slug, content, excerpt || content.substring(0, 200),
      category || 'actualite', tags || null, image_url || null,
      req.user.userId, author.fullname, status || 'published',
      status === 'published' ? new Date().toISOString() : null
    ])

    res.status(201).json({
      success: true,
      post: { id: result.lastID, slug }
    })
  } catch (error) {
    console.error('Erreur création article:', error)
    res.status(500).json({ error: 'Erreur lors de la création de l\'article' })
  }
})

// Mettre à jour un article (admin uniquement)
app.put('/api/blog/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { title, content, excerpt, category, tags, image_url, status } = req.body

  try {
    await run(`
            UPDATE blog_posts 
            SET title = ?, content = ?, excerpt = ?, category = ?, 
                tags = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [title, content, excerpt, category, tags, image_url, status, id])

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur mise à jour article:', error)
    res.status(500).json({ error: 'Erreur lors de la mise à jour' })
  }
})

// Supprimer un article (admin uniquement)
app.delete('/api/blog/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    await run('DELETE FROM blog_posts WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression article:', error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

// Obtenir les catégories
app.get('/api/blog/categories', async (req, res) => {
  try {
    const categories = await query(`
            SELECT category, COUNT(*) as count 
            FROM blog_posts 
            WHERE status = 'published'
            GROUP BY category
        `)
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des catégories' })
  }
})


// Dans server.js, assurez-vous que cette route existe
app.post('/api/admin/agents', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, password, province, agency_name, agency_address, agency_phone, agency_type } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro existe déjà' });
    }

    // Générer un ID agent unique
    const agentNumber = `AGT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPrivateKey = await bcrypt.hash(privateKey, 10);

    // Créer l'utilisateur
    const result = await run(
      `INSERT INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified)
             VALUES (?, ?, ?, ?, ?, 'agent', 1, 1)`,
      [phone, fullname, hashedPassword, hashedPrivateKey, province]
    );

    // Créer l'entrée dans la table agents
    await run(
      `INSERT INTO agents (user_id, agency_number, agency_name, agency_address, agency_phone, agency_type, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [result.lastID, agentNumber, agency_name, agency_address, agency_phone || phone, agency_type || 'secondaire', req.user.userId]
    );

    // Créer le wallet pour l'agent
    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [result.lastID]);

    res.status(201).json({
      success: true,
      agent: {
        id: result.lastID,
        phone,
        fullname,
        agent_number: agentNumber,
        private_key: privateKey
      }
    });

  } catch (error) {
    console.error('Erreur création agent:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});
// ============================================
// IMPORTS SUPPLÉMENTAIRES
// ============================================


// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'kyc');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `kyc-${req.user.userId}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});


// ============================================
// ENDPOINTS KYC
// ============================================


// ============================================
// ROUTES KYC POUR ADMIN
// ============================================
// ============================================
// CORRECTION COMPLÈTE - SERVER.JS
// ============================================



// GET - Récupérer une demande KYC spécifique
app.get('/api/admin/kyc/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  console.log(`📋 GET /api/admin/kyc/requests/${id}`);

  try {
    const request = await get(`
            SELECT 
                kr.*,
                u.fullname as user_fullname,
                u.phone as user_phone,
                u.email as user_email
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.user_id = u.id
            WHERE kr.id = ?
        `, [id]);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demande KYC non trouvée'
      });
    }

    // Récupérer les documents
    const documents = await query(`
            SELECT * FROM kyc_documents 
            WHERE kyc_request_id = ?
            ORDER BY uploaded_at DESC
        `, [id]);

    res.json({
      success: true,
      request: request,
      documents: documents || []
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// GET - Statistiques KYC
app.get('/api/admin/kyc/stats', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📊 GET /api/admin/kyc/stats');

  try {
    const stats = await get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM kyc_requests
        `);

    res.json({
      success: true,
      stats: {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        verified: stats?.verified || 0,
        rejected: stats?.rejected || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.json({
      success: true,
      stats: { total: 0, pending: 0, verified: 0, rejected: 0 }
    });
  }
});
/// ============================================
//// ============================================
// FONCTIONS DE CRÉATION DE TABLES
// ============================================

async function createReferralsTable() {
  try {
    // Vérifier que la base de données est initialisée
    const db = getDb();

    await run(`CREATE TABLE IF NOT EXISTS referral_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            referred_id INTEGER NOT NULL,
            total_referrals INTEGER DEFAULT 0,
            active_referrals INTEGER DEFAULT 0,
            bonus_amount INTEGER DEFAULT 0,
            total_bonus INTEGER DEFAULT 0,
            claimed_bonus INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id)
        )`);

    console.log('✅ Table referral_stats créée/vérifiée');
  } catch (error) {
    console.error('Erreur création table referral_stats:', error);
  }
}

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
  try {
    // 1. Initialiser la base de données
    await initDatabase();

    // 2. Créer les tables supplémentaires après initialisation
    await createReferralsTable();

    // 3. Créer les tables KYC si nécessaire
    await createKycTables();

    // 4. Mettre à jour le mot de passe admin
    const admin = await get('SELECT id, password_hash FROM users WHERE phone = ?', ['62787307']);
    if (admin && (admin.password_hash === 'PLACEHOLDER_HASH' || admin.password_hash === 'PLACEHOLDER')) {
      const hashedPassword = await hashPassword('08093Ali');
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedKey = await hashPassword(privateKey);
      await run('UPDATE users SET password_hash = ?, private_key_6 = ? WHERE phone = ?',
        [hashedPassword, hashedKey, '62787307']);
      console.log('✅ Admin configuré avec succès');
    }

    // 5. Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Serveur alkherpay démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur http://localhost:${PORT}`);
      console.log(`🔌 WebSocket actif`);
    });

  } catch (error) {
    console.error('Erreur au démarrage:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

module.exports = { app, io };
// backend/server.js - Ajouter ces endpoints

// ============================================
// ENDPOINTS PARRAINAGE (REFERRAL)
// ============================================

// Vérifier si un code de parrainage est valide
app.get('/api/referral/check/:code', async (req, res) => {
  const { code } = req.params;

  try {
    // Vérifier si le code de parrainage existe
    const user = await get(`
      SELECT id, fullname, phone FROM users 
      WHERE referral_code = ? AND is_active = 1
    `, [code]);

    if (user) {
      res.json({
        valid: true,
        message: `Code parrainage de ${user.fullname}`,
        referrer_id: user.id,
        referrer_name: user.fullname,
        bonus: 500,
        bonus_amount: 500
      });
    } else {
      res.json({
        valid: false,
        message: 'Code de parrainage invalide'
      });
    }
  } catch (error) {
    console.error('Erreur vérification code:', error);
    res.json({ valid: false, message: 'Erreur lors de la vérification' });
  }
});

// Obtenir les statistiques de parrainage de l'utilisateur
app.get('/api/referral/stats', authenticateToken, async (req, res) => {
  try {
    // Récupérer le code de parrainage de l'utilisateur
    const user = await get(`
      SELECT referral_code, fullname, phone FROM users WHERE id = ?
    `, [req.user.userId]);

    const referralCode = user?.referral_code || generateReferralCode(user?.phone);

    // Récupérer les statistiques de parrainage
    const stats = await get(`
      SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN status = 'completed' THEN bonus_amount ELSE 0 END) as total_bonus,
        SUM(CASE WHEN status = 'pending' THEN bonus_amount ELSE 0 END) as pending_bonus
      FROM referrals
      WHERE referrer_id = ? AND status != 'cancelled'
    `, [req.user.userId]);

    // Récupérer la liste des parrainages
    const referrals = await query(`
      SELECT 
        r.*,
        u.fullname as referred_name,
        u.phone as referred_phone,
        u.created_at as referred_date,
        u.id as referrer_id
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [req.user.userId]);

    res.json({
      referral_code: referralCode,
      totalReferrals: stats?.total_referrals || 0,
      bonusAmount: stats?.bonus_amounts || 0,
      totalBonus: stats?.total_bonus || 0,
      pendingBonus: stats?.pending_bonus || 0,
      referrals: referrals || []
    });

  } catch (error) {
    console.error('Erreur récupération stats parrainage:', error);
    res.json({
      totalReferrals: 0,
      bonusAmount: 0,
      totalBonus: 0,
      pendingBonus: 0,
      referrals: []
    });
  }
});

// Générer un code de parrainage unique
function generateReferralCode(phone) {
  if (!phone) return 'CASH' + Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CASH${phone.slice(-6)}`;
}

// Ajouter la colonne referral_code à la table users si elle n'existe pas
const addReferralColumn = async () => {
  try {
    await run(`ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE`);
  } catch (e) {
    // La colonne existe déjà
  }
};
addReferralColumn();


// src/pages/Profile.jsx - Remplacer la fonction copyReferralLink
async function startServer() {
  try {
    // 1. Initialiser la base de données
    await initDatabase();

    // 2. Créer les tables supplémentaires après initialisation
    await createReferralsTable();

    // 3. Créer les tables KYC (optionnel - commenté)
    // await createKycTables();

    // 4. Mettre à jour le mot de passe admin
    const admin = await get('SELECT id, password_hash FROM users WHERE phone = ?', ['62787307']);
    if (admin && (admin.password_hash === 'PLACEHOLDER_HASH' || admin.password_hash === 'PLACEHOLDER')) {
      const hashedPassword = await hashPassword('08093Ali');
      const privateKey = generatePrivateKey();
      const hashedKey = await hashPassword(privateKey);
      await run('UPDATE users SET password_hash = ?, private_key_6 = ? WHERE phone = ?',
        [hashedPassword, hashedKey, '62787307']);
      console.log('✅ Admin configuré avec succès');
    }

    // 5. Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Serveur alkherpay démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur http://localhost:${PORT}`);
      console.log(`🔌 WebSocket actif`);
    });

  } catch (error) {
    console.error('Erreur au démarrage:', error);
    process.exit(1);
  }
}
// Fonction de copie sécurisée avec fallback
const safeCopyToClipboard = (text, label) => {
  if (!text) {
    toast.error('Aucune information à copier')
    return false
  }

  // Méthode 1: Clipboard API moderne
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success(`${label} copié !`)
      })
      .catch((err) => {
        console.warn('Erreur clipboard API:', err)
        fallbackCopy(text, label)
      })
  } else {
    // Méthode 2: Fallback traditionnelle
    fallbackCopy(text, label)
  }
}

// Fallback pour navigateurs anciens ou HTTP
const fallbackCopy = (text, label) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.top = '-9999px'
  textArea.style.left = '-9999px'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)

  textArea.select()
  textArea.setSelectionRange(0, text.length)

  try {
    const successful = document.execCommand('copy')
    if (successful) {
      toast.success(`${label} copié !`)
    } else {
      toast.error(`Impossible de copier ${label}`)
    }
  } catch (err) {
    console.error('Erreur copie:', err)
    toast.error(`Impossible de copier ${label}`)
  }

  document.body.removeChild(textArea)
}

// Fonction copyReferralLink corrigée
const copyReferralLink = () => {
  if (!referralLink) {
    toast.error('Lien de parrainage non disponible')
    return
  }
  safeCopyToClipboard(referralLink, 'Lien de parrainage')
  setReferralCopied(true)
  setTimeout(() => setReferralCopied(false), 3000)
}

// Fonction copyReferralCode (si vous voulez copier le code)
const copyReferralCodeOnly = () => {
  if (!referralCode) {
    toast.error('Code de parrainage non disponible')
    return
  }
  safeCopyToClipboard(referralCode, 'Code de parrainage')
}

// backend/server.js - Ajouter ces endpoints

// ============================================
// ENDPOINTS POUR LE PARRAINAGE
// ============================================

// Vérifier si un code de parrainage est valide
app.get('/api/referral/check/:code', async (req, res) => {
  const { code } = req.params;

  try {
    // Vérifier si le code existe dans la base de données
    const user = await get(`
      SELECT id, fullname, phone FROM users 
      WHERE referral_code = ? AND is_active = 1
    `, [code]);

    if (user) {
      res.json({
        valid: true,
        message: `Code valide - Parrainé par ${user.fullname}`,
        referrer_id: user.id,
        referrer_name: user.fullname
      });
    } else {
      res.json({
        valid: false,
        message: 'Code de parrainage invalide ou expiré'
      });
    }
  } catch (error) {
    console.error('Erreur vérification code:', error);
    res.status(500).json({
      valid: false,
      message: 'Erreur lors de la vérification'
    });
  }
});

// Obtenir les statistiques de parrainage de l'utilisateur
app.get('/api/referral/stats', authenticateToken, async (req, res) => {
  try {
    // Récupérer le code de parrainage de l'utilisateur
    const user = await get(`
      SELECT referral_code FROM users WHERE id = ?
    `, [req.user.userId]);

    // Compter les filleuls
    const referrals = await query(`
      SELECT u.id, u.fullname, u.phone, u.created_at,
             CASE 
               WHEN u.created_at >= datetime('now', '-7 days') THEN 'pending'
               ELSE 'validated'
             END as status
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `, [req.user.userId]);

    const totalReferrals = referrals.length;
    const pendingBonus = referrals.filter(r => r.status === 'pending').length * 500;
    const totalBonus = referrals.filter(r => r.status === 'validated').length * 500;

    res.json({
      totalReferrals,
      totalBonus,
      pendingBonus,
      referrals
    });
  } catch (error) {
    console.error('Erreur stats parrainage:', error);
    res.json({
      totalReferrals: 0,
      totalBonus: 0,
      pendingBonus: 0,
      referrals: []
    });
  }
});
// ============================================
// AUTHENTIFICATION À DEUX FACTEURS (2FA)
// ============================================

// Générer un secret 2FA pour l'utilisateur
app.post('/api/user/2fa/setup', authenticateToken, async (req, res) => {
  const { method } = req.body;

  try {
    // Générer un secret pour l'authentification
    const secret = generate2FASecret();
    const userId = req.user.userId;

    // Stocker temporairement le secret
    await run(
      `UPDATE users SET two_factor_secret = ?, two_factor_method = ?, two_factor_pending = 1 
       WHERE id = ?`,
      [secret, method || 'authenticator', userId]
    );

    // Générer le QR code URL pour Google Authenticator
    const appName = 'alkherpay';
    const accountName = req.user.phone;
    const qrCodeUrl = `otpauth://totp/${appName}:${accountName}?secret=${secret}&issuer=${appName}`;

    res.json({
      secret,
      qrCodeUrl,
      backupCodes: generateBackupCodes()
    });

  } catch (error) {
    console.error('Erreur setup 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation' });
  }
});

// Vérifier et activer la 2FA
app.post('/api/user/2fa/verify', authenticateToken, async (req, res) => {
  const { code, method, phoneNumber, email } = req.body;

  try {
    const user = await get(
      `SELECT two_factor_secret FROM users WHERE id = ? AND two_factor_pending = 1`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(400).json({ error: 'Aucune configuration 2FA en cours' });
    }

    // Vérifier le code TOTP
    const isValid = verifyTOTPCode(user.two_factor_secret, code);

    if (!isValid) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    // Activer la 2FA
    await run(
      `UPDATE users SET 
        two_factor_enabled = 1, 
        two_factor_method = ?, 
        two_factor_phone = ?, 
        two_factor_email = ?,
        two_factor_pending = 0
       WHERE id = ?`,
      [method, phoneNumber || null, email || null, req.user.userId]
    );

    // Générer et stocker les codes de secours
    const backupCodes = generateBackupCodes();
    await run(
      `UPDATE users SET two_factor_backup_codes = ? WHERE id = ?`,
      [JSON.stringify(backupCodes), req.user.userId]
    );

    res.json({
      success: true,
      backupCodes
    });

  } catch (error) {
    console.error('Erreur vérification 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Obtenir le statut 2FA de l'utilisateur
app.get('/api/user/2fa/status', authenticateToken, async (req, res) => {
  try {
    const user = await get(
      `SELECT two_factor_enabled, two_factor_method, two_factor_phone, two_factor_email, 
              two_factor_backup_codes, created_at as enabledAt 
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    res.json({
      enabled: user?.two_factor_enabled === 1,
      method: user?.two_factor_method || null,
      phone: user?.two_factor_phone,
      email: user?.two_factor_email,
      enabledAt: user?.enabledAt,
      hasBackupCodes: !!user?.two_factor_backup_codes
    });

  } catch (error) {
    console.error('Erreur statut 2FA:', error);
    res.json({ enabled: false });
  }
});

// Désactiver la 2FA
app.post('/api/user/2fa/disable', authenticateToken, async (req, res) => {
  const { password } = req.body;

  try {
    // Vérifier le mot de passe
    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    await run(
      `UPDATE users SET 
        two_factor_enabled = 0, 
        two_factor_secret = NULL, 
        two_factor_method = NULL, 
        two_factor_phone = NULL, 
        two_factor_email = NULL,
        two_factor_backup_codes = NULL,
        two_factor_pending = 0
       WHERE id = ?`,
      [req.user.userId]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur désactivation 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation' });
  }
});

// Obtenir les appareils de confiance
app.get('/api/user/2fa/devices', authenticateToken, async (req, res) => {
  try {
    const devices = await query(
      `SELECT id, device_name, device_type, last_used, created_at 
       FROM trusted_devices 
       WHERE user_id = ? 
       ORDER BY last_used DESC`,
      [req.user.userId]
    );

    res.json(devices || []);
  } catch (error) {
    console.error('Erreur récupération appareils:', error);
    res.json([]);
  }
});

// Révoquer un appareil de confiance
app.delete('/api/user/2fa/device/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await run(
      `DELETE FROM trusted_devices WHERE id = ? AND user_id = ?`,
      [id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur révocation appareil:', error);
    res.status(500).json({ error: 'Erreur lors de la révocation' });
  }
});

// Générer de nouveaux codes de secours
app.post('/api/user/2fa/backup-codes', authenticateToken, async (req, res) => {
  try {
    const backupCodes = generateBackupCodes();
    await run(
      `UPDATE users SET two_factor_backup_codes = ? WHERE id = ?`,
      [JSON.stringify(backupCodes), req.user.userId]
    );

    res.json({ backupCodes });
  } catch (error) {
    console.error('Erreur génération codes:', error);
    res.status(500).json({ error: 'Erreur lors de la génération' });
  }
});

// ============================================
// FONCTIONS UTILITAIRES 2FA
// ============================================

// Générer un secret pour TOTP
function generate2FASecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Vérifier un code TOTP (simplifié, à remplacer par une vraie bibliothèque)
function verifyTOTPCode(secret, code) {
  // Dans une vraie implémentation, utilisez `speakeasy` ou `otplib`
  // Pour l'instant, acceptons les codes 123456 en développement
  // À remplacer par une vraie validation TOTP
  if (process.env.NODE_ENV === 'development') {
    return code === '123456' || code.length === 6;
  }
  return code.length === 6;
}

// Générer des codes de secours
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

// backend/server.js - Ajouter cet endpoint exactement

// Récupérer une notification spécifique par son ID
app.get('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('🔔 Récupération notification ID:', id, 'User:', req.user.userId);

  try {
    // Vérifier que l'ID est un nombre
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }

    const notification = await get(`
      SELECT n.*, 
             CASE WHEN n.is_read = 0 THEN 'unread' ELSE 'read' END as read_status,
             u.fullname as user_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = ? AND (n.user_id = ? OR n.user_id IS NULL)
    `, [notificationId, req.user.userId]);

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    // Parser le metadata si présent
    if (notification.metadata) {
      try {
        notification.metadata = JSON.parse(notification.metadata);
      } catch (e) {
        notification.metadata = null;
      }
    }

    res.json(notification);
  } catch (error) {
    console.error('Erreur récupération notification:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Marquer une notification comme lue
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }

    await run(`
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `, [notificationId, req.user.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    res.status(500).json({ error: 'Erreur lors du marquage' });
  }
});

// Supprimer une notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }

    const result = await run(`
      DELETE FROM notifications 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `, [notificationId, req.user.userId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});
// backend/server.js - Endpoint pour réinitialiser le PIN d'un utilisateur

// Réinitialiser le PIN (clé privée) d'un utilisateur
app.post('/api/admin/reset-user-pin/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer une nouvelle clé privée à 6 chiffres
    const newPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(newPrivateKey, 10);

    // Mettre à jour la clé privée
    await run('UPDATE users SET private_key_6 = ? WHERE id = ?', [hashedKey, userId]);

    // Enregistrer dans les logs
    await run(`
      INSERT INTO system_logs (user_id, action, details, created_at)
      VALUES (?, 'PIN_RESET', ?, CURRENT_TIMESTAMP)
    `, [req.user.userId, `Réinitialisation du PIN pour l'utilisateur ${user.phone}`]);

    // Créer une notification pour l'utilisateur
    await run(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES (?, '🔑 PIN réinitialisé', ?, 'alert', CURRENT_TIMESTAMP)
    `, [userId, `Votre code PIN a été réinitialisé par l'administrateur. Nouveau code: ${newPrivateKey}`]);

    res.json({
      success: true,
      message: 'PIN réinitialisé avec succès',
      new_pin: newPrivateKey,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('Erreur réinitialisation PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du PIN' });
  }
});
// backend/server.js - Ajouter cet endpoint

// Demande de réinitialisation de mot de passe
app.post('/api/auth/forgot-password', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide' });
  }

  try {
    // Vérifier si l'utilisateur existe
    const user = await get('SELECT id, phone, fullname, email FROM users WHERE phone = ?', [phone]);

    if (!user) {
      return res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro' });
    }

    // Récupérer l'admin principal
    const admin = await get('SELECT id FROM users WHERE role = "admin" AND phone = "62787307"');

    if (admin) {
      // Créer une notification pour l'admin
      await run(`
        INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
        VALUES (?, '🔑 Demande de réinitialisation', ?, 'alert', ?, CURRENT_TIMESTAMP)
      `, [
        admin.id,
        `L'utilisateur ${user.fullname} (${user.phone}) a demandé la réinitialisation de son mot de passe.`,
        JSON.stringify({ userId: user.id, phone: user.phone, type: 'password_reset' })
      ]);

      // Optionnel: Envoyer une notification socket à l'admin
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${admin.id}`).emit('notification', {
          title: '🔑 Demande de réinitialisation',
          message: `L'utilisateur ${user.fullname} demande la réinitialisation de son mot de passe.`,
          type: 'alert',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Enregistrer la demande dans les logs
    await run(`
      INSERT INTO system_logs (user_id, action, details, created_at)
      VALUES (?, 'PASSWORD_RESET_REQUEST', ?, CURRENT_TIMESTAMP)
    `, [user.id, `Demande de réinitialisation de mot de passe pour ${phone}`]);

    res.json({
      success: true,
      message: 'Votre demande a été envoyée à l\'administrateur. Vous serez contacté sous 24h.'
    });

  } catch (error) {
    console.error('Erreur demande réinitialisation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' });
  }
});

// Admin: Réinitialiser le mot de passe d'un utilisateur
app.post('/api/admin/reset-password/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }

  try {
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    // Créer une notification pour l'utilisateur
    await run(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES (?, '🔐 Mot de passe réinitialisé', ?, 'alert', CURRENT_TIMESTAMP)
    `, [userId, `Votre mot de passe a été réinitialisé par l'administrateur.`]);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// backend/server.js - Ajouter cet endpoint
// ============================================
// ROUTES KYC (KNOW YOUR CUSTOMER)
// ============================================
// ENDPOINTS KYC CORRIGÉS
// ============================================


// Admin: Valider une demande KYC
app.post('/api/admin/kyc/verify/:requestId', authenticateToken, requireAdmin, async (req, res) => {
  const { requestId } = req.params;
  const { action, rejectionReason, level } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }

  try {
    const request = await get('SELECT * FROM kyc_requests WHERE id = ?', [requestId]);

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    await run('BEGIN TRANSACTION');

    await run(`
            UPDATE kyc_requests 
            SET status = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?,
                rejection_reason = ?, level = ?
            WHERE id = ?
        `, [newStatus, req.user.userId, rejectionReason || null, level || 1, requestId]);

    await run(`
            INSERT INTO kyc_history (user_id, action, status_from, status_to, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
      request.user_id,
      action === 'approve' ? 'approve' : 'reject',
      request.status,
      newStatus,
      action === 'approve' ? 'Demande KYC approuvée' : `Demande KYC rejetée: ${rejectionReason || 'Non conforme'}`,
      req.user.userId
    ]);

    const title = action === 'approve' ? '✅ KYC approuvé' : '❌ KYC rejeté';
    const message = action === 'approve'
      ? 'Votre compte a été vérifié. Vous bénéficiez maintenant de limites de transaction plus élevées.'
      : `Votre demande KYC a été rejetée. Raison: ${rejectionReason || 'Documents non conformes'}. Veuillez soumettre une nouvelle demande.`;

    await run(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, ?, ?, 'alert')
        `, [request.user_id, title, message]);

    await run('COMMIT');

    res.json({
      success: true,
      message: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('Erreur traitement KYC:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});

// Télécharger un document KYC (admin ou propriétaire)
app.get('/api/kyc/download/:documentId', authenticateToken, async (req, res) => {
  const { documentId } = req.params;

  try {
    const document = await get(`
            SELECT kd.*, kr.user_id 
            FROM kyc_documents kd
            JOIN kyc_requests kr ON kd.kyc_request_id = kr.id
            WHERE kd.id = ?
        `, [documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Vérifier les droits (admin ou propriétaire)
    if (req.user.role !== 'admin' && document.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    res.download(document.file_path, document.filename);

  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// Admin: Valider une demande KYC
app.post('/api/admin/kyc/verify/:requestId', authenticateToken, requireAdmin, async (req, res) => {
  const { requestId } = req.params;
  const { action, rejectionReason, level } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }

  try {
    const request = await get('SELECT * FROM kyc_requests WHERE id = ?', [requestId]);

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    await run('BEGIN TRANSACTION');

    // Mettre à jour la demande
    await run(`
            UPDATE kyc_requests 
            SET status = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?,
                rejection_reason = ?, level = ?
            WHERE id = ?
        `, [newStatus, req.user.userId, rejectionReason || null, level || 1, requestId]);

    // Enregistrer dans l'historique
    await run(`
            INSERT INTO kyc_history (user_id, action, status_from, status_to, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
      request.user_id,
      action === 'approve' ? 'approve' : 'reject',
      request.status,
      newStatus,
      action === 'approve' ? 'Demande KYC approuvée' : `Demande KYC rejetée: ${rejectionReason || 'Non conforme'}`,
      req.user.userId
    ]);

    // Notification à l'utilisateur
    const title = action === 'approve' ? '✅ KYC approuvé' : '❌ KYC rejeté';
    const message = action === 'approve'
      ? 'Votre compte a été vérifié. Vous bénéficiez maintenant de limites de transaction plus élevées.'
      : `Votre demande KYC a été rejetée. Raison: ${rejectionReason || 'Documents non conformes'}. Veuillez soumettre une nouvelle demande.`;

    await run(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, ?, ?, 'alert')
        `, [request.user_id, title, message]);

    await run('COMMIT');

    res.json({
      success: true,
      message: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('Erreur traitement KYC:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});

// Obtenir l'historique KYC
app.get('/api/kyc/history', authenticateToken, async (req, res) => {
  try {
    const history = await query(`
            SELECT kh.*, u.fullname as created_by_name
            FROM kyc_history kh
            LEFT JOIN users u ON kh.created_by = u.id
            WHERE kh.user_id = ?
            ORDER BY kh.created_at DESC
        `, [req.user.userId]);

    res.json(history || []);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.json([]);
  }
});

// Obtenir les limites KYC de l'utilisateur
app.get('/api/kyc/limits', authenticateToken, async (req, res) => {
  try {
    const kycRequest = await get(`
            SELECT level FROM kyc_requests 
            WHERE user_id = ? AND status = 'verified'
            ORDER BY level DESC LIMIT 1
        `, [req.user.userId]);

    const level = kycRequest?.level || 0;
    const limits = await get('SELECT * FROM kyc_limits WHERE level = ?', [level]);

    res.json({
      level,
      limits: limits || {
        daily_transaction_limit: 25000,
        monthly_transaction_limit: 100000,
        single_transaction_limit: 25000,
        withdrawal_limit: 50000
      }
    });
  } catch (error) {
    console.error('Erreur récupération limites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des limites' });
  }
});

// Vérifier si une transaction respecte les limites KYC
app.post('/api/kyc/check-limit', authenticateToken, async (req, res) => {
  const { amount, type } = req.body; // type: 'transfer', 'withdraw'

  try {
    const limitsRes = await axios.get('http://localhost:5000/api/kyc/limits', {
      headers: { Authorization: req.headers.authorization }
    });

    const limits = limitsRes.data.limits;

    // Vérifier la limite par transaction
    if (amount > limits.single_transaction_limit) {
      return res.json({
        allowed: false,
        reason: `La limite par transaction est de ${limits.single_transaction_limit.toLocaleString()} FCFA`,
        limit: limits.single_transaction_limit
      });
    }

    // Vérifier la limite quotidienne (à implémenter avec un cache)
    // Vérifier la limite mensuelle

    res.json({
      allowed: true,
      limits
    });

  } catch (error) {
    console.error('Erreur vérification limites:', error);
    res.json({ allowed: true }); // Par défaut, autoriser
  }
});
// backend/server.js - Ajouter ces endpoints

// ============================================
// ADMIN - GESTION DES UTILISATEURS
// ============================================

// Récupérer tous les utilisateurs (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { role, is_active, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT u.*, w.balance 
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (is_active !== undefined) {
      sql += ' AND u.is_active = ?';
      params.push(parseInt(is_active));
    }

    if (search) {
      sql += ' AND (u.phone LIKE ? OR u.fullname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await query(sql, params);

    const totalSql = `
      SELECT COUNT(*) as count FROM users u
      WHERE 1=1
      ${role && role !== 'all' ? 'AND role = ?' : ''}
      ${is_active !== undefined ? 'AND is_active = ?' : ''}
      ${search ? 'AND (phone LIKE ? OR fullname LIKE ?)' : ''}
    `;
    const totalParams = [];
    if (role && role !== 'all') totalParams.push(role);
    if (is_active !== undefined) totalParams.push(parseInt(is_active));
    if (search) totalParams.push(`%${search}%`, `%${search}%`);

    const total = await get(totalSql, totalParams);

    res.json({
      users: users || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Créer un nouvel utilisateur (admin)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, password, email, province, city, address, role } = req.body;

  // Validation
  if (!phone || !fullname || !password) {
    return res.status(400).json({ error: 'Tous les champs obligatoires sont requis' });
  }

  if (!/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }

  const validRoles = ['user', 'admin', 'agent'];
  const userRole = validRoles.includes(role) ? role : 'user';

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Générer clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPrivateKey = await bcrypt.hash(privateKey, 10);

    // Créer l'utilisateur
    const result = await run(`
      INSERT INTO users (phone, fullname, password_hash, private_key_6, province, city, address, email, role, is_active, is_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
    `, [phone, fullname, hashedPassword, hashedPrivateKey, province || null, city || null, address || null, email || null, userRole]);

    // Le trigger crée automatiquement le wallet avec 1000 FCFA

    // Log
    await run(`
      INSERT INTO system_logs (user_id, action, details, created_at)
      VALUES (?, 'USER_CREATED', ?, CURRENT_TIMESTAMP)
    `, [req.user.userId, `Création de l'utilisateur ${fullname} (${phone}) avec le rôle ${userRole}`]);

    res.status(201).json({
      success: true,
      user: {
        id: result.lastID,
        phone,
        fullname,
        role: userRole,
        private_key: privateKey
      }
    });

  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Mettre à jour un utilisateur (admin)
app.put('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { fullname, email, province, city, address, role, is_active } = req.body;

  try {
    const updates = [];
    const params = [];

    if (fullname !== undefined) {
      updates.push('fullname = ?');
      params.push(fullname);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (province !== undefined) {
      updates.push('province = ?');
      params.push(province);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});


// Supprimer un utilisateur (admin)
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  // Ne pas permettre la suppression de son propre compte
  if (parseInt(userId) === req.user.userId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  try {
    const user = await get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Ne pas permettre la suppression du dernier admin
    if (user.role === 'admin') {
      const adminCount = await get('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    await run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Obtenir les détails d'un utilisateur (admin)
app.get('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await get(`
      SELECT u.*, w.balance 
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);

  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// server.js - Ajouter ces routes
// ============================================
// ROUTES COMMUNES (SERVICES D'IMPÔTS)
// ============================================

// Admin: Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/admin/communes - Admin:', req.user.userId);

    const communes = await query(`
            SELECT 
                u.id,
                u.phone,
                u.fullname as contact_name,
                u.commune_name as name,
                u.commune_address as address,
                u.email,
                u.is_active,
                w.balance,
                u.created_at
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.commune_name
        `);

    console.log(`✅ ${communes.length} communes trouvées`);
    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur chargement communes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES ADMIN - GESTION DES COMMUNES (SERVICES D'IMPÔTS)
// ============================================

// Créer une commune (service d'impôt)
app.post('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, commune_name, commune_address, email, password } = req.body;

  console.log('=== CRÉATION COMMUNE ===');
  console.log('Données reçues:', { phone, fullname, commune_name, commune_address, email, password: '***' });

  // Validation
  if (!phone || !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (!fullname || !commune_name) {
    return res.status(400).json({ error: 'Le nom de la commune est requis' });
  }

  try {
    // Vérifier si le numéro existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Générer un mot de passe par défaut si non fourni
    const finalPassword = password || Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Générer une clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(privateKey, 10);

    // Démarrer une transaction
    await run('BEGIN TRANSACTION');

    try {
      // 1. Créer l'utilisateur avec rôle 'commune'
      const result = await run(
        `INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, commune_name, commune_address, email) 
                 VALUES (?, ?, ?, ?, 'commune', 1, 1, ?, ?, ?)`,
        [phone, fullname, hashedPassword, hashedKey, commune_name, commune_address || '', email || '']
      );

      const userId = result.lastID;
      console.log('✅ Utilisateur créé avec ID:', userId);

      // 2. Vérifier si un wallet existe déjà pour cet utilisateur
      const existingWallet = await get('SELECT id FROM wallets WHERE user_id = ?', [userId]);

      if (!existingWallet) {
        // Créer le wallet pour la commune
        await run(
          `INSERT INTO wallets (user_id, balance, bonus_balance, currency, is_principal, created_at, updated_at) 
                     VALUES (?, 0, 0, 'XAF', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId]
        );
        console.log('✅ Wallet créé pour la commune');
      } else {
        console.log('⚠️ Wallet existant trouvé, utilisation existant');
      }

      // 3. Ajouter également dans la table communes (optionnel)
      try {
        await run(
          `INSERT OR IGNORE INTO communes (phone, name, address, contact_name, contact_phone, email, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [phone, commune_name, commune_address, fullname, phone, email || '', req.user.userId]
        );
        console.log('✅ Entrée ajoutée dans la table communes');
      } catch (communeError) {
        console.log('⚠️ Erreur table communes (non bloquante):', communeError.message);
      }

      await run('COMMIT');

      // Notification WebSocket
      if (io) {
        io.to(`user_${req.user.userId}`).emit('notification', {
          title: '🏛️ Commune créée',
          message: `La commune "${commune_name}" a été créée avec succès. Téléphone: ${phone}`,
          type: 'success',
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Commune créée avec succès',
        commune: {
          id: userId,
          phone: phone,
          name: commune_name,
          address: commune_address,
          email: email,
          password: finalPassword,
          private_key: privateKey
        }
      });

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Erreur création commune:', error);

    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Un wallet existe déjà pour cette commune' });
    } else {
      res.status(500).json({ error: error.message || 'Erreur lors de la création de la commune' });
    }
  }
});

// ============================================
// ROUTES ADMIN - PARAMÈTRES DE L'APPLICATION
// ============================================

// Créer la table app_settings si elle n'existe pas
async function initAppSettingsTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                description TEXT,
                updated_by INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Insérer les paramètres par défaut si la table est vide
    const count = await get('SELECT COUNT(*) as count FROM app_settings');
    if (count && count.count === 0) {
      const defaultSettings = [
        { key: 'min_transaction', value: '25', type: 'number', desc: 'Montant minimum de transaction' },
        { key: 'max_transaction', value: '10000000', type: 'number', desc: 'Montant maximum de transaction' },
        { key: 'transfer_fee', value: '2', type: 'number', desc: 'Frais de transfert (%)' },
        { key: 'deposit_fee', value: '0', type: 'number', desc: 'Frais de dépôt (%)' },
        { key: 'withdrawal_fee', value: '2', type: 'number', desc: 'Frais de retrait (%)' },
        { key: 'referral_bonus', value: '500', type: 'number', desc: 'Bonus de parrainage' },
        { key: 'maintenance_mode', value: '0', type: 'boolean', desc: 'Mode maintenance' },
        { key: 'allow_international', value: '0', type: 'boolean', desc: 'Autoriser les transferts internationaux' },
        { key: 'site_name', value: 'alkherpay', type: 'string', desc: 'Nom du site' },
        { key: 'site_description', value: 'Solution de transfert d\'argent', type: 'string', desc: 'Description du site' },
        { key: 'contact_email', value: 'contact@alkherpay.com', type: 'string', desc: 'Email de contact' },
        { key: 'contact_phone', value: '+235 XX XX XX XX', type: 'string', desc: 'Téléphone de contact' }
      ];

      for (const setting of defaultSettings) {
        await run(`
                    INSERT INTO app_settings (setting_key, setting_value, setting_type, description)
                    VALUES (?, ?, ?, ?)
                `, [setting.key, setting.value, setting.type, setting.desc]);
      }
      console.log('✅ Paramètres par défaut initialisés');
    }
  } catch (error) {
    console.error('Erreur initialisation table app_settings:', error);
  }
}

// Appeler cette fonction au démarrage
// initAppSettingsTable();
// ============================================
// ADMIN SETTINGS - VERSION CORRIGÉE
// ============================================

// GET - Récupérer les paramètres
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📥 GET /api/admin/settings');

  try {
    // Récupérer tous les paramètres
    const settings = await query(`
            SELECT setting_key, setting_value, setting_type 
            FROM app_settings 
            ORDER BY setting_key
        `);

    // Valeurs par défaut
    const result = {
      min_transaction: 25,
      max_transaction: 10000000,
      transfer_fee: 2,
      deposit_fee: 0,
      withdrawal_fee: 2,
      referral_bonus: 500,
      maintenance_mode: false,
      allow_international: false
    };

    // Remplacer par les valeurs de la base de données
    for (const setting of settings) {
      let value = setting.setting_value;
      if (setting.setting_type === 'number') {
        value = parseFloat(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === '1' || value === 'true';
      }
      result[setting.setting_key] = value;
    }

    res.json({
      success: true,
      settings: result
    });

  } catch (error) {
    console.error('Erreur GET settings:', error);
    // Retourner les valeurs par défaut en cas d'erreur
    res.json({
      success: true,
      settings: {
        min_transaction: 25,
        max_transaction: 10000000,
        transfer_fee: 2,
        deposit_fee: 0,
        withdrawal_fee: 2,
        referral_bonus: 500,
        maintenance_mode: false,
        allow_international: false
      }
    });
  }
});

// PUT - Mettre à jour les paramètres (CORRIGÉ)
// ============================================
// ADMIN SETTINGS - ENDPOINT CORRIGÉ
// ============================================

// GET - Récupérer les paramètres
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📥 GET /api/admin/settings');

  try {
    // S'assurer que la table existe
    await run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Récupérer tous les paramètres
    const settings = await query(`
            SELECT setting_key, setting_value, setting_type 
            FROM app_settings 
            ORDER BY setting_key
        `);

    // Valeurs par défaut
    const result = {
      min_transaction: 25,
      max_transaction: 10000000,
      transfer_fee: 2,
      deposit_fee: 0,
      withdrawal_fee: 2,
      referral_bonus: 500,
      maintenance_mode: false,
      allow_international: false
    };

    // Remplacer par les valeurs de la BD
    for (const setting of settings) {
      let value = setting.setting_value;
      if (setting.setting_type === 'number') {
        value = parseFloat(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === '1' || value === 'true';
      }
      result[setting.setting_key] = value;
    }

    res.json({ success: true, settings: result });

  } catch (error) {
    console.error('Erreur GET settings:', error);
    res.json({
      success: true,
      settings: {
        min_transaction: 25,
        max_transaction: 10000000,
        transfer_fee: 2,
        deposit_fee: 0,
        withdrawal_fee: 2,
        referral_bonus: 500,
        maintenance_mode: false,
        allow_international: false
      }
    });
  }
});

// PUT - Mettre à jour les paramètres (VERSION CORRIGÉE - SANS L'ERREUR)
app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  console.log('\n📤 PUT /api/admin/settings');
  console.log('Body reçu:', JSON.stringify(req.body, null, 2));

  try {
    const {
      min_transaction = 25,
      max_transaction = 10000000,
      transfer_fee = 2,
      deposit_fee = 0,
      withdrawal_fee = 2,
      referral_bonus = 500,
      maintenance_mode = false,
      allow_international = false
    } = req.body;

    // Créer la table si elle n'existe pas
    await run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Liste des paramètres à mettre à jour
    const updates = [
      { key: 'min_transaction', value: min_transaction, type: 'number' },
      { key: 'max_transaction', value: max_transaction, type: 'number' },
      { key: 'transfer_fee', value: transfer_fee, type: 'number' },
      { key: 'deposit_fee', value: deposit_fee, type: 'number' },
      { key: 'withdrawal_fee', value: withdrawal_fee, type: 'number' },
      { key: 'referral_bonus', value: referral_bonus, type: 'number' },
      { key: 'maintenance_mode', value: maintenance_mode ? '1' : '0', type: 'boolean' },
      { key: 'allow_international', value: allow_international ? '1' : '0', type: 'boolean' }
    ];

    // Mettre à jour chaque paramètre
    for (const update of updates) {
      // Vérifier si la clé existe
      const existing = await get(
        'SELECT id FROM app_settings WHERE setting_key = ?',
        [update.key]
      );

      if (existing) {
        // Mettre à jour existant
        await run(`
                    UPDATE app_settings 
                    SET setting_value = ?, setting_type = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE setting_key = ?
                `, [String(update.value), update.type, update.key]);
      } else {
        // Insérer nouveau
        await run(`
                    INSERT INTO app_settings (setting_key, setting_value, setting_type, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `, [update.key, String(update.value), update.type]);
      }
    }

    console.log('✅ Paramètres mis à jour avec succès');

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



// Route pour initialiser les paramètres par défaut (si la table est vide)
app.post('/api/admin/init-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Vérifier si des paramètres existent déjà
    const count = await get('SELECT COUNT(*) as count FROM app_settings');

    if (count && count.count === 0) {
      // Insérer les valeurs par défaut
      const defaultSettings = [
        { key: 'min_transaction', value: '25', type: 'number', desc: 'Montant minimum de transaction (FCFA)' },
        { key: 'max_transaction', value: '10000000', type: 'number', desc: 'Montant maximum de transaction (FCFA)' },
        { key: 'transfer_fee', value: '2', type: 'number', desc: 'Frais de transfert (%)' },
        { key: 'deposit_fee', value: '0', type: 'number', desc: 'Frais de dépôt (%)' },
        { key: 'withdrawal_fee', value: '2', type: 'number', desc: 'Frais de retrait (%)' },
        { key: 'referral_bonus', value: '500', type: 'number', desc: 'Bonus de parrainage (FCFA)' },
        { key: 'maintenance_mode', value: '0', type: 'boolean', desc: 'Mode maintenance (0=off, 1=on)' },
        { key: 'allow_international', value: '0', type: 'boolean', desc: 'Autoriser les transferts internationaux' }
      ];

      for (const setting of defaultSettings) {
        await run(`
                    INSERT INTO app_settings (setting_key, setting_value, setting_type, description)
                    VALUES (?, ?, ?, ?)
                `, [setting.key, setting.value, setting.type, setting.desc]);
      }

      res.json({ success: true, message: 'Paramètres par défaut initialisés' });
    } else {
      res.json({ success: true, message: 'Des paramètres existent déjà' });
    }

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});


// Mettre à jour les paramètres (admin)
app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  const settings = req.body;

  console.log('📝 Mise à jour des paramètres:', settings);

  try {
    // Vérifier que la table existe
    await initAppSettingsTable();

    // Mettre à jour chaque paramètre
    for (const [key, value] of Object.entries(settings)) {
      let settingValue = value;
      let settingType = 'string';

      // Déterminer le type
      if (typeof value === 'number') {
        settingType = 'number';
        settingValue = value.toString();
      } else if (typeof value === 'boolean') {
        settingType = 'boolean';
        settingValue = value ? '1' : '0';
      }

      // Vérifier si le paramètre existe
      const existing = await get('SELECT id FROM app_settings WHERE setting_key = ?', [key]);

      if (existing) {
        await run(`
                    UPDATE app_settings 
                    SET setting_value = ?, setting_type = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE setting_key = ?
                `, [settingValue, settingType, req.user.userId, key]);
      } else {
        await run(`
                    INSERT INTO app_settings (setting_key, setting_value, setting_type, updated_by)
                    VALUES (?, ?, ?, ?)
                `, [key, settingValue, settingType, req.user.userId]);
      }
    }

    // Journaliser l'action
    await run(`
            INSERT INTO system_logs (user_id, action, details, created_at)
            VALUES (?, 'SETTINGS_UPDATED', ?, CURRENT_TIMESTAMP)
        `, [req.user.userId, `Mise à jour des paramètres: ${Object.keys(settings).join(', ')}`]);

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des paramètres',
      details: error.message
    });
  }
});

// Récupérer un paramètre spécifique (public, pour le frontend)
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;

  try {
    const setting = await get(`
            SELECT setting_value, setting_type FROM app_settings WHERE setting_key = ?
        `, [key]);

    if (!setting) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    let value = setting.setting_value;
    if (setting.setting_type === 'number') {
      value = parseFloat(value);
    } else if (setting.setting_type === 'boolean') {
      value = value === '1' || value === 'true';
    }

    res.json({ [key]: value });

  } catch (error) {
    console.error('Erreur récupération paramètre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer plusieurs paramètres (public)
app.get('/api/settings', async (req, res) => {
  const { keys } = req.query;

  try {
    let sql = 'SELECT setting_key as key, setting_value as value, setting_type as type FROM app_settings';
    const params = [];

    if (keys) {
      const keyArray = keys.split(',');
      sql += ' WHERE setting_key IN (' + keyArray.map(() => '?').join(',') + ')';
      params.push(...keyArray);
    }

    const settings = await query(sql, params);

    const result = {};
    settings.forEach(setting => {
      let value = setting.value;
      if (setting.type === 'number') {
        value = parseFloat(value);
      } else if (setting.type === 'boolean') {
        value = value === '1' || value === 'true';
      }
      result[setting.key] = value;
    });

    res.json(result);

  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const communes = await query(`
            SELECT u.id, u.phone, u.fullname, u.commune_name, u.commune_address, u.email, u.is_active,
                   w.balance
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.created_at DESC
        `);

    res.json(communes || []);
  } catch (error) {
    console.error('Erreur récupération communes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modifier une commune
app.put('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { commune_name, commune_address, email, is_active } = req.body;

  try {
    await run(
      `UPDATE users SET commune_name = ?, commune_address = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND role = 'commune'`,
      [commune_name, commune_address || '', email || '', is_active ? 1 : 0, id]
    );

    res.json({ success: true, message: 'Commune modifiée avec succès' });
  } catch (error) {
    console.error('Erreur modification commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une commune
app.delete('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete - désactiver plutôt que supprimer
    await run('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "commune"', [id]);

    res.json({ success: true, message: 'Commune désactivée avec succès' });
  } catch (error) {
    console.error('Erreur suppression commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer la liste des communes pour les paiements
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT 
                id, 
                phone, 
                commune_name as name, 
                commune_address as address,
                email
            FROM users 
            WHERE role = 'commune' AND is_active = 1
            ORDER BY commune_name
        `);

    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les statistiques d'une commune
app.get('/api/commune/stats', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    // Récupérer le solde du wallet
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    // Récupérer les paiements reçus
    const payments = await query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(fee) as total_fees,
                DATE(created_at) as payment_date
            FROM tax_payments
            WHERE commune_id = ?
            GROUP BY DATE(created_at)
            ORDER BY payment_date DESC
            LIMIT 30
        `, [req.user.userId]);

    res.json({
      balance: wallet?.balance || 0,
      total_payments: payments.reduce((sum, p) => sum + p.total_count, 0),
      total_amount: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      recent_payments: payments.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.json({ balance: 0, total_payments: 0, total_amount: 0 });
  }
});



// ============================================
// ROUTES PAIEMENTS DE TAXES
// ============================================

// Paiement d'une taxe vers une commune
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    commune_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('=== PAIEMENT TAXE ===');
  console.log('Commune ID:', commune_id);
  console.log('Montant:', amount);
  console.log('User:', req.user.userId);

  try {
    // Validation
    if (!commune_id) {
      return res.status(400).json({ error: 'Veuillez sélectionner une commune' });
    }
    if (!taxpayer_name) {
      return res.status(400).json({ error: 'Nom du contribuable requis' });
    }
    if (!taxpayer_phone) {
      return res.status(400).json({ error: 'Téléphone requis' });
    }
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Montant minimum 100 FCFA' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
    if (!payer) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer la commune (destinataire)
    const commune = await get('SELECT id, phone, commune_name, fullname FROM users WHERE id = ? AND role = "commune"', [commune_id]);
    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    // Calculer les frais (1% pour la plateforme)
    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receiptNumber = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Effectuer les transferts
    await run('BEGIN TRANSACTION');

    try {
      // Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // Créditer la commune (montant sans frais)
      await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, commune.id]);

      // Créditer le wallet principal des frais
      const mainWallet = await get('SELECT id FROM main_wallet LIMIT 1');
      if (mainWallet) {
        await run('UPDATE main_wallet SET balance = balance + ?, total_revenue = total_revenue + ?', [fee, fee]);
      }

      // Enregistrer la transaction
      const transactionRef = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await run(
        `INSERT INTO transactions (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                 VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?)`,
        [transactionRef, payer.phone, commune.phone, amount, fee, amount, `Paiement de taxe - ${receiptNumber}`]
      );

      // Créer la table tax_payments si elle n'existe pas
      await run(`CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE,
                payer_id INTEGER,
                commune_id INTEGER,
                taxpayer_name TEXT,
                taxpayer_phone TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT,
                tax_period TEXT,
                amount INTEGER,
                fee INTEGER,
                total_amount INTEGER,
                payment_status TEXT DEFAULT 'paid',
                alkherpay_transaction_ref TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (commune_id) REFERENCES users(id)
            )`);

      // Enregistrer le paiement
      await run(
        `INSERT INTO tax_payments (
                    receipt_number, payer_id, commune_id, taxpayer_name, taxpayer_phone,
                    taxpayer_address, business_number, property_address, tax_type,
                    tax_period, amount, fee, total_amount, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNumber, payer.id, commune.id, taxpayer_name, taxpayer_phone,
          taxpayer_address || '', business_number || '', property_address || '',
          tax_type, tax_period || new Date().getFullYear().toString(),
          amount, fee, totalAmount, notes || ''
        ]
      );

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [payer.id, '✅ Paiement de taxe effectué',
      `Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type} à ${commune.commune_name}. Reçu: ${receiptNumber}`,
        'tax_payment', `/tax-payment?receipt=${receiptNumber}`]
    );

    // Notification pour la commune
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [commune.id, '💰 Nouveau paiement de taxe reçu',
      `${payer.fullname} (${payer.phone}) a payé ${amount.toLocaleString()} FCFA pour ${tax_type}`,
        'tax_received', `/commune/payments`]
    );

    console.log('✅ Paiement enregistré:', receiptNumber);

    res.json({
      success: true,
      receipt: {
        receipt_number: receiptNumber,
        taxpayer_name,
        taxpayer_phone,
        tax_type,
        amount,
        fee,
        total_amount: totalAmount,
        commune_name: commune.commune_name,
        commune_phone: commune.phone,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Historique des paiements de taxes de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await query(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.payer_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.json([]);
  }
});

// Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone, u.commune_address
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('❌ Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les paiements reçus par une commune
app.get('/api/commune/payments', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    const payments = await query(`
            SELECT tp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur paiements reçus:', error);
    res.json([]);
  }
});

// server.js - Route corrigée pour les paiements des communes

// GET - Récupérer les paiements d'une commune (pour la commune connectée)
app.get('/api/commune/payments', authenticateToken, async (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;

  try {
    console.log('📋 GET /api/commune/payments - User:', req.user.userId, 'Role:', req.user.role);

    // ✅ Vérifier que l'utilisateur est une commune (ou admin)
    const user = await get('SELECT id, role, phone FROM users WHERE id = ?', [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // ✅ Si admin, récupérer toutes les communes ou une spécifique
    let communeId = null;
    let communeName = null;

    if (user.role === 'admin') {
      // Admin peut voir toutes les communes
      // On peut filtrer par commune_id si passé en paramètre
      const { commune_id } = req.query;
      if (commune_id) {
        communeId = commune_id;
        const commune = await get('SELECT id, name FROM communes WHERE id = ?', [communeId]);
        communeName = commune?.name || null;
      }
    } else if (user.role === 'commune') {
      // ✅ Commune ne voit que ses propres paiements
      const commune = await get('SELECT id, name FROM communes WHERE phone = ? AND is_active = 1', [user.phone]);
      if (!commune) {
        return res.status(404).json({ error: 'Commune non trouvée' });
      }
      communeId = commune.id;
      communeName = commune.name;
    } else {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Si pas de commune trouvée
    if (!communeId) {
      return res.json({
        success: true,
        payments: [],
        stats: {
          total_amount: 0,
          total_count: 0,
          today_amount: 0,
          month_amount: 0,
          pending_count: 0
        }
      });
    }

    // ✅ Construire la requête SQL
    let sql = `
            SELECT 
                tp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
        `;
    const params = [communeId];

    if (status && status !== 'all') {
      sql += ' AND tp.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY tp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payments = await query(sql, params);

    // ✅ Statistiques
    const stats = await get(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN amount ELSE 0 END), 0) as today_amount,
                COALESCE(SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as month_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count
            FROM tax_payments
            WHERE commune_id = ?
        `, [communeId]);

    console.log(`✅ ${payments.length} paiements trouvés pour la commune ${communeName || communeId}`);

    res.json({
      success: true,
      payments: payments || [],
      commune: {
        id: communeId,
        name: communeName
      },
      stats: {
        total_amount: stats?.total_amount || 0,
        total_count: stats?.total_count || 0,
        today_amount: stats?.today_amount || 0,
        month_amount: stats?.month_amount || 0,
        pending_count: stats?.pending_count || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération paiements commune:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
// ============================================
// ADMIN: RÉINITIALISATION DE LA CLÉ PRIVÉE
// ============================================

app.post('/api/admin/users/:id/reset-key', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  console.log('=== POST /api/admin/users/reset-key ===');
  console.log('User ID:', id);
  console.log('Admin ID:', req.user.userId);

  try {
    // 1. Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname, role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // 2. Générer une nouvelle clé privée (6 chiffres)
    const newPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(newPrivateKey, 10);

    // 3. Mettre à jour la base de données
    await run(
      `UPDATE users SET 
                private_key_6 = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
      [hashedKey, id]
    );

    // 4. Journaliser l'action
    try {
      await run(
        `INSERT INTO system_logs (user_id, action, details, created_at) 
                 VALUES (?, ?, ?, datetime('now'))`,
        [req.user.userId, 'RESET_PRIVATE_KEY', `Reset private key for user ${id} (${user.phone})`]
      );
    } catch (logErr) {
      console.log('Log error (ignored):', logErr.message);
    }

    console.log('✅ Private key reset successful for user', id);
    console.log('New private key:', newPrivateKey);

    // 5. Retourner la réponse
    res.json({
      success: true,
      message: 'Clé privée réinitialisée avec succès',
      new_private_key: newPrivateKey,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Error in reset-key:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// ROUTE ADMIN - RÉINITIALISATION DE CLÉ PRIVÉE AVEC NOTIFICATIONS
// ============================================

// Réinitialiser la clé privée d'un utilisateur (admin)
app.post('/api/admin/users/:userId/reset-key', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('=== RÉINITIALISATION CLÉ PRIVÉE ===');
  console.log('User ID:', userId);
  console.log('Admin qui fait l\'action:', req.user.userId);

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname, email FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer une nouvelle clé privée à 6 chiffres
    const newPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(newPrivateKey, 10);

    // Mettre à jour la clé privée
    await run('UPDATE users SET private_key_6 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedKey, userId]);

    console.log('✅ Clé privée mise à jour pour:', user.phone);
    console.log('📱 Nouvelle clé privée:', newPrivateKey);

    // Enregistrer dans les logs
    try {
      await run(`INSERT INTO system_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.userId, 'RESET_KEY', `Réinitialisation clé privée de l'utilisateur ${user.phone}`]);
    } catch (logError) {
      console.log('Erreur log (non bloquante):', logError.message);
    }

    // ============================================
    // NOTIFICATION À L'UTILISATEUR CONCERNÉ
    // ============================================
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: Date.now(),
        title: '🔑 Clé privée réinitialisée',
        message: `Votre clé privée a été réinitialisée par l'administrateur.`,
        details: `Nouvelle clé privée: ${newPrivateKey}`,
        type: 'security',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        action: 'change_key',
        data: { new_private_key: newPrivateKey }
      });
      console.log('✅ Notification envoyée à l\'utilisateur');
    }

    // ============================================
    // NOTIFICATION À L'ADMIN QUI A FAIT L'ACTION
    // ============================================
    if (io) {
      io.to(`user_${req.user.userId}`).emit('notification', {
        id: Date.now(),
        title: '✅ Clé privée réinitialisée',
        message: `La clé privée de ${user.fullname} a été réinitialisée avec succès`,
        details: `Nouvelle clé privée: ${newPrivateKey}`,
        type: 'success',
        severity: 'info',
        timestamp: new Date().toISOString()
      });
      console.log('✅ Notification envoyée à l\'admin');
    }

    // ============================================
    // NOTIFICATION À TOUS LES AUTRES ADMINS (optionnel)
    // ============================================
    if (io) {
      // Envoyer à tous les admins connectés
      const admins = await query('SELECT id FROM users WHERE role = "admin" AND id != ?', [req.user.userId]);
      for (const admin of admins) {
        io.to(`user_${admin.id}`).emit('notification', {
          id: Date.now(),
          title: '🔑 Réinitialisation de clé',
          message: `${req.user.fullname || 'Un administrateur'} a réinitialisé la clé privée de ${user.fullname}`,
          type: 'info',
          severity: 'info',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Clé privée réinitialisée avec succès',
      new_private_key: newPrivateKey,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('Erreur réinitialisation clé privée:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la réinitialisation de la clé privée' });
  }
});

// ============================================
// ============================================
// ROUTE ADMIN - RÉINITIALISATION MOT DE PASSE AVEC GÉNÉRATION ALÉATOIRE
// ============================================

// ============================================
// RÉINITIALISATION DU MOT DE PASSE (ADMIN) - CORRIGÉ
// ============================================

app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('🔐 Réinitialisation mot de passe:', { userId });

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau mot de passe à 6 chiffres
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]);

    // Journaliser l'action
    try {
      await run(`
                INSERT INTO system_logs (user_id, action, details, created_at)
                VALUES (?, 'PASSWORD_RESET', ?, CURRENT_TIMESTAMP)
            `, [req.user.userId, `Réinitialisation mot de passe pour ${user.phone}`]);
    } catch (logErr) {
      console.log('Erreur log (non bloquante):', logErr.message);
    }

    // Créer une notification pour l'utilisateur - VERSION CORRIGÉE (sans apostrophe problématique)
    try {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '🔐 Mot de passe réinitialisé', 
                        'Votre mot de passe a ete reinitialise par l administrateur.', 
                        'security', CURRENT_TIMESTAMP)
            `, [userId]);
    } catch (notifErr) {
      console.log('Erreur notification (non bloquante):', notifErr.message);
      // Essayer avec un message plus simple
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, 'Password Reset', 'Your password has been reset by admin', 'security', CURRENT_TIMESTAMP)
            `, [userId]);
    }

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      new_password: newPassword,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 
// ============================================
// Endpoint de secours pour la compatibilité
app.get('/api/tax/offices', async (req, res) => {
  try {
    const offices = await query(`
            SELECT id, name, type, description, contact_phone, contact_email
            FROM service_companies
            WHERE is_active = 1
            ORDER BY name ASC
        `);

    res.json(offices || []);
  } catch (error) {
    // Données par défaut
    res.json([
      { id: 1, name: 'STE', type: 'water', description: 'Société Tchadienne des Eaux', contact_phone: 'XX XX XX XX' },
      { id: 2, name: 'ZIZ', type: 'electricity', description: 'Électricité du Tchad', contact_phone: 'XX XX XX XX' }
    ]);
  }
});

//=============================================
// kyc limits
//=============================================

// ============================================
// ROUTES KYC - HISTORIQUE
// ============================================

// Récupérer l'historique KYC de l'utilisateur
app.get('/api/kyc/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer toutes les demandes KYC de l'utilisateur
    const history = await query(`
            SELECT 
                id,
                user_id,
                level,
                status,
                verified_at,
                rejection_reason,
                created_at,
                updated_at
            FROM user_kyc 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

    if (!history || history.length === 0) {
      return res.json({
        success: true,
        history: [],
        message: 'Aucun historique KYC trouvé'
      });
    }

    // Formater l'historique
    const formattedHistory = history.map(record => ({
      id: record.id,
      date: record.created_at,
      status: record.status,
      level: record.level,
      rejectionReason: record.rejection_reason,
      verifiedAt: record.verified_at,
      statusText: getKYCStatusText(record.status),
      statusColor: getKYCStatusColor(record.status)
    }));

    res.json({
      success: true,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Erreur récupération historique KYC:', error);
    // Retourner un historique vide en cas d'erreur
    res.json({
      success: true,
      history: []
    });
  }
});

// Fonction utilitaire pour le texte du statut
function getKYCStatusText(status) {
  const statusMap = {
    'pending': 'En cours de vérification',
    'verified': 'Vérifié',
    'rejected': 'Rejeté',
    'not_submitted': 'Non soumis',
    'expired': 'Expiré'
  };
  return statusMap[status] || 'Inconnu';
}

// Fonction utilitaire pour la couleur du statut
function getKYCStatusColor(status) {
  const colorMap = {
    'pending': 'orange',
    'verified': 'green',
    'rejected': 'red',
    'not_submitted': 'gray',
    'expired': 'gray'
  };
  return colorMap[status] || 'gray';
}

// Récupérer les documents KYC de l'utilisateur
app.get('/api/kyc/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const documents = await query(`
            SELECT 
                id,
                document_type,
                file_name,
                uploaded_at,
                status
            FROM kyc_documents 
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        `, [userId]);

    res.json({
      success: true,
      documents: documents || []
    });

  } catch (error) {
    console.error('Erreur récupération documents KYC:', error);
    res.json({
      success: true,
      documents: []
    });
  }
});

// Soumettre une demande de mise à niveau KYC
app.post('/api/kyc/upgrade', authenticateToken, async (req, res) => {
  const { requestedLevel, documents } = req.body;

  try {
    const userId = req.user.userId;

    // Vérifier le niveau actuel
    const currentKyc = await get(`
            SELECT level, status FROM user_kyc WHERE user_id = ?
        `, [userId]);

    if (!currentKyc || currentKyc.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Vous devez d\'abord compléter le niveau 1'
      });
    }

    if (requestedLevel <= currentKyc.level) {
      return res.status(400).json({
        success: false,
        error: 'Le niveau demandé doit être supérieur à votre niveau actuel'
      });
    }

    // Créer une nouvelle demande de mise à niveau
    await run(`
            INSERT INTO kyc_upgrade_requests (
                user_id, current_level, requested_level, documents, status, created_at
            ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [userId, currentKyc.level, requestedLevel, JSON.stringify(documents || [])]);

    // Notification à l'admin
    const admin = await get('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admin) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '📊 Demande de mise à niveau KYC', 
                        ?, 'alert', CURRENT_TIMESTAMP)
            `, [admin.id, `Un utilisateur demande le niveau ${requestedLevel} KYC`]);
    }

    res.json({
      success: true,
      message: 'Demande de mise à niveau soumise avec succès'
    });

  } catch (error) {
    console.error('Erreur demande mise à niveau KYC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la demande'
    });
  }
});




//=========================================
//
//=======================================
// ============================================
// CORRECTION DE LA TABLE KYC_HISTORY
// ============================================

async function fixKycHistoryTable() {
  try {
    // Vérifier les colonnes existantes
    const columns = await query('PRAGMA table_info(kyc_history)');
    console.log('📋 Colonnes actuelles de kyc_history:', columns.map(c => c.name));

    // Supprimer l'ancienne table si elle a une mauvaise structure
    await run('DROP TABLE IF EXISTS kyc_history');

    // Recréer la table avec la bonne structure
    await run(`
            CREATE TABLE kyc_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kyc_request_id INTEGER NOT NULL,
                user_id INTEGER,
                action TEXT NOT NULL,
                status_from TEXT,
                status_to TEXT,
                description TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    console.log('✅ Table kyc_history recréée avec succès');

  } catch (error) {
    console.error('❌ Erreur recréation kyc_history:', error);
  }
}



//==============================================
//
//==============================================

// ============================================
// BILL PAYMENT ENDPOINTS
// ============================================
// ============================================
// ROUTES POUR LES PAIEMENTS DE FACTURES
// ============================================

// 1. RECHERCHER UN COMPTEUR
app.post('/api/bill-payments/search-meter', authenticateToken, async (req, res) => {
  const { meter_number, company_id } = req.body;

  console.log('🔍 Recherche compteur:', { meter_number, company_id });

  try {
    // Vérifier que l'entreprise existe
    const company = await get(
      'SELECT id, name, type FROM service_companies WHERE id = ? AND is_active = 1',
      [company_id]
    );

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Simulation - À connecter à l'API réelle de STE/ZIZ
    // Dans la vraie vie, vous feriez un appel API externe
    const meterInfo = {
      customer_name: `Client ${meter_number}`,
      address: "N'Djaména, Tchad",
      outstanding_amount: Math.floor(Math.random() * 50000) + 5000,
      period: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      meter_number: meter_number,
      company_name: company.name,
      company_type: company.type
    };

    res.json({ success: true, data: meterInfo });

  } catch (error) {
    console.error('❌ Erreur recherche compteur:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// PAYER UNE FACTURE (CLIENT → ENTREPRISE) - CORRIGÉ
// ============================================
app.post('/api/bill-payment', authenticateToken, async (req, res) => {
  const {
    company_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    meter_number,
    amount,
    period,
    invoice_number,
    account_number
  } = req.body;

  console.log('💰 Paiement facture reçu:', {
    company_id,
    customer_name,
    amount,
    meter_number
  });

  // Validation
  if (!company_id) {
    return res.status(400).json({ error: 'Veuillez sélectionner une entreprise' });
  }

  if (!customer_name) {
    return res.status(400).json({ error: 'Nom du client requis' });
  }

  if (!customer_phone) {
    return res.status(400).json({ error: 'Téléphone du client requis' });
  }

  if (!meter_number) {
    return res.status(400).json({ error: 'Numéro de compteur requis' });
  }

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Montant minimum 100 FCFA' });
  }

  // Variable pour suivre si une transaction est active
  let transactionActive = false;

  try {
    // Récupérer l'entreprise
    const company = await get(`
            SELECT sc.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM service_companies sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.id = ? AND sc.is_active = 1
        `, [company_id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Récupérer le payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    if (!payer) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.015); // 1.5% de frais
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        balance: payerWallet?.balance || 0,
        required: totalAmount,
        missing: totalAmount - (payerWallet?.balance || 0)
      });
    }

    // ✅ Démarrer la transaction ICI (après toutes les vérifications)
    await run('BEGIN TRANSACTION');
    transactionActive = true;

    // Générer les références
    const receiptNumber = `BILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer l'entreprise (son compte agent)
      if (company.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, company.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bill_payment', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        payer.phone,
        company.agent_phone,
        amount,
        fee,
        amount - fee,
        `Paiement facture ${company.name} - ${receiptNumber}`
      ]);

      // 5. Enregistrer le paiement de facture
      await run(`
                INSERT INTO bill_payments (
                    receipt_number, payer_id, company_id, company_name, customer_name,
                    customer_phone, customer_email, customer_address, meter_number,
                    account_number, amount, fee, total_amount, period, invoice_number,
                    service_type, transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receiptNumber,
        payer.id,
        company.id,
        company.name,
        customer_name,
        customer_phone,
        customer_email || '',
        customer_address || '',
        meter_number,
        account_number || '',
        amount,
        fee,
        totalAmount,
        period || '',
        invoice_number || '',
        company.type,
        transactionRef
      ]);

      // ✅ Valider la transaction
      await run('COMMIT');
      transactionActive = false;

    } catch (err) {
      // ✅ Annuler la transaction si elle est active
      if (transactionActive) {
        try {
          await run('ROLLBACK');
          transactionActive = false;
        } catch (rollbackErr) {
          console.error('⚠️ Erreur rollback:', rollbackErr.message);
        }
      }
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    'Vous avez payé ${amount.toLocaleString()} FCFA pour votre facture ${company.name}', 
                    'bill_payment', CURRENT_TIMESTAMP)
        `, [payer.id]);

    // Notification pour l'entreprise (agent)
    if (company.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement reçu', 
                        '${payer.fullname} a payé ${amount.toLocaleString()} FCFA pour ${company.name}', 
                        'bill_received', '${JSON.stringify({ payer: payer.fullname, amount, receipt: receiptNumber })}', 
                        CURRENT_TIMESTAMP)
            `, [company.agent_user_id]);

      // Envoyer via WebSocket si disponible
      if (io) {
        io.to(`user_${company.agent_user_id}`).emit('bill-payment', {
          receipt: receiptNumber,
          customer_name: customer_name,
          amount: amount,
          company: company.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Récupérer les nouveaux soldes
    const newPayerBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    const newCompanyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [company.agent_user_id]);

    res.json({
      success: true,
      message: 'Paiement effectué avec succès',
      receipt: {
        receipt_number: receiptNumber,
        company_name: company.name,
        service_type: company.type,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_address: customer_address,
        meter_number: meter_number,
        amount: amount,
        fee: fee,
        period: period || new Date().toLocaleDateString(),
        invoice_number: invoice_number,
        payment_date: new Date().toISOString()
      },
      balances: {
        payer: {
          before: payerWallet.balance,
          after: newPayerBalance?.balance || 0,
          debited: totalAmount
        },
        company: {
          before: 0,
          after: newCompanyBalance?.balance || 0,
          credited: amount
        }
      }
    });

  } catch (error) {
    // ✅ Vérifier si une transaction est active avant de faire rollback
    if (transactionActive) {
      try {
        await run('ROLLBACK');
        transactionActive = false;
        console.log('🔄 Rollback effectué');
      } catch (rollbackErr) {
        console.error('⚠️ Erreur rollback:', rollbackErr.message);
      }
    }

    console.error('❌ Erreur paiement:', error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// 3. HISTORIQUE DES PAIEMENTS DE L'UTILISATEUR
app.get('/api/bill-payments/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT bp.*, sc.name as company_name, sc.type as service_type
            FROM bill_payments bp
            LEFT JOIN service_companies sc ON bp.company_id = sc.id
            WHERE bp.payer_id = ?
            ORDER BY bp.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM bill_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json({ success: true, payments: [] });
  }
});

// 4. RÉCUPÉRER UN REÇU SPÉCIFIQUE
app.get('/api/bill-payments/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT bp.*, sc.name as company_name, sc.type as service_type
            FROM bill_payments bp
            LEFT JOIN service_companies sc ON bp.company_id = sc.id
            WHERE bp.receipt_number = ? AND bp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// BACKEND - GESTION DES ENTREPRISES DE FACTURATION
// ============================================

// ============================================
// 1. CRÉER LA TABLE DES ENTREPRISES DE SERVICES
// ============================================
async function createServiceCompaniesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS service_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('water', 'electricity')),
                fullName TEXT,
                description TEXT,
                logo TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                address TEXT,
                color TEXT,
                user_id INTEGER UNIQUE,
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Créer la table des paiements de factures
    await run(`
            CREATE TABLE IF NOT EXISTS bill_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE NOT NULL,
                payer_id INTEGER NOT NULL,
                company_id INTEGER NOT NULL,
                company_name TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_email TEXT,
                customer_address TEXT,
                meter_number TEXT NOT NULL,
                account_number TEXT,
                amount INTEGER NOT NULL,
                fee INTEGER DEFAULT 0,
                total_amount INTEGER NOT NULL,
                period TEXT,
                invoice_number TEXT,
                service_type TEXT,
                status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES service_companies(id)
            )
        `);

    console.log('✅ Tables service_companies et bill_payments créées');
  } catch (error) {
    console.error('Erreur création tables:', error);
  }
}

// ============================================
// 1. CRÉATION DES TABLES
// ============================================

async function createTaxTables() {
  try {
    // Table des communes (services d'impôts)
    await run(`
            CREATE TABLE IF NOT EXISTS communes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                address TEXT,
                contact_name TEXT,
                contact_phone TEXT,
                email TEXT,
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Table des paiements de taxes
    await run(`
            CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE NOT NULL,
                payer_id INTEGER NOT NULL,
                commune_id INTEGER NOT NULL,
                commune_name TEXT NOT NULL,
                taxpayer_name TEXT NOT NULL,
                taxpayer_phone TEXT NOT NULL,
                taxpayer_email TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT NOT NULL,
                tax_period TEXT,
                amount INTEGER NOT NULL,
                fee INTEGER DEFAULT 0,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'paid',
                transaction_ref TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (commune_id) REFERENCES communes(id)
            )
        `);

    // Table des types de taxes
    await run(`
            CREATE TABLE IF NOT EXISTS tax_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                rate INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Table des périodes fiscales
    await run(`
            CREATE TABLE IF NOT EXISTS tax_periods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                start_date DATE,
                end_date DATE,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    console.log('✅ Tables de taxes créées/vérifiées');
  } catch (error) {
    console.error('❌ Erreur création tables taxes:', error);
    throw error;
  }
}

// ============================================
// 2. ROUTES - PAIEMENTS DES TAXES (PUBLIC)
// ============================================

// GET - Récupérer les types de taxes
app.get('/api/tax-types', async (req, res) => {
  try {
    const types = await query(`
            SELECT * FROM tax_types 
            WHERE is_active = 1 
            ORDER BY name ASC
        `);
    res.json(types || []);
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.json([
      { id: 1, name: 'Taxe d\'habitation', description: 'Taxe sur les logements' },
      { id: 2, name: 'Taxe professionnelle', description: 'Taxe sur les activités professionnelles' },
      { id: 3, name: 'Taxe foncière', description: 'Taxe sur les propriétés' },
      { id: 4, name: 'Taxe de séjour', description: 'Taxe sur les hébergements touristiques' }
    ]);
  }
});

// GET - Récupérer les périodes fiscales
app.get('/api/tax-periods', async (req, res) => {
  try {
    const periods = await query(`
            SELECT * FROM tax_periods 
            WHERE is_active = 1 
            ORDER BY start_date DESC
        `);
    res.json(periods || []);
  } catch (error) {
    res.json([
      { id: 1, name: 'Janvier 2026' },
      { id: 2, name: 'Février 2026' },
      { id: 3, name: 'Mars 2026' }
    ]);
  }
});

// POST - Paiement d'une taxe
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    commune_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_email,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('💰 Paiement taxe reçu:', { commune_id, taxpayer_name, amount, tax_type });

  try {
    // Validation
    if (!commune_id) {
      return res.status(400).json({ error: 'Veuillez sélectionner une commune' });
    }
    if (!taxpayer_name) {
      return res.status(400).json({ error: 'Nom du contribuable requis' });
    }
    if (!taxpayer_phone) {
      return res.status(400).json({ error: 'Téléphone requis' });
    }
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Montant minimum 100 FCFA' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
    if (!payer) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer la commune (destinataire)
    const commune = await get(`
            SELECT id, phone, name, address, contact_name 
            FROM communes 
            WHERE id = ? AND is_active = 1
        `, [commune_id]);

    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    // Calculer les frais (1% pour la plateforme)
    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        balance: payerWallet?.balance || 0,
        required: totalAmount,
        missing: totalAmount - (payerWallet?.balance || 0)
      });
    }

    // Générer le reçu
    const receiptNumber = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer la commune (montant sans frais)
      const communeUser = await get('SELECT id FROM users WHERE phone = ?', [commune.phone]);
      if (communeUser) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, communeUser.id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        payer.phone,
        commune.phone,
        amount,
        fee,
        amount - fee,
        `Paiement ${tax_type} - ${receiptNumber}`
      ]);

      // 5. Enregistrer le paiement de taxe
      await run(`
                INSERT INTO tax_payments (
                    receipt_number, payer_id, commune_id, commune_name, taxpayer_name,
                    taxpayer_phone, taxpayer_email, taxpayer_address, business_number,
                    property_address, tax_type, tax_period, amount, fee, total_amount,
                    transaction_ref, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receiptNumber, payer.id, commune.id, commune.name, taxpayer_name,
        taxpayer_phone, taxpayer_email || '', taxpayer_address || '', business_number || '',
        property_address || '', tax_type, tax_period || '', amount, fee, totalAmount,
        transactionRef, notes || ''
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement de taxe effectué', 
                    'Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type} à ${commune.name}', 
                    'tax_payment', CURRENT_TIMESTAMP)
        `, [payer.id]);

    // Notification pour la commune
    if (communeUser) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '💰 Nouveau paiement de taxe reçu',
                        '${payer.fullname} (${payer.phone}) a payé ${amount.toLocaleString()} FCFA pour ${tax_type}',
                        'tax_received', CURRENT_TIMESTAMP)
            `, [communeUser.id]);
    }

    console.log('✅ Paiement enregistré:', receiptNumber);

    res.json({
      success: true,
      receipt: {
        receipt_number: receiptNumber,
        taxpayer_name,
        taxpayer_phone,
        tax_type,
        amount,
        fee,
        total_amount: totalAmount,
        commune_name: commune.name,
        commune_phone: commune.phone,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Historique des paiements de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT 
                tp.*,
                c.name as commune_name,
                c.phone as commune_phone,
                c.address as commune_address
            FROM tax_payments tp
            LEFT JOIN communes c ON tp.commune_id = c.id
            WHERE tp.payer_id = ?
            ORDER BY tp.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM tax_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.json({ success: true, payments: [] });
  }
});

// GET - Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT 
                tp.*,
                c.name as commune_name,
                c.phone as commune_phone,
                c.address as commune_address
            FROM tax_payments tp
            LEFT JOIN communes c ON tp.commune_id = c.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('❌ Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. ROUTES - COMMUNES (ADMIN)
// ============================================

// GET - Récupérer toutes les communes
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT 
                c.*,
                u.fullname as created_by_name
            FROM communes c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.is_active = 1
            ORDER BY c.name ASC
        `);

    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Récupérer les communes avec leurs soldes
app.get('/api/communes/with-balance', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT 
                c.*,
                u.id as user_id,
                u.phone as user_phone,
                w.balance,
                COALESCE((
                    SELECT SUM(amount) FROM tax_payments 
                    WHERE commune_id = c.id AND status = 'paid'
                ), 0) as total_collected,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments 
                    WHERE commune_id = c.id AND status = 'paid'
                ), 0) as total_payments
            FROM communes c
            LEFT JOIN users u ON c.phone = u.phone
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE c.is_active = 1
            ORDER BY c.name ASC
        `);

    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Créer une commune (admin)
app.post('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, name, address, contact_name, contact_phone, email, password } = req.body;

  console.log('🏛️ Création commune:', { phone, name });

  // Validation
  if (!phone || !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Le nom de la commune est requis' });
  }

  try {
    // Vérifier si le numéro existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Vérifier si la commune existe déjà
    const existingCommune = await get('SELECT id FROM communes WHERE phone = ?', [phone]);
    if (existingCommune) {
      return res.status(400).json({ error: 'Une commune avec ce numéro existe déjà' });
    }

    // Générer un mot de passe par défaut
    const finalPassword = password || Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Générer une clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(privateKey, 10);

    await run('BEGIN TRANSACTION');

    try {
      // 1. Créer l'utilisateur
      const userResult = await run(`
                INSERT INTO users (
                    phone, fullname, password_hash, private_key_6, 
                    role, is_active, is_verified, created_at
                ) VALUES (?, ?, ?, ?, 'commune', 1, 1, CURRENT_TIMESTAMP)
            `, [phone, name, hashedPassword, hashedKey]);

      const userId = userResult.lastID;

      // 2. Créer le wallet
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);

      // 3. Créer la commune
      await run(`
                INSERT INTO communes (
                    phone, name, address, contact_name, contact_phone, email, 
                    created_by, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            `, [phone, name, address || '', contact_name || name, contact_phone || phone, email || '', req.user.userId]);

      await run('COMMIT');

      console.log('✅ Commune créée:', { id: userId, phone, name });

      res.status(201).json({
        success: true,
        message: 'Commune créée avec succès',
        commune: {
          id: userId,
          phone: phone,
          name: name,
          address: address || '',
          password: finalPassword,
          private_key: privateKey
        }
      });

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Erreur création commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Modifier une commune (admin)
app.put('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, address, contact_name, contact_phone, email, is_active } = req.body;

  try {
    // Vérifier si la commune existe
    const commune = await get('SELECT phone FROM communes WHERE id = ?', [id]);
    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    // Mettre à jour la commune
    await run(`
            UPDATE communes 
            SET name = ?, 
                address = ?, 
                contact_name = ?, 
                contact_phone = ?, 
                email = ?,
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, address || '', contact_name || name, contact_phone || commune.phone, email || '', is_active ? 1 : 0, id]);

    // Mettre à jour l'utilisateur associé
    const user = await get('SELECT id FROM users WHERE phone = ?', [commune.phone]);
    if (user) {
      await run('UPDATE users SET fullname = ?, is_active = ? WHERE id = ?', [name, is_active ? 1 : 0, user.id]);
    }

    res.json({ success: true, message: 'Commune modifiée avec succès' });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer une commune (admin)
app.delete('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete
    await run('UPDATE communes SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    // Désactiver l'utilisateur associé
    const commune = await get('SELECT phone FROM communes WHERE id = ?', [id]);
    if (commune) {
      const user = await get('SELECT id FROM users WHERE phone = ?', [commune.phone]);
      if (user) {
        await run('UPDATE users SET is_active = 0 WHERE id = ?', [user.id]);
      }
    }

    res.json({ success: true, message: 'Commune désactivée avec succès' });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 4. ROUTES - PAIEMENTS REÇUS PAR UNE COMMUNE
// ============================================

// GET - Récupérer les paiements d'une commune (pour la commune connectée)
app.get('/api/commune/payments', authenticateToken, async (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;

  try {
    // Vérifier que l'utilisateur est une commune
    const user = await get('SELECT role, phone FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'commune') {
      return res.status(403).json({ error: 'Accès réservé aux communes' });
    }

    // Récupérer la commune
    const commune = await get('SELECT id, name FROM communes WHERE phone = ? AND is_active = 1', [user.phone]);
    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    let sql = `
            SELECT 
                tp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
        `;
    const params = [commune.id];

    if (status && status !== 'all') {
      sql += ' AND tp.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY tp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payments = await query(sql, params);

    // Statistiques
    const stats = await get(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN amount ELSE 0 END), 0) as today_amount,
                COALESCE(SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as month_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count
            FROM tax_payments
            WHERE commune_id = ?
        `, [commune.id]);

    res.json({
      success: true,
      payments: payments || [],
      stats: {
        total_amount: stats?.total_amount || 0,
        total_count: stats?.total_count || 0,
        today_amount: stats?.today_amount || 0,
        month_amount: stats?.month_amount || 0,
        pending_count: stats?.pending_count || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération paiements commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Récupérer les paiements d'une commune spécifique (admin)
app.get('/api/admin/communes/:id/payments', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                tp.*,
                u.fullname as payer_name,
                u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
        `;
    const params = [id];

    if (status && status !== 'all') {
      sql += ' AND tp.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY tp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payments = await query(sql, params);

    // Statistiques
    const stats = await get(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count
            FROM tax_payments
            WHERE commune_id = ?
        `, [id]);

    res.json({
      success: true,
      payments: payments || [],
      stats: {
        total_amount: stats?.total_amount || 0,
        total_count: stats?.total_count || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques d'une commune
app.get('/api/commune/stats', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est une commune
    const user = await get('SELECT role, phone FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'commune') {
      return res.status(403).json({ error: 'Accès réservé aux communes' });
    }

    const commune = await get('SELECT id FROM communes WHERE phone = ? AND is_active = 1', [user.phone]);
    if (!commune) {
      return res.json({
        balance: 0,
        total_payments: 0,
        total_amount: 0,
        recent_payments: []
      });
    }

    // Récupérer le solde
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    // Récupérer les paiements reçus
    const payments = await query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(fee) as total_fees,
                DATE(created_at) as payment_date
            FROM tax_payments
            WHERE commune_id = ?
            GROUP BY DATE(created_at)
            ORDER BY payment_date DESC
            LIMIT 30
        `, [commune.id]);

    // Récupérer les derniers paiements
    const recentPayments = await query(`
            SELECT 
                tp.*,
                u.fullname as payer_name,
                u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 10
        `, [commune.id]);

    res.json({
      balance: wallet?.balance || 0,
      total_payments: payments.reduce((sum, p) => sum + p.total_count, 0),
      total_amount: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      total_fees: payments.reduce((sum, p) => sum + (p.total_fees || 0), 0),
      recent_payments: recentPayments || []
    });

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.json({
      balance: 0,
      total_payments: 0,
      total_amount: 0,
      total_fees: 0,
      recent_payments: []
    });
  }
});

// GET - Récupérer les statistiques globales des communes (admin)
app.get('/api/admin/communes/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                COUNT(*) as total_communes,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_communes,
                COALESCE((
                    SELECT SUM(amount) FROM tax_payments WHERE status = 'paid'
                ), 0) as total_collected,
                COALESCE((
                    SELECT COUNT(*) FROM tax_payments WHERE status = 'paid'
                ), 0) as total_payments,
                COALESCE((
                    SELECT SUM(fee) FROM tax_payments WHERE status = 'paid'
                ), 0) as total_fees
            FROM communes
        `);

    // Top communes par collecte
    const topCommunes = await query(`
            SELECT 
                c.id,
                c.name,
                c.phone,
                COALESCE(SUM(tp.amount), 0) as collected
            FROM communes c
            LEFT JOIN tax_payments tp ON c.id = tp.commune_id AND tp.status = 'paid'
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY collected DESC
            LIMIT 10
        `);

    res.json({
      success: true,
      stats: {
        total_communes: stats?.total_communes || 0,
        active_communes: stats?.active_communes || 0,
        total_collected: stats?.total_collected || 0,
        total_payments: stats?.total_payments || 0,
        total_fees: stats?.total_fees || 0
      },
      top_communes: topCommunes || []
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 5. ROUTES - TYPES DE TAXES (ADMIN)
// ============================================

// POST - Créer un type de taxe (admin)
app.post('/api/admin/tax-types', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, rate } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const result = await run(`
            INSERT INTO tax_types (name, description, rate, is_active)
            VALUES (?, ?, ?, 1)
        `, [name, description || '', rate || 0]);

    res.status(201).json({
      success: true,
      message: 'Type de taxe créé',
      id: result.lastID
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// 3. ADMIN - MODIFIER UNE ENTREPRISE DE SERVICE
// ============================================
app.put('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    fullName,
    description,
    logo,
    contactPhone,
    contactEmail,
    address,
    color,
    is_active
  } = req.body;

  try {
    // Récupérer l'entreprise pour avoir le user_id
    const company = await get('SELECT user_id FROM service_companies WHERE id = ?', [id]);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Mettre à jour l'utilisateur associé
    if (name) {
      await run('UPDATE users SET fullname = ? WHERE id = ?', [name, company.user_id]);
    }

    // Mettre à jour l'entreprise
    await run(`
            UPDATE service_companies 
            SET name = ?, 
                type = ?, 
                fullName = ?, 
                description = ?, 
                logo = ?,
                contact_phone = ?, 
                contact_email = ?, 
                address = ?, 
                color = ?,
                is_active = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      name, type, fullName || name, description || '', logo || '',
      contactPhone || '', contactEmail || '', address || '', color || '',
      is_active ? 1 : 0, id
    ]);

    res.json({ success: true, message: 'Entreprise modifiée avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 3. POST - Créer une entreprise (ADMIN) - AVEC NUMÉRO FOURNI
// ============================================
app.post('/api/admin/service-companies', authenticateToken, requireAdmin, async (req, res) => {
  const {
    name,
    type,
    fullName,
    description,
    logo,
    contactPhone,
    contactEmail,
    address,
    color,
    password,
    agentPhone  // ✅ Numéro de téléphone de l'agent (fourni par l'admin)
  } = req.body;

  console.log('📝 Création entreprise de service:', { name, type, agentPhone });

  // Validation
  if (!name || !type || !password) {
    return res.status(400).json({
      error: 'Nom, type et mot de passe requis'
    });
  }

  if (!agentPhone || !/^\d{8}$/.test(agentPhone)) {
    return res.status(400).json({
      error: 'Numéro de téléphone de l\'agent requis (8 chiffres)'
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 4 caractères'
    });
  }

  try {
    // ✅ Vérifier si le numéro existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [agentPhone]);
    if (existingUser) {
      return res.status(400).json({
        error: `Le numéro ${agentPhone} est déjà utilisé par un autre utilisateur`
      });
    }

    // ✅ Vérifier si une entreprise utilise déjà ce numéro
    const existingCompany = await get(`
            SELECT sc.id FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            WHERE u.phone = ?
        `, [agentPhone]);

    if (existingCompany) {
      return res.status(400).json({
        error: `Une entreprise utilise déjà le numéro ${agentPhone}`
      });
    }

    // Générer la clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedKey = await bcrypt.hash(privateKey, 10);

    await run('BEGIN TRANSACTION');

    // 1. Créer l'utilisateur agent avec le numéro fourni
    const userResult = await run(`
            INSERT INTO users (
                phone, fullname, password_hash, private_key_6, 
                role, is_active, is_verified, created_at
            ) VALUES (?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [agentPhone, name, hashedPassword, hashedKey]);

    const userId = userResult.lastID;
    console.log('✅ Agent créé avec le numéro:', { id: userId, phone: agentPhone });

    // 2. Créer le wallet
    await run('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    console.log('✅ Wallet créé pour l\'agent');

    // 3. Créer l'entreprise
    const companyResult = await run(`
            INSERT INTO service_companies (
                name, type, fullName, description, logo, 
                contact_phone, contact_email, address, color, 
                user_id, created_by, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
      name,
      type,
      fullName || name,
      description || '',
      logo || (type === 'water' ? '💧' : '⚡'),
      contactPhone || agentPhone,
      contactEmail || '',
      address || '',
      color || (type === 'water' ? '#2196F3' : '#FFC107'),
      userId,         // user_id = l'agent responsable
      req.user.userId // created_by = l'admin qui crée
    ]);

    await run('COMMIT');

    console.log('✅ Entreprise créée:', {
      id: companyResult.lastID,
      name,
      agentPhone: agentPhone
    });

    res.status(201).json({
      success: true,
      message: 'Entreprise de service créée avec succès',
      company: {
        id: companyResult.lastID,
        name: name,
        type: type,
        fullName: fullName || name,
        agent: {
          id: userId,
          phone: agentPhone,  // ✅ Le numéro fourni
          password: password,
          private_key: privateKey
        }
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur création:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 4. ADMIN - SUPPRIMER UNE ENTREPRISE DE SERVICE
// ============================================
app.delete('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const company = await get('SELECT user_id FROM service_companies WHERE id = ?', [id]);

    if (company?.user_id) {
      // Désactiver l'utilisateur agent
      await run('UPDATE users SET is_active = 0 WHERE id = ?', [company.user_id]);
    }

    // Désactiver l'entreprise
    await run('UPDATE service_companies SET is_active = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Entreprise supprimée avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 5. PUBLIC - RÉCUPÉRER TOUTES LES ENTREPRISES
// ============================================
// server.js - Routes pour les entreprises de service

// ✅ Option 1: Route publique (sans authentification)
app.get('/api/service-companies', async (req, res) => {
  try {
    console.log('📥 Récupération des entreprises (public)...');

    const sql = `
            SELECT 
                sc.id,
                sc.name,
                sc.type,
                sc.fullName,
                sc.description,
                sc.logo,
                sc.contact_phone,
                sc.contact_email,
                sc.address,
                sc.color,
                sc.is_active,
                sc.created_by as agent_id,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM service_companies sc
            LEFT JOIN users u ON sc.created_by = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE sc.is_active = 1
            ORDER BY sc.name ASC
        `;

    const companies = await query(sql);
    console.log(`✅ ${companies.length} entreprises récupérées`);
    res.json(companies);

  } catch (error) {
    console.error('❌ Erreur récupération entreprises:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des entreprises',
      details: error.message
    });
  }
});

// ✅ Option 2: Route protégée (avec authentification)
app.get('/api/service-companies', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Récupération des entreprises (authentifié)...');

    const sql = `
            SELECT 
                sc.id,
                sc.name,
                sc.type,
                sc.fullName,
                sc.description,
                sc.logo,
                sc.contact_phone,
                sc.contact_email,
                sc.address,
                sc.color,
                sc.is_active,
                sc.created_by as agent_id,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM service_companies sc
            LEFT JOIN users u ON sc.created_by = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE sc.is_active = 1
            ORDER BY sc.name ASC
        `;

    const companies = await query(sql);
    console.log(`✅ ${companies.length} entreprises récupérées`);
    res.json(companies);

  } catch (error) {
    console.error('❌ Erreur récupération entreprises:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des entreprises',
      details: error.message
    });
  }
});
// ============================================
// 2. GET - Récupérer une entreprise par ID
// ============================================
app.get('/api/service-companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
            SELECT 
                sc.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM service_companies sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE sc.id = ?
        `;

    const company = await db.get(query, [id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json(company);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// ============================================
// 3. POST - Créer une entreprise (avec agent)
// ============================================
app.post('/api/admin/service-companies', authenticateToken, requireAdmin, async (req, res) => {
  const {
    name,
    type,
    fullName,
    description,
    logo,
    contactPhone,
    contactEmail,
    address,
    color,
    password
  } = req.body;

  console.log('📝 Création entreprise de service:', { name, type });

  // Validation
  if (!name || !type || !password) {
    return res.status(400).json({
      error: 'Nom, type et mot de passe requis'
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 4 caractères'
    });
  }

  try {
    // 1. Créer l'agent (comme pour les agences)
    let agentPhone = `62${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    let existing = await db.get('SELECT id FROM users WHERE phone = ?', [agentPhone]);
    let attempts = 0;

    while (existing && attempts < 10) {
      agentPhone = `62${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      existing = await db.get('SELECT id FROM users WHERE phone = ?', [agentPhone]);
      attempts++;
    }

    if (existing) {
      return res.status(400).json({
        error: 'Impossible de générer un numéro unique'
      });
    }

    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedKey = await bcrypt.hash(privateKey, 10);

    await db.run('BEGIN TRANSACTION');

    // Créer l'utilisateur agent
    const userResult = await db.run(`
            INSERT INTO users (
                phone, fullname, password_hash, private_key_6, 
                role, is_active, is_verified, created_at
            ) VALUES (?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [agentPhone, name, hashedPassword, hashedKey]);

    const userId = userResult.lastID;
    console.log('✅ Agent créé:', { id: userId, phone: agentPhone });

    // Créer le wallet
    await db.run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    console.log('✅ Wallet créé');

    // Créer l'entreprise
    const companyResult = await db.run(`
            INSERT INTO service_companies (
                name, type, fullName, description, logo, 
                contact_phone, contact_email, address, color, 
                user_id, created_by, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
      name,
      type,
      fullName || name,
      description || '',
      logo || (type === 'water' ? '💧' : '⚡'),
      contactPhone || agentPhone,
      contactEmail || '',
      address || '',
      color || (type === 'water' ? '#2196F3' : '#FFC107'),
      userId,  // user_id = l'agent responsable
      req.user.userId  // created_by = l'admin qui crée
    ]);

    await db.run('COMMIT');

    console.log('✅ Entreprise créée:', { id: companyResult.lastID, name });

    res.status(201).json({
      success: true,
      message: 'Entreprise de service créée avec succès',
      company: {
        id: companyResult.lastID,
        name: name,
        type: type,
        fullName: fullName || name,
        agent: {
          id: userId,
          phone: agentPhone,
          password: password,
          private_key: privateKey
        }
      }
    });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('❌ Erreur création:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 4. PUT - Modifier une entreprise
// ============================================
app.put('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    fullName,
    description,
    logo,
    contactPhone,
    contactEmail,
    address,
    color,
    is_active
  } = req.body;

  try {
    // Vérifier si l'entreprise existe
    const existing = await db.get(
      'SELECT id FROM service_companies WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Mettre à jour
    await db.run(`
            UPDATE service_companies SET
                name = ?,
                type = ?,
                fullName = ?,
                description = ?,
                logo = ?,
                contact_phone = ?,
                contact_email = ?,
                address = ?,
                color = ?,
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      name,
      type,
      fullName || name,
      description || '',
      logo || (type === 'water' ? '💧' : '⚡'),
      contactPhone || '',
      contactEmail || '',
      address || '',
      color || (type === 'water' ? '#2196F3' : '#FFC107'),
      is_active !== undefined ? is_active : 1,
      id
    ]);

    res.json({
      success: true,
      message: 'Entreprise mise à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ============================================
// 5. DELETE - Désactiver une entreprise
// ============================================
app.delete('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db.get(
      'SELECT id FROM service_companies WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Soft delete
    await db.run(`
            UPDATE service_companies 
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [id]);

    res.json({
      success: true,
      message: 'Entreprise désactivée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ============================================
// 6. GET - Statistiques des entreprises
// ============================================
app.get('/api/admin/service-companies/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN type = 'water' THEN 1 ELSE 0 END) as water_count,
                SUM(CASE WHEN type = 'electricity' THEN 1 ELSE 0 END) as electricity_count,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count
            FROM service_companies
        `);

    res.json(stats);

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats' });
  }
});
// ============================================
// 6. PAYER UNE FACTURE (CLIENT → ENTREPRISE)
// ============================================
app.post('/api/bill-payment', authenticateToken, async (req, res) => {
  const {
    company_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    meter_number,
    amount,
    period,
    invoice_number,
    account_number
  } = req.body;

  console.log('💰 Paiement facture reçu:', { company_id, customer_name, amount });

  try {
    // Récupérer l'entreprise
    const company = await get(`
            SELECT sc.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM service_companies sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.id = ? AND sc.is_active = 1
        `, [company_id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Récupérer le payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.015);
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        balance: payerWallet?.balance || 0,
        required: totalAmount,
        missing: totalAmount - (payerWallet?.balance || 0)
      });
    }

    // Générer les références
    const receiptNumber = `BILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer l'entreprise (son compte agent)
      if (company.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, company.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bill_payment', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        payer.phone,
        company.agent_phone,
        amount,
        fee,
        amount,
        `Paiement facture ${company.name} - ${receiptNumber}`
      ]);

      // 5. Enregistrer le paiement de facture
      await run(`
                INSERT INTO bill_payments (
                    receipt_number, payer_id, company_id, company_name, customer_name,
                    customer_phone, customer_email, customer_address, meter_number,
                    account_number, amount, fee, total_amount, period, invoice_number,
                    service_type, transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receiptNumber, payer.id, company.id, company.name, customer_name,
        customer_phone, customer_email || '', customer_address || '', meter_number,
        account_number || '', amount, fee, totalAmount, period || '', invoice_number || '',
        company.type, transactionRef
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    'Vous avez payé ${amount.toLocaleString()} FCFA pour votre facture ${company.name}', 
                    'bill_payment', CURRENT_TIMESTAMP)
        `, [payer.id]);

    // Notification pour l'entreprise (agent)
    if (company.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement reçu', 
                        '${payer.fullname} a payé ${amount.toLocaleString()} FCFA pour ${company.name}', 
                        'bill_received', '${JSON.stringify({ payer: payer.fullname, amount, receipt: receiptNumber })}', 
                        CURRENT_TIMESTAMP)
            `, [company.agent_user_id]);

      // Envoyer via WebSocket si disponible
      if (io) {
        io.to(`user_${company.agent_user_id}`).emit('bill-payment', {
          receipt: receiptNumber,
          customer_name: customer_name,
          amount: amount,
          company: company.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Récupérer les nouveaux soldes
    const newPayerBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    const newCompanyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [company.agent_user_id]);

    res.json({
      success: true,
      message: 'Paiement effectué avec succès',
      receipt: {
        receipt_number: receiptNumber,
        company_name: company.name,
        service_type: company.type,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_address: customer_address,
        meter_number: meter_number,
        amount: amount,
        fee: fee,
        period: period || new Date().toLocaleDateString(),
        invoice_number: invoice_number,
        payment_date: new Date().toISOString()
      },
      balances: {
        payer: {
          before: payerWallet.balance,
          after: newPayerBalance?.balance || 0,
          debited: totalAmount
        },
        company: {
          before: 0,
          after: newCompanyBalance?.balance || 0,
          credited: amount
        }
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 7. RÉCUPÉRER L'HISTORIQUE DES PAIEMENTS D'UN UTILISATEUR
// ============================================
app.get('/api/bill-payments/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT bp.*, sc.name as company_name, sc.type as service_type
            FROM bill_payments bp
            LEFT JOIN service_companies sc ON bp.company_id = sc.id
            WHERE bp.payer_id = ?
            ORDER BY bp.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM bill_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json({ success: true, payments: [] });
  }
});

// ============================================
// 8. RÉCUPÉRER LES PAIEMENTS REÇUS PAR UNE ENTREPRISE
// ============================================
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  try {
    // Vérifier si l'utilisateur est associé à une entreprise
    const company = await get(`
            SELECT id, name FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({
        payments: [],
        total_amount: 0,
        total_count: 0,
        today_amount: 0,
        this_month_amount: 0
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Statistiques
    const stats = await get(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
            FROM bill_payments
            WHERE company_id = ? AND status = 'completed'
        `, [today, firstDayOfMonth, company.id]);

    // Liste des paiements
    const payments = await query(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.company_id = ? AND bp.status = 'completed'
            ORDER BY bp.created_at DESC
            LIMIT ? OFFSET ?
        `, [company.id, parseInt(limit), parseInt(offset)]);

    res.json({
      payments: payments || [],
      total_amount: stats?.total_amount || 0,
      total_count: stats?.total_count || 0,
      today_amount: stats?.today_amount || 0,
      this_month_amount: stats?.this_month_amount || 0,
      company: {
        id: company.id,
        name: company.name
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération paiements entreprise:', error);
    res.json({
      payments: [],
      total_amount: 0,
      total_count: 0,
      today_amount: 0,
      this_month_amount: 0
    });
  }
});

// ============================================
// 9. RÉCUPÉRER LE SOLDE DE L'ENTREPRISE
// ============================================
app.get('/api/company/balance', authenticateToken, async (req, res) => {
  try {
    const company = await get(`
            SELECT sc.id, sc.name, u.id as user_id, w.balance
            FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            JOIN wallets w ON u.id = w.user_id
            WHERE u.id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({ balance: 0, company: null });
    }

    res.json({
      balance: company.balance || 0,
      company: {
        id: company.id,
        name: company.name
      }
    });

  } catch (error) {
    console.error('Erreur récupération solde:', error);
    res.json({ balance: 0 });
  }
});

// ============================================
// 10. ADMIN - STATISTIQUES DES ENTREPRISES
// ============================================
app.get('/api/admin/service-companies/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                COUNT(*) as total_companies,
                SUM(CASE WHEN type = 'water' THEN 1 ELSE 0 END) as water_companies,
                SUM(CASE WHEN type = 'electricity' THEN 1 ELSE 0 END) as electricity_companies,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_companies,
                (SELECT COALESCE(SUM(w.balance), 0) 
                 FROM service_companies sc 
                 JOIN users u ON sc.user_id = u.id 
                 JOIN wallets w ON u.id = w.user_id) as total_balance,
                (SELECT COALESCE(SUM(bp.amount), 0) 
                 FROM bill_payments bp 
                 WHERE bp.status = 'completed') as total_revenue
            FROM service_companies
        `);

    res.json(stats || {
      total_companies: 0,
      water_companies: 0,
      electricity_companies: 0,
      active_companies: 0,
      total_balance: 0,
      total_revenue: 0
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.json({
      total_companies: 0,
      water_companies: 0,
      electricity_companies: 0,
      active_companies: 0,
      total_balance: 0,
      total_revenue: 0
    });
  }
});

// ============================================
// 11. ADMIN - TRANSFERT ENTRE ENTREPRISES
// ============================================
app.post('/api/admin/service-companies/transfer', authenticateToken, requireAdmin, async (req, res) => {
  const { from_company_id, to_company_id, amount, reason } = req.body;

  if (!from_company_id || !to_company_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Données invalides' });
  }

  try {
    // Récupérer les entreprises
    const fromCompany = await get(`
            SELECT sc.id, sc.name, u.id as user_id, w.balance
            FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            JOIN wallets w ON u.id = w.user_id
            WHERE sc.id = ?
        `, [from_company_id]);

    const toCompany = await get(`
            SELECT sc.id, sc.name, u.id as user_id, w.balance
            FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            JOIN wallets w ON u.id = w.user_id
            WHERE sc.id = ?
        `, [to_company_id]);

    if (!fromCompany || !toCompany) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (fromCompany.balance < amount) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        balance: fromCompany.balance,
        required: amount
      });
    }

    await run('BEGIN TRANSACTION');

    // Débiter l'entreprise source
    await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, fromCompany.user_id]);

    // Créditer l'entreprise destination
    await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, toCompany.user_id]);

    // Enregistrer la transaction
    const transactionRef = `TRANSFER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await run(`
            INSERT INTO transactions (
                reference, sender_phone, receiver_phone, amount, fee, net_amount,
                type, status, description, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'transfer', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
      transactionRef,
      fromCompany.user_id,
      toCompany.user_id,
      amount,
      0,
      amount,
      `Transfert entre entreprises: ${fromCompany.name} → ${toCompany.name} - ${reason || ''}`
    ]);

    await run('COMMIT');

    const newFromBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [fromCompany.user_id]);
    const newToBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [toCompany.user_id]);

    res.json({
      success: true,
      message: 'Transfert effectué avec succès',
      transaction: {
        reference: transactionRef,
        from: {
          id: fromCompany.id,
          name: fromCompany.name,
          balance: newFromBalance?.balance || 0
        },
        to: {
          id: toCompany.id,
          name: toCompany.name,
          balance: newToBalance?.balance || 0
        },
        amount: amount
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur transfert:', error);
    res.status(500).json({ error: error.message });
  }
});


// server.js - Route de diagnostic (ajoutez avant les autres routes)
app.get('/api/diagnostic/tables', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const diagnostics = {};

    // 1. Liste de toutes les tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    diagnostics.tables = tables.map(t => t.name);

    // 2. Structure de service_companies
    try {
      const scColumns = await db.all("PRAGMA table_info(service_companies)");
      diagnostics.service_companies = {
        exists: true,
        columns: scColumns.map(c => c.name),
        fullSchema: scColumns
      };

      // Compter les enregistrements
      const count = await db.get("SELECT COUNT(*) as count FROM service_companies");
      diagnostics.service_companies.count = count.count;

      // Échantillon de données
      const sample = await db.all("SELECT * FROM service_companies LIMIT 2");
      diagnostics.service_companies.sample = sample;

    } catch (e) {
      diagnostics.service_companies = { exists: false, error: e.message };
    }

    // 3. Structure de users
    try {
      const userColumns = await db.all("PRAGMA table_info(users)");
      diagnostics.users = {
        exists: true,
        columns: userColumns.map(c => c.name)
      };
    } catch (e) {
      diagnostics.users = { exists: false, error: e.message };
    }

    // 4. Structure de wallets
    try {
      const walletColumns = await db.all("PRAGMA table_info(wallets)");
      diagnostics.wallets = {
        exists: true,
        columns: walletColumns.map(c => c.name)
      };
    } catch (e) {
      diagnostics.wallets = { exists: false, error: e.message };
    }

    res.json(diagnostics);

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 12. ROUTE DE DIAGNOSTIC - VÉRIFIER LES TABLES
// ============================================
app.get('/api/diagnostic/service-companies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tables = await query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('service_companies', 'bill_payments')
        `);

    const companies = await query('SELECT COUNT(*) as count FROM service_companies');
    const payments = await query('SELECT COUNT(*) as count FROM bill_payments');

    res.json({
      tables: tables,
      companies_count: companies[0]?.count || 0,
      payments_count: payments[0]?.count || 0,
      structure: {
        service_companies: await query('PRAGMA table_info(service_companies)'),
        bill_payments: await query('PRAGMA table_info(bill_payments)')
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// PUT - Mettre à jour une entreprise (admin uniquement)
app.put('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, type, fullName, description, logo, contact_phone, contact_email, address, color, is_active } = req.body;

  try {
    await run(`
            UPDATE service_companies 
            SET name = ?, type = ?, fullName = ?, description = ?, logo = ?,
                contact_phone = ?, contact_email = ?, address = ?, color = ?,
                is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, type, fullName, description, logo, contact_phone, contact_email, address, color, is_active ? 1 : 0, id]);

    res.json({ success: true, message: 'Entreprise mise à jour' });

  } catch (error) {
    console.error('Erreur mise à jour:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer une entreprise (soft delete, admin uniquement)
app.delete('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await run('UPDATE service_companies SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Entreprise désactivée' });

  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES POUR LES PAIEMENTS DE FACTURES
// ============================================

/// ============================================
// ROUTES POUR LES ENTREPRISES DE SERVICES (STE, ZIZ, etc.)
// ============================================

// 1. Créer la table des entreprises de services
async function createServiceCompaniesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS service_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('water', 'electricity')),
                fullName TEXT,
                description TEXT,
                logo TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                address TEXT,
                color TEXT,
                user_id INTEGER,  -- L'utilisateur associé (agent)
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Vérifier si des données existent
    const count = await get('SELECT COUNT(*) as count FROM service_companies');
    if (count && count.count === 0) {
      // Créer d'abord les utilisateurs pour STE et ZIZ
      const stePassword = await bcrypt.hash('ste1234', 10);
      const stePrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedSteKey = await bcrypt.hash(stePrivateKey, 10);

      const steUser = await run(`
                INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
                VALUES ('62787301', 'STE - Société des Eaux', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
            `, [stePassword, hashedSteKey]);

      const zizPassword = await bcrypt.hash('ziz1234', 10);
      const zizPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedZizKey = await bcrypt.hash(zizPrivateKey, 10);

      const zizUser = await run(`
                INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
                VALUES ('62787302', 'ZIZ - Électricité du Tchad', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
            `, [zizPassword, hashedZizKey]);

      // Créer les wallets pour ces agents
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [steUser.lastID]);
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [zizUser.lastID]);

      // Insérer STE et ZIZ
      await run(`
                INSERT INTO service_companies (name, type, fullName, description, logo, color, user_id, is_active)
                VALUES 
                    ('STE', 'water', 'Société Tchadienne des Eaux', 'Distribution d\'eau potable', '💧', 'blue', ?, 1),
                    ('ZIZ', 'electricity', 'Électricité du Tchad', 'Distribution d\'électricité', '⚡', 'yellow', ?, 1)
            `, [steUser.lastID, zizUser.lastID]);

      console.log('✅ Entreprises STE et ZIZ créées avec leurs comptes agents');
    }

    console.log('✅ Table service_companies prête');
  } catch (error) {
    console.error('Erreur création table:', error);
  }
}

// 3. Rechercher un compteur
app.post('/api/bill-payments/search-meter', authenticateToken, async (req, res) => {
  const { meter_number, company_id } = req.body;

  console.log('🔍 Recherche compteur:', meter_number, 'Company:', company_id);

  try {
    // Simulation - À connecter à la vraie base de données de STE/ZIZ
    const mockMeterInfo = {
      customer_name: "Client Test",
      address: "N'Djaména, Tchad",
      outstanding_amount: 25000,
      period: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    };

    res.json({ success: true, data: mockMeterInfo });

  } catch (error) {
    res.status(404).json({ error: 'Compteur non trouvé' });
  }
});

// 4. Paiement de facture
app.post('/api/bill-payment', authenticateToken, async (req, res) => {
  const {
    company_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    meter_number,
    amount,
    period,
    invoice_number,
    account_number
  } = req.body;

  console.log('💰 Paiement facture:', { company_id, customer_name, amount });

  try {
    // Récupérer l'entreprise et son utilisateur associé
    const company = await get(`
            SELECT sc.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM service_companies sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.id = ? AND sc.is_active = 1
        `, [company_id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Vérifier le solde
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.015);
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receipt_number = `BILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Créer la table des paiements si elle n'existe pas
    await run(`
            CREATE TABLE IF NOT EXISTS bill_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE,
                payer_id INTEGER,
                company_id INTEGER,
                company_name TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                customer_address TEXT,
                meter_number TEXT,
                account_number TEXT,
                amount INTEGER,
                fee INTEGER,
                total_amount INTEGER,
                period TEXT,
                invoice_number TEXT,
                service_type TEXT,
                status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES service_companies(id)
            )
        `);

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer l'entreprise (son compte agent)
      if (company.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, company.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions 
                (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                VALUES (?, ?, ?, ?, ?, ?, 'bill_payment', 'completed', ?)
            `, [transactionRef, payer.phone, company.agent_phone, amount, fee, amount, `Paiement facture ${company.name} - ${receipt_number}`]);

      // 5. Enregistrer le paiement de facture
      await run(`
                INSERT INTO bill_payments (
                    receipt_number, payer_id, company_id, company_name, customer_name,
                    customer_phone, customer_email, customer_address, meter_number,
                    account_number, amount, fee, total_amount, period, invoice_number,
                    service_type, transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receipt_number, payer.id, company.id, company.name, customer_name,
        customer_phone, customer_email || '', customer_address || '', meter_number,
        account_number || '', amount, fee, totalAmount, period || '', invoice_number || '',
        company.type, transactionRef
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    ?, 'bill_payment', CURRENT_TIMESTAMP)
        `, [payer.id, `Vous avez payé ${amount.toLocaleString()} FCFA pour votre facture ${company.name}`]);

    // Notification pour l'entreprise (via WebSocket si connectée)
    if (company.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement reçu', 
                        ?, 'bill_received', ?, CURRENT_TIMESTAMP)
            `, [company.agent_user_id, `${payer.fullname} a payé ${amount.toLocaleString()} FCFA`, JSON.stringify({ payer: payer.fullname, amount, receipt: receipt_number })]);

      // Envoyer via WebSocket
      if (io) {
        io.to(`user_${company.agent_user_id}`).emit('bill-payment', {
          receipt: receipt_number,
          customer_name: customer_name,
          amount: amount,
          company: company.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      receipt: {
        receipt_number: receipt_number,
        company_name: company.name,
        service_type: company.type,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_address: customer_address,
        meter_number: meter_number,
        amount: amount,
        fee: fee,
        period: period || new Date().toLocaleDateString(),
        invoice_number: invoice_number,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Historique des paiements de l'utilisateur
app.get('/api/bill-payments/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT * FROM bill_payments 
            WHERE payer_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM bill_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json({ success: true, payments: [] });
  }
});

// 6. GET - Paiements reçus par une entreprise (pour l'agent)
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est associé à une entreprise
    const company = await get(`
            SELECT id, name FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({ payments: [], total: 0 });
    }

    const payments = await query(`
            SELECT bp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM bill_payments bp
            JOIN users u ON bp.payer_id = u.id
            WHERE bp.company_id = ?
            ORDER BY bp.created_at DESC
            LIMIT 100
        `, [company.id]);

    const total = await get('SELECT SUM(amount) as total_amount, COUNT(*) as count FROM bill_payments WHERE company_id = ?', [company.id]);

    res.json({
      payments: payments || [],
      total_amount: total?.total_amount || 0,
      total_count: total?.count || 0
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ payments: [], total_amount: 0, total_count: 0 });
  }
});

// Appeler la création des tables au démarrage
// createServiceCompaniesTable();


// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - PAIEMENTS REÇUS
// ============================================


// GET - Détails d'un paiement spécifique
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques mensuelles de l'entreprise
app.get('/api/company/stats/monthly', authenticateToken, async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  try {
    const company = await get(`
            SELECT sc.id FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            WHERE u.id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({ stats: [] });
    }

    const monthlyStats = await query(`
            SELECT 
                strftime('%m', created_at) as month,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM bill_payments
            WHERE company_id = ? 
                AND status = 'completed'
                AND strftime('%Y', created_at) = ?
            GROUP BY strftime('%m', created_at)
            ORDER BY month ASC
        `, [company.id, year]);

    res.json({ stats: monthlyStats || [] });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ stats: [] });
  }
});

//=============================================
//  PDF IMPORT ENDPOINT
//=============================================

// GET - Récupérer les communes (agents)
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT u.id, u.phone, u.fullname as name, u.commune_address as address
            FROM users u
            WHERE u.role = 'commune' AND u.is_active = 1
            ORDER BY u.fullname
        `);
    res.json(communes || []);
  } catch (error) {
    res.json([]);
  }
});

// GET - Solde du wallet
app.get('/api/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);
    res.json({ balance: wallet?.balance || 0 });
  } catch (error) {
    res.json({ balance: 0 });
  }
});




//=============================================
//
//  FIN DES ENDPOINTS
// ============================================
// ROUTES POUR LES SERVICES D'IMPÔTS (COMMUNES)
// ============================================

// 1. Créer la table des services d'impôts
async function createTaxOfficesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS tax_offices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                fullName TEXT,
                description TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                user_id INTEGER,  -- L'utilisateur associé (agent)
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Table des paiements de taxes
    await run(`
            CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE NOT NULL,
                payer_id INTEGER NOT NULL,
                office_id INTEGER NOT NULL,
                office_name TEXT NOT NULL,
                taxpayer_name TEXT NOT NULL,
                taxpayer_phone TEXT NOT NULL,
                taxpayer_email TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT NOT NULL,
                tax_period TEXT,
                amount INTEGER NOT NULL,
                fee INTEGER DEFAULT 0,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (office_id) REFERENCES tax_offices(id)
            )
        `);

    // Vérifier si des données existent
    const count = await get('SELECT COUNT(*) as count FROM tax_offices');
    if (count && count.count === 0) {
      // Créer les communes par défaut avec des comptes agents
      await createDefaultTaxOffices();
    }

    console.log('✅ Tables tax_offices et tax_payments créées/vérifiées');
  } catch (error) {
    console.error('Erreur création tables:', error);
  }
}

async function createDefaultTaxOffices() {
  try {
    // Créer Commune de N'Djaména
    const ndjamenaPassword = await bcrypt.hash('ndjamena1234', 10);
    const ndjamenaPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedNdjamenaKey = await bcrypt.hash(ndjamenaPrivateKey, 10);

    const ndjamenaUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787303', 'Commune de N\'Djaména', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [ndjamenaPassword, hashedNdjamenaKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [ndjamenaUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de N\'Djaména', 'Mairie de N\'Djaména', 'Service des impôts et taxes de la commune de N\'Djaména', '62 78 73 03', 'contact@ndjamena.td', 'N\'Djaména, Tchad', ?, 1)
        `, [ndjamenaUser.lastID]);

    // Créer Commune de Moundou
    const moundouPassword = await bcrypt.hash('moundou1234', 10);
    const moundouPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedMoundouKey = await bcrypt.hash(moundouPrivateKey, 10);

    const moundouUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787304', 'Commune de Moundou', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [moundouPassword, hashedMoundouKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [moundouUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de Moundou', 'Mairie de Moundou', 'Service des impôts et taxes de la commune de Moundou', '62 78 73 04', 'contact@moundou.td', 'Moundou, Tchad', ?, 1)
        `, [moundouUser.lastID]);

    // Créer Commune de Sarh
    const sarhPassword = await bcrypt.hash('sarh1234', 10);
    const sarhPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedSarhKey = await bcrypt.hash(sarhPrivateKey, 10);

    const sarhUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787305', 'Commune de Sarh', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [sarhPassword, hashedSarhKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [sarhUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de Sarh', 'Mairie de Sarh', 'Service des impôts et taxes de la commune de Sarh', '62 78 73 05', 'contact@sarh.td', 'Sarh, Tchad', ?, 1)
        `, [sarhUser.lastID]);

    console.log('✅ Services d\'impôts par défaut créés (N\'Djaména, Moundou, Sarh)');

  } catch (error) {
    console.error('Erreur création services d\'impôts par défaut:', error);
  }
}

// 2. GET - Récupérer tous les services d'impôts
app.get('/api/tax-offices', async (req, res) => {
  console.log('📋 GET /api/tax-offices');

  try {
    await createTaxOfficesTable();

    const offices = await query(`
            SELECT 
                toff.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM tax_offices toff
            LEFT JOIN users u ON toff.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE toff.is_active = 1
            ORDER BY toff.name ASC
        `);

    console.log(`✅ ${offices.length} services d'impôts trouvés`);
    res.json(offices || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    // Retourner des données par défaut
    res.json([
      { id: 1, name: "Commune de N'Djaména", phone: "62 78 73 03", address: "N'Djaména", fullName: "Mairie de N'Djaména" },
      { id: 2, name: "Commune de Moundou", phone: "62 78 73 04", address: "Moundou", fullName: "Mairie de Moundou" },
      { id: 3, name: "Commune de Sarh", phone: "62 78 73 05", address: "Sarh", fullName: "Mairie de Sarh" }
    ]);
  }
});

// 3. POST - Paiement d'une taxe
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    office_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_email,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('💰 Paiement taxe reçu:', { office_id, taxpayer_name, amount, tax_type });

  try {
    // Récupérer le service d'impôts
    const office = await get(`
            SELECT toff.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM tax_offices toff
            LEFT JOIN users u ON toff.user_id = u.id
            WHERE toff.id = ? AND toff.is_active = 1
        `, [office_id]);

    if (!office) {
      return res.status(404).json({ error: 'Service d\'impôts non trouvé' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Vérifier le solde
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receipt_number = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer le service d'impôts
      if (office.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, office.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions 
                (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?)
            `, [transactionRef, payer.phone, office.agent_phone, amount, fee, amount, `Paiement ${tax_type} - ${receipt_number}`]);

      // 5. Enregistrer le paiement de taxe
      await run(`
                INSERT INTO tax_payments (
                    receipt_number, payer_id, office_id, office_name, taxpayer_name,
                    taxpayer_phone, taxpayer_email, taxpayer_address, business_number,
                    property_address, tax_type, tax_period, amount, fee, total_amount,
                    transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receipt_number, payer.id, office.id, office.name, taxpayer_name,
        taxpayer_phone, taxpayer_email || '', taxpayer_address || '', business_number || '',
        property_address || '', tax_type, tax_period || '', amount, fee, totalAmount, transactionRef
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    'Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type}', 
                    'tax_payment', CURRENT_TIMESTAMP)
        `, [payer.id]);

    // Notification pour le service d'impôts
    if (office.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement de taxe reçu', 
                        '${payer.fullname} a payé ${amount.toLocaleString()} FCFA pour ${tax_type}', 
                        'tax_received', '${JSON.stringify({ payer: payer.fullname, amount, receipt: receipt_number })}', 
                        CURRENT_TIMESTAMP)
            `, [office.agent_user_id]);

      // Envoyer via WebSocket
      if (io) {
        io.to(`user_${office.agent_user_id}`).emit('tax-payment', {
          receipt: receipt_number,
          taxpayer_name: taxpayer_name,
          amount: amount,
          tax_type: tax_type,
          office: office.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      receipt: {
        receipt_number: receipt_number,
        office_name: office.name,
        tax_type: tax_type,
        taxpayer_name: taxpayer_name,
        taxpayer_phone: taxpayer_phone,
        taxpayer_email: taxpayer_email,
        taxpayer_address: taxpayer_address,
        business_number: business_number,
        property_address: property_address,
        tax_period: tax_period || new Date().getFullYear().toString(),
        amount: amount,
        fee: fee,
        total_amount: totalAmount,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET - Historique des paiements de taxes de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT * FROM tax_payments 
            WHERE payer_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM tax_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json([]);
  }
});

// 5. GET - Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT tp.*, toff.name as office_name, toff.address as office_address
            FROM tax_payments tp
            LEFT JOIN tax_offices toff ON tp.office_id = toff.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Paiements reçus par un service d'impôts (pour l'agent)
app.get('/api/tax-office/payments', authenticateToken, async (req, res) => {
  try {
    const office = await get(`
            SELECT id, name FROM tax_offices WHERE user_id = ?
        `, [req.user.userId]);

    if (!office) {
      return res.json({ payments: [], total_amount: 0, total_count: 0 });
    }

    const payments = await query(`
            SELECT tp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.office_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 100
        `, [office.id]);

    const total = await get('SELECT SUM(amount) as total_amount, COUNT(*) as count FROM tax_payments WHERE office_id = ?', [office.id]);

    res.json({
      payments: payments || [],
      total_amount: total?.total_amount || 0,
      total_count: total?.count || 0
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ payments: [], total_amount: 0, total_count: 0 });
  }
});


//=============================================
//
//
//=============================================
// ============================================
// ROUTE - SOLDE DU WALLET DE L'ENTREPRISE
// ============================================

// GET - Récupérer le solde du wallet de l'entreprise
app.get('/api/company/wallet/balance', authenticateToken, async (req, res) => {
  console.log('📊 GET /api/company/wallet/balance - User:', req.user.userId);

  try {
    // Vérifier si l'utilisateur est un agent (entreprise)
    const user = await db.get('SELECT id, role, fullname FROM users WHERE id = ?', [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur n'est pas un agent, vérifier s'il a une entreprise associée
    if (user.role !== 'agent') {
      // Vérifier si l'utilisateur est associé à une entreprise via service_companies
      const company = await db.get(`
                SELECT sc.id, sc.name, sc.user_id 
                FROM service_companies sc 
                WHERE sc.user_id = ? AND sc.is_active = 1
            `, [req.user.userId]);

      if (!company) {
        // Vérifier dans tax_offices
        const taxOffice = await db.get(`
                    SELECT id, name, user_id 
                    FROM tax_offices 
                    WHERE user_id = ? AND is_active = 1
                `, [req.user.userId]);

        if (!taxOffice) {
          // Vérifier dans travel_agencies
          const travelAgency = await db.get(`
                        SELECT id, name, user_id 
                        FROM travel_agencies 
                        WHERE user_id = ? AND is_active = 1
                    `, [req.user.userId]);

          if (!travelAgency) {
            return res.status(404).json({
              error: 'Aucune entreprise associée à cet utilisateur'
            });
          }
        }
      }
    }

    // Récupérer le solde du wallet
    const wallet = await db.get(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [req.user.userId]
    );

    if (!wallet) {
      // Créer un wallet si inexistant
      await db.run(
        'INSERT INTO wallets (user_id, balance) VALUES (?, 0)',
        [req.user.userId]
      );

      return res.json({
        balance: 0,
        currency: 'XAF',
        fullname: user.fullname
      });
    }

    res.json({
      balance: wallet.balance || 0,
      currency: 'XAF',
      fullname: user.fullname
    });

  } catch (error) {
    console.error('❌ Erreur récupération solde entreprise:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du solde',
      details: error.message
    });
  }
});
// GET - Solde du wallet de l'entreprise avec détails
app.get('/api/company/wallet/balance', authenticateToken, async (req, res) => {
  console.log('📊 GET /api/company/wallet/balance - User:', req.user.userId);

  try {
    // Récupérer les infos de l'utilisateur
    const user = await db.get('SELECT id, role, fullname, phone FROM users WHERE id = ?', [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer les informations de l'entreprise associée
    let companyInfo = null;

    // 1. Vérifier dans service_companies (eau/électricité)
    const serviceCompany = await db.get(`
            SELECT id, name, type, 'service' as company_type 
            FROM service_companies 
            WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (serviceCompany) {
      companyInfo = serviceCompany;
    }

    // 2. Si pas trouvé, vérifier dans tax_offices (impôts)
    if (!companyInfo) {
      const taxOffice = await db.get(`
                SELECT id, name, 'tax_office' as company_type 
                FROM tax_offices 
                WHERE user_id = ? AND is_active = 1
            `, [req.user.userId]);

      if (taxOffice) {
        companyInfo = taxOffice;
      }
    }

    // 3. Si pas trouvé, vérifier dans travel_agencies (voyages)
    if (!companyInfo) {
      const travelAgency = await db.get(`
                SELECT id, name, 'travel_agency' as company_type 
                FROM travel_agencies 
                WHERE user_id = ? AND is_active = 1
            `, [req.user.userId]);

      if (travelAgency) {
        companyInfo = travelAgency;
      }
    }

    // Récupérer le solde du wallet
    const wallet = await db.get(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [req.user.userId]
    );

    // Créer un wallet si inexistant
    if (!wallet) {
      await db.run(
        'INSERT INTO wallets (user_id, balance, created_at) VALUES (?, 0, CURRENT_TIMESTAMP)',
        [req.user.userId]
      );

      return res.json({
        balance: 0,
        currency: 'XAF',
        fullname: user.fullname,
        phone: user.phone,
        company: companyInfo || null
      });
    }

    res.json({
      balance: wallet.balance || 0,
      currency: 'XAF',
      fullname: user.fullname,
      phone: user.phone,
      company: companyInfo || null
    });

  } catch (error) {
    console.error('❌ Erreur récupération solde entreprise:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du solde',
      details: error.message
    });
  }
});
// ============================================
// ROUTE - TABLEAU DE BORD DE L'ENTREPRISE
// ============================================

// GET - Récupérer toutes les données du tableau de bord
app.get('/api/company/wallet/balance', authenticateToken, async (req, res) => {
  console.log('📊 GET /api/company/wallet/balance - User:', req.user.userId);

  try {
    // 1. Récupérer l'utilisateur
    const user = await db.get(
      'SELECT id, phone, fullname, role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // 2. Récupérer l'entreprise associée
    let company = await db.get(`
            SELECT 
                id, 
                name, 
                type, 
                fullName,
                description,
                logo,
                contact_phone,
                contact_email,
                address,
                color,
                is_active
            FROM service_companies 
            WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!company) {
      // Vérifier dans tax_offices
      company = await db.get(`
                SELECT 
                    id, 
                    name, 
                    'tax_office' as type,
                    fullName,
                    description,
                    NULL as logo,
                    phone as contact_phone,
                    email as contact_email,
                    address,
                    NULL as color,
                    is_active
                FROM tax_offices 
                WHERE user_id = ? AND is_active = 1
            `, [req.user.userId]);
    }

    if (!company) {
      // Vérifier dans travel_agencies
      company = await db.get(`
                SELECT 
                    id, 
                    name, 
                    'travel_agency' as type,
                    description,
                    NULL as logo,
                    phone as contact_phone,
                    email as contact_email,
                    address,
                    NULL as color,
                    is_active
                FROM travel_agencies 
                WHERE user_id = ? AND is_active = 1
            `, [req.user.userId]);
    }

    if (!company) {
      return res.status(404).json({
        error: 'Aucune entreprise associée à cet utilisateur'
      });
    }

    // 3. Récupérer le solde du wallet
    let wallet = await db.get(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [req.user.userId]
    );

    if (!wallet) {
      await db.run(
        'INSERT INTO wallets (user_id, balance) VALUES (?, 0)',
        [req.user.userId]
      );
      wallet = { balance: 0 };
    }

    // 4. Récupérer les statistiques
    let statistics = {
      total_received: 0,
      total_payments: 0,
      total_fees: 0
    };

    // Pour les services d'eau/électricité
    if (company.type === 'water' || company.type === 'electricity') {
      const stats = await db.get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_received,
                    COUNT(*) as total_payments,
                    COALESCE(SUM(fee), 0) as total_fees
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [company.id]);

      if (stats) {
        statistics = stats;
      }
    }

    // Pour les offices de taxe
    if (company.type === 'tax_office') {
      const stats = await db.get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_received,
                    COUNT(*) as total_payments,
                    COALESCE(SUM(fee), 0) as total_fees
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [company.id]);

      if (stats) {
        statistics = stats;
      }
    }

    // 5. Récupérer les derniers paiements
    let recent_payments = [];

    // Pour les services d'eau/électricité
    if (company.type === 'water' || company.type === 'electricity') {
      recent_payments = await db.query(`
                SELECT 
                    receipt_number,
                    customer_name,
                    customer_phone,
                    amount,
                    fee,
                    amount - fee as amount_to_company,
                    created_at,
                    status
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
                ORDER BY created_at DESC
                LIMIT 10
            `, [company.id]);
    }

    // Pour les offices de taxe
    if (company.type === 'tax_office') {
      recent_payments = await db.query(`
                SELECT 
                    receipt_number,
                    taxpayer_name as customer_name,
                    taxpayer_phone as customer_phone,
                    amount,
                    fee,
                    amount - fee as amount_to_company,
                    created_at,
                    status
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
                ORDER BY created_at DESC
                LIMIT 10
            `, [company.id]);
    }

    // 6. Construire la réponse
    const responseData = {
      company: {
        id: company.id,
        name: company.name,
        type: company.type,
        fullName: company.fullName || company.name,
        description: company.description || '',
        logo: company.logo || (company.type === 'water' ? '💧' : company.type === 'electricity' ? '⚡' : '🏢'),
        contact_phone: company.contact_phone || user.phone,
        contact_email: company.contact_email || '',
        address: company.address || '',
        color: company.color || '#DAA520',
        is_active: company.is_active
      },
      wallet: {
        balance: wallet.balance || 0,
        currency: 'XAF'
      },
      statistics: {
        total_received: statistics.total_received || 0,
        total_payments: statistics.total_payments || 0,
        total_fees: statistics.total_fees || 0
      },
      recent_payments: recent_payments || [],
      user: {
        phone: user.phone,
        fullname: user.fullname
      }
    };

    console.log(`✅ Données chargées pour ${company.name}`);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Erreur récupération données:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données',
      details: error.message
    });
  }
});
// ============================================
// ROUTE - TRANSFERT DEPUIS L'ENTREPRISE
// ============================================

// POST - Transfert d'argent depuis l'entreprise vers un utilisateur
app.post('/api/company/transfer', authenticateToken, async (req, res) => {
  const { to_phone, amount, description } = req.body;

  console.log('💰 Transfert depuis entreprise:', { to_phone, amount, from: req.user.userId });

  try {
    // Validation
    if (!to_phone) {
      return res.status(400).json({ error: 'Numéro du destinataire requis' });
    }

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Montant minimum: 100 FCFA' });
    }

    const amountNum = parseInt(amount);

    // Récupérer l'expéditeur (l'entreprise)
    const sender = await db.get(
      'SELECT id, phone, fullname, role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!sender) {
      return res.status(404).json({ error: 'Expéditeur non trouvé' });
    }

    // Vérifier le solde de l'entreprise
    const senderWallet = await db.get(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [sender.id]
    );

    if (!senderWallet || senderWallet.balance < amountNum) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        balance: senderWallet?.balance || 0,
        required: amountNum
      });
    }

    // Récupérer le destinataire
    const receiver = await db.get(
      'SELECT id, phone, fullname FROM users WHERE phone = ? AND is_active = 1',
      [to_phone]
    );

    if (!receiver) {
      return res.status(404).json({ error: 'Destinataire non trouvé ou inactif' });
    }

    if (receiver.id === sender.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous transférer à vous-même' });
    }

    // Démarrer la transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. Débiter l'expéditeur
      await db.run(
        'UPDATE wallets SET balance = balance - ? WHERE user_id = ?',
        [amountNum, sender.id]
      );

      // 2. Créditer le destinataire
      await db.run(
        'UPDATE wallets SET balance = balance + ? WHERE user_id = ?',
        [amountNum, receiver.id]
      );

      // 3. Enregistrer la transaction
      const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      await db.run(`
                INSERT INTO transactions (
                    reference, 
                    sender_phone, 
                    receiver_phone, 
                    amount, 
                    fee, 
                    net_amount, 
                    type, 
                    status, 
                    description,
                    created_at,
                    completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'transfer', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        reference,
        sender.phone,
        receiver.phone,
        amountNum,
        0,
        amountNum,
        description || `Transfert depuis ${sender.fullname}`
      ]);

      await db.run('COMMIT');

      // Notifications
      await db.run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Transfert effectué', 
                        'Vous avez transféré ${amountNum.toLocaleString()} FCFA à ${receiver.fullname}', 
                        'transfer', CURRENT_TIMESTAMP)
            `, [sender.id]);

      await db.run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '💰 Transfert reçu', 
                        'Vous avez reçu ${amountNum.toLocaleString()} FCFA de ${sender.fullname}', 
                        'transfer', CURRENT_TIMESTAMP)
            `, [receiver.id]);

      // Récupérer les nouveaux soldes
      const newSenderBalance = await db.get(
        'SELECT balance FROM wallets WHERE user_id = ?',
        [sender.id]
      );

      res.json({
        success: true,
        message: 'Transfert effectué avec succès',
        transfer: {
          reference: reference,
          amount: amountNum,
          receiver: receiver.fullname,
          receiver_phone: receiver.phone,
          new_balance: newSenderBalance?.balance || 0
        }
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('❌ Erreur transfert:', error);
    res.status(500).json({
      error: 'Erreur lors du transfert',
      details: error.message
    });
  }
});
// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - COMPTE UTILISATEUR
// ============================================

// GET - Récupérer les informations de l'entreprise connectée (agent)
app.get('/api/company/info', authenticateToken, async (req, res) => {
  console.log('📋 GET /api/company/info - User:', req.user.userId, 'Role:', req.user.role);

  try {
    // Récupérer l'utilisateur
    const user = await get('SELECT id, phone, fullname, role, is_active FROM users WHERE id = ?', [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur est un agent, chercher l'entreprise associée
    if (user.role === 'agent') {
      // Chercher dans service_companies (eau/électricité)
      let company = await get(`
                SELECT 
                    sc.*,
                    u.phone as agent_phone,
                    u.fullname as agent_name,
                    u.is_active as agent_status,
                    w.balance as agent_balance
                FROM service_companies sc
                JOIN users u ON sc.user_id = u.id
                LEFT JOIN wallets w ON u.id = w.user_id
                WHERE u.id = ? AND sc.is_active = 1
            `, [req.user.userId]);

      // Si pas trouvé, chercher dans tax_offices (impôts)
      if (!company) {
        company = await get(`
                    SELECT 
                        toff.*,
                        u.phone as agent_phone,
                        u.fullname as agent_name,
                        u.is_active as agent_status,
                        w.balance as agent_balance
                    FROM tax_offices toff
                    JOIN users u ON toff.user_id = u.id
                    LEFT JOIN wallets w ON u.id = w.user_id
                    WHERE u.id = ? AND toff.is_active = 1
                `, [req.user.userId]);

        if (company) {
          company.type = 'tax_office';
          company.is_tax_office = true;
        }
      }

      // Si une entreprise est trouvée
      if (company) {
        return res.json({
          id: company.id,
          name: company.name,
          type: company.type || (company.is_tax_office ? 'tax_office' : 'service'),
          fullName: company.fullName || company.name,
          description: company.description,
          contact_phone: company.contact_phone || company.phone,
          contact_email: company.contact_email || company.email,
          address: company.address,
          logo: company.logo,
          color: company.color,
          is_active: company.is_active === 1,
          is_tax_office: company.is_tax_office || false,
          agent: {
            id: req.user.userId,
            phone: company.agent_phone || user.phone,
            name: company.agent_name || user.fullname,
            status: company.agent_status === 1 ? 'active' : 'inactive',
            balance: company.agent_balance || 0
          }
        });
      }
    }

    // Si l'utilisateur n'est pas associé à une entreprise, retourner ses infos de base
    res.json({
      id: null,
      name: user.fullname,
      type: 'user',
      fullName: user.fullname,
      description: 'Compte utilisateur',
      is_active: user.is_active === 1,
      agent: {
        id: user.id,
        phone: user.phone,
        name: user.fullname,
        status: user.is_active ? 'active' : 'inactive',
        balance: 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/info:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Paiements reçus par l'entreprise (agent)
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  console.log('📋 GET /api/company/payments - User:', req.user.userId);

  try {
    let companyId = null;
    let companyName = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, name, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyName = serviceCompany.name;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id, name FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyName = taxOffice.name;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        payments: [],
        total_amount: 0,
        total_count: 0,
        today_amount: 0,
        this_month_amount: 0
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let stats = { total_amount: 0, total_count: 0, today_amount: 0, this_month_amount: 0 };
    let payments = [];

    // Pour les services d'eau/électricité
    if (companyType === 'water' || companyType === 'electricity') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    bp.id,
                    bp.receipt_number,
                    bp.customer_name,
                    bp.customer_phone,
                    bp.customer_email,
                    bp.customer_address,
                    bp.meter_number,
                    bp.amount,
                    bp.fee,
                    bp.total_amount,
                    bp.period,
                    bp.invoice_number,
                    bp.service_type,
                    bp.status,
                    bp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM bill_payments bp
                LEFT JOIN users u ON bp.payer_id = u.id
                WHERE bp.company_id = ? AND bp.status = 'completed'
                ORDER BY bp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    // Pour les services d'impôts
    if (companyType === 'tax_office') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    tp.id,
                    tp.receipt_number,
                    tp.taxpayer_name as customer_name,
                    tp.taxpayer_phone as customer_phone,
                    tp.taxpayer_email as customer_email,
                    tp.taxpayer_address as customer_address,
                    NULL as meter_number,
                    tp.amount,
                    tp.fee,
                    tp.total_amount,
                    tp.tax_period as period,
                    NULL as invoice_number,
                    tp.tax_type as service_type,
                    tp.status,
                    tp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.office_id = ? AND tp.status = 'completed'
                ORDER BY tp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    res.json({
      payments: payments || [],
      total_amount: stats?.total_amount || 0,
      total_count: stats?.total_count || 0,
      today_amount: stats?.today_amount || 0,
      this_month_amount: stats?.this_month_amount || 0,
      company: {
        id: companyId,
        name: companyName,
        type: companyType
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/payments:', error);
    res.status(500).json({
      error: error.message,
      payments: [],
      total_amount: 0,
      total_count: 0,
      today_amount: 0,
      this_month_amount: 0
    });
  }
});

// GET - Détails d'un paiement spécifique
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    let payment = null;

    // Chercher dans bill_payments
    payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    // Si pas trouvé, chercher dans tax_payments
    if (!payment) {
      payment = await get(`
                SELECT 
                    tp.*,
                    u.fullname as payer_name,
                    u.phone as payer_phone,
                    u.email as payer_email
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.id = ? AND tp.status = 'completed'
            `, [id]);
    }

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques de l'entreprise
app.get('/api/company/stats', authenticateToken, async (req, res) => {
  try {
    let companyId = null;
    let companyType = null;

    const serviceCompany = await get(`
            SELECT id, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyType = serviceCompany.type;
    }

    if (!companyId) {
      const taxOffice = await get(`
                SELECT id FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        total_payments: 0,
        total_amount: 0,
        average_amount: 0,
        monthly_stats: []
      });
    }

    let globalStats = { total_payments: 0, total_amount: 0, average_amount: 0 };
    let monthlyStats = [];

    if (companyType === 'water' || companyType === 'electricity') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    if (companyType === 'tax_office') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    res.json({
      total_payments: globalStats?.total_payments || 0,
      total_amount: globalStats?.total_amount || 0,
      average_amount: Math.round(globalStats?.average_amount || 0),
      monthly_stats: monthlyStats || []
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/stats:', error);
    res.json({
      total_payments: 0,
      total_amount: 0,
      average_amount: 0,
      monthly_stats: []
    });
  }
});



// ============================================
// ROUTES COMMUNES (SERVICES D'IMPÔTS)
// ============================================

// Admin: Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/admin/communes - Admin:', req.user.userId);

    const communes = await query(`
            SELECT 
                u.id,
                u.phone,
                u.fullname as contact_name,
                u.commune_name as name,
                u.commune_address as address,
                u.email,
                u.is_active,
                w.balance,
                u.created_at
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.commune_name
        `);

    console.log(`✅ ${communes.length} communes trouvées`);
    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur chargement communes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES ADMIN - GESTION DES COMMUNES (SERVICES D'IMPÔTS)
// ============================================

// Créer une commune (service d'impôt)
app.post('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, commune_name, commune_address, email, password } = req.body;

  console.log('=== CRÉATION COMMUNE ===');
  console.log('Données reçues:', { phone, fullname, commune_name, commune_address, email, password: '***' });

  // Validation
  if (!phone || !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (!fullname || !commune_name) {
    return res.status(400).json({ error: 'Le nom de la commune est requis' });
  }

  try {
    // Vérifier si le numéro existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Générer un mot de passe par défaut si non fourni
    const finalPassword = password || Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Générer une clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(privateKey, 10);

    // Démarrer une transaction
    await run('BEGIN TRANSACTION');

    try {
      // 1. Créer l'utilisateur avec rôle 'commune'
      const result = await run(
        `INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, commune_name, commune_address, email) 
                 VALUES (?, ?, ?, ?, 'commune', 1, 1, ?, ?, ?)`,
        [phone, fullname, hashedPassword, hashedKey, commune_name, commune_address || '', email || '']
      );

      const userId = result.lastID;
      console.log('✅ Utilisateur créé avec ID:', userId);

      // 2. Vérifier si un wallet existe déjà pour cet utilisateur
      const existingWallet = await get('SELECT id FROM wallets WHERE user_id = ?', [userId]);

      if (!existingWallet) {
        // Créer le wallet pour la commune
        await run(
          `INSERT INTO wallets (user_id, balance, bonus_balance, currency, is_principal, created_at, updated_at) 
                     VALUES (?, 0, 0, 'XAF', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId]
        );
        console.log('✅ Wallet créé pour la commune');
      } else {
        console.log('⚠️ Wallet existant trouvé, utilisation existant');
      }

      // 3. Ajouter également dans la table communes (optionnel)
      try {
        await run(
          `INSERT OR IGNORE INTO communes (phone, name, address, contact_name, contact_phone, email, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [phone, commune_name, commune_address, fullname, phone, email || '', req.user.userId]
        );
        console.log('✅ Entrée ajoutée dans la table communes');
      } catch (communeError) {
        console.log('⚠️ Erreur table communes (non bloquante):', communeError.message);
      }

      await run('COMMIT');

      // Notification WebSocket
      if (io) {
        io.to(`user_${req.user.userId}`).emit('notification', {
          title: '🏛️ Commune créée',
          message: `La commune "${commune_name}" a été créée avec succès. Téléphone: ${phone}`,
          type: 'success',
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Commune créée avec succès',
        commune: {
          id: userId,
          phone: phone,
          name: commune_name,
          address: commune_address,
          email: email,
          password: finalPassword,
          private_key: privateKey
        }
      });

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Erreur création commune:', error);

    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Un wallet existe déjà pour cette commune' });
    } else {
      res.status(500).json({ error: error.message || 'Erreur lors de la création de la commune' });
    }
  }
});

// Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const communes = await query(`
            SELECT u.id, u.phone, u.fullname, u.commune_name, u.commune_address, u.email, u.is_active,
                   w.balance
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.created_at DESC
        `);

    res.json(communes || []);
  } catch (error) {
    console.error('Erreur récupération communes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modifier une commune
app.put('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { commune_name, commune_address, email, is_active } = req.body;

  try {
    await run(
      `UPDATE users SET commune_name = ?, commune_address = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND role = 'commune'`,
      [commune_name, commune_address || '', email || '', is_active ? 1 : 0, id]
    );

    res.json({ success: true, message: 'Commune modifiée avec succès' });
  } catch (error) {
    console.error('Erreur modification commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une commune
app.delete('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete - désactiver plutôt que supprimer
    await run('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "commune"', [id]);

    res.json({ success: true, message: 'Commune désactivée avec succès' });
  } catch (error) {
    console.error('Erreur suppression commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer la liste des communes pour les paiements
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT 
                id, 
                phone, 
                commune_name as name, 
                commune_address as address,
                email
            FROM users 
            WHERE role = 'commune' AND is_active = 1
            ORDER BY commune_name
        `);

    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les statistiques d'une commune
app.get('/api/commune/stats', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    // Récupérer le solde du wallet
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    // Récupérer les paiements reçus
    const payments = await query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(fee) as total_fees,
                DATE(created_at) as payment_date
            FROM tax_payments
            WHERE commune_id = ?
            GROUP BY DATE(created_at)
            ORDER BY payment_date DESC
            LIMIT 30
        `, [req.user.userId]);

    res.json({
      balance: wallet?.balance || 0,
      total_payments: payments.reduce((sum, p) => sum + p.total_count, 0),
      total_amount: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      recent_payments: payments.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.json({ balance: 0, total_payments: 0, total_amount: 0 });
  }
});

// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - PAIEMENTS REÇUS
// ============================================

// GET - Paiements reçus par l'entreprise
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  console.log('📋 GET /api/company/payments - User:', req.user.userId);

  try {
    // Récupérer l'ID de l'entreprise associée
    let companyId = null;
    let companyName = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, name, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyName = serviceCompany.name;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id, name FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyName = taxOffice.name;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        payments: [],
        total_amount: 0,
        total_count: 0,
        today_amount: 0,
        this_month_amount: 0,
        message: 'Aucune entreprise associée'
      });
    }

    // Calculer les statistiques
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let stats = { total_amount: 0, total_count: 0, today_amount: 0, this_month_amount: 0 };
    let payments = [];

    // Si c'est un service d'eau/électricité, chercher dans bill_payments
    if (companyType === 'water' || companyType === 'electricity') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    bp.id,
                    bp.receipt_number,
                    bp.customer_name,
                    bp.customer_phone,
                    bp.customer_email,
                    bp.customer_address,
                    bp.meter_number,
                    bp.amount,
                    bp.fee,
                    bp.total_amount,
                    bp.period,
                    bp.invoice_number,
                    bp.service_type,
                    bp.status,
                    bp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM bill_payments bp
                LEFT JOIN users u ON bp.payer_id = u.id
                WHERE bp.company_id = ? AND bp.status = 'completed'
                ORDER BY bp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    // Si c'est un service d'impôts, chercher dans tax_payments
    if (companyType === 'tax_office') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    tp.id,
                    tp.receipt_number,
                    tp.taxpayer_name as customer_name,
                    tp.taxpayer_phone as customer_phone,
                    tp.taxpayer_email as customer_email,
                    tp.taxpayer_address as customer_address,
                    NULL as meter_number,
                    tp.amount,
                    tp.fee,
                    tp.total_amount,
                    tp.tax_period as period,
                    NULL as invoice_number,
                    tp.tax_type as service_type,
                    tp.status,
                    tp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.office_id = ? AND tp.status = 'completed'
                ORDER BY tp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    console.log(`✅ ${payments.length} paiements trouvés pour ${companyName}`);

    res.json({
      payments: payments || [],
      total_amount: stats?.total_amount || 0,
      total_count: stats?.total_count || 0,
      today_amount: stats?.today_amount || 0,
      this_month_amount: stats?.this_month_amount || 0,
      company: {
        id: companyId,
        name: companyName,
        type: companyType
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/payments:', error);
    res.status(500).json({
      error: error.message,
      payments: [],
      total_amount: 0,
      total_count: 0,
      today_amount: 0,
      this_month_amount: 0
    });
  }
});

// GET - Détails d'un paiement spécifique pour l'entreprise
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    let payment = null;

    // Chercher d'abord dans bill_payments
    payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    // Si pas trouvé, chercher dans tax_payments
    if (!payment) {
      payment = await get(`
                SELECT 
                    tp.*,
                    u.fullname as payer_name,
                    u.phone as payer_phone,
                    u.email as payer_email
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.id = ? AND tp.status = 'completed'
            `, [id]);
    }

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques de l'entreprise
app.get('/api/company/stats', authenticateToken, async (req, res) => {
  try {
    let companyId = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        total_payments: 0,
        total_amount: 0,
        average_amount: 0,
        monthly_stats: []
      });
    }

    let globalStats = { total_payments: 0, total_amount: 0, average_amount: 0 };
    let monthlyStats = [];

    if (companyType === 'water' || companyType === 'electricity') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    if (companyType === 'tax_office') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    res.json({
      total_payments: globalStats?.total_payments || 0,
      total_amount: globalStats?.total_amount || 0,
      average_amount: Math.round(globalStats?.average_amount || 0),
      monthly_stats: monthlyStats || []
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/stats:', error);
    res.json({
      total_payments: 0,
      total_amount: 0,
      average_amount: 0,
      monthly_stats: []
    });
  }
});
// Appeler la création des tables au démarrage
// createTaxOfficesTable();



// Paiement d'une taxe vers une commune
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    commune_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('=== PAIEMENT TAXE ===');
  console.log('Commune ID:', commune_id);
  console.log('Montant:', amount);
  console.log('User:', req.user.userId);

  try {
    // Validation
    if (!commune_id) {
      return res.status(400).json({ error: 'Veuillez sélectionner une commune' });
    }
    if (!taxpayer_name) {
      return res.status(400).json({ error: 'Nom du contribuable requis' });
    }
    if (!taxpayer_phone) {
      return res.status(400).json({ error: 'Téléphone requis' });
    }
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Montant minimum 100 FCFA' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
    if (!payer) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer la commune (destinataire)
    const commune = await get('SELECT id, phone, commune_name, fullname FROM users WHERE id = ? AND role = "commune"', [commune_id]);
    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    // Calculer les frais (1% pour la plateforme)
    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receiptNumber = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Effectuer les transferts
    await run('BEGIN TRANSACTION');

    try {
      // Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // Créditer la commune (montant sans frais)
      await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, commune.id]);

      // Créditer le wallet principal des frais
      const mainWallet = await get('SELECT id FROM main_wallet LIMIT 1');
      if (mainWallet) {
        await run('UPDATE main_wallet SET balance = balance + ?, total_revenue = total_revenue + ?', [fee, fee]);
      }

      // Enregistrer la transaction
      const transactionRef = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await run(
        `INSERT INTO transactions (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                 VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?)`,
        [transactionRef, payer.phone, commune.phone, amount, fee, amount, `Paiement de taxe - ${receiptNumber}`]
      );

      // Créer la table tax_payments si elle n'existe pas
      await run(`CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE,
                payer_id INTEGER,
                commune_id INTEGER,
                taxpayer_name TEXT,
                taxpayer_phone TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT,
                tax_period TEXT,
                amount INTEGER,
                fee INTEGER,
                total_amount INTEGER,
                payment_status TEXT DEFAULT 'paid',
                alkherpay_transaction_ref TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (commune_id) REFERENCES users(id)
            )`);

      // Enregistrer le paiement
      await run(
        `INSERT INTO tax_payments (
                    receipt_number, payer_id, commune_id, taxpayer_name, taxpayer_phone,
                    taxpayer_address, business_number, property_address, tax_type,
                    tax_period, amount, fee, total_amount, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNumber, payer.id, commune.id, taxpayer_name, taxpayer_phone,
          taxpayer_address || '', business_number || '', property_address || '',
          tax_type, tax_period || new Date().getFullYear().toString(),
          amount, fee, totalAmount, notes || ''
        ]
      );

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [payer.id, '✅ Paiement de taxe effectué',
      `Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type} à ${commune.commune_name}. Reçu: ${receiptNumber}`,
        'tax_payment', `/tax-payment?receipt=${receiptNumber}`]
    );

    // Notification pour la commune
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [commune.id, '💰 Nouveau paiement de taxe reçu',
      `${payer.fullname} (${payer.phone}) a payé ${amount.toLocaleString()} FCFA pour ${tax_type}`,
        'tax_received', `/commune/payments`]
    );

    console.log('✅ Paiement enregistré:', receiptNumber);

    res.json({
      success: true,
      receipt: {
        receipt_number: receiptNumber,
        taxpayer_name,
        taxpayer_phone,
        tax_type,
        amount,
        fee,
        total_amount: totalAmount,
        commune_name: commune.commune_name,
        commune_phone: commune.phone,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Historique des paiements de taxes de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await query(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.payer_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.json([]);
  }
});

// Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone, u.commune_address
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('❌ Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les paiements reçus par une commune
app.get('/api/commune/payments', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    const payments = await query(`
            SELECT tp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur paiements reçus:', error);
    res.json([]);
  }
});


// ============================================
// ROUTE ADMIN - RÉINITIALISATION DE CLÉ PRIVÉE AVEC NOTIFICATIONS
// ============================================

// Réinitialiser la clé privée d'un utilisateur (admin)
app.post('/api/admin/users/:userId/reset-key', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('=== RÉINITIALISATION CLÉ PRIVÉE ===');
  console.log('User ID:', userId);
  console.log('Admin qui fait l\'action:', req.user.userId);

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname, email FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer une nouvelle clé privée à 6 chiffres
    const newPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(newPrivateKey, 10);

    // Mettre à jour la clé privée
    await run('UPDATE users SET private_key_6 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedKey, userId]);

    console.log('✅ Clé privée mise à jour pour:', user.phone);
    console.log('📱 Nouvelle clé privée:', newPrivateKey);

    // Enregistrer dans les logs
    try {
      await run(`INSERT INTO system_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.userId, 'RESET_KEY', `Réinitialisation clé privée de l'utilisateur ${user.phone}`]);
    } catch (logError) {
      console.log('Erreur log (non bloquante):', logError.message);
    }

    // ============================================
    // NOTIFICATION À L'UTILISATEUR CONCERNÉ
    // ============================================
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: Date.now(),
        title: '🔑 Clé privée réinitialisée',
        message: `Votre clé privée a été réinitialisée par l'administrateur.`,
        details: `Nouvelle clé privée: ${newPrivateKey}`,
        type: 'security',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        action: 'change_key',
        data: { new_private_key: newPrivateKey }
      });
      console.log('✅ Notification envoyée à l\'utilisateur');
    }

    // ============================================
    // NOTIFICATION À L'ADMIN QUI A FAIT L'ACTION
    // ============================================
    if (io) {
      io.to(`user_${req.user.userId}`).emit('notification', {
        id: Date.now(),
        title: '✅ Clé privée réinitialisée',
        message: `La clé privée de ${user.fullname} a été réinitialisée avec succès`,
        details: `Nouvelle clé privée: ${newPrivateKey}`,
        type: 'success',
        severity: 'info',
        timestamp: new Date().toISOString()
      });
      console.log('✅ Notification envoyée à l\'admin');
    }

    // ============================================
    // NOTIFICATION À TOUS LES AUTRES ADMINS (optionnel)
    // ============================================
    if (io) {
      // Envoyer à tous les admins connectés
      const admins = await query('SELECT id FROM users WHERE role = "admin" AND id != ?', [req.user.userId]);
      for (const admin of admins) {
        io.to(`user_${admin.id}`).emit('notification', {
          id: Date.now(),
          title: '🔑 Réinitialisation de clé',
          message: `${req.user.fullname || 'Un administrateur'} a réinitialisé la clé privée de ${user.fullname}`,
          type: 'info',
          severity: 'info',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Clé privée réinitialisée avec succès',
      new_private_key: newPrivateKey,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('Erreur réinitialisation clé privée:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la réinitialisation de la clé privée' });
  }
});

// ============================================
// ============================================
// ROUTE ADMIN - RÉINITIALISATION MOT DE PASSE AVEC GÉNÉRATION ALÉATOIRE
// ============================================

// ============================================
// RÉINITIALISATION DU MOT DE PASSE (ADMIN) - CORRIGÉ
// ============================================

app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;

  console.log('🔐 Réinitialisation mot de passe:', { userId });

  try {
    // Vérifier que l'utilisateur existe
    const user = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau mot de passe à 6 chiffres
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]);

    // Journaliser l'action
    try {
      await run(`
                INSERT INTO system_logs (user_id, action, details, created_at)
                VALUES (?, 'PASSWORD_RESET', ?, CURRENT_TIMESTAMP)
            `, [req.user.userId, `Réinitialisation mot de passe pour ${user.phone}`]);
    } catch (logErr) {
      console.log('Erreur log (non bloquante):', logErr.message);
    }

    // Créer une notification pour l'utilisateur - VERSION CORRIGÉE (sans apostrophe problématique)
    try {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '🔐 Mot de passe réinitialisé', 
                        'Votre mot de passe a ete reinitialise par l administrateur.', 
                        'security', CURRENT_TIMESTAMP)
            `, [userId]);
    } catch (notifErr) {
      console.log('Erreur notification (non bloquante):', notifErr.message);
      // Essayer avec un message plus simple
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, 'Password Reset', 'Your password has been reset by admin', 'security', CURRENT_TIMESTAMP)
            `, [userId]);
    }

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      new_password: newPassword,
      user: {
        id: user.id,
        phone: user.phone,
        fullname: user.fullname
      }
    });

  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// 
// ============================================
// Endpoint de secours pour la compatibilité
app.get('/api/tax/offices', async (req, res) => {
  try {
    const offices = await query(`
            SELECT id, name, type, description, contact_phone, contact_email
            FROM service_companies
            WHERE is_active = 1
            ORDER BY name ASC
        `);

    res.json(offices || []);
  } catch (error) {
    // Données par défaut
    res.json([
      { id: 1, name: 'STE', type: 'water', description: 'Société Tchadienne des Eaux', contact_phone: 'XX XX XX XX' },
      { id: 2, name: 'ZIZ', type: 'electricity', description: 'Électricité du Tchad', contact_phone: 'XX XX XX XX' }
    ]);
  }
});
// ============================================
// CORRECTION COMPLÈTE DE L'ENDPOINT KYC STATUS
// ============================================
// ============================================
// SERVER.JS - ENDPOINTS KYC COMPLETS
// ============================================

// ============================================
// CRÉATION DE LA TABLE KYC - VERSION COMPLÈTE
// ============================================

async function createKycTables() {
    try {
        console.log('📝 Création des tables KYC...');
        
        // ✅ Table kyc_requests - Version complète sans CHECK constraints
        await run(`
            CREATE TABLE IF NOT EXISTS kyc_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                fullname TEXT NOT NULL,
                birth_date TEXT,
                birth_place TEXT,
                nationality TEXT DEFAULT 'Tchadienne',
                id_type TEXT,
                id_number TEXT,
                id_issue_date TEXT,
                id_expiry_date TEXT,
                address TEXT,
                occupation TEXT,
                phone_number TEXT,
                company_name TEXT,
                company_address TEXT,
                company_phone TEXT,
                company_email TEXT,
                business_type TEXT,
                registration_number TEXT,
                tax_id TEXT,
                position_in_company TEXT,
                company_additional_info TEXT,
                status TEXT DEFAULT 'pending',
                level INTEGER DEFAULT 1,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME,
                verified_by INTEGER,
                rejection_reason TEXT,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ Table kyc_requests créée avec toutes les colonnes');
        
        // ✅ Table kyc_documents
        await run(`
            CREATE TABLE IF NOT EXISTS kyc_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kyc_request_id INTEGER NOT NULL,
                document_type TEXT NOT NULL,
                filename TEXT,
                file_path TEXT,
                file_size INTEGER,
                mime_type TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table kyc_documents créée');
        
        // ✅ Table kyc_history
        await run(`
            CREATE TABLE IF NOT EXISTS kyc_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kyc_request_id INTEGER,
                action TEXT NOT NULL,
                status_from TEXT,
                status_to TEXT,
                description TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        console.log('✅ Table kyc_history créée');
        
        // ✅ Table kyc_limits
        await run(`
            CREATE TABLE IF NOT EXISTS kyc_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level INTEGER DEFAULT 1,
                daily_transaction_limit INTEGER DEFAULT 100000,
                monthly_transaction_limit INTEGER DEFAULT 500000,
                single_transaction_limit INTEGER DEFAULT 50000,
                withdrawal_limit INTEGER DEFAULT 100000,
                description TEXT
            )
        `);
        console.log('✅ Table kyc_limits créée');
        
        // Insérer les limites par défaut
        const limitCheck = await get('SELECT COUNT(*) as count FROM kyc_limits');
        if (limitCheck?.count === 0) {
            await run(`
                INSERT INTO kyc_limits (level, daily_transaction_limit, monthly_transaction_limit, single_transaction_limit, withdrawal_limit, description)
                VALUES 
                    (0, 25000, 100000, 25000, 50000, 'Non vérifié - Limites réduites'),
                    (1, 100000, 500000, 50000, 100000, 'Niveau 1 - Vérification de base'),
                    (2, 500000, 2000000, 200000, 500000, 'Niveau 2 - Vérification complète'),
                    (3, 1000000, 5000000, 500000, 1000000, 'Niveau 3 - Vérification premium')
            `);
            console.log('✅ Limites KYC insérées');
        }
        
        console.log('✅ Toutes les tables KYC sont prêtes');
        
    } catch (error) {
        console.error('❌ Erreur création tables KYC:', error);
        throw error;
    }
}

// ✅ 2. GET - Statut KYC (CORRIGÉ)
app.get('/api/kyc/status', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    console.log(`📋 Récupération statut KYC pour user ${userId}`);
    
    try {
        await createKycTables();
        
        // Récupérer l'utilisateur
        const user = await get(`
            SELECT id, fullname, phone, email, is_verified, kyc_level, address
            FROM users WHERE id = ?
        `, [userId]);
        
        if (!user) {
            return res.json({
                status: 'none',
                has_kyc: false,
                level: 1,
                is_verified: false,
                fullname: '',
                phone: '',
                message: 'Utilisateur non trouvé'
            });
        }
        
        // Récupérer la dernière demande KYC
        const kyc = await get(`
            SELECT 
                kr.*,
                vu.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users vu ON kr.verified_by = vu.id
            WHERE kr.user_id = ?
            ORDER BY kr.id DESC
            LIMIT 1
        `, [userId]);
        
        // Si aucune demande KYC n'existe
        if (!kyc) {
            return res.json({
                status: 'none',
                has_kyc: false,
                level: user.kyc_level || 0,
                is_verified: user.is_verified === 1,
                fullname: user.fullname || '',
                phone: user.phone || '',
                email: user.email || '',
                address: user.address || '',
                message: 'Aucune demande KYC trouvée'
            });
        }
        
        // Récupérer les documents
        const documents = await query(`
            SELECT id, document_type, filename, uploaded_at
            FROM kyc_documents 
            WHERE kyc_request_id = ?
            ORDER BY uploaded_at DESC
        `, [kyc.id]);
        
        // Déterminer le statut final
        let finalStatus = kyc.status;
        let isVerified = false;
        
        if (kyc.status === 'verified' && user.is_verified === 1) {
            isVerified = true;
        }
        
        if (user.is_verified === 1 && kyc.status === 'pending') {
            finalStatus = 'verified';
            isVerified = true;
        }
        
        // Récupérer les notes (contient les données niveau 2)
        let companyData = null;
        if (kyc.notes) {
            try {
                companyData = JSON.parse(kyc.notes);
            } catch (e) {
                companyData = null;
            }
        }
        
        const response = {
            id: kyc.id,
            user_id: kyc.user_id,
            fullname: kyc.fullname || user.fullname || '',
            phone: kyc.phone_number || user.phone || '',
            email: user.email || '',
            address: kyc.address || user.address || '',
            status: finalStatus,
            level: kyc.level || user.kyc_level || 1,
            is_verified: isVerified,
            has_kyc: true,
            submitted_at: kyc.submitted_at,
            verified_at: kyc.verified_at,
            verified_by: kyc.verified_by,
            verified_by_name: kyc.verified_by_name,
            rejection_reason: kyc.rejection_reason,
            // Données niveau 2
            company: companyData ? {
                name: companyData.companyName || kyc.company_name,
                address: companyData.companyAddress || kyc.company_address,
                phone: companyData.companyPhone || kyc.company_phone,
                email: companyData.companyEmail || kyc.company_email,
                business_type: companyData.businessType || kyc.business_type,
                registration_number: companyData.registrationNumber || kyc.registration_number,
                tax_id: companyData.taxId || kyc.tax_id,
                position: companyData.position || kyc.position_in_company,
                additional_info: companyData.additionalInfo || kyc.company_additional_info
            } : null,
            message: isVerified ? `Compte vérifié - Niveau ${kyc.level || 1}` : `Statut: ${finalStatus}`,
            documents: documents || [],
            userData: {
                fullname: kyc.fullname || user.fullname || '',
                address: kyc.address || user.address || '',
                phone: kyc.phone_number || user.phone || '',
                birth_date: kyc.birth_date,
                birth_place: kyc.birth_place,
                nationality: kyc.nationality,
                id_type: kyc.id_type,
                id_number: kyc.id_number
            }
        };
        
        console.log(`✅ Statut KYC récupéré: ${finalStatus} - Niveau ${kyc.level}`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ Erreur récupération KYC:', error);
        res.status(500).json({
            status: 'error',
            has_kyc: false,
            level: 1,
            is_verified: false,
            message: 'Erreur lors de la récupération du statut KYC',
            error: error.message
        });
    }
});

// ✅ 3. POST - Soumettre KYC Niveau 1
app.post('/api/kyc/submit', authenticateToken, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'proofOfAddress', maxCount: 1 }
]), async (req, res) => {
    const userId = req.user.userId;
    const {
        fullname,
        birthDate,
        birthPlace,
        nationality = 'Tchadienne',
        idType,
        idNumber,
        idIssueDate,
        idExpiryDate,
        address,
        occupation,
        phoneNumber
    } = req.body;
    
    console.log(`📝 Soumission KYC Niveau 1 pour user ${userId}`);
    
    try {
        await createKycTables();
        
        // Vérifier si l'utilisateur a déjà une demande en cours
        const existing = await get(`
            SELECT id, status, level FROM kyc_requests 
            WHERE user_id = ? AND status IN ('pending', 'verified')
        `, [userId]);
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Vous avez déjà une demande KYC en cours (statut: ${existing.status})`,
                existing_status: existing.status
            });
        }
        
        // Valider les champs obligatoires
        if (!fullname || !birthDate || !idType || !idNumber) {
            return res.status(400).json({
                success: false,
                error: 'Nom complet, date de naissance, type et numéro de pièce sont requis'
            });
        }
        
        // Récupérer l'utilisateur
        const user = await get('SELECT fullname, phone FROM users WHERE id = ?', [userId]);
        
        // Créer la demande KYC niveau 1
        const result = await run(`
            INSERT INTO kyc_requests (
                user_id,
                fullname,
                birth_date,
                birth_place,
                nationality,
                id_type,
                id_number,
                id_issue_date,
                id_expiry_date,
                address,
                occupation,
                phone_number,
                status,
                level,
                submitted_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            userId,
            fullname,
            birthDate || null,
            birthPlace || null,
            nationality || 'Tchadienne',
            idType || null,
            idNumber || null,
            idIssueDate || null,
            idExpiryDate || null,
            address || null,
            occupation || null,
            phoneNumber || user?.phone || null
        ]);
        
        const kycId = result.lastID;
        
        // Enregistrer les documents
        const files = req.files || {};
        const documentTypes = {
            idFront: 'id_front',
            idBack: 'id_back',
            selfie: 'selfie',
            proofOfAddress: 'proof_of_address'
        };
        
        for (const [field, type] of Object.entries(documentTypes)) {
            if (files[field] && files[field].length > 0) {
                const file = files[field][0];
                await run(`
                    INSERT INTO kyc_documents (
                        kyc_request_id,
                        document_type,
                        filename,
                        file_path,
                        file_size,
                        mime_type,
                        uploaded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [
                    kycId,
                    type,
                    file.filename,
                    file.path,
                    file.size,
                    file.mimetype
                ]);
            }
        }
        
        // Ajouter à l'historique
        await run(`
            INSERT INTO kyc_history (
                user_id, kyc_request_id, action, status_from, status_to, description, created_by, created_at
            ) VALUES (?, ?, 'submit', NULL, 'pending', 'Demande KYC niveau 1 soumise', ?, CURRENT_TIMESTAMP)
        `, [userId, kycId, userId]);
        
        // Notifier les admins
        const admins = await query(`
            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        `);
        
        for (const admin of admins) {
            await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '📋 Nouvelle demande KYC', 
                        'Une nouvelle demande de vérification KYC niveau 1 a été soumise par ' || ?,
                        'info', CURRENT_TIMESTAMP)
            `, [admin.id, fullname]);
        }
        
        console.log(`✅ Demande KYC Niveau 1 créée avec ID: ${kycId}`);
        
        res.json({
            success: true,
            message: 'Demande KYC niveau 1 soumise avec succès',
            request_id: kycId,
            status: 'pending',
            level: 1
        });
        
    } catch (error) {
        console.error('❌ Erreur soumission KYC Niveau 1:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ============================================
// ENDPOINT KYC Niveau 2 CORRIGÉ
// ============================================

// ✅ POST - Soumettre KYC Niveau 2 (CORRIGÉ AVEC TOUTES LES COLONNES)
app.post('/api/kyc/submit-level-2', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {
        fullname,
        birthDate,
        birthPlace,
        nationality = 'Tchadienne',
        idType,
        idNumber,
        idIssueDate,
        idExpiryDate,
        address,
        occupation,
        phoneNumber,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        businessType,
        registrationNumber,
        taxId,
        position,
        additionalInfo
    } = req.body;
    
    console.log(`📝 Soumission KYC Niveau 2 pour user ${userId}`);
    console.log('📝 Données reçues:', req.body);
    
    try {
        await createKycTables();
        
        // 1. Vérifier si l'utilisateur existe
        const user = await get(`
            SELECT id, fullname, phone, is_verified, kyc_level, address
            FROM users WHERE id = ?
        `, [userId]);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        
        // 2. Vérifier que l'utilisateur a au moins le niveau 1
        if (user.kyc_level < 1) {
            return res.status(400).json({
                success: false,
                error: 'Vous devez d\'abord compléter le niveau 1 KYC avant de demander le niveau 2'
            });
        }
        
        // 3. Vérifier si une demande niveau 2 existe déjà
        const existing = await get(`
            SELECT id, status, level FROM kyc_requests 
            WHERE user_id = ? AND level = 2 AND status IN ('pending', 'verified')
        `, [userId]);
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Vous avez déjà une demande KYC niveau 2 en cours (statut: ${existing.status})`,
                existing_status: existing.status
            });
        }
        
        // 4. Valider les champs obligatoires
        if (!fullname || !birthDate || !idType || !idNumber) {
            return res.status(400).json({
                success: false,
                error: 'Nom complet, date de naissance, type et numéro de pièce sont requis'
            });
        }
        
        if (!companyName || !companyAddress || !position) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'entreprise, l\'adresse et votre poste sont requis'
            });
        }
        
        // 5. Créer la demande KYC niveau 2 avec TOUTES les colonnes
        const result = await run(`
            INSERT INTO kyc_requests (
                user_id,
                fullname,
                birth_date,
                birth_place,
                nationality,
                id_type,
                id_number,
                id_issue_date,
                id_expiry_date,
                address,
                occupation,
                phone_number,
                status,
                level,
                submitted_at,
                updated_at,
                -- Colonnes niveau 2
                company_name,
                company_address,
                company_phone,
                company_email,
                business_type,
                registration_number,
                tax_id,
                position_in_company,
                company_additional_info,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            fullname,
            birthDate || null,
            birthPlace || null,
            nationality || 'Tchadienne',
            idType || null,
            idNumber || null,
            idIssueDate || null,
            idExpiryDate || null,
            address || null,
            occupation || null,
            phoneNumber || user?.phone || null,
            companyName,
            companyAddress,
            companyPhone || '',
            companyEmail || '',
            businessType || '',
            registrationNumber || '',
            taxId || '',
            position,
            additionalInfo || '',
            JSON.stringify({
                requested_level: 2,
                submitted_by: userId,
                timestamp: new Date().toISOString()
            })
        ]);
        
        const kycId = result.lastID;
        
        // 6. Ajouter à l'historique
        await run(`
            INSERT INTO kyc_history (
                user_id, kyc_request_id, action, status_from, status_to, description, created_by, created_at
            ) VALUES (?, ?, 'submit_level_2', NULL, 'pending', 'Demande KYC niveau 2 soumise pour ' || ?, ?, CURRENT_TIMESTAMP)
        `, [userId, kycId, companyName, userId]);
        
        // 7. Notifier les admins
        const admins = await query(`
            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        `);
        
        for (const admin of admins) {
            await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '📋 Nouvelle demande KYC Niveau 2', 
                        'Une nouvelle demande de vérification KYC niveau 2 a été soumise par ' || ? || ' pour l\'entreprise ' || ?,
                        'info', CURRENT_TIMESTAMP)
            `, [admin.id, fullname, companyName]);
        }
        
        console.log(`✅ Demande KYC Niveau 2 créée avec ID: ${kycId}`);
        
        res.json({
            success: true,
            message: 'Demande KYC niveau 2 soumise avec succès',
            request_id: kycId,
            status: 'pending',
            level: 2
        });
        
    } catch (error) {
        console.error('❌ Erreur soumission KYC Niveau 2:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ 5. PUT - Admin approuve une demande KYC
app.put('/api/admin/kyc/verify/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { action, level, rejection_reason } = req.body;
    const adminId = req.user.userId;
    
    console.log(`🔍 Vérification KYC ${id} - Action: ${action}`);
    
    try {
        const request = await get(`
            SELECT * FROM kyc_requests WHERE id = ?
        `, [id]);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Demande KYC non trouvée'
            });
        }
        
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cette demande est déjà ${request.status}`
            });
        }
        
        const requestedLevel = request.level || 1;
        
        if (action === 'approve') {
            await run(`
                UPDATE kyc_requests 
                SET status = 'verified',
                    level = ?,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [requestedLevel, adminId, id]);
            
            await run(`
                UPDATE users 
                SET is_verified = 1,
                    kyc_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [requestedLevel, request.user_id]);
            
            const levelMessage = requestedLevel === 2 
                ? 'Vous pouvez maintenant créer des entreprises et investir ! 🚀' 
                : 'Vous bénéficiez de limites de transaction augmentées.';
            
            await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ KYC Approuvé', 
                        'Félicitations ! Votre demande KYC niveau ' || ? || ' a été approuvée. ' || ?,
                        'success', CURRENT_TIMESTAMP)
            `, [request.user_id, requestedLevel, levelMessage]);
            
            await run(`
                INSERT INTO kyc_history (
                    user_id, kyc_request_id, action, status_from, status_to, description, created_by, created_at
                ) VALUES (?, ?, 'approve', 'pending', 'verified', 'Demande KYC niveau ' || ? || ' approuvée', ?, CURRENT_TIMESTAMP)
            `, [request.user_id, id, requestedLevel, adminId]);
            
            res.json({
                success: true,
                message: `Demande KYC niveau ${requestedLevel} approuvée avec succès`,
                status: 'verified',
                level: requestedLevel
            });
            
        } else if (action === 'reject') {
            await run(`
                UPDATE kyc_requests 
                SET status = 'rejected',
                    rejection_reason = ?,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [rejection_reason || 'Non conforme', adminId, id]);
            
            await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '❌ KYC Rejeté', 
                        'Votre demande KYC niveau ' || ? || ' a été rejetée. Raison: ' || ?,
                        'error', CURRENT_TIMESTAMP)
            `, [request.user_id, requestedLevel, rejection_reason || 'Non conforme']);
            
            await run(`
                INSERT INTO kyc_history (
                    user_id, kyc_request_id, action, status_from, status_to, description, created_by, created_at
                ) VALUES (?, ?, 'reject', 'pending', 'rejected', 'Demande KYC niveau ' || ? || ' rejetée: ' || ?, ?, CURRENT_TIMESTAMP)
            `, [request.user_id, id, requestedLevel, rejection_reason || 'Non conforme', adminId]);
            
            res.json({
                success: true,
                message: `Demande KYC niveau ${requestedLevel} rejetée`,
                status: 'rejected',
                rejection_reason: rejection_reason || 'Non conforme'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Action invalide. Utilisez "approve" ou "reject"'
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification KYC:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ 6. GET - Récupérer toutes les demandes KYC (Admin)
app.get('/api/admin/kyc/requests', authenticateToken, requireAdmin, async (req, res) => {
  const { status, level, limit = 50, offset = 0 } = req.query;

  console.log(`📋 Récupération demandes KYC - Status: ${status || 'all'}, Level: ${level || 'all'}`);

  try {
    await createKycTables();

    let sql = `
            SELECT 
                kr.*,
                u.fullname as user_name,
                u.phone as user_phone,
                u.email as user_email,
                vu.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.user_id = u.id
            LEFT JOIN users vu ON kr.verified_by = vu.id
            WHERE 1=1
        `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND kr.status = ?';
      params.push(status);
    }

    if (level && level !== 'all') {
      sql += ' AND kr.level = ?';
      params.push(parseInt(level));
    }

    sql += ' ORDER BY kr.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const requests = await query(sql, params);

    // Compter le total
    let countSql = 'SELECT COUNT(*) as total FROM kyc_requests WHERE 1=1';
    const countParams = [];

    if (status && status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (level && level !== 'all') {
      countSql += ' AND level = ?';
      countParams.push(parseInt(level));
    }

    const total = await get(countSql, countParams);

    // Récupérer les documents pour chaque demande
    for (const request of requests || []) {
      const docs = await query(`
                SELECT id, document_type, filename, uploaded_at
                FROM kyc_documents 
                WHERE kyc_request_id = ?
            `, [request.id]);
      request.documents = docs || [];
    }

    console.log(`✅ ${requests?.length || 0} demandes trouvées`);

    res.json({
      success: true,
      requests: requests || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération demandes KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ 7. GET - Statistiques KYC (Admin)
app.get('/api/admin/kyc/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await createKycTables();

    const stats = await get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' AND level = 1 THEN 1 ELSE 0 END) as pending_level1,
                SUM(CASE WHEN status = 'pending' AND level = 2 THEN 1 ELSE 0 END) as pending_level2,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_total,
                SUM(CASE WHEN status = 'verified' AND level = 1 THEN 1 ELSE 0 END) as verified_level1,
                SUM(CASE WHEN status = 'verified' AND level = 2 THEN 1 ELSE 0 END) as verified_level2,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_total,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM kyc_requests
        `);

    res.json({
      success: true,
      stats: {
        total: stats?.total || 0,
        pending: {
          level1: stats?.pending_level1 || 0,
          level2: stats?.pending_level2 || 0,
          total: stats?.pending_total || 0
        },
        verified: {
          level1: stats?.verified_level1 || 0,
          level2: stats?.verified_level2 || 0,
          total: stats?.verified_total || 0
        },
        rejected: stats?.rejected || 0,
        cancelled: stats?.cancelled || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques KYC:', error);
    res.json({
      success: true,
      stats: {
        total: 0,
        pending: { level1: 0, level2: 0, total: 0 },
        verified: { level1: 0, level2: 0, total: 0 },
        rejected: 0,
        cancelled: 0
      }
    });
  }
});

// ✅ 8. GET - Historique KYC d'un utilisateur
app.get('/api/kyc/history', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    await createKycTables();

    const history = await query(`
            SELECT 
                kh.*,
                u.fullname as created_by_name
            FROM kyc_history kh
            LEFT JOIN users u ON kh.created_by = u.id
            WHERE kh.user_id = ?
            ORDER BY kh.created_at DESC
            LIMIT 20
        `, [userId]);

    res.json(history || []);

  } catch (error) {
    console.error('❌ Erreur récupération historique KYC:', error);
    res.json([]);
  }
});

// ✅ 9. POST - Télécharger un document KYC
app.get('/api/kyc/download/:documentId', authenticateToken, async (req, res) => {
  const { documentId } = req.params;
  const userId = req.user.userId;

  try {
    const document = await get(`
            SELECT kd.*, kr.user_id 
            FROM kyc_documents kd
            JOIN kyc_requests kr ON kd.kyc_request_id = kr.id
            WHERE kd.id = ?
        `, [documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur a le droit de voir ce document
    if (document.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    res.download(document.file_path, document.filename);

  } catch (error) {
    console.error('❌ Erreur téléchargement document:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INITIALISATION AU DÉMARRAGE
// ============================================

// Appeler la création des tables au démarrage
async function initializeKyc() {
  try {
    await createKycTables();
    console.log('✅ Système KYC initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation KYC:', error);
  }
}

// Appeler au démarrage du serveur
// initializeKyc();

// ✅ 4. Endpoint de test pour vérifier KYC
app.post('/api/kyc/test-verify', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Vérifier si une demande existe
    const existing = await get(`
            SELECT id FROM kyc_requests WHERE user_id = ?
        `, [userId]);

    if (!existing) {
      // Créer une demande KYC automatiquement vérifiée
      await run(`
                INSERT INTO kyc_requests (
                    user_id, fullname, status, level, 
                    submitted_at, verified_at, verified_by
                ) VALUES (
                    ?, 'Utilisateur Test', 'verified', 2, 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
                )
            `, [userId]);
    } else {
      // Mettre à jour la demande existante
      await run(`
                UPDATE kyc_requests 
                SET status = 'verified', level = 2, 
                    verified_at = CURRENT_TIMESTAMP, verified_by = 1
                WHERE user_id = ?
            `, [userId]);
    }

    // Mettre à jour l'utilisateur
    await run(`
            UPDATE users 
            SET is_verified = 1, kyc_level = 2 
            WHERE id = ?
        `, [userId]);

    res.json({
      success: true,
      message: 'KYC vérifié automatiquement (mode test)'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// ============================================
// ROUTES KYC (KNOW YOUR CUSTOMER)
// ============================================

// Créer la table kyc_limits si elle n'existe pas
async function createKycTables() {
  try {
    // Table des limites KYC
    await run(`
            CREATE TABLE IF NOT EXISTS kyc_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level INTEGER NOT NULL DEFAULT 1,
                daily_limit INTEGER NOT NULL DEFAULT 1000000,
                monthly_limit INTEGER NOT NULL DEFAULT 10000000,
                single_transaction_limit INTEGER NOT NULL DEFAULT 500000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Table des vérifications KYC utilisateur
    await run(`
            CREATE TABLE IF NOT EXISTS user_kyc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                level INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending',
                verified_at DATETIME,
                id_card_front TEXT,
                id_card_back TEXT,
                selfie TEXT,
                rejection_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id)
            )
        `);

    // Insérer les limites par défaut si la table est vide
    const existing = await get('SELECT COUNT(*) as count FROM kyc_limits');
    if (existing && existing.count === 0) {
      await run(`
                INSERT INTO kyc_limits (level, daily_limit, monthly_limit, single_transaction_limit)
                VALUES 
                    (1, 1000000, 10000000, 500000),
                    (2, 5000000, 50000000, 2000000),
                    (3, 20000000, 200000000, 5000000)
            `);
      console.log('✅ Limites KYC par défaut créées');
    }

    console.log('✅ Tables KYC créées/vérifiées');
  } catch (error) {
    console.error('Erreur création tables KYC:', error);
  }
}

// Obtenir les limites KYC de l'utilisateur
app.get('/api/kyc/limits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer le niveau KYC de l'utilisateur
    const userKyc = await get(`
            SELECT level, status FROM user_kyc WHERE user_id = ?
        `, [userId]);

    const currentLevel = (userKyc && userKyc.status === 'verified') ? userKyc.level : 1;

    // Récupérer les limites pour ce niveau
    const limits = await get(`
            SELECT * FROM kyc_limits WHERE level = ?
        `, [currentLevel]);

    // Récupérer les montants déjà utilisés aujourd'hui et ce mois
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const todayTotal = await get(`
            SELECT COALESCE(SUM(amount + fee), 0) as total
            FROM transactions 
            WHERE (sender_phone = (SELECT phone FROM users WHERE id = ?) OR receiver_phone = (SELECT phone FROM users WHERE id = ?))
            AND status = 'completed'
            AND DATE(created_at) = ?
        `, [userId, userId, today]);

    const monthTotal = await get(`
            SELECT COALESCE(SUM(amount + fee), 0) as total
            FROM transactions 
            WHERE (sender_phone = (SELECT phone FROM users WHERE id = ?) OR receiver_phone = (SELECT phone FROM users WHERE id = ?))
            AND status = 'completed'
            AND DATE(created_at) >= ?
        `, [userId, userId, firstDayOfMonth]);

    res.json({
      success: true,
      data: {
        level: currentLevel,
        dailyLimit: limits?.daily_limit || 1000000,
        monthlyLimit: limits?.monthly_limit || 10000000,
        singleTransactionLimit: limits?.single_transaction_limit || 500000,
        usedDaily: todayTotal?.total || 0,
        usedMonthly: monthTotal?.total || 0,
        remainingDaily: (limits?.daily_limit || 1000000) - (todayTotal?.total || 0),
        remainingMonthly: (limits?.monthly_limit || 10000000) - (monthTotal?.total || 0)
      }
    });

  } catch (error) {
    console.error('Erreur récupération limites KYC:', error);
    // Retourner des limites par défaut en cas d'erreur
    res.json({
      success: true,
      data: {
        level: 1,
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 500000,
        usedDaily: 0,
        usedMonthly: 0,
        remainingDaily: 1000000,
        remainingMonthly: 10000000
      }
    });
  }
});

// ============================================
// GET - STATUT KYC D'UN UTILISATEUR (VERSION CORRIGÉE COMPLÈTE)
// ============================================
// ============================================
// MIDDLEWARE DE VÉRIFICATION KYC
// ============================================

// ✅ Middleware pour vérifier que l'utilisateur est vérifié KYC
async function requireKYCVerified(req, res, next) {
  const userId = req.user.userId;

  try {
    // Vérifier si l'utilisateur est vérifié
    const user = await get(`
            SELECT is_verified, kyc_level, fullname 
            FROM users 
            WHERE id = ?
        `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    // Vérifier si l'utilisateur est vérifié KYC
    if (user.is_verified !== 1) {
      // Vérifier si une demande KYC existe
      const kycRequest = await get(`
                SELECT id, status, level 
                FROM kyc_requests 
                WHERE user_id = ? 
                ORDER BY id DESC LIMIT 1
            `, [userId]);

      let statusMessage = 'Vous devez être vérifié KYC pour créer une entreprise.';

      if (kycRequest) {
        if (kycRequest.status === 'pending') {
          statusMessage = 'Votre demande KYC est en attente de vérification. Veuillez attendre la validation.';
        } else if (kycRequest.status === 'rejected') {
          statusMessage = 'Votre demande KYC a été rejetée. Veuillez soumettre une nouvelle demande.';
        }
      } else {
        statusMessage = 'Vous devez soumettre une demande KYC avant de créer une entreprise.';
      }

      return res.status(403).json({
        success: false,
        error: statusMessage,
        code: 'KYC_REQUIRED',
        kyc_status: kycRequest?.status || 'none',
        kyc_level: user.kyc_level || 0
      });
    }

    // Vérifier le niveau KYC minimum (niveau 2 minimum pour créer une entreprise)
    const kycLevel = user.kyc_level || 0;
    if (kycLevel < 2) {
      return res.status(403).json({
        success: false,
        error: `Vous devez avoir un niveau KYC 2 minimum pour créer une entreprise. Votre niveau actuel: ${kycLevel}`,
        code: 'KYC_LEVEL_INSUFFICIENT',
        current_level: kycLevel,
        required_level: 2
      });
    }

    // Tout est bon, continuer
    req.kycData = {
      verified: true,
      level: kycLevel,
      fullname: user.fullname
    };

    next();

  } catch (error) {
    console.error('❌ Erreur vérification KYC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification KYC',
      code: 'KYC_ERROR'
    });
  }
}
// ✅ POST - Upgrade KYC niveau
app.post('/api/kyc/upgrade', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { level, cost } = req.body;

  console.log(`📝 Upgrade KYC: user ${userId} -> niveau ${level}`);

  try {
    // Vérifier si l'utilisateur est vérifié
    const user = await get(`
            SELECT is_verified, kyc_level, fullname 
            FROM users WHERE id = ?
        `, [userId]);

    if (!user || user.is_verified !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Vous devez être vérifié KYC pour passer au niveau supérieur'
      });
    }

    // Vérifier le niveau actuel
    const currentLevel = user.kyc_level || 0;
    if (currentLevel >= level) {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà ce niveau ou un niveau supérieur'
      });
    }

    // Vérifier le solde
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
    if (!wallet || wallet.balance < cost) {
      return res.status(400).json({
        success: false,
        error: 'Solde insuffisant pour passer au niveau supérieur'
      });
    }

    // Démarrer la transaction
    await run('BEGIN TRANSACTION');

    // Débiter le wallet
    await run(`
            UPDATE wallets 
            SET balance = balance - ? 
            WHERE user_id = ?
        `, [cost, userId]);

    // Mettre à jour le niveau KYC
    await run(`
            UPDATE users 
            SET kyc_level = ? 
            WHERE id = ?
        `, [level, userId]);

    // Mettre à jour la demande KYC
    await run(`
            UPDATE kyc_requests 
            SET level = ? 
            WHERE user_id = ? AND status = 'verified'
        `, [level, userId]);

    // Historique
    await run(`
            INSERT INTO kyc_history (
                user_id, action, status_from, status_to, 
                description, created_by, created_at
            ) VALUES (?, 'upgrade', ?, ?, 
                'Upgrade KYC niveau ' || ?, ?, CURRENT_TIMESTAMP)
        `, [userId, currentLevel, level, level, userId]);

    // Notification
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '⭐ Niveau KYC upgradé', 
                    'Félicitations ! Vous êtes passé au niveau KYC ' || ? || ' !',
                    'success', CURRENT_TIMESTAMP)
        `, [userId, level]);

    await run('COMMIT');

    console.log(`✅ Upgrade KYC réussi: user ${userId} -> niveau ${level}`);

    res.json({
      success: true,
      message: `Passé au niveau KYC ${level} avec succès`,
      new_level: level,
      cost: cost
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur upgrade KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ============================================
// SERVER.JS - ENDPOINTS KYC NIVEAU 2
// ============================================

// ✅ POST - Soumettre une demande KYC niveau 2
app.post('/api/kyc/submit-level-2', authenticateToken, upload.fields([
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'taxIdentification', maxCount: 1 }
]), async (req, res) => {
  const userId = req.user.userId;
  const {
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    businessType,
    registrationNumber,
    taxId,
    position,
    additionalInfo
  } = req.body;

  console.log(`📝 Soumission KYC Niveau 2 pour user ${userId}`);

  try {
    await createKycTables();

    // Vérifier si l'utilisateur a déjà un niveau 2
    const existing = await get(`
            SELECT id, status, level FROM kyc_requests 
            WHERE user_id = ? AND level = 2 AND status IN ('pending', 'verified')
        `, [userId]);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Vous avez déjà une demande KYC niveau 2 en cours (statut: ${existing.status})`,
        existing_status: existing.status
      });
    }

    // Vérifier si l'utilisateur a au moins le niveau 1
    const user = await get(`
            SELECT is_verified, kyc_level, fullname, phone 
            FROM users WHERE id = ?
        `, [userId]);

    if (user.kyc_level < 1) {
      return res.status(400).json({
        success: false,
        error: 'Vous devez d\'abord compléter le niveau 1 KYC avant de demander le niveau 2'
      });
    }

    // Créer la demande KYC niveau 2
    const result = await run(`
            INSERT INTO kyc_requests (
                user_id,
                fullname,
                status,
                level,
                address,
                phone_number,
                submitted_at,
                updated_at,
                notes
            ) VALUES (?, ?, 'pending', 2, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        `, [
      userId,
      user.fullname || 'Utilisateur',
      companyAddress || user.address || '',
      companyPhone || user.phone || '',
      JSON.stringify({
        companyName: companyName || '',
        companyAddress: companyAddress || '',
        companyPhone: companyPhone || '',
        companyEmail: companyEmail || '',
        businessType: businessType || '',
        registrationNumber: registrationNumber || '',
        taxId: taxId || '',
        position: position || '',
        additionalInfo: additionalInfo || '',
        requested_level: 2
      })
    ]);

    const kycId = result.lastID;

    // Enregistrer les documents
    const files = req.files || {};
    const documentTypes = {
      proofOfAddress: 'proof_of_address',
      businessLicense: 'business_license',
      taxIdentification: 'tax_identification'
    };

    for (const [field, type] of Object.entries(documentTypes)) {
      if (files[field] && files[field].length > 0) {
        const file = files[field][0];
        await run(`
                    INSERT INTO kyc_documents (
                        kyc_request_id,
                        document_type,
                        filename,
                        file_path,
                        file_size,
                        mime_type,
                        uploaded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [
          kycId,
          type,
          file.filename,
          file.path,
          file.size,
          file.mimetype
        ]);
      }
    }

    // Notifier les admins
    const admins = await query(`
            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        `);

    for (const admin of admins) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '📋 Nouvelle demande KYC Niveau 2', 
                        'Une nouvelle demande de vérification KYC niveau 2 a été soumise par ' || ?,
                        'info', CURRENT_TIMESTAMP)
            `, [admin.id, user.fullname]);
    }

    console.log(`✅ Demande KYC Niveau 2 créée avec ID: ${kycId}`);

    res.json({
      success: true,
      message: 'Demande KYC niveau 2 soumise avec succès',
      request_id: kycId,
      status: 'pending',
      level: 2
    });

  } catch (error) {
    console.error('❌ Erreur soumission KYC Niveau 2:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ PUT - Admin approuve une demande KYC niveau 2
app.put('/api/admin/kyc/verify-level-2/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;
  const adminId = req.user.userId;

  console.log(`🔍 Vérification KYC Niveau 2 ${id} - Action: ${action}`);

  try {
    // Récupérer la demande
    const request = await get(`
            SELECT * FROM kyc_requests WHERE id = ? AND level = 2
        `, [id]);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demande KYC niveau 2 non trouvée'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cette demande est déjà ${request.status}`
      });
    }

    if (action === 'approve') {
      // Approuver la demande niveau 2
      await run(`
                UPDATE kyc_requests 
                SET status = 'verified',
                    level = 2,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [adminId, id]);

      // Mettre à jour l'utilisateur au niveau 2
      await run(`
                UPDATE users 
                SET is_verified = 1,
                    kyc_level = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [request.user_id]);

      // Notification à l'utilisateur
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ KYC Niveau 2 Approuvé', 
                        'Félicitations ! Votre demande KYC niveau 2 a été approuvée. Vous pouvez maintenant créer des entreprises.',
                        'success', CURRENT_TIMESTAMP)
            `, [request.user_id]);

      // Historique
      await run(`
                INSERT INTO kyc_history (
                    user_id, action, status_from, status_to, description, created_by, created_at
                ) VALUES (?, 'approve_level_2', 'pending', 'verified', 'KYC Niveau 2 approuvé', ?, CURRENT_TIMESTAMP)
            `, [request.user_id, adminId]);

      res.json({
        success: true,
        message: 'Demande KYC niveau 2 approuvée avec succès',
        status: 'verified',
        level: 2
      });

    } else if (action === 'reject') {
      // Rejeter la demande
      await run(`
                UPDATE kyc_requests 
                SET status = 'rejected',
                    rejection_reason = ?,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [rejection_reason || 'Non conforme', adminId, id]);

      // Notification à l'utilisateur
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '❌ KYC Niveau 2 Rejeté', 
                        'Votre demande KYC niveau 2 a été rejetée. Raison: ' || ?,
                        'error', CURRENT_TIMESTAMP)
            `, [request.user_id, rejection_reason || 'Non conforme']);

      // Historique
      await run(`
                INSERT INTO kyc_history (
                    user_id, action, status_from, status_to, description, created_by, created_at
                ) VALUES (?, 'reject_level_2', 'pending', 'rejected', ?, ?, CURRENT_TIMESTAMP)
            `, [request.user_id, rejection_reason || 'Non conforme', adminId]);

      res.json({
        success: true,
        message: 'Demande KYC niveau 2 rejetée',
        status: 'rejected',
        rejection_reason: rejection_reason || 'Non conforme'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Action invalide. Utilisez "approve" ou "reject"'
      });
    }

  } catch (error) {
    console.error('❌ Erreur vérification KYC Niveau 2:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// POST - Créer une entreprise (sans middleware)
app.post('/api/investment/company', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {
        name,
        fullName,
        description,
        sector,
        location,
        website,
        email,
        phone,
        fundingGoal,
        sharesOffered,
        sharePrice,
        color,
        pitch,
        team,
        achievements
    } = req.body;
    
    console.log(`📝 Création entreprise par user ${userId}`);
    console.log('📝 Données:', req.body);
    
    try {
        await createInvestmentTables();
        
        // ✅ Vérification KYC directe dans le endpoint
        const user = await get(`
            SELECT is_verified, kyc_level, fullname 
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        console.log('🔍 Vérification KYC - Utilisateur:', {
            id: userId,
            is_verified: user?.is_verified,
            kyc_level: user?.kyc_level
        });
        
       
        
        if (!name || !description || !fundingGoal) {
            return res.status(400).json({
                success: false,
                error: 'Nom, description et objectif sont requis'
            });
        }
        
        // Vérifier si l'utilisateur a déjà une entreprise
        const existingCompany = await get(`
            SELECT id, name FROM investment_companies 
            WHERE created_by = ? AND is_active = 1
        `, [userId]);
        
        if (existingCompany) {
            return res.status(400).json({
                success: false,
                error: `Vous avez déjà une entreprise active: "${existingCompany.name}"`,
                existing_company: existingCompany
            });
        }
        
        // Insérer l'entreprise
        const result = await run(`
            INSERT INTO investment_companies (
                name, fullName, description, sector, location,
                website, email, phone, fundingGoal, sharesOffered,
                sharePrice, color, pitch, team, achievements,
                created_by, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            name, 
            fullName || name, 
            description, 
            sector || 'Autre', 
            location || '',
            website || '', 
            email || '', 
            phone || '',
            parseFloat(fundingGoal) || 10000,
            parseInt(sharesOffered) || 1000,
            parseFloat(sharePrice) || 1000,
            color || '#4F46E5',
            pitch || '', 
            team || '', 
            achievements || '',
            userId
        ]);
        
        console.log(`✅ Entreprise créée avec ID: ${result.lastID}`);
        
        // Notification
        await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '🏢 Entreprise créée', 
                    'Votre entreprise "' || ? || '" a été créée avec succès !',
                    'success', CURRENT_TIMESTAMP)
        `, [userId, name]);
        
        res.json({
            success: true,
            message: 'Entreprise créée avec succès',
            data: { 
                id: result.lastID, 
                name: name,
                fullName: fullName || name,
                kyc_level: user.kyc_level || 1
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur création entreprise:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'CREATE_ERROR'
        });
    }
});



// ============================================
// SERVER.JS - AJOUTER CET ENDPOINT
// ============================================

// ✅ GET - Statistiques d'investissement de l'utilisateur
app.get('/api/investment/statistics', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    try {
        // Créer les tables si elles n'existent pas
        await createInvestmentTables();
        
        // Total investi
        const totalInvested = await get(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM investments 
            WHERE user_id = ? AND status = 'active'
        `, [userId]);
        
        // Total des retours (simulé pour l'instant)
        const totalReturns = await get(`
            SELECT COALESCE(SUM(amount * 0.1), 0) as total
            FROM investments 
            WHERE user_id = ? AND status = 'active'
        `, [userId]);
        
        // Nombre d'investissements actifs
        const activeInvestments = await get(`
            SELECT COUNT(*) as count
            FROM investments 
            WHERE user_id = ? AND status = 'active'
        `, [userId]);
        
        // Calcul du ROI
        const invested = totalInvested?.total || 0;
        const returns = totalReturns?.total || 0;
        const roi = invested > 0 ? Math.round((returns / invested) * 100) : 0;
        
        res.json({
            totalInvested: invested,
            totalReturns: returns,
            activeInvestments: activeInvestments?.count || 0,
            roi: roi
        });
        
    } catch (error) {
        console.error('❌ Erreur statistiques:', error);
        res.json({
            totalInvested: 0,
            totalReturns: 0,
            activeInvestments: 0,
            roi: 0
        });
    }
});
//a testee
// ✅ 1. GET - Statut KYC de l'utilisateur
app.get('/api/kyc/status', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  console.log(`📋 Récupération statut KYC pour user ${userId}`);

  try {
    // Vérifier si la table existe
    await createKycTables();

    // Récupérer la dernière demande KYC
    const kyc = await get(`
            SELECT 
                kr.*,
                u.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.verified_by = u.id
            WHERE kr.user_id = ?
            ORDER BY kr.id DESC
            LIMIT 1
        `, [userId]);

    // Récupérer les infos de l'utilisateur
    const user = await get(`
            SELECT is_verified, kyc_level, fullname, phone 
            FROM users 
            WHERE id = ?
        `, [userId]);

    if (!kyc) {
      return res.json({
        status: 'none',
        has_kyc: false,
        level: 0,
        is_verified: false,
        fullname: user?.fullname || '',
        phone: user?.phone || '',
        message: 'Aucune demande KYC trouvée'
      });
    }

    // Récupérer les documents
    const documents = await query(`
            SELECT id, document_type, filename, uploaded_at
            FROM kyc_documents 
            WHERE kyc_request_id = ?
            ORDER BY uploaded_at DESC
        `, [kyc.id]);

    const response = {
      id: kyc.id,
      user_id: kyc.user_id,
      fullname: kyc.fullname || user?.fullname || '',
      phone: user?.phone || '',
      status: kyc.status,
      level: kyc.level || 1,
      is_verified: user?.is_verified === 1,
      has_kyc: true,
      submitted_at: kyc.submitted_at,
      verified_at: kyc.verified_at,
      verified_by: kyc.verified_by,
      verified_by_name: kyc.verified_by_name,
      rejection_reason: kyc.rejection_reason,
      message: getStatusMessage(kyc.status),
      documents: documents || [],
      userData: {
        fullname: kyc.fullname || user?.fullname || '',
        address: kyc.address || '',
        phone: kyc.phone_number || user?.phone || '',
        birth_date: kyc.birth_date,
        birth_place: kyc.birth_place,
        nationality: kyc.nationality,
        id_type: kyc.id_type,
        id_number: kyc.id_number
      }
    };

    console.log(`✅ Statut KYC récupéré: ${kyc.status}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur récupération KYC:', error);
    res.status(500).json({
      status: 'error',
      has_kyc: false,
      level: 0,
      is_verified: false,
      message: 'Erreur lors de la récupération du statut KYC',
      error: error.message
    });
  }
});


// ✅ GET - Investissements de l'utilisateur
app.get('/api/investment/my-investments', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Vérifier si la table existe
    const tableCheck = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='investments'
        `);

    if (!tableCheck) {
      return res.json({
        success: true,
        data: [],
        message: 'Aucun investissement trouvé'
      });
    }

    const investments = await query(`
            SELECT 
                i.*,
                c.name as company_name,
                c.sector,
                c.id as company_id
            FROM investments i
            LEFT JOIN investment_companies c ON i.company_id = c.id
            WHERE i.user_id = ?
            ORDER BY i.created_at DESC
        `, [userId]);

    res.json({
      success: true,
      data: investments || []
    });

  } catch (error) {
    console.error('❌ Erreur récupération investissements:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// ✅ GET - Entreprise de l'utilisateur
app.get('/api/investment/my-company', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Vérifier si la table existe
    const tableCheck = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='investment_companies'
        `);

    if (!tableCheck) {
      return res.json({
        success: true,
        data: null,
        message: 'Table des entreprises non disponible'
      });
    }

    const company = await get(`
            SELECT 
                c.*,
                u.fullname as owner_name,
                u.phone as owner_phone
            FROM investment_companies c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.created_by = ? AND c.is_active = 1
            ORDER BY c.id DESC
            LIMIT 1
        `, [userId]);

    if (!company) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucune entreprise trouvée'
      });
    }

    // Récupérer le nombre d'investisseurs
    const investorsCount = await get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM investments 
            WHERE company_id = ?
        `, [company.id]);

    company.investors_count = investorsCount?.count || 0;

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Erreur récupération entreprise:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: null
    });
  }
});

// ✅ GET - Nombre d'investisseurs
app.get('/api/investment/investors-count', authenticateToken, async (req, res) => {
  try {
    // Vérifier si la table existe
    const tableCheck = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='investments'
        `);

    if (!tableCheck) {
      return res.json({
        success: true,
        count: 0,
        message: 'Aucun investisseur'
      });
    }

    const result = await get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM investments 
            WHERE status = 'active'
        `);

    res.json({
      success: true,
      count: result?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération investisseurs:', error);
    res.json({
      success: true,
      count: 0,
      error: error.message
    });
  }
});

//// ============================================
// ROUTES KYC - VERSION SIMPLIFIÉE
// ============================================
app.post('/api/kyc/submit', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const body = req.body;

  try {
    // Récupérer l'utilisateur
    const user = await get('SELECT fullname, phone FROM users WHERE id = ?', [userId]);

    if (!user || !user.fullname) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez compléter votre profil avec votre nom complet'
      });
    }

    // Vérifier si une demande existe déjà
    const existing = await get(`
            SELECT * FROM kyc_requests 
            WHERE user_id = ? AND status IN ('pending', 'verified')
        `, [userId]);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Vous avez déjà une demande en cours (statut: ${existing.status})`,
        existing_status: existing.status
      });
    }

    // Créer la demande avec statut 'pending'
    const result = await run(`
            INSERT INTO kyc_requests (
                user_id, fullname, birth_date, birth_place, nationality,
                id_type, id_number, id_issue_date, id_expiry_date,
                address, occupation, phone_number, 
                status, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [
      userId,
      user.fullname,
      body.birth_date || null,
      body.birth_place || null,
      body.nationality || 'Tchadienne',
      body.id_type || null,
      body.id_number || null,
      body.id_issue_date || null,
      body.id_expiry_date || null,
      body.address || null,
      body.occupation || null,
      body.phone_number || user.phone || null
    ]);

    res.json({
      success: true,
      message: 'Demande KYC soumise avec succès',
      request_id: result.lastID,
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Récupérer l'historique KYC
app.get('/api/kyc/history', authenticateToken, async (req, res) => {
  try {
    const history = await query(`
            SELECT 
                kr.id,
                kr.submitted_at as date,
                kr.status,
                kr.level,
                kr.rejection_reason,
                kr.verified_at,
                CASE 
                    WHEN kr.status = 'pending' THEN 'En cours de vérification'
                    WHEN kr.status = 'verified' THEN 'Vérifié'
                    WHEN kr.status = 'rejected' THEN 'Rejeté'
                    WHEN kr.status = 'cancelled' THEN 'Annulé'
                    ELSE 'Non soumis'
                END as status_text,
                CASE 
                    WHEN kr.status = 'pending' THEN 'orange'
                    WHEN kr.status = 'verified' THEN 'green'
                    WHEN kr.status = 'rejected' THEN 'red'
                    WHEN kr.status = 'cancelled' THEN 'gray'
                    ELSE 'gray'
                END as status_color
            FROM kyc_requests kr
            WHERE kr.user_id = ?
            ORDER BY kr.submitted_at DESC
        `, [req.user.userId]);

    res.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Erreur historique KYC:', error);
    res.json({
      success: true,
      history: []
    });
  }
});

// Récupérer les limites KYC
app.get('/api/kyc/limits', authenticateToken, async (req, res) => {
  try {
    // Récupérer le niveau KYC de l'utilisateur
    const userKyc = await get(`
            SELECT level FROM kyc_requests 
            WHERE user_id = ? AND status = 'verified'
            ORDER BY level DESC LIMIT 1
        `, [req.user.userId]);

    const level = userKyc?.level || 1;

    // Récupérer les limites depuis la table kyc_limits
    let limits = await get(`
            SELECT * FROM kyc_limits WHERE level = ?
        `, [level]);

    // Si pas de limites dans la table, utiliser des valeurs par défaut
    if (!limits) {
      limits = {
        daily_transaction_limit: level === 1 ? 100000 : 500000,
        monthly_transaction_limit: level === 1 ? 500000 : 2000000,
        single_transaction_limit: level === 1 ? 50000 : 200000,
        withdrawal_limit: level === 1 ? 100000 : 500000
      };
    }

    res.json({
      success: true,
      data: {
        level: level,
        dailyLimit: limits.daily_transaction_limit || 100000,
        monthlyLimit: limits.monthly_transaction_limit || 500000,
        singleTransactionLimit: limits.single_transaction_limit || 50000,
        withdrawalLimit: limits.withdrawal_limit || 100000
      }
    });

  } catch (error) {
    console.error('Erreur limites KYC:', error);
    res.json({
      success: true,
      data: {
        level: 1,
        dailyLimit: 100000,
        monthlyLimit: 500000,
        singleTransactionLimit: 50000,
        withdrawalLimit: 100000
      }
    });
  }
});

// GET - Récupérer toutes les demandes KYC
app.get('/api/admin/kyc/requests', authenticateToken, requireAdmin, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  console.log('📋 GET /api/admin/kyc/requests - Status:', status);

  try {
    await createKycTables();

    let sql = `
            SELECT 
                kr.*,
                u.fullname as user_fullname,
                u.phone as user_phone,
                u.email as user_email,
                u.is_verified,
                vu.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.user_id = u.id
            LEFT JOIN users vu ON kr.verified_by = vu.id
            WHERE 1=1
        `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND kr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY kr.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const requests = await query(sql, params);

    // Compter le total
    let countSql = 'SELECT COUNT(*) as total FROM kyc_requests WHERE 1=1';
    const countParams = [];

    if (status && status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const total = await get(countSql, countParams);

    // Pour chaque demande, récupérer les documents
    for (const request of requests || []) {
      const docs = await query(`
                SELECT * FROM kyc_documents 
                WHERE kyc_request_id = ?
                ORDER BY uploaded_at DESC
            `, [request.id]);
      request.documents = docs || [];
    }

    console.log(`✅ ${requests?.length || 0} demandes trouvées`);

    res.json({
      success: true,
      requests: requests || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération demandes KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST - Approuver une demande KYC
app.post('/api/admin/kyc/verify/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, level, rejection_reason } = req.body;

  console.log(`🔍 Vérification KYC ${id} - Action: ${action}`);

  try {
    const request = await get('SELECT * FROM kyc_requests WHERE id = ?', [id]);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvée'
      });
    }

    if (action === 'approve') {
      // Approuver la demande
      await run(`
                UPDATE kyc_requests 
                SET status = 'verified', 
                    level = ?,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [level || 1, req.user.userId, id]);

      // Mettre à jour l'utilisateur
      await run(`
                UPDATE users 
                SET is_verified = 1,
                    kyc_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [level || 1, request.user_id]);

      // Notification à l'utilisateur
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Compte vérifié', 
                        'Félicitations ! Votre compte a été vérifié avec succès. Niveau KYC: ' || ?,
                        'success', CURRENT_TIMESTAMP)
            `, [request.user_id, level || 1]);

    } else if (action === 'reject') {
      // Rejeter la demande
      await run(`
                UPDATE kyc_requests 
                SET status = 'rejected', 
                    rejection_reason = ?,
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [rejection_reason || 'Non conforme', req.user.userId, id]);

      // Notification à l'utilisateur
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '❌ Vérification échouée', 
                        'Votre demande de vérification a été rejetée. Raison: ' || ?,
                        'error', CURRENT_TIMESTAMP)
            `, [request.user_id, rejection_reason || 'Non conforme']);
    }

    res.json({
      success: true,
      message: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin - Statistiques KYC
app.get('/api/admin/kyc/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM kyc_requests
        `);

    res.json({
      success: true,
      stats: {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        verified: stats?.verified || 0,
        rejected: stats?.rejected || 0,
        cancelled: stats?.cancelled || 0
      }
    });

  } catch (error) {
    console.error('Erreur stats KYC:', error);
    res.json({
      success: true,
      stats: { total: 0, pending: 0, verified: 0, rejected: 0, cancelled: 0 }
    });
  }
});

// ROUTES KYC - HISTORIQUE
// ============================================

// Récupérer l'historique KYC de l'utilisateur
app.get('/api/kyc/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer toutes les demandes KYC de l'utilisateur
    const history = await query(`
            SELECT 
                id,
                user_id,
                level,
                status,
                verified_at,
                rejection_reason,
                created_at,
                updated_at
            FROM user_kyc 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

    if (!history || history.length === 0) {
      return res.json({
        success: true,
        history: [],
        message: 'Aucun historique KYC trouvé'
      });
    }

    // Formater l'historique
    const formattedHistory = history.map(record => ({
      id: record.id,
      date: record.created_at,
      status: record.status,
      level: record.level,
      rejectionReason: record.rejection_reason,
      verifiedAt: record.verified_at,
      statusText: getKYCStatusText(record.status),
      statusColor: getKYCStatusColor(record.status)
    }));

    res.json({
      success: true,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Erreur récupération historique KYC:', error);
    // Retourner un historique vide en cas d'erreur
    res.json({
      success: true,
      history: []
    });
  }
});

// Fonction utilitaire pour le texte du statut
function getKYCStatusText(status) {
  const statusMap = {
    'pending': 'En cours de vérification',
    'verified': 'Vérifié',
    'rejected': 'Rejeté',
    'not_submitted': 'Non soumis',
    'expired': 'Expiré'
  };
  return statusMap[status] || 'Inconnu';
}

// Fonction utilitaire pour la couleur du statut
function getKYCStatusColor(status) {
  const colorMap = {
    'pending': 'orange',
    'verified': 'green',
    'rejected': 'red',
    'not_submitted': 'gray',
    'expired': 'gray'
  };
  return colorMap[status] || 'gray';
}

// Récupérer les documents KYC de l'utilisateur
app.get('/api/kyc/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const documents = await query(`
            SELECT 
                id,
                document_type,
                file_name,
                uploaded_at,
                status
            FROM kyc_documents 
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        `, [userId]);

    res.json({
      success: true,
      documents: documents || []
    });

  } catch (error) {
    console.error('Erreur récupération documents KYC:', error);
    res.json({
      success: true,
      documents: []
    });
  }
});

// Soumettre une demande de mise à niveau KYC
app.post('/api/kyc/upgrade', authenticateToken, async (req, res) => {
  const { requestedLevel, documents } = req.body;

  try {
    const userId = req.user.userId;

    // Vérifier le niveau actuel
    const currentKyc = await get(`
            SELECT level, status FROM user_kyc WHERE user_id = ?
        `, [userId]);

    if (!currentKyc || currentKyc.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Vous devez d\'abord compléter le niveau 1'
      });
    }

    if (requestedLevel <= currentKyc.level) {
      return res.status(400).json({
        success: false,
        error: 'Le niveau demandé doit être supérieur à votre niveau actuel'
      });
    }

    // Créer une nouvelle demande de mise à niveau
    await run(`
            INSERT INTO kyc_upgrade_requests (
                user_id, current_level, requested_level, documents, status, created_at
            ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [userId, currentKyc.level, requestedLevel, JSON.stringify(documents || [])]);

    // Notification à l'admin
    const admin = await get('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admin) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '📊 Demande de mise à niveau KYC', 
                        ?, 'alert', CURRENT_TIMESTAMP)
            `, [admin.id, `Un utilisateur demande le niveau ${requestedLevel} KYC`]);
    }

    res.json({
      success: true,
      message: 'Demande de mise à niveau soumise avec succès'
    });

  } catch (error) {
    console.error('Erreur demande mise à niveau KYC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la demande'
    });
  }
});




//=========================================
//
//=======================================
// ============================================
// CORRECTION DE LA TABLE KYC_HISTORY
// ============================================

async function fixKycHistoryTable() {
  try {
    // Vérifier les colonnes existantes
    const columns = await query('PRAGMA table_info(kyc_history)');
    console.log('📋 Colonnes actuelles de kyc_history:', columns.map(c => c.name));

    // Supprimer l'ancienne table si elle a une mauvaise structure
    await run('DROP TABLE IF EXISTS kyc_history');

    // Recréer la table avec la bonne structure
    await run(`
            CREATE TABLE kyc_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kyc_request_id INTEGER NOT NULL,
                user_id INTEGER,
                action TEXT NOT NULL,
                status_from TEXT,
                status_to TEXT,
                description TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    console.log('✅ Table kyc_history recréée avec succès');

  } catch (error) {
    console.error('❌ Erreur recréation kyc_history:', error);
  }
}



//==============================================
//
//==============================================

// ============================================
// BILL PAYMENT ENDPOINTS
// ============================================

// Rechercher les infos d'un compteur
app.post('/api/bill-payments/search-meter', authenticateToken, async (req, res) => {
  const { meter_number, company_id } = req.body;

  try {
    // Simuler la recherche (à connecter à votre base de données)
    const meterInfo = {
      customer_name: "Client Test",
      address: "N'Djaména, Tchad",
      outstanding_amount: 25000,
      period: "Janvier 2026"
    };

    res.json({ success: true, data: meterInfo });
  } catch (error) {
    res.status(404).json({ error: 'Compteur non trouvé' });
  }
});

// Paiement de facture
app.post('/api/bill-payment', authenticateToken, async (req, res) => {
  const {
    company_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    meter_number,
    amount,
    period,
    invoice_number
  } = req.body;

  try {
    // Logique de paiement...
    const receipt = {
      receipt_number: `BILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      company_name: company_id === 1 ? 'STE' : 'ZIZ',
      service_type: company_id === 1 ? 'water' : 'electricity',
      customer_name,
      customer_phone,
      customer_address,
      meter_number,
      amount,
      fee: Math.floor(amount * 0.015),
      payment_date: new Date().toISOString()
    };

    res.json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Historique des paiements
app.get('/api/bill-payments/history', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, payments: [] });
  } catch (error) {
    res.json({ success: true, payments: [] });
  }
});


//=============================================
// bill payment endpoints
//=============================================
// ============================================
// ROUTES POUR LES ENTREPRISES DE SERVICES (EAU/ÉLECTRICITÉ)
// ============================================

// Créer la table des entreprises de services
async function createServiceCompaniesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS service_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('water', 'electricity')),
                fullName TEXT,
                description TEXT,
                logo TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                address TEXT,
                color TEXT,
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Vérifier si des données existent
    const count = await get('SELECT COUNT(*) as count FROM service_companies');
    if (count && count.count === 0) {
      // Insérer STE et ZIZ par défaut
      await run(`
                INSERT INTO service_companies (name, type, fullName, description, logo, color, is_active)
                VALUES 
                    ('STE', 'water', 'Société Tchadienne des Eaux', 'Distribution d\'eau potable', '💧', 'blue', 1),
                    ('ZIZ', 'electricity', 'Électricité du Tchad', 'Distribution d\'électricité', '⚡', 'yellow', 1)
            `);
      console.log('✅ Entreprises par défaut créées (STE et ZIZ)');
    }

    console.log('✅ Table service_companies créée/vérifiée');
  } catch (error) {
    console.error('Erreur création table:', error);
  }
}

// ✅ Version corrigée
app.get('/api/service-companies', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Récupération des entreprises...');

    const query = `
            SELECT 
                sc.id,
                sc.name,
                sc.type,
                sc.fullName,
                sc.description,
                sc.logo,
                sc.contact_phone,
                sc.contact_email,
                sc.address,
                sc.color,
                sc.is_active,
                sc.created_by as agent_id,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM service_companies sc
            LEFT JOIN users u ON sc.created_by = u.id  // ✅ CORRIGÉ: created_by
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE sc.is_active = 1
            ORDER BY sc.name ASC
        `;

    console.log('📝 Exécution requête SQL...');
    const companies = await db.all(query);
    console.log(`✅ ${companies.length} entreprises récupérées`);

    res.json(companies);

  } catch (error) {
    console.error('❌ ERREUR DÉTAILLÉE:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);

    res.status(500).json({
      error: 'Erreur lors de la récupération des entreprises',
      details: error.message,
      code: error.code
    });
  }
});
// PUT - Mettre à jour une entreprise (admin uniquement)
app.put('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, type, fullName, description, logo, contact_phone, contact_email, address, color, is_active } = req.body;

  try {
    await run(`
            UPDATE service_companies 
            SET name = ?, type = ?, fullName = ?, description = ?, logo = ?,
                contact_phone = ?, contact_email = ?, address = ?, color = ?,
                is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, type, fullName, description, logo, contact_phone, contact_email, address, color, is_active ? 1 : 0, id]);

    res.json({ success: true, message: 'Entreprise mise à jour' });

  } catch (error) {
    console.error('Erreur mise à jour:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer une entreprise (soft delete, admin uniquement)
app.delete('/api/admin/service-companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await run('UPDATE service_companies SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Entreprise désactivée' });

  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES POUR LES PAIEMENTS DE FACTURES
// ============================================

/// ============================================
// ROUTES POUR LES ENTREPRISES DE SERVICES (STE, ZIZ, etc.)
// ============================================

// 1. Créer la table des entreprises de services
async function createServiceCompaniesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS service_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('water', 'electricity')),
                fullName TEXT,
                description TEXT,
                logo TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                address TEXT,
                color TEXT,
                user_id INTEGER,  -- L'utilisateur associé (agent)
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Vérifier si des données existent
    const count = await get('SELECT COUNT(*) as count FROM service_companies');
    if (count && count.count === 0) {
      // Créer d'abord les utilisateurs pour STE et ZIZ
      const stePassword = await bcrypt.hash('ste1234', 10);
      const stePrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedSteKey = await bcrypt.hash(stePrivateKey, 10);

      const steUser = await run(`
                INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
                VALUES ('62787301', 'STE - Société des Eaux', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
            `, [stePassword, hashedSteKey]);

      const zizPassword = await bcrypt.hash('ziz1234', 10);
      const zizPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedZizKey = await bcrypt.hash(zizPrivateKey, 10);

      const zizUser = await run(`
                INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
                VALUES ('62787302', 'ZIZ - Électricité du Tchad', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
            `, [zizPassword, hashedZizKey]);

      // Créer les wallets pour ces agents
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [steUser.lastID]);
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [zizUser.lastID]);

      // Insérer STE et ZIZ
      await run(`
                INSERT INTO service_companies (name, type, fullName, description, logo, color, user_id, is_active)
                VALUES 
                    ('STE', 'water', 'Société Tchadienne des Eaux', 'Distribution d\'eau potable', '💧', 'blue', ?, 1),
                    ('ZIZ', 'electricity', 'Électricité du Tchad', 'Distribution d\'électricité', '⚡', 'yellow', ?, 1)
            `, [steUser.lastID, zizUser.lastID]);

      console.log('✅ Entreprises STE et ZIZ créées avec leurs comptes agents');
    }

    console.log('✅ Table service_companies prête');
  } catch (error) {
    console.error('Erreur création table:', error);
  }
}

// 3. Rechercher un compteur
app.post('/api/bill-payments/search-meter', authenticateToken, async (req, res) => {
  const { meter_number, company_id } = req.body;

  console.log('🔍 Recherche compteur:', meter_number, 'Company:', company_id);

  try {
    // Simulation - À connecter à la vraie base de données de STE/ZIZ
    const mockMeterInfo = {
      customer_name: "Client Test",
      address: "N'Djaména, Tchad",
      outstanding_amount: 25000,
      period: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    };

    res.json({ success: true, data: mockMeterInfo });

  } catch (error) {
    res.status(404).json({ error: 'Compteur non trouvé' });
  }
});

// 4. Paiement de facture
app.post('/api/bill-payment', authenticateToken, async (req, res) => {
  const {
    company_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    meter_number,
    amount,
    period,
    invoice_number,
    account_number
  } = req.body;

  console.log('💰 Paiement facture:', { company_id, customer_name, amount });

  try {
    // Récupérer l'entreprise et son utilisateur associé
    const company = await get(`
            SELECT sc.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM service_companies sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.id = ? AND sc.is_active = 1
        `, [company_id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Vérifier le solde
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.015);
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receipt_number = `BILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Créer la table des paiements si elle n'existe pas
    await run(`
            CREATE TABLE IF NOT EXISTS bill_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE,
                payer_id INTEGER,
                company_id INTEGER,
                company_name TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                customer_address TEXT,
                meter_number TEXT,
                account_number TEXT,
                amount INTEGER,
                fee INTEGER,
                total_amount INTEGER,
                period TEXT,
                invoice_number TEXT,
                service_type TEXT,
                status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES service_companies(id)
            )
        `);

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer l'entreprise (son compte agent)
      if (company.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, company.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions 
                (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                VALUES (?, ?, ?, ?, ?, ?, 'bill_payment', 'completed', ?)
            `, [transactionRef, payer.phone, company.agent_phone, amount, fee, amount, `Paiement facture ${company.name} - ${receipt_number}`]);

      // 5. Enregistrer le paiement de facture
      await run(`
                INSERT INTO bill_payments (
                    receipt_number, payer_id, company_id, company_name, customer_name,
                    customer_phone, customer_email, customer_address, meter_number,
                    account_number, amount, fee, total_amount, period, invoice_number,
                    service_type, transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receipt_number, payer.id, company.id, company.name, customer_name,
        customer_phone, customer_email || '', customer_address || '', meter_number,
        account_number || '', amount, fee, totalAmount, period || '', invoice_number || '',
        company.type, transactionRef
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    ?, 'bill_payment', CURRENT_TIMESTAMP)
        `, [payer.id, `Vous avez payé ${amount.toLocaleString()} FCFA pour votre facture ${company.name}`]);

    // Notification pour l'entreprise (via WebSocket si connectée)
    if (company.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement reçu', 
                        ?, 'bill_received', ?, CURRENT_TIMESTAMP)
            `, [company.agent_user_id, `${payer.fullname} a payé ${amount.toLocaleString()} FCFA`, JSON.stringify({ payer: payer.fullname, amount, receipt: receipt_number })]);

      // Envoyer via WebSocket
      if (io) {
        io.to(`user_${company.agent_user_id}`).emit('bill-payment', {
          receipt: receipt_number,
          customer_name: customer_name,
          amount: amount,
          company: company.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      receipt: {
        receipt_number: receipt_number,
        company_name: company.name,
        service_type: company.type,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_address: customer_address,
        meter_number: meter_number,
        amount: amount,
        fee: fee,
        period: period || new Date().toLocaleDateString(),
        invoice_number: invoice_number,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Historique des paiements de l'utilisateur
app.get('/api/bill-payments/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT * FROM bill_payments 
            WHERE payer_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM bill_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json({ success: true, payments: [] });
  }
});

// 6. GET - Paiements reçus par une entreprise (pour l'agent)
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est associé à une entreprise
    const company = await get(`
            SELECT id, name FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({ payments: [], total: 0 });
    }

    const payments = await query(`
            SELECT bp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM bill_payments bp
            JOIN users u ON bp.payer_id = u.id
            WHERE bp.company_id = ?
            ORDER BY bp.created_at DESC
            LIMIT 100
        `, [company.id]);

    const total = await get('SELECT SUM(amount) as total_amount, COUNT(*) as count FROM bill_payments WHERE company_id = ?', [company.id]);

    res.json({
      payments: payments || [],
      total_amount: total?.total_amount || 0,
      total_count: total?.count || 0
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ payments: [], total_amount: 0, total_count: 0 });
  }
});

// Appeler la création des tables au démarrage
// createServiceCompaniesTable();


// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - PAIEMENTS REÇUS
// ============================================


// GET - Détails d'un paiement spécifique
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques mensuelles de l'entreprise
app.get('/api/company/stats/monthly', authenticateToken, async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  try {
    const company = await get(`
            SELECT sc.id FROM service_companies sc
            JOIN users u ON sc.user_id = u.id
            WHERE u.id = ?
        `, [req.user.userId]);

    if (!company) {
      return res.json({ stats: [] });
    }

    const monthlyStats = await query(`
            SELECT 
                strftime('%m', created_at) as month,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM bill_payments
            WHERE company_id = ? 
                AND status = 'completed'
                AND strftime('%Y', created_at) = ?
            GROUP BY strftime('%m', created_at)
            ORDER BY month ASC
        `, [company.id, year]);

    res.json({ stats: monthlyStats || [] });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ stats: [] });
  }
});

//=============================================
//  PDF IMPORT ENDPOINT
//=============================================

// GET - Récupérer les communes (agents)
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT u.id, u.phone, u.fullname as name, u.commune_address as address
            FROM users u
            WHERE u.role = 'commune' AND u.is_active = 1
            ORDER BY u.fullname
        `);
    res.json(communes || []);
  } catch (error) {
    res.json([]);
  }
});

// GET - Solde du wallet
app.get('/api/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);
    res.json({ balance: wallet?.balance || 0 });
  } catch (error) {
    res.json({ balance: 0 });
  }
});




//=============================================
//
//  FIN DES ENDPOINTS
// ============================================
// ROUTES POUR LES SERVICES D'IMPÔTS (COMMUNES)
// ============================================

// 1. Créer la table des services d'impôts
async function createTaxOfficesTable() {
  try {
    await run(`
            CREATE TABLE IF NOT EXISTS tax_offices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                fullName TEXT,
                description TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                user_id INTEGER,  -- L'utilisateur associé (agent)
                is_active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

    // Table des paiements de taxes
    await run(`
            CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE NOT NULL,
                payer_id INTEGER NOT NULL,
                office_id INTEGER NOT NULL,
                office_name TEXT NOT NULL,
                taxpayer_name TEXT NOT NULL,
                taxpayer_phone TEXT NOT NULL,
                taxpayer_email TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT NOT NULL,
                tax_period TEXT,
                amount INTEGER NOT NULL,
                fee INTEGER DEFAULT 0,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (office_id) REFERENCES tax_offices(id)
            )
        `);

    // Vérifier si des données existent
    const count = await get('SELECT COUNT(*) as count FROM tax_offices');
    if (count && count.count === 0) {
      // Créer les communes par défaut avec des comptes agents
      await createDefaultTaxOffices();
    }

    console.log('✅ Tables tax_offices et tax_payments créées/vérifiées');
  } catch (error) {
    console.error('Erreur création tables:', error);
  }
}

async function createDefaultTaxOffices() {
  try {
    // Créer Commune de N'Djaména
    const ndjamenaPassword = await bcrypt.hash('ndjamena1234', 10);
    const ndjamenaPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedNdjamenaKey = await bcrypt.hash(ndjamenaPrivateKey, 10);

    const ndjamenaUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787303', 'Commune de N\'Djaména', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [ndjamenaPassword, hashedNdjamenaKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [ndjamenaUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de N\'Djaména', 'Mairie de N\'Djaména', 'Service des impôts et taxes de la commune de N\'Djaména', '62 78 73 03', 'contact@ndjamena.td', 'N\'Djaména, Tchad', ?, 1)
        `, [ndjamenaUser.lastID]);

    // Créer Commune de Moundou
    const moundouPassword = await bcrypt.hash('moundou1234', 10);
    const moundouPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedMoundouKey = await bcrypt.hash(moundouPrivateKey, 10);

    const moundouUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787304', 'Commune de Moundou', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [moundouPassword, hashedMoundouKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [moundouUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de Moundou', 'Mairie de Moundou', 'Service des impôts et taxes de la commune de Moundou', '62 78 73 04', 'contact@moundou.td', 'Moundou, Tchad', ?, 1)
        `, [moundouUser.lastID]);

    // Créer Commune de Sarh
    const sarhPassword = await bcrypt.hash('sarh1234', 10);
    const sarhPrivateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedSarhKey = await bcrypt.hash(sarhPrivateKey, 10);

    const sarhUser = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES ('62787305', 'Commune de Sarh', ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [sarhPassword, hashedSarhKey]);

    await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [sarhUser.lastID]);

    await run(`
            INSERT INTO tax_offices (name, fullName, description, phone, email, address, user_id, is_active)
            VALUES ('Commune de Sarh', 'Mairie de Sarh', 'Service des impôts et taxes de la commune de Sarh', '62 78 73 05', 'contact@sarh.td', 'Sarh, Tchad', ?, 1)
        `, [sarhUser.lastID]);

    console.log('✅ Services d\'impôts par défaut créés (N\'Djaména, Moundou, Sarh)');

  } catch (error) {
    console.error('Erreur création services d\'impôts par défaut:', error);
  }
}

// 2. GET - Récupérer tous les services d'impôts
app.get('/api/tax-offices', async (req, res) => {
  console.log('📋 GET /api/tax-offices');

  try {
    await createTaxOfficesTable();

    const offices = await query(`
            SELECT 
                toff.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as agent_balance
            FROM tax_offices toff
            LEFT JOIN users u ON toff.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE toff.is_active = 1
            ORDER BY toff.name ASC
        `);

    console.log(`✅ ${offices.length} services d'impôts trouvés`);
    res.json(offices || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    // Retourner des données par défaut
    res.json([
      { id: 1, name: "Commune de N'Djaména", phone: "62 78 73 03", address: "N'Djaména", fullName: "Mairie de N'Djaména" },
      { id: 2, name: "Commune de Moundou", phone: "62 78 73 04", address: "Moundou", fullName: "Mairie de Moundou" },
      { id: 3, name: "Commune de Sarh", phone: "62 78 73 05", address: "Sarh", fullName: "Mairie de Sarh" }
    ]);
  }
});

// 3. POST - Paiement d'une taxe
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    office_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_email,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('💰 Paiement taxe reçu:', { office_id, taxpayer_name, amount, tax_type });

  try {
    // Récupérer le service d'impôts
    const office = await get(`
            SELECT toff.*, u.id as agent_user_id, u.phone as agent_phone, u.fullname as agent_name
            FROM tax_offices toff
            LEFT JOIN users u ON toff.user_id = u.id
            WHERE toff.id = ? AND toff.is_active = 1
        `, [office_id]);

    if (!office) {
      return res.status(404).json({ error: 'Service d\'impôts non trouvé' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);

    // Vérifier le solde
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);

    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receipt_number = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // 2. Créditer le service d'impôts
      if (office.agent_user_id) {
        await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, office.agent_user_id]);
      }

      // 3. Créditer les frais au wallet admin
      const adminWallet = await get(`
                SELECT w.id FROM wallets w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.role = 'admin' LIMIT 1
            `);
      if (adminWallet) {
        await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
      }

      // 4. Enregistrer la transaction principale
      await run(`
                INSERT INTO transactions 
                (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?)
            `, [transactionRef, payer.phone, office.agent_phone, amount, fee, amount, `Paiement ${tax_type} - ${receipt_number}`]);

      // 5. Enregistrer le paiement de taxe
      await run(`
                INSERT INTO tax_payments (
                    receipt_number, payer_id, office_id, office_name, taxpayer_name,
                    taxpayer_phone, taxpayer_email, taxpayer_address, business_number,
                    property_address, tax_type, tax_period, amount, fee, total_amount,
                    transaction_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        receipt_number, payer.id, office.id, office.name, taxpayer_name,
        taxpayer_phone, taxpayer_email || '', taxpayer_address || '', business_number || '',
        property_address || '', tax_type, tax_period || '', amount, fee, totalAmount, transactionRef
      ]);

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '✅ Paiement effectué', 
                    'Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type}', 
                    'tax_payment', CURRENT_TIMESTAMP)
        `, [payer.id]);

    // Notification pour le service d'impôts
    if (office.agent_user_id) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
                VALUES (?, '💰 Paiement de taxe reçu', 
                        '${payer.fullname} a payé ${amount.toLocaleString()} FCFA pour ${tax_type}', 
                        'tax_received', '${JSON.stringify({ payer: payer.fullname, amount, receipt: receipt_number })}', 
                        CURRENT_TIMESTAMP)
            `, [office.agent_user_id]);

      // Envoyer via WebSocket
      if (io) {
        io.to(`user_${office.agent_user_id}`).emit('tax-payment', {
          receipt: receipt_number,
          taxpayer_name: taxpayer_name,
          amount: amount,
          tax_type: tax_type,
          office: office.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      receipt: {
        receipt_number: receipt_number,
        office_name: office.name,
        tax_type: tax_type,
        taxpayer_name: taxpayer_name,
        taxpayer_phone: taxpayer_phone,
        taxpayer_email: taxpayer_email,
        taxpayer_address: taxpayer_address,
        business_number: business_number,
        property_address: property_address,
        tax_period: tax_period || new Date().getFullYear().toString(),
        amount: amount,
        fee: fee,
        total_amount: totalAmount,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET - Historique des paiements de taxes de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const payments = await query(`
            SELECT * FROM tax_payments 
            WHERE payer_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const total = await get('SELECT COUNT(*) as total FROM tax_payments WHERE payer_id = ?', [req.user.userId]);

    res.json({
      success: true,
      payments: payments || [],
      total: total?.total || 0
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.json([]);
  }
});

// 5. GET - Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT tp.*, toff.name as office_name, toff.address as office_address
            FROM tax_payments tp
            LEFT JOIN tax_offices toff ON tp.office_id = toff.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Paiements reçus par un service d'impôts (pour l'agent)
app.get('/api/tax-office/payments', authenticateToken, async (req, res) => {
  try {
    const office = await get(`
            SELECT id, name FROM tax_offices WHERE user_id = ?
        `, [req.user.userId]);

    if (!office) {
      return res.json({ payments: [], total_amount: 0, total_count: 0 });
    }

    const payments = await query(`
            SELECT tp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.office_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 100
        `, [office.id]);

    const total = await get('SELECT SUM(amount) as total_amount, COUNT(*) as count FROM tax_payments WHERE office_id = ?', [office.id]);

    res.json({
      payments: payments || [],
      total_amount: total?.total_amount || 0,
      total_count: total?.count || 0
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ payments: [], total_amount: 0, total_count: 0 });
  }
});


//=============================================
//
//
//=============================================

// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - COMPTE UTILISATEUR
// ============================================

// GET - Récupérer les informations de l'entreprise connectée (agent)
app.get('/api/company/info', authenticateToken, async (req, res) => {
  console.log('📋 GET /api/company/info - User:', req.user.userId, 'Role:', req.user.role);

  try {
    // Récupérer l'utilisateur
    const user = await get('SELECT id, phone, fullname, role, is_active FROM users WHERE id = ?', [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur est un agent, chercher l'entreprise associée
    if (user.role === 'agent') {
      // Chercher dans service_companies (eau/électricité)
      let company = await get(`
                SELECT 
                    sc.*,
                    u.phone as agent_phone,
                    u.fullname as agent_name,
                    u.is_active as agent_status,
                    w.balance as agent_balance
                FROM service_companies sc
                JOIN users u ON sc.user_id = u.id
                LEFT JOIN wallets w ON u.id = w.user_id
                WHERE u.id = ? AND sc.is_active = 1
            `, [req.user.userId]);

      // Si pas trouvé, chercher dans tax_offices (impôts)
      if (!company) {
        company = await get(`
                    SELECT 
                        toff.*,
                        u.phone as agent_phone,
                        u.fullname as agent_name,
                        u.is_active as agent_status,
                        w.balance as agent_balance
                    FROM tax_offices toff
                    JOIN users u ON toff.user_id = u.id
                    LEFT JOIN wallets w ON u.id = w.user_id
                    WHERE u.id = ? AND toff.is_active = 1
                `, [req.user.userId]);

        if (company) {
          company.type = 'tax_office';
          company.is_tax_office = true;
        }
      }

      // Si une entreprise est trouvée
      if (company) {
        return res.json({
          id: company.id,
          name: company.name,
          type: company.type || (company.is_tax_office ? 'tax_office' : 'service'),
          fullName: company.fullName || company.name,
          description: company.description,
          contact_phone: company.contact_phone || company.phone,
          contact_email: company.contact_email || company.email,
          address: company.address,
          logo: company.logo,
          color: company.color,
          is_active: company.is_active === 1,
          is_tax_office: company.is_tax_office || false,
          agent: {
            id: req.user.userId,
            phone: company.agent_phone || user.phone,
            name: company.agent_name || user.fullname,
            status: company.agent_status === 1 ? 'active' : 'inactive',
            balance: company.agent_balance || 0
          }
        });
      }
    }

    // Si l'utilisateur n'est pas associé à une entreprise, retourner ses infos de base
    res.json({
      id: null,
      name: user.fullname,
      type: 'user',
      fullName: user.fullname,
      description: 'Compte utilisateur',
      is_active: user.is_active === 1,
      agent: {
        id: user.id,
        phone: user.phone,
        name: user.fullname,
        status: user.is_active ? 'active' : 'inactive',
        balance: 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/info:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Paiements reçus par l'entreprise (agent)
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  console.log('📋 GET /api/company/payments - User:', req.user.userId);

  try {
    let companyId = null;
    let companyName = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, name, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyName = serviceCompany.name;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id, name FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyName = taxOffice.name;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        payments: [],
        total_amount: 0,
        total_count: 0,
        today_amount: 0,
        this_month_amount: 0
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let stats = { total_amount: 0, total_count: 0, today_amount: 0, this_month_amount: 0 };
    let payments = [];

    // Pour les services d'eau/électricité
    if (companyType === 'water' || companyType === 'electricity') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    bp.id,
                    bp.receipt_number,
                    bp.customer_name,
                    bp.customer_phone,
                    bp.customer_email,
                    bp.customer_address,
                    bp.meter_number,
                    bp.amount,
                    bp.fee,
                    bp.total_amount,
                    bp.period,
                    bp.invoice_number,
                    bp.service_type,
                    bp.status,
                    bp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM bill_payments bp
                LEFT JOIN users u ON bp.payer_id = u.id
                WHERE bp.company_id = ? AND bp.status = 'completed'
                ORDER BY bp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    // Pour les services d'impôts
    if (companyType === 'tax_office') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    tp.id,
                    tp.receipt_number,
                    tp.taxpayer_name as customer_name,
                    tp.taxpayer_phone as customer_phone,
                    tp.taxpayer_email as customer_email,
                    tp.taxpayer_address as customer_address,
                    NULL as meter_number,
                    tp.amount,
                    tp.fee,
                    tp.total_amount,
                    tp.tax_period as period,
                    NULL as invoice_number,
                    tp.tax_type as service_type,
                    tp.status,
                    tp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.office_id = ? AND tp.status = 'completed'
                ORDER BY tp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    res.json({
      payments: payments || [],
      total_amount: stats?.total_amount || 0,
      total_count: stats?.total_count || 0,
      today_amount: stats?.today_amount || 0,
      this_month_amount: stats?.this_month_amount || 0,
      company: {
        id: companyId,
        name: companyName,
        type: companyType
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/payments:', error);
    res.status(500).json({
      error: error.message,
      payments: [],
      total_amount: 0,
      total_count: 0,
      today_amount: 0,
      this_month_amount: 0
    });
  }
});

// GET - Détails d'un paiement spécifique
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    let payment = null;

    // Chercher dans bill_payments
    payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    // Si pas trouvé, chercher dans tax_payments
    if (!payment) {
      payment = await get(`
                SELECT 
                    tp.*,
                    u.fullname as payer_name,
                    u.phone as payer_phone,
                    u.email as payer_email
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.id = ? AND tp.status = 'completed'
            `, [id]);
    }

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques de l'entreprise
app.get('/api/company/stats', authenticateToken, async (req, res) => {
  try {
    let companyId = null;
    let companyType = null;

    const serviceCompany = await get(`
            SELECT id, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyType = serviceCompany.type;
    }

    if (!companyId) {
      const taxOffice = await get(`
                SELECT id FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        total_payments: 0,
        total_amount: 0,
        average_amount: 0,
        monthly_stats: []
      });
    }

    let globalStats = { total_payments: 0, total_amount: 0, average_amount: 0 };
    let monthlyStats = [];

    if (companyType === 'water' || companyType === 'electricity') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    if (companyType === 'tax_office') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    res.json({
      total_payments: globalStats?.total_payments || 0,
      total_amount: globalStats?.total_amount || 0,
      average_amount: Math.round(globalStats?.average_amount || 0),
      monthly_stats: monthlyStats || []
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/stats:', error);
    res.json({
      total_payments: 0,
      total_amount: 0,
      average_amount: 0,
      monthly_stats: []
    });
  }
});




// ============================================
// ROUTES POUR LES AGENCES - À AJOUTER DANS SERVER.JS
// ============================================

// Middleware pour vérifier que l'utilisateur est une agence
async function requireAgency(req, res, next) {
  try {
    const agency = await get(`
            SELECT id FROM travel_agencies 
            WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!agency) {
      return res.status(403).json({
        error: 'Accès réservé aux agences de voyage'
      });
    }
    req.agency = agency;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
// ============================================
// ROUTES POUR LES AGENCES DE VOYAGE (AGENTS)
// ============================================

// Middleware pour vérifier que l'utilisateur est une agence
async function requireAgency(req, res, next) {
  try {
    const agency = await get(`
            SELECT id, name FROM travel_agencies 
            WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!agency) {
      return res.status(403).json({
        error: 'Accès réservé aux agences de voyage'
      });
    }
    req.agency = agency;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 1. GET - Informations de l'agence
app.get('/api/agency/info', authenticateToken, requireAgency, async (req, res) => {
  try {
    const agency = await get(`
            SELECT 
                ta.*, 
                u.phone as user_phone, 
                u.fullname as user_name, 
                COALESCE(w.balance, 0) as balance
            FROM travel_agencies ta
            JOIN users u ON ta.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE ta.id = ?
        `, [req.agency.id]);

    res.json(agency);

  } catch (error) {
    console.error('❌ Erreur /api/agency/info:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET - Liste des trajets de l'agence
app.get('/api/agency/trips', authenticateToken, requireAgency, async (req, res) => {
  try {
    const trips = await query(`
            SELECT * FROM trips 
            WHERE agency_id = ? 
            ORDER BY departure_date ASC, departure_time ASC
        `, [req.agency.id]);

    res.json(trips || []);

  } catch (error) {
    console.error('❌ Erreur /api/agency/trips:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST - Créer un trajet
app.post('/api/agency/trips', authenticateToken, requireAgency, async (req, res) => {
  const {
    departure_city, destination_city, departure_date, departure_time,
    arrival_time, price, total_seats, description
  } = req.body;

  console.log('📝 Création trajet:', { departure_city, destination_city, price, total_seats });

  try {
    const result = await run(`
            INSERT INTO trips (
                agency_id, departure_city, destination_city, departure_date,
                departure_time, arrival_time, price, total_seats, available_seats,
                description, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `, [
      req.agency.id, departure_city, destination_city, departure_date,
      departure_time, arrival_time || null, price, total_seats, total_seats,
      description || ''
    ]);

    res.status(201).json({
      success: true,
      message: 'Trajet créé avec succès',
      trip_id: result.lastID
    });

  } catch (error) {
    console.error('❌ Erreur création trajet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT - Modifier un trajet
app.put('/api/agency/trips/:id', authenticateToken, requireAgency, async (req, res) => {
  const { id } = req.params;
  const {
    departure_city, destination_city, departure_date, departure_time,
    arrival_time, price, total_seats, description
  } = req.body;

  try {
    // Vérifier que le trajet appartient à l'agence
    const trip = await get(`
            SELECT t.* FROM trips t
            WHERE t.id = ? AND t.agency_id = ?
        `, [id, req.agency.id]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    await run(`
            UPDATE trips 
            SET departure_city = ?, 
                destination_city = ?, 
                departure_date = ?, 
                departure_time = ?, 
                arrival_time = ?, 
                price = ?, 
                total_seats = ?, 
                description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      departure_city, destination_city, departure_date,
      departure_time, arrival_time || '', price, total_seats,
      description || '', id
    ]);

    res.json({ success: true, message: 'Trajet modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification trajet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE - Supprimer un trajet
app.delete('/api/agency/trips/:id', authenticateToken, requireAgency, async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier que le trajet appartient à l'agence
    const trip = await get(`
            SELECT t.* FROM trips t
            WHERE t.id = ? AND t.agency_id = ?
        `, [id, req.agency.id]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier s'il y a des réservations
    const bookings = await get(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE trip_id = ? AND booking_status != 'cancelled'
        `, [id]);

    if (bookings?.count > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce trajet car il a des réservations en cours'
      });
    }

    await run('UPDATE trips SET status = "cancelled" WHERE id = ?', [id]);

    res.json({ success: true, message: 'Trajet annulé avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression trajet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Liste des réservations de l'agence
app.get('/api/agency/bookings', authenticateToken, requireAgency, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city, 
                t.destination_city, 
                t.departure_date, 
                t.departure_time,
                t.arrival_time,
                t.price as trip_price,
                u.fullname as user_name,
                u.phone as user_phone
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [req.agency.id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    // Compter le total
    let countSql = `
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
        `;
    const countParams = [req.agency.id];

    if (status && status !== 'all') {
      countSql += ' AND b.booking_status = ?';
      countParams.push(status);
    }

    const total = await get(countSql, countParams);

    res.json({
      success: true,
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur /api/agency/bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 7. POST - Valider une réservation (AVEC PAIEMENT)
app.post('/api/agency/bookings/:id/validate', authenticateToken, requireAgency, async (req, res) => {
  const { id } = req.params;

  console.log('✅ Validation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'agence
    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réservation' });
    }

    // Vérification du solde du client
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    if (clientWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'Solde client insuffisant.',
        client_balance: clientWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - clientWallet.balance
      });
    }

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le client
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 2. Créditer l'agence
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 3. Enregistrer la transaction
      const transactionRef = `BUS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bus_booking', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        user?.phone || '',
        agency?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Paiement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'confirmed', 
                    payment_status = 'paid',
                    validation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

      // 5. Notifications
      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_confirmed', 
                    'Réservation ${booking.booking_number} confirmée - Paiement reçu de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Réservation confirmée', 
                    'Votre réservation ${booking.booking_number} a été confirmée par ${booking.agency_name}. Montant débité: ${booking.total_amount.toLocaleString()} FCFA',
                    'booking', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run('COMMIT');

      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation validée et paiement effectué avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'confirmed',
          payment_status: 'paid'
        },
        balances: {
          client: {
            before: clientWallet.balance,
            after: newClientBalance?.balance || 0,
            debited: booking.total_amount
          },
          agency: {
            before: null,
            after: newAgencyBalance?.balance || 0,
            credited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur validation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. POST - Rejeter une réservation
app.post('/api/agency/bookings/:id/reject', authenticateToken, requireAgency, async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  console.log('❌ Rejet réservation:', id);

  try {
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à rejeter cette réservation' });
    }

    await run('BEGIN TRANSACTION');

    // Remettre les places disponibles
    await run(`
            UPDATE trips 
            SET available_seats = available_seats + ?
            WHERE id = ?
        `, [booking.seat_count, booking.trip_id]);

    // Rejeter la réservation
    await run(`
            UPDATE bookings 
            SET booking_status = 'rejected', 
                payment_status = 'cancelled',
                rejection_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [rejection_reason || 'Non conforme', id]);

    // Notifications
    await run(`
            INSERT INTO booking_notifications (
                agency_id, booking_id, type, message, created_at
            ) VALUES (?, ?, 'booking_rejected', 
                'Réservation ${booking.booking_number} rejetée. Motif: ${rejection_reason || "Non spécifié"}',
                CURRENT_TIMESTAMP)
        `, [booking.agency_id, id]);

    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '❌ Réservation rejetée', 
                'Votre réservation ${booking.booking_number} a été rejetée par ${booking.agency_name}. Motif: ${rejection_reason || "Non spécifié"}',
                'booking', CURRENT_TIMESTAMP)
        `, [booking.user_id]);

    await run('COMMIT');

    res.json({
      success: true,
      message: 'Réservation rejetée avec succès',
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: 'rejected'
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur rejet réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. GET - Notifications de l'agence
app.get('/api/agency/notifications', authenticateToken, requireAgency, async (req, res) => {
  try {
    const notifications = await query(`
            SELECT 
                bn.*,
                b.booking_number,
                b.passenger_name,
                b.seat_count,
                b.total_amount,
                b.booking_status
            FROM booking_notifications bn
            JOIN bookings b ON bn.booking_id = b.id
            WHERE bn.agency_id = ?
            ORDER BY bn.created_at DESC
            LIMIT 50
        `, [req.agency.id]);

    const unreadCount = await get(`
            SELECT COUNT(*) as count FROM booking_notifications 
            WHERE agency_id = ? AND is_read = 0
        `, [req.agency.id]);

    res.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur /api/agency/notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 10. PUT - Marquer une notification comme lue
app.put('/api/agency/notifications/:id/read', authenticateToken, requireAgency, async (req, res) => {
  const { id } = req.params;

  try {
    await run(`
            UPDATE booking_notifications 
            SET is_read = 1 
            WHERE id = ? AND agency_id = ?
        `, [id, req.agency.id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. GET - Statistiques de l'agence
app.get('/api/agency/stats', authenticateToken, requireAgency, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                (SELECT COUNT(*) FROM trips WHERE agency_id = ? AND status = 'active') as total_trips,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'pending') as pending_bookings,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'confirmed') as confirmed_bookings,
                (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.payment_status = 'paid') as total_revenue
            `, [req.agency.id, req.agency.id, req.agency.id, req.agency.id]
    );

    // Récupérer le solde
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    res.json({
      success: true,
      stats: {
        total_trips: stats?.total_trips || 0,
        pending_bookings: stats?.pending_bookings || 0,
        confirmed_bookings: stats?.confirmed_bookings || 0,
        total_revenue: stats?.total_revenue || 0,
        balance: wallet?.balance || 0
      }
    });

  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 12. GET - Vérifier si l'utilisateur a une agence
app.get('/api/agency/check', authenticateToken, async (req, res) => {
  try {
    const agency = await get(`
            SELECT id, name FROM travel_agencies 
            WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    res.json({
      hasAgency: !!agency,
      agency: agency || null
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({ hasAgency: false });
  }
});
// ============================================
// 1. GET - Informations de l'agence
// ============================================

app.get('/api/agency/info', authenticateToken, requireAgency, async (req, res) => {
  try {
    const agency = await get(`
            SELECT 
                ta.*, 
                u.phone as user_phone, 
                u.fullname as user_name, 
                COALESCE(w.balance, 0) as balance
            FROM travel_agencies ta
            JOIN users u ON ta.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE ta.id = ?
        `, [req.agency.id]);

    res.json(agency);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 2. GET - Liste des trajets
// ============================================

app.get('/api/agency/trips', authenticateToken, requireAgency, async (req, res) => {
  try {
    const trips = await query(`
            SELECT * FROM trips 
            WHERE agency_id = ? 
            ORDER BY departure_date ASC, departure_time ASC
        `, [req.agency.id]);

    res.json(trips || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. GET - Liste des réservations
// ============================================

app.get('/api/agency/bookings', authenticateToken, requireAgency, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city, 
                t.destination_city, 
                t.departure_date, 
                t.departure_time,
                t.arrival_time,
                t.price as trip_price,
                u.fullname as user_name,
                u.phone as user_phone
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [req.agency.id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    res.json({
      success: true,
      bookings: bookings || [],
      total: bookings?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 4. GET - Notifications
// ============================================

app.get('/api/agency/notifications', authenticateToken, requireAgency, async (req, res) => {
  try {
    const notifications = await query(`
            SELECT 
                bn.*,
                b.booking_number,
                b.passenger_name,
                b.seat_count,
                b.total_amount,
                b.booking_status
            FROM booking_notifications bn
            JOIN bookings b ON bn.booking_id = b.id
            WHERE bn.agency_id = ?
            ORDER BY bn.created_at DESC
            LIMIT 50
        `, [req.agency.id]);

    const unreadCount = await get(`
            SELECT COUNT(*) as count FROM booking_notifications 
            WHERE agency_id = ? AND is_read = 0
        `, [req.agency.id]);

    res.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 5. POST - Créer un trajet
// ============================================

app.post('/api/agency/trips', authenticateToken, requireAgency, async (req, res) => {
  const {
    departure_city, destination_city, departure_date, departure_time,
    arrival_time, price, total_seats, description
  } = req.body;

  try {
    const result = await run(`
            INSERT INTO trips (
                agency_id, departure_city, destination_city, departure_date,
                departure_time, arrival_time, price, total_seats, available_seats, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      req.agency.id, departure_city, destination_city, departure_date,
      departure_time, arrival_time || null, price, total_seats, total_seats, description || ''
    ]);

    res.status(201).json({
      success: true,
      message: 'Trajet créé avec succès',
      trip_id: result.lastID
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 6. POST - Valider une réservation
// ============================================
// ============================================
// ROUTES POUR LES RÉSERVATIONS DE VOYAGE (AVEC TRANSACTIONS)
// ============================================
// ============================================
// POST - Valider une réservation - CORRIGÉ
// ============================================
app.post('/api/agency/bookings/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('✅ Validation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'agence
    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réservation' });
    }

    // Vérification du solde du client
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    if (clientWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'Solde client insuffisant.',
        client_balance: clientWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - clientWallet.balance
      });
    }

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le client
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 2. Créditer l'agence
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 3. Enregistrer la transaction - ✅ UTILISER 'bus_booking' (qui existe)
      const transactionRef = `BUS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bus_booking', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        user?.phone || '',
        agency?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Paiement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'confirmed', 
                    payment_status = 'paid',
                    validation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

      // 5. Notifications
      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_confirmed', 
                    'Réservation ${booking.booking_number} confirmée - Paiement reçu de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Réservation confirmée', 
                    'Votre réservation ${booking.booking_number} a été confirmée par ${booking.agency_name}. Montant débité: ${booking.total_amount.toLocaleString()} FCFA',
                    'booking', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run('COMMIT');

      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation validée et paiement effectué avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'confirmed',
          payment_status: 'paid'
        },
        balances: {
          client: {
            before: clientWallet.balance,
            after: newClientBalance?.balance || 0,
            debited: booking.total_amount
          },
          agency: {
            before: null,
            after: newAgencyBalance?.balance || 0,
            credited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur validation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Récupérer les réservations d'une agence
app.get('/api/agency/bookings', authenticateToken, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Récupérer l'agence de l'utilisateur
    const agency = await get(`
            SELECT id FROM travel_agencies WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!agency) {
      return res.json({ bookings: [], total: 0 });
    }

    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                t.arrival_time,
                u.fullname as user_name,
                u.phone as user_phone
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [agency.id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
            ${status && status !== 'all' ? 'AND b.booking_status = ?' : ''}
        `, status && status !== 'all' ? [agency.id, status] : [agency.id]);

    res.json({
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Récupérer les trajets d'une agence
app.get('/api/agency/trips', authenticateToken, async (req, res) => {
  try {
    const agency = await get(`
            SELECT id FROM travel_agencies WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!agency) {
      return res.json([]);
    }

    const trips = await query(`
            SELECT * FROM trips 
            WHERE agency_id = ?
            ORDER BY departure_date ASC, departure_time ASC
        `, [agency.id]);

    res.json(trips || []);

  } catch (error) {
    console.error('❌ Erreur récupération trajets:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Créer un trajet pour une agence
app.post('/api/agency/trips', authenticateToken, async (req, res) => {
  const {
    departure_city,
    destination_city,
    departure_date,
    departure_time,
    arrival_time,
    price,
    total_seats,
    description
  } = req.body;

  try {
    const agency = await get(`
            SELECT id FROM travel_agencies WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    const result = await run(`
            INSERT INTO trips (
                agency_id, departure_city, destination_city, departure_date,
                departure_time, arrival_time, price, total_seats, available_seats,
                description, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `, [
      agency.id, departure_city, destination_city, departure_date,
      departure_time, arrival_time || '', price, total_seats, total_seats,
      description || ''
    ]);

    res.status(201).json({
      success: true,
      message: 'Trajet créé avec succès',
      trip: { id: result.lastID }
    });

  } catch (error) {
    console.error('❌ Erreur création trajet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Modifier un trajet
app.put('/api/agency/trips/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    departure_city,
    destination_city,
    departure_date,
    departure_time,
    arrival_time,
    price,
    total_seats,
    description
  } = req.body;

  try {
    // Vérifier que le trajet appartient à l'agence
    const trip = await get(`
            SELECT t.* FROM trips t
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE t.id = ? AND ta.user_id = ?
        `, [id, req.user.userId]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    await run(`
            UPDATE trips 
            SET departure_city = ?, 
                destination_city = ?, 
                departure_date = ?, 
                departure_time = ?, 
                arrival_time = ?, 
                price = ?, 
                total_seats = ?, 
                available_seats = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      departure_city, destination_city, departure_date,
      departure_time, arrival_time || '', price, total_seats,
      total_seats - (trip.total_seats - trip.available_seats), // Garder les places réservées
      description || '', id
    ]);

    res.json({ success: true, message: 'Trajet modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification trajet:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Supprimer un trajet
app.delete('/api/agency/trips/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier que le trajet appartient à l'agence
    const trip = await get(`
            SELECT t.* FROM trips t
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE t.id = ? AND ta.user_id = ?
        `, [id, req.user.userId]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier s'il y a des réservations en attente ou confirmées
    const bookings = await get(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE trip_id = ? AND booking_status IN ('pending', 'confirmed')
        `, [id]);

    if (bookings?.count > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce trajet car il a des réservations en cours'
      });
    }

    await run('UPDATE trips SET status = "cancelled" WHERE id = ?', [id]);

    res.json({ success: true, message: 'Trajet annulé avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression trajet:', error);
    res.status(500).json({ error: error.message });
  }
});
// 2. POST - Créer une agence de voyage (avec création de compte agent)
app.post('/api/admin/travel-agencies', authenticateToken, requireAdmin, async (req, res) => {
  const {
    name,
    type,
    description,
    phone,
    email,
    address,
    password
  } = req.body;

  console.log('📝 Création agence de voyage:', { name, phone });

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le nom de l\'agence est requis' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Le téléphone est requis' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }

  try {
    // Vérifier si le téléphone existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Vérifier si une agence avec ce téléphone existe déjà
    const existingAgency = await get('SELECT id FROM travel_agencies WHERE phone = ?', [phone]);
    if (existingAgency) {
      return res.status(400).json({ error: 'Une agence avec ce téléphone existe déjà' });
    }

    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedKey = await bcrypt.hash(privateKey, 10);

    await run('BEGIN TRANSACTION');

    // 1. Créer l'utilisateur agent
    const userResult = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES (?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [phone, name, hashedPassword, hashedKey]);

    const userId = userResult.lastID;
    console.log('✅ Utilisateur agent créé:', { id: userId, phone: phone });

    // 2. Créer le wallet pour l'agent (le trigger le fera, mais on vérifie)
    const existingWallet = await get('SELECT id FROM wallets WHERE user_id = ?', [userId]);
    if (!existingWallet) {
      await run('INSERT INTO wallets (user_id, balance, created_at) VALUES (?, 0, CURRENT_TIMESTAMP)', [userId]);
    }
    console.log('✅ Wallet créé pour l\'agent');

    // 3. Créer l'agence de voyage
    const agencyResult = await run(`
            INSERT INTO travel_agencies (
                name, 
                type, 
                description, 
                phone, 
                email, 
                address, 
                user_id, 
                created_by, 
                is_active, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
      name,
      type || 'travel_agency',
      description || '',
      phone,
      email || '',
      address || '',
      userId,
      req.user.userId
    ]);

    await run('COMMIT');

    console.log('✅ Agence de voyage créée:', { id: agencyResult.lastID, name });

    res.status(201).json({
      success: true,
      message: 'Agence de voyage créée avec succès',
      agency: {
        id: agencyResult.lastID,
        name: name,
        type: type || 'travel_agency',
        phone: phone,
        email: email || '',
        agent: {
          phone: phone,
          password: password,
          private_key: privateKey
        }
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur création agence:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. PUT - Modifier une agence de voyage
app.put('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    description,
    phone,
    email,
    address,
    is_active
  } = req.body;

  console.log('📝 Modification agence:', { id, name, phone });

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT user_id FROM travel_agencies WHERE id = ?', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Mettre à jour l'utilisateur associé
    if (name) {
      await run('UPDATE users SET fullname = ? WHERE id = ?', [name, agency.user_id]);
    }
    if (phone) {
      await run('UPDATE users SET phone = ? WHERE id = ?', [phone, agency.user_id]);
    }

    // Mettre à jour l'agence
    await run(`
            UPDATE travel_agencies 
            SET name = ?, 
                type = ?, 
                description = ?, 
                phone = ?, 
                email = ?, 
                address = ?,
                is_active = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      name,
      type || 'travel_agency',
      description || '',
      phone,
      email || '',
      address || '',
      is_active ? 1 : 0,
      id
    ]);

    res.json({ success: true, message: 'Agence modifiée avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE - Supprimer une agence de voyage (soft delete)
app.delete('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  console.log('🗑️ Suppression agence:', id);

  try {
    // Récupérer l'utilisateur associé
    const agency = await get('SELECT user_id FROM travel_agencies WHERE id = ?', [id]);

    if (agency?.user_id) {
      await run('UPDATE users SET is_active = 0 WHERE id = ?', [agency.user_id]);
    }

    await run('UPDATE travel_agencies SET is_active = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Agence supprimée avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Détails d'une agence de voyage spécifique
app.get('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const agency = await get(`
            SELECT 
                ta.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as wallet_balance
            FROM travel_agencies ta
            LEFT JOIN users u ON ta.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE ta.id = ? AND ta.is_active = 1
        `, [id]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    res.json(agency);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Récupérer tous les voyages d'une agence
app.get('/api/admin/travel-agencies/:id/trips', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT id FROM travel_agencies WHERE id = ? AND is_active = 1', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    let sql = `
            SELECT * FROM trips 
            WHERE agency_id = ?
        `;
    const params = [id];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY departure_date ASC, departure_time ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const trips = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count FROM trips 
            WHERE agency_id = ?
            ${status && status !== 'all' ? 'AND status = ?' : ''}
        `, status && status !== 'all' ? [id, status] : [id]);

    res.json({
      trips: trips || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Erreur récupération voyages:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST - Ajouter un voyage à une agence
app.post('/api/admin/travel-agencies/:id/trips', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    departure_city,
    destination_city,
    departure_date,
    departure_time,
    arrival_time,
    price,
    total_seats,
    description
  } = req.body;

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT id FROM travel_agencies WHERE id = ? AND is_active = 1', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    const result = await run(`
            INSERT INTO trips (
                agency_id, departure_city, destination_city, departure_date,
                departure_time, arrival_time, price, total_seats, available_seats,
                description, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `, [
      id, departure_city, destination_city, departure_date,
      departure_time, arrival_time || '', price, total_seats, total_seats,
      description || ''
    ]);

    res.status(201).json({
      success: true,
      message: 'Voyage ajouté avec succès',
      trip: { id: result.lastID }
    });

  } catch (error) {
    console.error('❌ Erreur création voyage:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. PUT - Modifier un voyage
app.put('/api/admin/trips/:tripId', authenticateToken, requireAdmin, async (req, res) => {
  const { tripId } = req.params;
  const {
    departure_city,
    destination_city,
    departure_date,
    departure_time,
    arrival_time,
    price,
    total_seats,
    available_seats,
    description,
    status
  } = req.body;

  try {
    await run(`
            UPDATE trips 
            SET departure_city = ?, 
                destination_city = ?, 
                departure_date = ?, 
                departure_time = ?, 
                arrival_time = ?, 
                price = ?, 
                total_seats = ?, 
                available_seats = ?,
                description = ?, 
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      departure_city, destination_city, departure_date,
      departure_time, arrival_time || '', price, total_seats,
      available_seats || total_seats, description || '',
      status || 'active', tripId
    ]);

    res.json({ success: true, message: 'Voyage modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification voyage:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. DELETE - Supprimer un voyage
app.delete('/api/admin/trips/:tripId', authenticateToken, requireAdmin, async (req, res) => {
  const { tripId } = req.params;

  try {
    // Vérifier s'il y a des réservations
    const bookings = await get('SELECT COUNT(*) as count FROM bookings WHERE trip_id = ? AND booking_status != "cancelled"', [tripId]);

    if (bookings?.count > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce voyage car il a des réservations en cours'
      });
    }

    await run('UPDATE trips SET status = "cancelled" WHERE id = ?', [tripId]);

    res.json({ success: true, message: 'Voyage annulé avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression voyage:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. GET - Toutes les réservations d'une agence
app.get('/api/admin/travel-agencies/:id/bookings', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                u.fullname as user_name,
                u.phone as user_phone
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
            ${status && status !== 'all' ? 'AND b.booking_status = ?' : ''}
        `, status && status !== 'all' ? [id, status] : [id]);

    res.json({
      bookings: bookings || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. GET - Statistiques d'une agence
app.get('/api/admin/travel-agencies/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT id FROM travel_agencies WHERE id = ? AND is_active = 1', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Statistiques globales
    const stats = await get(`
            SELECT 
                (SELECT COUNT(*) FROM trips WHERE agency_id = ?) as total_trips,
                (SELECT COUNT(*) FROM trips WHERE agency_id = ? AND status = 'active') as active_trips,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ?) as total_bookings,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'confirmed') as confirmed_bookings,
                (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.payment_status = 'paid') as total_revenue
            `, [id, id, id, id, id]
    );

    res.json({
      total_trips: stats?.total_trips || 0,
      active_trips: stats?.active_trips || 0,
      total_bookings: stats?.total_bookings || 0,
      confirmed_bookings: stats?.confirmed_bookings || 0,
      total_revenue: stats?.total_revenue || 0
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ error: error.message });
  }
});

// 12. Route pour créer des agences de test
app.post('/api/admin/travel-agencies/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const testAgencies = [
      {
        name: "Voyages du Monde",
        type: "travel_agency",
        description: "Agence spécialisée dans les voyages internationaux",
        phone: "62 78 73 10",
        email: "contact@voyagesdumonde.com",
        address: "N'Djaména, Tchad"
      },
      {
        name: "Travel Express",
        type: "travel_agency",
        description: "Voyages rapides et économiques",
        phone: "62 78 73 11",
        email: "info@travelexpress.com",
        address: "Moundou, Tchad"
      },
      {
        name: "Safari Adventures",
        type: "travel_agency",
        description: "Découvrez l'Afrique en toute sécurité",
        phone: "62 78 73 12",
        email: "contact@safariadventures.com",
        address: "Sarh, Tchad"
      }
    ];

    let createdCount = 0;

    for (const agency of testAgencies) {
      // Vérifier si l'agence existe déjà
      const existing = await get('SELECT id FROM travel_agencies WHERE phone = ?', [agency.phone]);
      if (existing) continue;

      const password = `test1234`;
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedKey = await bcrypt.hash(privateKey, 10);

      const userResult = await run(`
                INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified)
                VALUES (?, ?, ?, ?, 'agent', 1, 1)
            `, [agency.phone, agency.name, hashedPassword, hashedKey]);

      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userResult.lastID]);

      await run(`
                INSERT INTO travel_agencies (
                    name, type, description, phone, email, address,
                    user_id, created_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
        agency.name, agency.type, agency.description, agency.phone,
        agency.email, agency.address, userResult.lastID, req.user.userId
      ]);

      createdCount++;
    }

    res.json({
      success: true,
      message: `${createdCount} agences de test créées`,
      count: createdCount
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// 13. Route de diagnostic
app.get('/api/admin/travel-agencies/diagnostic', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Vérifier si la table existe
    const tableExists = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='travel_agencies'
        `);

    if (!tableExists) {
      return res.json({
        exists: false,
        message: 'La table travel_agencies n\'existe pas'
      });
    }

    // Récupérer la structure
    const columns = await query('PRAGMA table_info(travel_agencies)');

    // Compter les entrées
    const count = await get('SELECT COUNT(*) as count FROM travel_agencies');

    res.json({
      exists: true,
      columns: columns,
      count: count?.count || 0,
      message: 'Structure de la table correcte'
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// ROUTES COMMUNES (SERVICES D'IMPÔTS)
// ============================================

// Admin: Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/admin/communes - Admin:', req.user.userId);

    const communes = await query(`
            SELECT 
                u.id,
                u.phone,
                u.fullname as contact_name,
                u.commune_name as name,
                u.commune_address as address,
                u.email,
                u.is_active,
                w.balance,
                u.created_at
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.commune_name
        `);

    console.log(`✅ ${communes.length} communes trouvées`);
    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur chargement communes:', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================
// ROUTES POUR LES AGENCES DE VOYAGE (PUBLIQUES)
// ============================================

// 1. Vérifier si l'utilisateur a une agence
app.get('/api/company/check', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est un agent
    const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);

    if (user?.role !== 'agent') {
      return res.json({ isAgency: false, role: user?.role || 'user' });
    }

    // Vérifier si l'agent a une agence de voyage
    const agency = await get(`
            SELECT id, name FROM travel_agencies WHERE user_id = ? AND is_active = 1
        `, [req.user.userId]);

    res.json({
      isAgency: !!agency,
      agency: agency || null,
      role: user?.role
    });

  } catch (error) {
    console.error('❌ Erreur vérification agence:', error);
    res.json({ isAgency: false });
  }
});

// 2. Récupérer tous les trajets disponibles
app.get('/api/trips', async (req, res) => {
  const { departure_city, destination_city, date, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                t.*,
                ta.name as agency_name,
                ta.phone as agency_phone,
                ta.address as agency_address
            FROM trips t
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE t.status = 'active' 
              AND ta.is_active = 1
              AND t.available_seats > 0
        `;
    const params = [];

    if (departure_city) {
      sql += ' AND t.departure_city LIKE ?';
      params.push(`%${departure_city}%`);
    }

    if (destination_city) {
      sql += ' AND t.destination_city LIKE ?';
      params.push(`%${destination_city}%`);
    }

    if (date) {
      sql += ' AND t.departure_date = ?';
      params.push(date);
    }

    sql += ' ORDER BY t.departure_date ASC, t.departure_time ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const trips = await query(sql, params);

    // Compter le total
    let countSql = `
            SELECT COUNT(*) as count 
            FROM trips t
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE t.status = 'active' AND ta.is_active = 1 AND t.available_seats > 0
        `;
    const countParams = [];

    if (departure_city) {
      countSql += ' AND t.departure_city LIKE ?';
      countParams.push(`%${departure_city}%`);
    }
    if (destination_city) {
      countSql += ' AND t.destination_city LIKE ?';
      countParams.push(`%${destination_city}%`);
    }
    if (date) {
      countSql += ' AND t.departure_date = ?';
      countParams.push(date);
    }

    const total = await get(countSql, countParams);

    res.json({
      success: true,
      trips: trips || [],
      total: total?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Erreur récupération trajets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Récupérer les réservations de l'utilisateur
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                t.arrival_time,
                ta.name as agency_name,
                ta.phone as agency_phone
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.user_id = ?
        `;
    const params = [req.user.userId];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count FROM bookings WHERE user_id = ?
            ${status && status !== 'all' ? 'AND booking_status = ?' : ''}
        `, status && status !== 'all' ? [req.user.userId, status] : [req.user.userId]);

    res.json({
      success: true,
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Récupérer toutes les agences de voyage (publiques)
app.get('/api/travel-agencies', async (req, res) => {
  const { city, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                ta.id,
                ta.name,
                ta.type,
                ta.description,
                ta.phone,
                ta.email,
                ta.address,
                ta.is_active,
                u.fullname as agent_name,
                u.phone as agent_phone,
                (SELECT COUNT(*) FROM trips t WHERE t.agency_id = ta.id AND t.status = 'active') as active_trips
            FROM travel_agencies ta
            JOIN users u ON ta.user_id = u.id
            WHERE ta.is_active = 1 AND u.is_active = 1
        `;
    const params = [];

    if (city) {
      sql += ' AND (ta.address LIKE ? OR u.city LIKE ?)';
      params.push(`%${city}%`, `%${city}%`);
    }

    if (search) {
      sql += ' AND (ta.name LIKE ? OR ta.description LIKE ? OR u.fullname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY ta.name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const agencies = await query(sql, params);

    // Compter le total
    let countSql = `
            SELECT COUNT(*) as count FROM travel_agencies ta
            JOIN users u ON ta.user_id = u.id
            WHERE ta.is_active = 1 AND u.is_active = 1
        `;
    const countParams = [];

    if (city) {
      countSql += ' AND (ta.address LIKE ? OR u.city LIKE ?)';
      countParams.push(`%${city}%`, `%${city}%`);
    }
    if (search) {
      countSql += ' AND (ta.name LIKE ? OR ta.description LIKE ? OR u.fullname LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = await get(countSql, countParams);

    res.json({
      success: true,
      agencies: agencies || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. Récupérer les détails d'une agence spécifique
app.get('/api/travel-agencies/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const agency = await get(`
            SELECT 
                ta.*,
                u.fullname as agent_name,
                u.phone as agent_phone,
                u.email as agent_email,
                (SELECT COUNT(*) FROM trips t WHERE t.agency_id = ta.id AND t.status = 'active') as active_trips,
                (SELECT COUNT(*) FROM trips t WHERE t.agency_id = ta.id) as total_trips
            FROM travel_agencies ta
            JOIN users u ON ta.user_id = u.id
            WHERE ta.id = ? AND ta.is_active = 1
        `, [id]);

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'Agence non trouvée'
      });
    }

    // Récupérer les trajets de l'agence
    const trips = await query(`
            SELECT * FROM trips 
            WHERE agency_id = ? AND status = 'active' AND available_seats > 0
            ORDER BY departure_date ASC, departure_time ASC
            LIMIT 10
        `, [id]);

    res.json({
      success: true,
      agency: agency,
      trips: trips || []
    });

  } catch (error) {
    console.error('❌ Erreur récupération agence:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
//=====================================
//
//==========================================
// ============================================
// ROUTES POUR LES RÉSERVATIONS AVEC VÉRIFICATION DES SOLDES
// ============================================

// 3. POST - Rejeter une réservation (SANS PAIEMENT)
app.post('/api/agency/bookings/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  console.log('❌ Rejet réservation:', id);

  try {
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à rejeter cette réservation' });
    }

    await run('BEGIN TRANSACTION');

    // Remettre les places disponibles
    await run(`
            UPDATE trips 
            SET available_seats = available_seats + ?
            WHERE id = ?
        `, [booking.seat_count, booking.trip_id]);

    // Rejeter la réservation
    await run(`
            UPDATE bookings 
            SET booking_status = 'rejected', 
                payment_status = 'cancelled',
                rejection_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [rejection_reason || 'Non conforme', id]);

    // Notifications
    await run(`
            INSERT INTO booking_notifications (
                agency_id, booking_id, type, message, created_at
            ) VALUES (?, ?, 'booking_rejected', 
                'Réservation ${booking.booking_number} rejetée. Motif: ${rejection_reason || "Non spécifié"}',
                CURRENT_TIMESTAMP)
        `, [booking.agency_id, id]);

    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '❌ Réservation rejetée', 
                'Votre réservation ${booking.booking_number} a été rejetée par ${booking.agency_name}. Motif: ${rejection_reason || "Non spécifié"}',
                'booking', CURRENT_TIMESTAMP)
        `, [booking.user_id]);

    await run('COMMIT');

    res.json({
      success: true,
      message: 'Réservation rejetée avec succès',
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: 'rejected'
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur rejet réservation:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// ROUTES ADMIN - GESTION DES AGENCES DE VOYAGE
// ============================================

// 1. GET - Récupérer toutes les agences de voyage (admin)
app.get('/api/admin/travel-agencies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agencies = await query(`
            SELECT 
                ta.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                u.email as agent_email,
                w.balance as wallet_balance,
                (SELECT COUNT(*) FROM trips t WHERE t.agency_id = ta.id AND t.status = 'active') as active_trips,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ta.id AND b.booking_status = 'confirmed') as total_bookings
            FROM travel_agencies ta
            LEFT JOIN users u ON ta.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE ta.is_active = 1
            ORDER BY ta.name ASC
        `);

    res.json(agencies || []);

  } catch (error) {
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST - Créer une agence de voyage (admin)
app.post('/api/admin/travel-agencies', authenticateToken, requireAdmin, async (req, res) => {
  const {
    name,
    type,
    description,
    phone,
    email,
    address,
    password
  } = req.body;

  console.log('📝 Création agence de voyage:', { name, phone });

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le nom de l\'agence est requis' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Le téléphone est requis' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }

  try {
    // Vérifier si le téléphone existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Vérifier si une agence avec ce téléphone existe déjà
    const existingAgency = await get('SELECT id FROM travel_agencies WHERE phone = ?', [phone]);
    if (existingAgency) {
      return res.status(400).json({ error: 'Une agence avec ce téléphone existe déjà' });
    }

    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedKey = await bcrypt.hash(privateKey, 10);

    await run('BEGIN TRANSACTION');

    // 1. Créer l'utilisateur agent
    const userResult = await run(`
            INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, created_at)
            VALUES (?, ?, ?, ?, 'agent', 1, 1, CURRENT_TIMESTAMP)
        `, [phone, name, hashedPassword, hashedKey]);

    const userId = userResult.lastID;
    console.log('✅ Utilisateur agent créé:', { id: userId, phone: phone });

    // 2. Créer le wallet pour l'agent
    const existingWallet = await get('SELECT id FROM wallets WHERE user_id = ?', [userId]);
    if (!existingWallet) {
      await run('INSERT INTO wallets (user_id, balance, created_at) VALUES (?, 0, CURRENT_TIMESTAMP)', [userId]);
    }
    console.log('✅ Wallet créé pour l\'agent');

    // 3. Créer l'agence de voyage
    const agencyResult = await run(`
            INSERT INTO travel_agencies (
                name, 
                type, 
                description, 
                phone, 
                email, 
                address, 
                user_id, 
                created_by, 
                is_active, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
      name,
      type || 'travel_agency',
      description || '',
      phone,
      email || '',
      address || '',
      userId,
      req.user.userId
    ]);

    await run('COMMIT');

    console.log('✅ Agence de voyage créée:', { id: agencyResult.lastID, name });

    res.status(201).json({
      success: true,
      message: 'Agence de voyage créée avec succès',
      agency: {
        id: agencyResult.lastID,
        name: name,
        type: type || 'travel_agency',
        phone: phone,
        email: email || '',
        agent: {
          phone: phone,
          password: password,
          private_key: privateKey
        }
      }
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur création agence:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. PUT - Modifier une agence de voyage (admin)
app.put('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    description,
    phone,
    email,
    address,
    is_active
  } = req.body;

  console.log('📝 Modification agence:', { id, name, phone });

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT user_id FROM travel_agencies WHERE id = ?', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Mettre à jour l'utilisateur associé
    if (name) {
      await run('UPDATE users SET fullname = ? WHERE id = ?', [name, agency.user_id]);
    }
    if (phone) {
      await run('UPDATE users SET phone = ? WHERE id = ?', [phone, agency.user_id]);
    }

    // Mettre à jour l'agence
    await run(`
            UPDATE travel_agencies 
            SET name = ?, 
                type = ?, 
                description = ?, 
                phone = ?, 
                email = ?, 
                address = ?,
                is_active = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
      name,
      type || 'travel_agency',
      description || '',
      phone,
      email || '',
      address || '',
      is_active ? 1 : 0,
      id
    ]);

    res.json({ success: true, message: 'Agence modifiée avec succès' });

  } catch (error) {
    console.error('❌ Erreur modification:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE - Supprimer une agence de voyage (admin) - soft delete
app.delete('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  console.log('🗑️ Suppression agence:', id);

  try {
    // Récupérer l'utilisateur associé
    const agency = await get('SELECT user_id FROM travel_agencies WHERE id = ?', [id]);

    if (agency?.user_id) {
      // Désactiver l'utilisateur
      await run('UPDATE users SET is_active = 0 WHERE id = ?', [agency.user_id]);
    }

    // Désactiver l'agence
    await run('UPDATE travel_agencies SET is_active = 0 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Agence supprimée avec succès' });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Détails d'une agence spécifique (admin)
app.get('/api/admin/travel-agencies/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const agency = await get(`
            SELECT 
                ta.*,
                u.phone as agent_phone,
                u.fullname as agent_name,
                u.is_active as agent_status,
                w.balance as wallet_balance
            FROM travel_agencies ta
            LEFT JOIN users u ON ta.user_id = u.id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE ta.id = ? AND ta.is_active = 1
        `, [id]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Récupérer les trajets de l'agence
    const trips = await query(`
            SELECT * FROM trips 
            WHERE agency_id = ? AND status = 'active'
            ORDER BY departure_date ASC
            LIMIT 20
        `, [id]);

    // Récupérer les statistiques
    const stats = await get(`
            SELECT 
                COUNT(*) as total_trips,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_trips,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'confirmed') as total_bookings,
                (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.payment_status = 'paid') as total_revenue
            FROM trips t
            WHERE t.agency_id = ?
        `, [id, id, id]);

    res.json({
      ...agency,
      trips: trips || [],
      stats: {
        total_trips: stats?.total_trips || 0,
        active_trips: stats?.active_trips || 0,
        total_bookings: stats?.total_bookings || 0,
        total_revenue: stats?.total_revenue || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération agence:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Récupérer les trajets d'une agence (admin)
app.get('/api/admin/travel-agencies/:id/trips', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Vérifier si l'agence existe
    const agency = await get('SELECT id FROM travel_agencies WHERE id = ?', [id]);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    let sql = `
            SELECT * FROM trips 
            WHERE agency_id = ?
        `;
    const params = [id];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY departure_date DESC, departure_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const trips = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count FROM trips 
            WHERE agency_id = ?
            ${status && status !== 'all' ? 'AND status = ?' : ''}
        `, status && status !== 'all' ? [id, status] : [id]);

    res.json({
      trips: trips || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération trajets:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. GET - Récupérer les réservations d'une agence (admin)
app.get('/api/admin/travel-agencies/:id/bookings', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                u.fullname as client_name,
                u.phone as client_phone,
                u.email as client_email
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    const total = await get(`
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
            ${status && status !== 'all' ? 'AND b.booking_status = ?' : ''}
        `, status && status !== 'all' ? [id, status] : [id]);

    res.json({
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. GET - Statistiques d'une agence (admin)
app.get('/api/admin/travel-agencies/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const stats = await get(`
            SELECT 
                (SELECT COUNT(*) FROM trips WHERE agency_id = ?) as total_trips,
                (SELECT COUNT(*) FROM trips WHERE agency_id = ? AND status = 'active') as active_trips,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ?) as total_bookings,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'confirmed') as confirmed_bookings,
                (SELECT COUNT(*) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.booking_status = 'pending') as pending_bookings,
                (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ? AND b.payment_status = 'paid') as total_revenue
            `, [id, id, id, id, id, id]
    );

    // Récupérer le solde de l'agence
    const agency = await get('SELECT user_id FROM travel_agencies WHERE id = ?', [id]);
    let agencyBalance = 0;
    if (agency?.user_id) {
      const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [agency.user_id]);
      agencyBalance = wallet?.balance || 0;
    }

    res.json({
      stats: {
        total_trips: stats?.total_trips || 0,
        active_trips: stats?.active_trips || 0,
        total_bookings: stats?.total_bookings || 0,
        confirmed_bookings: stats?.confirmed_bookings || 0,
        pending_bookings: stats?.pending_bookings || 0,
        total_revenue: stats?.total_revenue || 0,
        agency_balance: agencyBalance
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ error: error.message });
  }
});


// 3. GET - Vérifier le solde avant réservation
app.get('/api/bookings/check-balance', authenticateToken, async (req, res) => {
  const { trip_id, seat_count } = req.query;

  try {
    // Récupérer le trajet
    const trip = await get(`
            SELECT price, available_seats FROM trips 
            WHERE id = ? AND status = 'active'
        `, [trip_id]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier les places disponibles
    const requestedSeats = parseInt(seat_count || 1);
    if (trip.available_seats < requestedSeats) {
      return res.status(400).json({
        error: 'Places insuffisantes',
        available: trip.available_seats,
        requested: requestedSeats
      });
    }

    // Récupérer le solde du client
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    const totalAmount = trip.price * requestedSeats;

    res.json({
      success: true,
      balance: wallet?.balance || 0,
      total_amount: totalAmount,
      is_sufficient: (wallet?.balance || 0) >= totalAmount,
      missing: Math.max(0, totalAmount - (wallet?.balance || 0)),
      trip: {
        price: trip.price,
        available_seats: trip.available_seats,
        requested_seats: requestedSeats
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification solde:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// ROUTES POUR LES RÉSERVATIONS AVEC VÉRIFICATION DES SOLDES (CLIENT + AGENCE)
// ============================================
// ============================================
// ROUTES POUR LES RÉSERVATIONS (SANS REMBOURSEMENT AU REJET)
// ============================================

// 1. POST - Créer une réservation (SANS PAIEMENT, EN ATTENTE)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { trip_id, passenger_name, passenger_phone, passenger_email, seat_count } = req.body;

  console.log('📝 Création réservation en attente:', { trip_id, passenger_name, seat_count });

  try {
    // Validation
    if (!trip_id) {
      return res.status(400).json({ error: 'Trajet requis' });
    }
    if (!passenger_name) {
      return res.status(400).json({ error: 'Nom du passager requis' });
    }
    if (!passenger_phone) {
      return res.status(400).json({ error: 'Téléphone du passager requis' });
    }
    if (!seat_count || seat_count < 1) {
      return res.status(400).json({ error: 'Nombre de places invalide' });
    }

    // Récupérer le trajet
    const trip = await get(`
            SELECT t.*, ta.id as agency_id, ta.name as agency_name, ta.user_id as agency_user_id
            FROM trips t
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE t.id = ? AND t.status = 'active' AND t.available_seats >= ?
        `, [trip_id, seat_count]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non disponible ou places insuffisantes' });
    }

    const totalAmount = trip.price * seat_count;
    const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // ✅ Vérifier le solde du client (alerte seulement, pas de débit)
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    // Réserver les places
    await run(`
            UPDATE trips 
            SET available_seats = available_seats - ?
            WHERE id = ?
        `, [seat_count, trip_id]);

    // Créer la réservation (en attente)
    const result = await run(`
            INSERT INTO bookings (
                booking_number, user_id, trip_id, passenger_name, passenger_phone,
                passenger_email, seat_count, total_amount, payment_status,
                booking_status, reservation_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
      bookingNumber, req.user.userId, trip_id, passenger_name, passenger_phone,
      passenger_email || '', seat_count, totalAmount
    ]);

    // Notification à l'agence
    await run(`
            INSERT INTO booking_notifications (
                agency_id, booking_id, type, message, created_at
            ) VALUES (?, ?, 'new_booking', 
                'Nouvelle réservation en attente de ${passenger_name} pour ${trip.departure_city} → ${trip.destination_city} - ${seat_count} place(s)',
                CURRENT_TIMESTAMP)
        `, [trip.agency_id, result.lastID]);

    // Notification au client
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '⏳ Réservation en attente', 
                'Votre réservation ${bookingNumber} est en attente de validation par ${trip.agency_name}.',
                'booking', CURRENT_TIMESTAMP)
        `, [req.user.userId]);

    res.status(201).json({
      success: true,
      message: 'Réservation créée, en attente de validation par l\'agence',
      booking: {
        id: result.lastID,
        booking_number: bookingNumber,
        passenger_name: passenger_name,
        passenger_phone: passenger_phone,
        seat_count: seat_count,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        departure_city: trip.departure_city,
        destination_city: trip.destination_city,
        departure_date: trip.departure_date,
        departure_time: trip.departure_time,
        agency_name: trip.agency_name
      },
      client_balance: clientWallet.balance
    });

  } catch (error) {
    console.error('❌ Erreur création réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST - Valider une réservation (AVEC PAIEMENT)
app.post('/api/agency/bookings/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('✅ Validation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'agence
    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réservation' });
    }

    // ✅ VÉRIFICATION DU SOLDE DU CLIENT
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    if (clientWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'Solde client insuffisant.',
        client_balance: clientWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - clientWallet.balance
      });
    }

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le client
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 2. Créditer l'agence
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 3. Enregistrer la transaction
      const transactionRef = `BUS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bus_booking', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        user?.phone || '',
        agency?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Paiement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'confirmed', 
                    payment_status = 'paid',
                    validation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

      // 5. Notifications
      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_confirmed', 
                    'Réservation ${booking.booking_number} confirmée - Paiement reçu de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Réservation confirmée', 
                    'Votre réservation ${booking.booking_number} a été confirmée par ${booking.agency_name}. Montant débité: ${booking.total_amount.toLocaleString()} FCFA',
                    'booking', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run('COMMIT');

      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation validée et paiement effectué avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'confirmed',
          payment_status: 'paid'
        },
        balances: {
          client: {
            before: clientWallet.balance,
            after: newClientBalance?.balance || 0,
            debited: booking.total_amount
          },
          agency: {
            before: null,
            after: newAgencyBalance?.balance || 0,
            credited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur validation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});


// 2. PUT - Annuler une réservation (AVEC VÉRIFICATION DU SOLDE DE L'AGENCE)
app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('🔄 Annulation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.user_id = ? AND b.booking_status = 'confirmed'
        `, [id, req.user.userId]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou non confirmée' });
    }

    // Vérifier si la date de départ est passée
    const departureDate = new Date(booking.departure_date + ' ' + (booking.departure_time || '00:00'));
    if (departureDate < new Date()) {
      return res.status(400).json({ error: 'Le trajet est déjà passé, impossible d\'annuler' });
    }

    // ✅ VÉRIFICATION DU SOLDE DE L'AGENCE AVANT REMBOURSEMENT
    const agencyWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

    if (!agencyWallet) {
      return res.status(404).json({
        error: 'Wallet de l\'agence non trouvé. Impossible de procéder au remboursement.'
      });
    }

    // Vérifier si l'agence a assez de solde pour le remboursement
    if (agencyWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'L\'agence n\'a pas assez de solde pour le remboursement.',
        agency_balance: agencyWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - agencyWallet.balance,
        message: `Solde disponible: ${agencyWallet.balance.toLocaleString()} FCFA - Besoin de ${booking.total_amount.toLocaleString()} FCFA`
      });
    }

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter l'agence
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 2. Créditer le client
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 3. Enregistrer le remboursement
      const transactionRef = `REFUND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'refund', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        agency?.phone || '',
        user?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Remboursement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'cancelled', 
                    payment_status = 'refunded',
                    updated_at = CURRENT_TIMESTAMP
            `, [id]);

      // 5. Remettre les places disponibles
      await run(`
                UPDATE trips 
                SET available_seats = available_seats + ?
                WHERE id = ?
            `, [booking.seat_count, booking.trip_id]);

      // 6. Notifications
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '💰 Remboursement effectué', 
                    'Votre réservation ${booking.booking_number} a été annulée et remboursée de ${booking.total_amount.toLocaleString()} FCFA',
                    'refund', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_cancelled', 
                    'Réservation ${booking.booking_number} annulée par le client - Remboursement effectué de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run('COMMIT');

      // Récupérer les nouveaux soldes
      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation annulée et remboursée avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'cancelled',
          payment_status: 'refunded'
        },
        balances: {
          client: {
            before: null,
            after: newClientBalance?.balance || 0,
            credited: booking.total_amount
          },
          agency: {
            before: agencyWallet.balance,
            after: newAgencyBalance?.balance || 0,
            debited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur annulation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST - Valider une réservation (avec vérification des deux soldes)
app.post('/api/agency/bookings/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('✅ Validation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'agence
    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réservation' });
    }

    // ✅ VÉRIFICATION DU SOLDE DU CLIENT
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    if (clientWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'Solde client insuffisant. Montant nécessaire: ' + booking.total_amount.toLocaleString() + ' FCFA',
        client_balance: clientWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - clientWallet.balance
      });
    }

    // ✅ VÉRIFICATION DU SOLDE DE L'AGENCE
    const agencyWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

    if (!agencyWallet) {
      return res.status(404).json({ error: 'Wallet de l\'agence non trouvé' });
    }

    // Démarrer la transaction
    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le client
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 2. Créditer l'agence
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 3. Enregistrer la transaction
      const transactionRef = `BUS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bus_booking', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        user?.phone || '',
        agency?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Paiement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'confirmed', 
                    payment_status = 'paid',
                    validation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `, [id]);

      // 5. Notifications
      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_confirmed', 
                    'Réservation ${booking.booking_number} confirmée - Paiement reçu de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Réservation confirmée', 
                    'Votre réservation ${booking.booking_number} a été confirmée par ${booking.agency_name}. Montant: ${booking.total_amount.toLocaleString()} FCFA',
                    'booking', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run('COMMIT');

      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation validée et paiement effectué avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'confirmed',
          payment_status: 'paid'
        },
        balances: {
          client: {
            before: clientWallet.balance,
            after: newClientBalance?.balance || 0,
            debited: booking.total_amount
          },
          agency: {
            before: agencyWallet.balance,
            after: newAgencyBalance?.balance || 0,
            credited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur validation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Vérifier le solde avant remboursement
app.get('/api/bookings/:id/refund-check', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.user_id = ?
        `, [id, req.user.userId]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    if (booking.booking_status !== 'confirmed') {
      return res.status(400).json({
        error: 'Seules les réservations confirmées peuvent être annulées',
        status: booking.booking_status
      });
    }

    // Vérifier si la date de départ est passée
    const departureDate = new Date(booking.departure_date + ' ' + (booking.departure_time || '00:00'));
    if (departureDate < new Date()) {
      return res.status(400).json({
        error: 'Le trajet est déjà passé, impossible d\'annuler',
        departure_date: booking.departure_date
      });
    }

    // ✅ VÉRIFICATION DU SOLDE DE L'AGENCE POUR LE REMBOURSEMENT
    const agencyWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

    if (!agencyWallet) {
      return res.status(404).json({
        error: 'Wallet de l\'agence non trouvé.',
        can_refund: false
      });
    }

    const canRefund = agencyWallet.balance >= booking.total_amount;

    res.json({
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        total_amount: booking.total_amount,
        departure_city: booking.departure_city,
        destination_city: booking.destination_city,
        departure_date: booking.departure_date
      },
      agency: {
        name: booking.agency_name,
        balance: agencyWallet.balance
      },
      refund: {
        can_refund: canRefund,
        required: booking.total_amount,
        available: agencyWallet.balance,
        missing: Math.max(0, booking.total_amount - agencyWallet.balance)
      },
      message: canRefund
        ? 'Remboursement possible'
        : `L'agence n'a pas assez de solde. Besoin de ${(booking.total_amount - agencyWallet.balance).toLocaleString()} FCFA supplémentaire.`
    });

  } catch (error) {
    console.error('❌ Erreur vérification remboursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Statistiques des réservations pour une agence
app.get('/api/agency/bookings/stats', authenticateToken, async (req, res) => {
  try {
    const agency = await get('SELECT id, name FROM travel_agencies WHERE user_id = ? AND is_active = 1', [req.user.userId]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Récupérer les statistiques
    const stats = await get(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                SUM(CASE WHEN booking_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
        `, [agency.id]);

    // Récupérer le solde de l'agence
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    res.json({
      success: true,
      agency: {
        id: agency.id,
        name: agency.name,
        balance: wallet?.balance || 0
      },
      stats: {
        total: stats?.total_bookings || 0,
        pending: stats?.pending_count || 0,
        confirmed: stats?.confirmed_count || 0,
        rejected: stats?.rejected_count || 0,
        cancelled: stats?.cancelled_count || 0,
        revenue: stats?.total_revenue || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques réservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST - Valider une réservation (avec vérification des deux soldes)
app.post('/api/agency/bookings/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('✅ Validation réservation:', id);

  try {
    // Récupérer la réservation
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.booking_status = 'pending'
        `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou déjà traitée' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'agence
    if (booking.agency_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réservation' });
    }

    // ✅ VÉRIFICATION DU SOLDE DU CLIENT
    const clientWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);

    if (!clientWallet) {
      return res.status(404).json({ error: 'Wallet du client non trouvé' });
    }

    // Vérifier si le client a assez de solde
    if (clientWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'Solde client insuffisant. Montant nécessaire: ' + booking.total_amount.toLocaleString() + ' FCFA',
        client_balance: clientWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - clientWallet.balance
      });
    }

    // ✅ VÉRIFICATION DU SOLDE DE L'AGENCE (pour les frais éventuels)
    const agencyWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

    if (!agencyWallet) {
      return res.status(404).json({ error: 'Wallet de l\'agence non trouvé' });
    }

    // Démarrer la transaction
    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter le client
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 2. Créditer l'agence
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 3. Enregistrer la transaction
      const transactionRef = `BUS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'bus_booking', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        user?.phone || '',
        agency?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Paiement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'confirmed', 
                    payment_status = 'paid',
                    validation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

      // 5. Notifications
      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_confirmed', 
                    'Réservation ${booking.booking_number} confirmée - Paiement reçu de ${booking.total_amount.toLocaleString()} FCFA',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '✅ Réservation confirmée', 
                    'Votre réservation ${booking.booking_number} a été confirmée par ${booking.agency_name}. Montant: ${booking.total_amount.toLocaleString()} FCFA',
                    'booking', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run('COMMIT');

      // Récupérer les nouveaux soldes
      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation validée et paiement effectué avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'confirmed',
          payment_status: 'paid'
        },
        balances: {
          client: {
            before: clientWallet.balance,
            after: newClientBalance?.balance || 0,
            debited: booking.total_amount
          },
          agency: {
            before: agencyWallet.balance,
            after: newAgencyBalance?.balance || 0,
            credited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur validation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT - Annuler une réservation (avec vérification du solde de l'agence)
app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('🔄 Annulation réservation:', id);

  try {
    const booking = await get(`
            SELECT 
                b.*,
                t.id as trip_id,
                t.price,
                t.departure_city,
                t.destination_city,
                t.agency_id,
                ta.user_id as agency_user_id,
                ta.name as agency_name
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.id = ? AND b.user_id = ? AND b.booking_status = 'confirmed'
        `, [id, req.user.userId]);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée ou non confirmée' });
    }

    // Vérifier si la date de départ est passée
    const departureDate = new Date(booking.departure_date + ' ' + (booking.departure_time || '00:00'));
    if (departureDate < new Date()) {
      return res.status(400).json({ error: 'Le trajet est déjà passé, impossible d\'annuler' });
    }

    // ✅ VÉRIFICATION DU SOLDE DE L'AGENCE
    const agencyWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

    if (!agencyWallet) {
      return res.status(404).json({ error: 'Wallet de l\'agence non trouvé' });
    }

    // Vérifier si l'agence a assez de solde pour le remboursement
    if (agencyWallet.balance < booking.total_amount) {
      return res.status(400).json({
        error: 'L\'agence n\'a pas assez de solde pour le remboursement. Solde disponible: ' + agencyWallet.balance.toLocaleString() + ' FCFA',
        agency_balance: agencyWallet.balance,
        required: booking.total_amount,
        missing: booking.total_amount - agencyWallet.balance
      });
    }

    await run('BEGIN TRANSACTION');

    try {
      // 1. Débiter l'agence
      await run('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.agency_user_id]);

      // 2. Créditer le client
      await run('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [booking.total_amount, booking.user_id]);

      // 3. Enregistrer le remboursement
      const transactionRef = `REFUND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await get('SELECT phone FROM users WHERE id = ?', [booking.user_id]);
      const agency = await get('SELECT phone FROM users WHERE id = ?', [booking.agency_user_id]);

      await run(`
                INSERT INTO transactions (
                    reference, sender_phone, receiver_phone, amount, fee, net_amount,
                    type, status, description, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'refund', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
        transactionRef,
        agency?.phone || '',
        user?.phone || '',
        booking.total_amount,
        0,
        booking.total_amount,
        `Remboursement réservation ${booking.booking_number} - ${booking.departure_city} → ${booking.destination_city}`
      ]);

      // 4. Mettre à jour la réservation
      await run(`
                UPDATE bookings 
                SET booking_status = 'cancelled', 
                    payment_status = 'refunded',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

      // 5. Remettre les places disponibles
      await run(`
                UPDATE trips 
                SET available_seats = available_seats + ?
                WHERE id = ?
            `, [booking.seat_count, booking.trip_id]);

      // 6. Notifications
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '💰 Remboursement effectué', 
                    'Votre réservation ${booking.booking_number} a été annulée et remboursée de ${booking.total_amount.toLocaleString()} FCFA',
                    'refund', CURRENT_TIMESTAMP)
            `, [booking.user_id]);

      await run(`
                INSERT INTO booking_notifications (
                    agency_id, booking_id, type, message, created_at
                ) VALUES (?, ?, 'booking_cancelled', 
                    'Réservation ${booking.booking_number} annulée par le client - Remboursement effectué',
                    CURRENT_TIMESTAMP)
            `, [booking.agency_id, id]);

      await run('COMMIT');

      // Récupérer les nouveaux soldes
      const newClientBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.user_id]);
      const newAgencyBalance = await get('SELECT balance FROM wallets WHERE user_id = ?', [booking.agency_user_id]);

      res.json({
        success: true,
        message: 'Réservation annulée et remboursée avec succès',
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: 'cancelled',
          payment_status: 'refunded'
        },
        balances: {
          client: {
            before: null,
            after: newClientBalance?.balance || 0,
            credited: booking.total_amount
          },
          agency: {
            before: agencyWallet.balance,
            after: newAgencyBalance?.balance || 0,
            debited: booking.total_amount
          }
        }
      });

    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur annulation réservation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Vérifier le solde avant réservation
app.get('/api/bookings/check-balance', authenticateToken, async (req, res) => {
  const { trip_id, seat_count } = req.query;

  try {
    // Récupérer le trajet
    const trip = await get(`
            SELECT price, available_seats FROM trips 
            WHERE id = ? AND status = 'active'
        `, [trip_id]);

    if (!trip) {
      return res.status(404).json({ error: 'Trajet non trouvé' });
    }

    // Vérifier les places disponibles
    if (trip.available_seats < parseInt(seat_count || 1)) {
      return res.status(400).json({
        error: 'Places insuffisantes',
        available: trip.available_seats,
        requested: parseInt(seat_count || 1)
      });
    }

    // Récupérer le solde du client
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    const totalAmount = trip.price * (parseInt(seat_count || 1));

    res.json({
      success: true,
      balance: wallet?.balance || 0,
      total_amount: totalAmount,
      is_sufficient: (wallet?.balance || 0) >= totalAmount,
      missing: Math.max(0, totalAmount - (wallet?.balance || 0)),
      trip: {
        price: trip.price,
        available_seats: trip.available_seats,
        requested_seats: parseInt(seat_count || 1)
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification solde:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET - Récupérer les réservations de l'utilisateur
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                t.arrival_time,
                ta.name as agency_name,
                ta.phone as agency_phone,
                ta.address as agency_address
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN travel_agencies ta ON t.agency_id = ta.id
            WHERE b.user_id = ?
        `;
    const params = [req.user.userId];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    // Compter le total
    let countSql = `SELECT COUNT(*) as count FROM bookings WHERE user_id = ?`;
    const countParams = [req.user.userId];
    if (status && status !== 'all') {
      countSql += ' AND booking_status = ?';
      countParams.push(status);
    }
    const total = await get(countSql, countParams);

    res.json({
      success: true,
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. GET - Récupérer les réservations d'une agence
app.get('/api/agency/bookings', authenticateToken, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Vérifier que l'utilisateur est le propriétaire de l'agence
    const agency = await get('SELECT id FROM travel_agencies WHERE user_id = ? AND is_active = 1', [req.user.userId]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    let sql = `
            SELECT 
                b.*,
                t.departure_city,
                t.destination_city,
                t.departure_date,
                t.departure_time,
                t.arrival_time,
                u.fullname as client_name,
                u.phone as client_phone,
                u.email as client_email
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE t.agency_id = ?
        `;
    const params = [agency.id];

    if (status && status !== 'all') {
      sql += ' AND b.booking_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    // Compter le total
    let countSql = `SELECT COUNT(*) as count FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.agency_id = ?`;
    const countParams = [agency.id];
    if (status && status !== 'all') {
      countSql += ' AND b.booking_status = ?';
      countParams.push(status);
    }
    const total = await get(countSql, countParams);

    res.json({
      success: true,
      bookings: bookings || [],
      total: total?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations agence:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. GET - Statistiques des réservations pour une agence
app.get('/api/agency/bookings/stats', authenticateToken, async (req, res) => {
  try {
    const agency = await get('SELECT id FROM travel_agencies WHERE user_id = ? AND is_active = 1', [req.user.userId]);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    const stats = await get(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                SUM(CASE WHEN booking_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue
            FROM bookings b
            JOIN trips t ON b.trip_id = t.id
            WHERE t.agency_id = ?
        `, [agency.id]);

    res.json({
      success: true,
      stats: {
        total: stats?.total_bookings || 0,
        pending: stats?.pending_count || 0,
        confirmed: stats?.confirmed_count || 0,
        rejected: stats?.rejected_count || 0,
        cancelled: stats?.cancelled_count || 0,
        revenue: stats?.total_revenue || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques réservations:', error);
    res.status(500).json({ error: error.message });
  }
});
// Créer une commune (service d'impôt)
app.post('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  const { phone, fullname, commune_name, commune_address, email, password } = req.body;

  console.log('=== CRÉATION COMMUNE ===');
  console.log('Données reçues:', { phone, fullname, commune_name, commune_address, email, password: '***' });

  // Validation
  if (!phone || !/^\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 8 chiffres' });
  }

  if (!fullname || !commune_name) {
    return res.status(400).json({ error: 'Le nom de la commune est requis' });
  }

  try {
    // Vérifier si le numéro existe déjà
    const existingUser = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Générer un mot de passe par défaut si non fourni
    const finalPassword = password || Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Générer une clé privée
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedKey = await bcrypt.hash(privateKey, 10);

    // Démarrer une transaction
    await run('BEGIN TRANSACTION');

    try {
      // 1. Créer l'utilisateur avec rôle 'commune'
      const result = await run(
        `INSERT INTO users (phone, fullname, password_hash, private_key_6, role, is_active, is_verified, commune_name, commune_address, email) 
                 VALUES (?, ?, ?, ?, 'commune', 1, 1, ?, ?, ?)`,
        [phone, fullname, hashedPassword, hashedKey, commune_name, commune_address || '', email || '']
      );

      const userId = result.lastID;
      console.log('✅ Utilisateur créé avec ID:', userId);

      // 2. Vérifier si un wallet existe déjà pour cet utilisateur
      const existingWallet = await get('SELECT id FROM wallets WHERE user_id = ?', [userId]);

      if (!existingWallet) {
        // Créer le wallet pour la commune
        await run(
          `INSERT INTO wallets (user_id, balance, bonus_balance, currency, is_principal, created_at, updated_at) 
                     VALUES (?, 0, 0, 'XAF', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId]
        );
        console.log('✅ Wallet créé pour la commune');
      } else {
        console.log('⚠️ Wallet existant trouvé, utilisation existant');
      }

      // 3. Ajouter également dans la table communes (optionnel)
      try {
        await run(
          `INSERT OR IGNORE INTO communes (phone, name, address, contact_name, contact_phone, email, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [phone, commune_name, commune_address, fullname, phone, email || '', req.user.userId]
        );
        console.log('✅ Entrée ajoutée dans la table communes');
      } catch (communeError) {
        console.log('⚠️ Erreur table communes (non bloquante):', communeError.message);
      }

      await run('COMMIT');

      // Notification WebSocket
      if (io) {
        io.to(`user_${req.user.userId}`).emit('notification', {
          title: '🏛️ Commune créée',
          message: `La commune "${commune_name}" a été créée avec succès. Téléphone: ${phone}`,
          type: 'success',
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Commune créée avec succès',
        commune: {
          id: userId,
          phone: phone,
          name: commune_name,
          address: commune_address,
          email: email,
          password: finalPassword,
          private_key: privateKey
        }
      });

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Erreur création commune:', error);

    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Un wallet existe déjà pour cette commune' });
    } else {
      res.status(500).json({ error: error.message || 'Erreur lors de la création de la commune' });
    }
  }
});

// Récupérer toutes les communes
app.get('/api/admin/communes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const communes = await query(`
            SELECT u.id, u.phone, u.fullname, u.commune_name, u.commune_address, u.email, u.is_active,
                   w.balance
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'commune'
            ORDER BY u.created_at DESC
        `);

    res.json(communes || []);
  } catch (error) {
    console.error('Erreur récupération communes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modifier une commune
app.put('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { commune_name, commune_address, email, is_active } = req.body;

  try {
    await run(
      `UPDATE users SET commune_name = ?, commune_address = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND role = 'commune'`,
      [commune_name, commune_address || '', email || '', is_active ? 1 : 0, id]
    );

    res.json({ success: true, message: 'Commune modifiée avec succès' });
  } catch (error) {
    console.error('Erreur modification commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une commune
app.delete('/api/admin/communes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete - désactiver plutôt que supprimer
    await run('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "commune"', [id]);

    res.json({ success: true, message: 'Commune désactivée avec succès' });
  } catch (error) {
    console.error('Erreur suppression commune:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer la liste des communes pour les paiements
app.get('/api/communes', authenticateToken, async (req, res) => {
  try {
    const communes = await query(`
            SELECT 
                id, 
                phone, 
                commune_name as name, 
                commune_address as address,
                email
            FROM users 
            WHERE role = 'commune' AND is_active = 1
            ORDER BY commune_name
        `);

    res.json(communes || []);

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les statistiques d'une commune
app.get('/api/commune/stats', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    // Récupérer le solde du wallet
    const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [req.user.userId]);

    // Récupérer les paiements reçus
    const payments = await query(`
            SELECT 
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(fee) as total_fees,
                DATE(created_at) as payment_date
            FROM tax_payments
            WHERE commune_id = ?
            GROUP BY DATE(created_at)
            ORDER BY payment_date DESC
            LIMIT 30
        `, [req.user.userId]);

    res.json({
      balance: wallet?.balance || 0,
      total_payments: payments.reduce((sum, p) => sum + p.total_count, 0),
      total_amount: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      recent_payments: payments.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.json({ balance: 0, total_payments: 0, total_amount: 0 });
  }
});

// ============================================
// ROUTES POUR LES ENTREPRISES (AGENTS) - PAIEMENTS REÇUS
// ============================================

// GET - Paiements reçus par l'entreprise
app.get('/api/company/payments', authenticateToken, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  console.log('📋 GET /api/company/payments - User:', req.user.userId);

  try {
    // Récupérer l'ID de l'entreprise associée
    let companyId = null;
    let companyName = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, name, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyName = serviceCompany.name;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id, name FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyName = taxOffice.name;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        payments: [],
        total_amount: 0,
        total_count: 0,
        today_amount: 0,
        this_month_amount: 0,
        message: 'Aucune entreprise associée'
      });
    }

    // Calculer les statistiques
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let stats = { total_amount: 0, total_count: 0, today_amount: 0, this_month_amount: 0 };
    let payments = [];

    // Si c'est un service d'eau/électricité, chercher dans bill_payments
    if (companyType === 'water' || companyType === 'electricity') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    bp.id,
                    bp.receipt_number,
                    bp.customer_name,
                    bp.customer_phone,
                    bp.customer_email,
                    bp.customer_address,
                    bp.meter_number,
                    bp.amount,
                    bp.fee,
                    bp.total_amount,
                    bp.period,
                    bp.invoice_number,
                    bp.service_type,
                    bp.status,
                    bp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM bill_payments bp
                LEFT JOIN users u ON bp.payer_id = u.id
                WHERE bp.company_id = ? AND bp.status = 'completed'
                ORDER BY bp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    // Si c'est un service d'impôts, chercher dans tax_payments
    if (companyType === 'tax_office') {
      stats = await get(`
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN amount ELSE 0 END), 0) as today_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN amount ELSE 0 END), 0) as this_month_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [today, firstDayOfMonth, companyId]);

      payments = await query(`
                SELECT 
                    tp.id,
                    tp.receipt_number,
                    tp.taxpayer_name as customer_name,
                    tp.taxpayer_phone as customer_phone,
                    tp.taxpayer_email as customer_email,
                    tp.taxpayer_address as customer_address,
                    NULL as meter_number,
                    tp.amount,
                    tp.fee,
                    tp.total_amount,
                    tp.tax_period as period,
                    NULL as invoice_number,
                    tp.tax_type as service_type,
                    tp.status,
                    tp.created_at,
                    u.fullname as payer_name,
                    u.phone as payer_phone
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.office_id = ? AND tp.status = 'completed'
                ORDER BY tp.created_at DESC
                LIMIT ? OFFSET ?
            `, [companyId, parseInt(limit), parseInt(offset)]);
    }

    console.log(`✅ ${payments.length} paiements trouvés pour ${companyName}`);

    res.json({
      payments: payments || [],
      total_amount: stats?.total_amount || 0,
      total_count: stats?.total_count || 0,
      today_amount: stats?.today_amount || 0,
      this_month_amount: stats?.this_month_amount || 0,
      company: {
        id: companyId,
        name: companyName,
        type: companyType
      }
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/payments:', error);
    res.status(500).json({
      error: error.message,
      payments: [],
      total_amount: 0,
      total_count: 0,
      today_amount: 0,
      this_month_amount: 0
    });
  }
});

// GET - Détails d'un paiement spécifique pour l'entreprise
app.get('/api/company/payments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    let payment = null;

    // Chercher d'abord dans bill_payments
    payment = await get(`
            SELECT 
                bp.*,
                u.fullname as payer_name,
                u.phone as payer_phone,
                u.email as payer_email
            FROM bill_payments bp
            LEFT JOIN users u ON bp.payer_id = u.id
            WHERE bp.id = ? AND bp.status = 'completed'
        `, [id]);

    // Si pas trouvé, chercher dans tax_payments
    if (!payment) {
      payment = await get(`
                SELECT 
                    tp.*,
                    u.fullname as payer_name,
                    u.phone as payer_phone,
                    u.email as payer_email
                FROM tax_payments tp
                LEFT JOIN users u ON tp.payer_id = u.id
                WHERE tp.id = ? AND tp.status = 'completed'
            `, [id]);
    }

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(payment);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques de l'entreprise
app.get('/api/company/stats', authenticateToken, async (req, res) => {
  try {
    let companyId = null;
    let companyType = null;

    // Chercher dans service_companies
    const serviceCompany = await get(`
            SELECT id, type FROM service_companies WHERE user_id = ?
        `, [req.user.userId]);

    if (serviceCompany) {
      companyId = serviceCompany.id;
      companyType = serviceCompany.type;
    }

    // Si pas trouvé, chercher dans tax_offices
    if (!companyId) {
      const taxOffice = await get(`
                SELECT id FROM tax_offices WHERE user_id = ?
            `, [req.user.userId]);

      if (taxOffice) {
        companyId = taxOffice.id;
        companyType = 'tax_office';
      }
    }

    if (!companyId) {
      return res.json({
        total_payments: 0,
        total_amount: 0,
        average_amount: 0,
        monthly_stats: []
      });
    }

    let globalStats = { total_payments: 0, total_amount: 0, average_amount: 0 };
    let monthlyStats = [];

    if (companyType === 'water' || companyType === 'electricity') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM bill_payments
                WHERE company_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    if (companyType === 'tax_office') {
      globalStats = await get(`
                SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(amount), 0) as average_amount
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
            `, [companyId]);

      monthlyStats = await query(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM tax_payments
                WHERE office_id = ? AND status = 'completed'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `, [companyId]);
    }

    res.json({
      total_payments: globalStats?.total_payments || 0,
      total_amount: globalStats?.total_amount || 0,
      average_amount: Math.round(globalStats?.average_amount || 0),
      monthly_stats: monthlyStats || []
    });

  } catch (error) {
    console.error('❌ Erreur /api/company/stats:', error);
    res.json({
      total_payments: 0,
      total_amount: 0,
      average_amount: 0,
      monthly_stats: []
    });
  }
});
// Appeler la création des tables au démarrage
// createTaxOfficesTable();



// Paiement d'une taxe vers une commune
app.post('/api/tax/pay', authenticateToken, async (req, res) => {
  const {
    commune_id,
    taxpayer_name,
    taxpayer_phone,
    taxpayer_address,
    business_number,
    property_address,
    tax_type,
    tax_period,
    amount,
    notes
  } = req.body;

  console.log('=== PAIEMENT TAXE ===');
  console.log('Commune ID:', commune_id);
  console.log('Montant:', amount);
  console.log('User:', req.user.userId);

  try {
    // Validation
    if (!commune_id) {
      return res.status(400).json({ error: 'Veuillez sélectionner une commune' });
    }
    if (!taxpayer_name) {
      return res.status(400).json({ error: 'Nom du contribuable requis' });
    }
    if (!taxpayer_phone) {
      return res.status(400).json({ error: 'Téléphone requis' });
    }
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Montant minimum 100 FCFA' });
    }

    // Récupérer l'utilisateur payeur
    const payer = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
    if (!payer) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer la commune (destinataire)
    const commune = await get('SELECT id, phone, commune_name, fullname FROM users WHERE id = ? AND role = "commune"', [commune_id]);
    if (!commune) {
      return res.status(404).json({ error: 'Commune non trouvée' });
    }

    // Calculer les frais (1% pour la plateforme)
    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    // Vérifier le solde du payeur
    const payerWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [payer.id]);
    if (!payerWallet || payerWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // Générer le reçu
    const receiptNumber = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Effectuer les transferts
    await run('BEGIN TRANSACTION');

    try {
      // Débiter le payeur
      await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, payer.id]);

      // Créditer la commune (montant sans frais)
      await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, commune.id]);

      // Créditer le wallet principal des frais
      const mainWallet = await get('SELECT id FROM main_wallet LIMIT 1');
      if (mainWallet) {
        await run('UPDATE main_wallet SET balance = balance + ?, total_revenue = total_revenue + ?', [fee, fee]);
      }

      // Enregistrer la transaction
      const transactionRef = `TAX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await run(
        `INSERT INTO transactions (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, description)
                 VALUES (?, ?, ?, ?, ?, ?, 'tax_payment', 'completed', ?)`,
        [transactionRef, payer.phone, commune.phone, amount, fee, amount, `Paiement de taxe - ${receiptNumber}`]
      );

      // Créer la table tax_payments si elle n'existe pas
      await run(`CREATE TABLE IF NOT EXISTS tax_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT UNIQUE,
                payer_id INTEGER,
                commune_id INTEGER,
                taxpayer_name TEXT,
                taxpayer_phone TEXT,
                taxpayer_address TEXT,
                business_number TEXT,
                property_address TEXT,
                tax_type TEXT,
                tax_period TEXT,
                amount INTEGER,
                fee INTEGER,
                total_amount INTEGER,
                payment_status TEXT DEFAULT 'paid',
                AlkherPay_transaction_ref TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payer_id) REFERENCES users(id),
                FOREIGN KEY (commune_id) REFERENCES users(id)
            )`);

      // Enregistrer le paiement
      await run(
        `INSERT INTO tax_payments (
                    receipt_number, payer_id, commune_id, taxpayer_name, taxpayer_phone,
                    taxpayer_address, business_number, property_address, tax_type,
                    tax_period, amount, fee, total_amount, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNumber, payer.id, commune.id, taxpayer_name, taxpayer_phone,
          taxpayer_address || '', business_number || '', property_address || '',
          tax_type, tax_period || new Date().getFullYear().toString(),
          amount, fee, totalAmount, notes || ''
        ]
      );

      await run('COMMIT');

    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }

    // Notification pour le payeur
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [payer.id, '✅ Paiement de taxe effectué',
      `Vous avez payé ${amount.toLocaleString()} FCFA pour ${tax_type} à ${commune.commune_name}. Reçu: ${receiptNumber}`,
        'tax_payment', `/tax-payment?receipt=${receiptNumber}`]
    );

    // Notification pour la commune
    await run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [commune.id, '💰 Nouveau paiement de taxe reçu',
      `${payer.fullname} (${payer.phone}) a payé ${amount.toLocaleString()} FCFA pour ${tax_type}`,
        'tax_received', `/commune/payments`]
    );

    console.log('✅ Paiement enregistré:', receiptNumber);

    res.json({
      success: true,
      receipt: {
        receipt_number: receiptNumber,
        taxpayer_name,
        taxpayer_phone,
        tax_type,
        amount,
        fee,
        total_amount: totalAmount,
        commune_name: commune.commune_name,
        commune_phone: commune.phone,
        payment_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement taxe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Historique des paiements de taxes de l'utilisateur
app.get('/api/tax/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await query(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.payer_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.json([]);
  }
});

// Récupérer un reçu spécifique
app.get('/api/tax/receipt/:receipt_number', authenticateToken, async (req, res) => {
  const { receipt_number } = req.params;

  try {
    const receipt = await get(`
            SELECT tp.*, u.commune_name, u.phone as commune_phone, u.commune_address
            FROM tax_payments tp
            LEFT JOIN users u ON tp.commune_id = u.id
            WHERE tp.receipt_number = ? AND tp.payer_id = ?
        `, [receipt_number, req.user.userId]);

    if (!receipt) {
      return res.status(404).json({ error: 'Reçu non trouvé' });
    }

    res.json(receipt);

  } catch (error) {
    console.error('❌ Erreur reçu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les paiements reçus par une commune
app.get('/api/commune/payments', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est une commune
  const user = await get('SELECT role FROM users WHERE id = ?', [req.user.userId]);
  if (user.role !== 'commune') {
    return res.status(403).json({ error: 'Accès réservé aux communes' });
  }

  try {
    const payments = await query(`
            SELECT tp.*, u.fullname as payer_name, u.phone as payer_phone
            FROM tax_payments tp
            JOIN users u ON tp.payer_id = u.id
            WHERE tp.commune_id = ?
            ORDER BY tp.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

    res.json(payments || []);

  } catch (error) {
    console.error('❌ Erreur paiements reçus:', error);
    res.json([]);
  }
});

// ============================================
// ROUTES INVESTISSEMENTS - BACKEND COMPLET
// ============================================

// ============================================
// 1. CRÉATION DES TABLES
// ============================================

// ============================================
// CORRECTION COMPLÈTE DES ENDPOINTS D'INVESTISSEMENT
// ============================================

// ✅ 1. Vérifier et créer les tables d'investissement
async function createInvestmentTables() {
  try {
    // Vérifier si la table investment_companies existe
    const tableExists = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='investment_companies'
        `);

    if (!tableExists) {
      console.log('📝 Création de la table investment_companies...');

      // Créer la table investment_companies
      await run(`
                CREATE TABLE investment_companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    fullName TEXT,
                    description TEXT,
                    sector TEXT,
                    location TEXT,
                    website TEXT,
                    email TEXT,
                    phone TEXT,
                    fundingGoal REAL DEFAULT 0,
                    collectedAmount REAL DEFAULT 0,
                    sharesOffered INTEGER DEFAULT 0,
                    sharePrice REAL DEFAULT 1000,
                    color TEXT DEFAULT '#4F46E5',
                    pitch TEXT,
                    team TEXT,
                    achievements TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
      console.log('✅ Table investment_companies créée');
    } else {
      console.log('✅ Table investment_companies existe déjà');

      // Vérifier les colonnes manquantes
      const columns = await query("PRAGMA table_info(investment_companies)");
      const columnNames = columns.map(col => col.name);

      const requiredColumns = [
        { name: 'fullName', type: 'TEXT' },
        { name: 'sector', type: 'TEXT' },
        { name: 'location', type: 'TEXT' },
        { name: 'website', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'pitch', type: 'TEXT' },
        { name: 'team', type: 'TEXT' },
        { name: 'achievements', type: 'TEXT' },
        { name: 'collectedAmount', type: 'REAL' },
        { name: 'sharesOffered', type: 'INTEGER' },
        { name: 'sharePrice', type: 'REAL' }
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          try {
            await run(`ALTER TABLE investment_companies ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ Colonne ${col.name} ajoutée`);
          } catch (err) {
            console.log(`⚠️ Impossible d'ajouter ${col.name}:`, err.message);
          }
        }
      }
    }

    // Vérifier si la table investments existe
    const investmentsTableExists = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='investments'
        `);

    if (!investmentsTableExists) {
      console.log('📝 Création de la table investments...');

      await run(`
                CREATE TABLE investments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    investor_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    amount INTEGER NOT NULL,
                    shares INTEGER NOT NULL,
                    share_price INTEGER NOT NULL,
                    total_amount INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    contract_url TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
      console.log('✅ Table investments créée');
    } else {
      console.log('✅ Table investments existe déjà');

      // Vérifier les colonnes de investments
      const columns = await query("PRAGMA table_info(investments)");
      const columnNames = columns.map(col => col.name);

      if (!columnNames.includes('investor_id')) {
        await run('ALTER TABLE investments ADD COLUMN investor_id INTEGER');
        console.log('✅ Colonne investor_id ajoutée');
      }

      if (!columnNames.includes('total_amount')) {
        await run('ALTER TABLE investments ADD COLUMN total_amount INTEGER');
        console.log('✅ Colonne total_amount ajoutée');
      }
    }

    // Créer les index
    await run('CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_investments_company_id ON investments(company_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_investment_companies_active ON investment_companies(is_active)');
    await run('CREATE INDEX IF NOT EXISTS idx_investment_companies_created_by ON investment_companies(created_by)');

    console.log('✅ Tables d\'investissement prêtes');

  } catch (error) {
    console.error('❌ Erreur création tables investment:', error);
    throw error;
  }
}

// ✅ 2. GET - Liste des entreprises d'investissement (CORRIGÉ)
app.get('/api/investment/companies', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Récupération des entreprises d\'investissement...');

    // Créer les tables si elles n'existent pas
    await createInvestmentTables();

    // Récupérer les entreprises actives
    const companies = await query(`
            SELECT 
                c.*,
                u.fullname as owner_name,
                u.phone as owner_phone,
                (SELECT COUNT(DISTINCT user_id) FROM investments WHERE company_id = c.id AND status = 'active') as investors_count
            FROM investment_companies c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.is_active = 1
            ORDER BY c.created_at DESC
        `);

    // Calculer le montant collecté pour chaque entreprise
    for (const company of companies || []) {
      const collected = await get(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM investments 
                WHERE company_id = ? AND status = 'active'
            `, [company.id]);

      company.collected_amount = collected?.total || 1000;
      company.investors_count = company.investors_count || 1000;
    }

    console.log(`✅ ${companies?.length || 1000} entreprises trouvées`);

    res.json({
      success: true,
      data: companies || []
    });

  } catch (error) {
    console.error('❌ Erreur récupération entreprises:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// ✅ 3. GET - Entreprise de l'utilisateur (CORRIGÉ)
app.get('/api/investment/my-company', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log(`📋 Récupération entreprise pour user ${userId}`);

    await createInvestmentTables();

    const company = await get(`
            SELECT 
                c.*,
                u.fullname as owner_name,
                u.phone as owner_phone
            FROM investment_companies c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.created_by = ? AND c.is_active = 1
            ORDER BY c.id DESC
            LIMIT 1
        `, [userId]);

    if (!company) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucune entreprise trouvée'
      });
    }

    // Calculer le montant collecté
    const collected = await get(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM investments 
            WHERE company_id = ? AND status = 'active'
        `, [company.id]);

    company.collected_amount = collected?.total || 1000;

    // Nombre d'investisseurs
    const investorsCount = await get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM investments 
            WHERE company_id = ? AND status = 'active'
        `, [company.id]);

    company.investors_count = investorsCount?.count || 1000;

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Erreur récupération entreprise:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: null
    });
  }
});

// ✅ 4. GET - Investissements de l'utilisateur (CORRIGÉ)
app.get('/api/investment/my-investments', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log(`📋 Récupération investissements pour user ${userId}`);

    await createInvestmentTables();

    const investments = await query(`
            SELECT 
                i.*,
                c.name as company_name,
                c.sector,
                c.id as company_id,
                c.fullName as company_fullname
            FROM investments i
            LEFT JOIN investment_companies c ON i.company_id = c.id
            WHERE i.user_id = ?
            ORDER BY i.created_at DESC
        `, [userId]);

    console.log(`✅ ${investments?.length || 0} investissements trouvés`);

    res.json({
      success: true,
      data: investments || []
    });

  } catch (error) {
    console.error('❌ Erreur récupération investissements:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// ============================================
// POST - INVESTIR DANS UNE ENTREPRISE (SANS KYC)
// ============================================

app.post('/api/investment/invest', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { company_id, amount, shares } = req.body;

    console.log(`📝 Investissement: user ${userId}, company ${company_id}, amount ${amount}`);

    try {
        await createInvestmentTables();

        // ✅ SUPPRIMER LA VÉRIFICATION KYC
        // Plus de vérification KYC - tout le monde peut investir

        // Vérifier les données
        if (!company_id || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Données d\'investissement invalides'
            });
        }

        // Vérifier que l'entreprise existe
        const company = await get(`
            SELECT * FROM investment_companies 
            WHERE id = ? AND is_active = 1
        `, [company_id]);

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Entreprise non trouvée'
            });
        }

        // Vérifier que l'utilisateur n'investit pas dans sa propre entreprise
        if (company.created_by === userId) {
            return res.status(400).json({
                success: false,
                error: 'Vous ne pouvez pas investir dans votre propre entreprise'
            });
        }

        // Vérifier le solde de l'utilisateur
        const wallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [userId]);

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Solde insuffisant'
            });
        }

        // Démarrer la transaction
        await run('BEGIN TRANSACTION');

        const sharesCount = shares || Math.floor(amount / (company.sharePrice || 1000));
        const sharePrice = company.sharePrice || 1000;
        const totalAmount = sharesCount * sharePrice;

        // Enregistrer l'investissement
        const result = await run(`
            INSERT INTO investments (
                user_id,
                investor_id,
                company_id,
                amount,
                shares,
                share_price,
                total_amount,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [userId, userId, company_id, totalAmount, sharesCount, sharePrice, totalAmount]);

        // Débiter le wallet
        await run(`
            UPDATE wallets 
            SET balance = balance - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [totalAmount, userId]);

        // Mettre à jour le montant collecté
        await run(`
            UPDATE investment_companies 
            SET collectedAmount = COALESCE(collectedAmount, 0) + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [totalAmount, company_id]);

        await run('COMMIT');

        console.log(`✅ Investissement enregistré avec ID: ${result.lastID}`);

        // Notification à l'utilisateur
        await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '💰 Investissement réussi', 
                    'Vous avez investi ' || ? || ' FCFA dans "' || ? || '"',
                    'success', CURRENT_TIMESTAMP)
        `, [userId, totalAmount.toLocaleString(), company.name]);

        res.json({
            success: true,
            message: 'Investissement réussi',
            data: {
                id: result.lastID,
                amount: totalAmount,
                shares: sharesCount,
                share_price: sharePrice,
                company_id: company_id,
                company_name: company.name
            }
        });

    } catch (error) {
        await run('ROLLBACK');
        console.error('❌ Erreur investissement:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'INVEST_ERROR'
        });
    }
});

// ✅ 5. GET - Nombre d'investisseurs (CORRIGÉ)
app.get('/api/investment/investors-count', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Récupération nombre d\'investisseurs...');

    await createInvestmentTables();

    const result = await get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM investments 
            WHERE status = 'active'
        `);

    res.json({
      success: true,
      count: result?.count || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération investisseurs:', error);
    res.json({
      success: true,
      count: 0
    });
  }
});


// ============================================
// 7. ROUTES - STATISTIQUES ET SECTEURS
// ============================================

// GET - Secteurs disponibles
app.get('/api/investment/sectors', authenticateToken, async (req, res) => {
  try {
    const sectors = await query(`
            SELECT DISTINCT sector FROM investment_companies 
            WHERE status = 'active'
            ORDER BY sector
        `);

    res.json(sectors.map(s => s.sector) || []);

  } catch (error) {
    console.error('Erreur:', error);
    res.json([]);
  }
});

// GET - Statistiques globales
app.get('/api/investment/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                COUNT(*) as total_companies,
                COALESCE(SUM(funding_goal), 0) as total_funding_goal,
                COALESCE((
                    SELECT SUM(amount) FROM investments WHERE status = 'completed'
                ), 0) as total_invested,
                COALESCE((
                    SELECT COUNT(DISTINCT investor_id) FROM investments WHERE status = 'completed'
                ), 0) as total_investors
            FROM investment_companies
            WHERE status = 'active'
        `);

    res.json(stats || {
      total_companies: 1000,
      total_funding_goal: 1000,
      total_invested: 1000,
      total_investors: 1000
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.json({
      total_companies: 1000,
      total_funding_goal: 1000,
      total_invested: 1000,
      total_investors: 1000
    });
  }
});



// ============================================
// CREATE INVESTMENT COMPANY - AVEC VÉRIFICATION COMPLÈTE
// ============================================

app.post('/api/admin/investment-companies', authenticateToken, requireAdmin, async (req, res) => {
  const adminId = req.user.userId;
  const {
    name,
    fullName,
    description,
    logo,
    contact_phone,
    contact_email,
    address,
    website,
    color,
    // Pour l'agent associé
    agent_phone,
    agent_password,
    agent_fullname
  } = req.body;

  console.log('📝 Création entreprise d\'investissement par admin:', adminId);

  try {
    // ✅ 1. Vérifier que l'admin existe et a les droits
    const admin = await get(`
            SELECT id, role, is_active, is_verified, kyc_level 
            FROM users 
            WHERE id = ?
        `, [adminId]);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin non trouvé'
      });
    }

    if (admin.is_active !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte est inactif. Veuillez contacter le support.'
      });
    }

    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas les droits pour créer une entreprise'
      });
    }

    console.log('✅ Admin vérifié:', { id: admin.id, role: admin.role });

    // ✅ 2. Vérifier si l'agent existe (si fourni)
    let agentId = null;

    if (agent_phone) {
      const agent = await get(`
                SELECT id, fullname, phone, role, is_active, is_verified, kyc_level 
                FROM users 
                WHERE phone = ?
            `, [agent_phone]);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: `Agent avec le téléphone ${agent_phone} non trouvé`
        });
      }

      // Vérifier que l'utilisateur est un agent
      if (agent.role !== 'agent') {
        return res.status(400).json({
          success: false,
          error: `L'utilisateur ${agent.fullname} n'est pas un agent (rôle: ${agent.role})`
        });
      }

      // Vérifier que l'agent est actif
      if (agent.is_active !== 1) {
        return res.status(400).json({
          success: false,
          error: `L'agent ${agent.fullname} est inactif`
        });
      }

      // Vérifier que l'agent est vérifié
      if (agent.is_verified !== 1) {
        return res.status(400).json({
          success: false,
          error: `L'agent ${agent.fullname} n'est pas vérifié. Un agent doit être vérifié pour gérer une entreprise d'investissement.`
        });
      }

      // Vérifier le niveau KYC de l'agent
      if (agent.kyc_level < 2) {
        return res.status(400).json({
          success: false,
          error: `L'agent ${agent.fullname} n'a pas le niveau KYC requis (niveau 2 minimum). Niveau actuel: ${agent.kyc_level}`
        });
      }

      agentId = agent.id;
      console.log('✅ Agent vérifié:', { id: agent.id, name: agent.fullname, kyc_level: agent.kyc_level });
    }

    // ✅ 3. Si pas d'agent spécifié, en créer un nouveau
    if (!agentId && agent_password) {
      // Vérifier que le mot de passe est valide
      if (!agent_password || agent_password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Le mot de passe de l\'agent doit contenir au moins 4 caractères'
        });
      }

      // Générer un numéro de téléphone unique
      let newAgentPhone = `62${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      let existingPhone = await get('SELECT id FROM users WHERE phone = ?', [newAgentPhone]);
      let attempts = 0;
      while (existingPhone && attempts < 10) {
        newAgentPhone = `62${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        existingPhone = await get('SELECT id FROM users WHERE phone = ?', [newAgentPhone]);
        attempts++;
      }

      if (existingPhone) {
        return res.status(500).json({
          success: false,
          error: 'Impossible de générer un numéro de téléphone unique'
        });
      }

      // Générer la clé privée
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(agent_password, 10);
      const hashedKey = await bcrypt.hash(privateKey, 10);

      // Créer l'agent
      await run('BEGIN TRANSACTION');

      const agentResult = await run(`
                INSERT INTO users (
                    phone, fullname, password_hash, private_key_6,
                    role, is_active, is_verified, kyc_level,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'agent', 1, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [newAgentPhone, agent_fullname || name, hashedPassword, hashedKey]);

      agentId = agentResult.lastID;

      // Créer le wallet de l'agent
      await run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [agentId]);

      await run('COMMIT');

      console.log('✅ Nouvel agent créé:', { id: agentId, phone: newAgentPhone });

      // Ajouter aux informations à retourner
      var newAgentInfo = {
        phone: newAgentPhone,
        password: agent_password,
        private_key: privateKey
      };
    }

    // ✅ 4. Créer l'entreprise d'investissement
    await run('BEGIN TRANSACTION');

    const companyResult = await run(`
            INSERT INTO investment_companies (
                name,
                fullName,
                description,
                logo,
                contact_phone,
                contact_email,
                address,
                website,
                color,
                created_by,
                is_active,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
      name,
      fullName || name,
      description || '',
      logo || '🏢',
      contact_phone || '',
      contact_email || '',
      address || '',
      website || '',
      color || '#4F46E5',
      adminId
    ]);

    const companyId = companyResult.lastID;

    // ✅ 5. Associer l'agent à l'entreprise (si un agent est associé)
    if (agentId) {
      await run(`
                UPDATE investment_companies 
                SET user_id = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [agentId, companyId]);
    }

    await run('COMMIT');

    console.log('✅ Entreprise d\'investissement créée:', { id: companyId, name });

    // ✅ 6. Log l'action
    await run(`
            INSERT INTO admin_logs (
                admin_id,
                action,
                target_type,
                target_id,
                details,
                created_at
            ) VALUES (?, 'create_investment_company', 'investment_companies', ?, ?, CURRENT_TIMESTAMP)
        `, [adminId, companyId, JSON.stringify({ name, agent_id: agentId })]);

    // ✅ 7. Notification
    await run(`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, '🏢 Nouvelle entreprise d\'investissement', 
                    'L\'entreprise "' || ? || '" a été créée avec succès.',
                    'success', CURRENT_TIMESTAMP)
        `, [adminId, name]);

    res.status(201).json({
      success: true,
      message: 'Entreprise d\'investissement créée avec succès',
      company: {
        id: companyId,
        name: name,
        fullName: fullName || name,
        agent: agentId ? {
          id: agentId,
          phone: agent_phone || newAgentInfo?.phone,
          fullname: agent_fullname || name
        } : null
      },
      agent_credentials: newAgentInfo || undefined
    });

  } catch (error) {
    await run('ROLLBACK');
    console.error('❌ Erreur création entreprise d\'investissement:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// ============================================
// FONCTION DE VÉRIFICATION DES STATUTS UTILISATEUR
// ============================================

async function validateUserStatus(userId, requiredRole = null, minKycLevel = 0) {
  try {
    const user = await get(`
            SELECT 
                id,
                fullname,
                phone,
                email,
                role,
                is_active,
                is_verified,
                kyc_level,
                created_at,
                updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);

    if (!user) {
      return {
        valid: false,
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      };
    }

    // Vérifier si le compte est actif
    if (user.is_active !== 1) {
      return {
        valid: false,
        error: 'Le compte utilisateur est inactif',
        code: 'USER_INACTIVE',
        user: user
      };
    }

    // Vérifier si le compte est vérifié
    if (user.is_verified !== 1) {
      return {
        valid: false,
        error: 'Le compte utilisateur n\'est pas vérifié',
        code: 'USER_NOT_VERIFIED',
        user: user
      };
    }

    // Vérifier le rôle requis
    if (requiredRole && user.role !== requiredRole) {
      return {
        valid: false,
        error: `Rôle requis: ${requiredRole}, Rôle actuel: ${user.role}`,
        code: 'INVALID_ROLE',
        user: user
      };
    }

    // Vérifier le niveau KYC
    if (user.kyc_level < minKycLevel) {
      return {
        valid: false,
        error: `Niveau KYC requis: ${minKycLevel}, Niveau actuel: ${user.kyc_level}`,
        code: 'INSUFFICIENT_KYC',
        user: user
      };
    }

    return {
      valid: true,
      user: user,
      message: 'Utilisateur valide'
    };

  } catch (error) {
    console.error('❌ Erreur validation user:', error);
    return {
      valid: false,
      error: error.message,
      code: 'VALIDATION_ERROR'
    };
  }
}

// ============================================
// MIDDLEWARE DE VÉRIFICATION
// ============================================

// Vérifier que l'utilisateur peut gérer une entreprise d'investissement
async function canManageInvestmentCompany(req, res, next) {
  const userId = req.user.userId;

  const validation = await validateUserStatus(userId, 'admin', 2);

  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      error: validation.error,
      code: validation.code
    });
  }

  req.validatedUser = validation.user;
  next();
}

// Vérifier qu'un agent peut être associé à une entreprise
async function canBeInvestmentAgent(req, res, next) {
  const { agent_phone } = req.body;

  if (!agent_phone) {
    return next(); // Pas d'agent à vérifier
  }

  const agent = await get(`
        SELECT id, fullname, role, is_active, is_verified, kyc_level 
        FROM users 
        WHERE phone = ?
    `, [agent_phone]);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent avec le téléphone ${agent_phone} non trouvé`
    });
  }

  // Vérifications
  if (agent.role !== 'agent') {
    return res.status(400).json({
      success: false,
      error: `L'utilisateur ${agent.fullname} n'est pas un agent`
    });
  }

  if (agent.is_active !== 1) {
    return res.status(400).json({
      success: false,
      error: `L'agent ${agent.fullname} est inactif`
    });
  }

  if (agent.is_verified !== 1) {
    return res.status(400).json({
      success: false,
      error: `L'agent ${agent.fullname} n'est pas vérifié`
    });
  }

  if (agent.kyc_level < 2) {
    return res.status(400).json({
      success: false,
      error: `L'agent ${agent.fullname} n'a pas le niveau KYC requis (niveau 2 minimum)`
    });
  }

  req.validatedAgent = agent;
  next();
}

// GET - Entreprises en attente de vérification (admin)
app.get('/api/admin/investment/companies/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const companies = await query(`
            SELECT 
                ic.*,
                u.fullname as owner_name,
                u.phone as owner_phone,
                u.email as owner_email
            FROM investment_companies ic
            JOIN users u ON ic.user_id = u.id
            WHERE ic.is_verified = 1
            ORDER BY ic.created_at ASC
        `);

    res.json(companies || []);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Vérifier une entreprise (admin)
app.put('/api/admin/investment/companies/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_verified } = req.body;

  try {
    await run(`
            UPDATE investment_companies 
            SET is_verified = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [is_verified ? 1 : 0, id]);

    // Notification au propriétaire
    const company = await get('SELECT user_id, name FROM investment_companies WHERE id = ?', [id]);

    if (company) {
      await run(`
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES (?, '🏢 Entreprise ${is_verified ? 'vérifiée' : 'rejetée'}', 
                        'Votre entreprise "${company.name}" a été ${is_verified ? 'vérifiée' : 'rejetée'} par l\'administrateur', 
                        'investment', CURRENT_TIMESTAMP)
            `, [company.user_id]);
    }

    res.json({
      success: true,
      message: `Entreprise ${is_verified ? 'vérifiée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 9. INITIALISATION
// ============================================

// Appeler lors du démarrage du serveur
async function initializeInvestmentSystem() {
  try {
    await createInvestmentTables();
    console.log('✅ Système d\'investissement initialisé');
  } catch (error) {
    console.error('Erreur initialisation investissement:', error);
  }
}



// Dans server.js - GET détail d'une entreprise (déjà présent)
app.get('/api/investment/companies/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const company = await get(`
            SELECT 
                ic.*,
                u.fullname as owner_name,
                u.phone as owner_phone,
                u.email as owner_email,
                COALESCE((
                    SELECT SUM(amount) FROM investments 
                    WHERE company_id = ic.id AND status = 'completed'
                ), 0) as collected_amount,
                COALESCE((
                    SELECT COUNT(DISTINCT investor_id) FROM investments 
                    WHERE company_id = ic.id AND status = 'completed'
                ), 0) as investors_count
            FROM investment_companies ic
            JOIN users u ON ic.user_id = u.id
            WHERE ic.id = ? AND ic.status = 'active'
        `, [id]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Récupérer les investisseurs
    const investors = await query(`
            SELECT 
                i.*,
                u.fullname as investor_name,
                u.phone as investor_phone,
                u.email as investor_email
            FROM investments i
            JOIN users u ON i.investor_id = u.id
            WHERE i.company_id = ? AND i.status = 'completed'
            ORDER BY i.amount DESC
        `, [id]);

    company.investors = investors || [];

    res.json(company);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});


//========================================

//=========================================
// ============================================
// ROUTES RAPPORTS D'INVESTISSEMENT
// ============================================

// GET - Générer un rapport complet d'investissement (PDF)
app.get('/api/investment/report/:companyId', authenticateToken, async (req, res) => {
  const { companyId } = req.params;

  console.log('📊 Génération rapport d\'investissement - Company:', companyId);

  try {
    // 1. Récupérer les informations de l'entreprise
    const company = await get(`
            SELECT 
                ic.*,
                u.fullname as owner_name,
                u.phone as owner_phone,
                u.email as owner_email
            FROM investment_companies ic
            JOIN users u ON ic.user_id = u.id
            WHERE ic.id = ?
        `, [companyId]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // 2. Récupérer tous les investisseurs
    const investors = await query(`
            SELECT 
                i.*,
                u.fullname as investor_name,
                u.phone as investor_phone,
                u.email as investor_email
            FROM investments i
            JOIN users u ON i.investor_id = u.id
            WHERE i.company_id = ? AND i.status = 'completed'
            ORDER BY i.amount DESC
        `, [companyId]);

    // 3. Calculer les statistiques
    const totalInvested = investors.reduce((sum, inv) => sum + inv.amount, 0);
    const totalShares = investors.reduce((sum, inv) => sum + (inv.shares || 0), 0);
    const averageInvestment = investors.length > 0 ? totalInvested / investors.length : 0;

    // 4. Statistiques mensuelles
    const monthlyStats = await query(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as count,
                SUM(amount) as total
            FROM investments
            WHERE company_id = ? AND status = 'completed'
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
            LIMIT 12
        `, [companyId]);

    // 5. Top investisseurs
    const topInvestors = investors.slice(0, 10);

    // 6. Générer le rapport en PDF
    const reportData = {
      company: {
        id: company.id,
        name: company.name,
        sector: company.sector,
        description: company.description,
        funding_goal: company.funding_goal,
        created_at: company.created_at,
        owner: {
          name: company.owner_name,
          phone: company.owner_phone,
          email: company.owner_email
        }
      },
      stats: {
        totalInvestors: investors.length,
        totalInvested: totalInvested,
        totalShares: totalShares,
        averageInvestment: averageInvestment,
        progress: company.funding_goal > 0 ? (totalInvested / company.funding_goal) * 100 : 0
      },
      monthlyStats: monthlyStats || [],
      topInvestors: topInvestors,
      generatedAt: new Date().toISOString()
    };

    // Envoyer les données au frontend pour générer le PDF
    res.json({
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('❌ Erreur génération rapport:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Rapport simplifié (JSON)
app.get('/api/investment/report/:companyId/summary', authenticateToken, async (req, res) => {
  const { companyId } = req.params;

  try {
    // Récupérer les données de base
    const company = await get(`
            SELECT 
                ic.*,
                u.fullname as owner_name,
                COUNT(DISTINCT i.investor_id) as investor_count,
                COALESCE(SUM(i.amount), 0) as total_invested,
                COALESCE(SUM(i.shares), 0) as total_shares
            FROM investment_companies ic
            JOIN users u ON ic.user_id = u.id
            LEFT JOIN investments i ON ic.id = i.company_id AND i.status = 'completed'
            WHERE ic.id = ?
            GROUP BY ic.id
        `, [companyId]);

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Progress
    const progress = company.funding_goal > 0
      ? (company.total_invested / company.funding_goal) * 100
      : 0;

    res.json({
      success: true,
      summary: {
        company_name: company.name,
        sector: company.sector,
        owner: company.owner_name,
        funding_goal: company.funding_goal,
        total_invested: company.total_invested,
        investor_count: company.investor_count,
        total_shares: company.total_shares,
        progress: Math.min(progress, 100),
        remaining: Math.max(company.funding_goal - company.total_invested, 0),
        created_at: company.created_at
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Exporter les investisseurs en CSV
app.get('/api/investment/report/:companyId/export-csv', authenticateToken, async (req, res) => {
  const { companyId } = req.params;

  try {
    const investors = await query(`
            SELECT 
                u.fullname as Nom,
                u.phone as Telephone,
                u.email as Email,
                i.amount as Montant,
                i.shares as Actions,
                i.created_at as Date
            FROM investments i
            JOIN users u ON i.investor_id = u.id
            WHERE i.company_id = ? AND i.status = 'completed'
            ORDER BY i.amount DESC
        `, [companyId]);

    if (investors.length === 0) {
      return res.status(404).json({ error: 'Aucun investisseur trouvé' });
    }

    // Créer le CSV
    const headers = ['Nom', 'Téléphone', 'Email', 'Montant (FCFA)', 'Actions', 'Date'];
    const rows = investors.map(inv => [
      inv.Nom || 'N/A',
      inv.Telephone || 'N/A',
      inv.Email || 'N/A',
      inv.Montant || 0,
      inv.Actions || 0,
      new Date(inv.Date).toLocaleDateString('fr-FR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=investisseurs_${Date.now()}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Statistiques globales d'investissement (admin)
app.get('/api/investment/global-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await get(`
            SELECT 
                COUNT(DISTINCT ic.id) as total_companies,
                COUNT(DISTINCT i.investor_id) as total_investors,
                COALESCE(SUM(i.amount), 0) as total_invested,
                COALESCE(AVG(i.amount), 0) as average_investment,
                COALESCE(SUM(ic.funding_goal), 0) as total_funding_goal
            FROM investment_companies ic
            LEFT JOIN investments i ON ic.id = i.company_id AND i.status = 'completed'
            WHERE ic.status = 'active'
        `);

    // Statistiques par secteur
    const sectorStats = await query(`
            SELECT 
                sector,
                COUNT(*) as count,
                COALESCE(SUM(i.amount), 0) as total
            FROM investment_companies ic
            LEFT JOIN investments i ON ic.id = i.company_id AND i.status = 'completed'
            WHERE ic.status = 'active'
            GROUP BY sector
            ORDER BY total DESC
        `);

    res.json({
      success: true,
      stats: {
        total_companies: stats?.total_companies || 0,
        total_investors: stats?.total_investors || 0,
        total_invested: stats?.total_invested || 0,
        average_investment: Math.round(stats?.average_investment || 0),
        total_funding_goal: stats?.total_funding_goal || 0,
        sector_stats: sectorStats || []
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});
// Appeler cette fonction au démarrage

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
  try {
    // 1. Initialiser la base de données
    await initDatabase();

    // 2. Créer les tables supplémentaires après initialisation
    await createReferralsTable();

    // 3. Créer les tables KYC si nécessaire
    await createKycTables();

    // 4. Mettre à jour le mot de passe admin
    const admin = await get('SELECT id, password_hash FROM users WHERE phone = ?', ['62787307']);
    if (admin && (admin.password_hash === 'PLACEHOLDER_HASH' || admin.password_hash === 'PLACEHOLDER')) {
      const hashedPassword = await hashPassword('08093Ali');
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedKey = await hashPassword(privateKey);
      await run('UPDATE users SET password_hash = ?, private_key_6 = ? WHERE phone = ?',
        [hashedPassword, hashedKey, '62787307']);
      console.log('✅ Admin configuré avec succès');
    }

    // 5. Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Serveur AlkherPay démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur http://localhost:${PORT}`);
      console.log(`🔌 WebSocket actif`);
    });

  } catch (error) {
    console.error('Erreur au démarrage:', error);
    process.exit(1);
  }
}


// Appeler cette fonction au démarrage
module.exports = { app, io };