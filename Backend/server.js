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
const JWT_SECRET = process.env.JWT_SECRET || 'cashpays_super_secret_key_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cashpays_refresh_secret_2024';


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
        <Nm>CashPays System</Nm>
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
// ROUTES TRANSACTIONS
// ============================================
// ============================================
// TRANSFERT ENTRE UTILISATEURS AVEC NOTIFICATIONS
// ============================================
// backend/server.js - Ajouter ces endpoints

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
      VALUES (?, '🔄 PIN réinitialisé', 'Votre code PIN a été réinitialisé par l\'administrateur. Veuillez en définir un nouveau.', 'info', 'security', CURRENT_TIMESTAMP)
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
        VALUES (?, '✅ Bienvenue dans le réseau CashPays', ?, 'success', CURRENT_TIMESTAMP)
      `, [userResult.lastID, `Félicitations ! Votre agence "${application.agency_name}" est maintenant active.`]);
    }
    
    // Notification à l'utilisateur
    const title = action === 'approve' ? '✅ Candidature acceptée' : '❌ Candidature rejetée';
    const message = action === 'approve' 
      ? 'Félicitations ! Votre candidature pour devenir agent CashPays a été acceptée.'
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
  
  switch(type) {
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
      message = `Vous avez déposé ${data.amount.toLocaleString()} FCFA chez ${data.agent_name || 'un agent CashPays'}`;
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
// ROUTES ADMIN
// ============================================
// Correction de l'endpoint /api/transfer
app.post('/api/transfer', authenticateToken, async (req, res) => {
  const { receiver_phone, amount, description } = req.body;
  
  // Validation
  if (!receiver_phone || !amount) {
    return res.status(400).json({ error: 'Destinataire et montant requis' });
  }
  
  const amountNum = parseInt(amount);
  if (amountNum < 25) {
    return res.status(400).json({ error: 'Le montant minimum est de 25 FCFA' });
  }
  
  try {
    // Récupérer l'expéditeur
    const sender = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
    
    // Vérifier le solde
    const senderWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [sender.id]);
    const fee = Math.floor(amountNum * 0.02);
    const totalAmount = amountNum + fee;
    
    if (senderWallet.balance < totalAmount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // Récupérer le destinataire
    const receiver = await get('SELECT id, phone, fullname FROM users WHERE phone = ? AND is_active = 1', [receiver_phone]);
    if (!receiver) {
      return res.status(404).json({ error: 'Destinataire non trouvé' });
    }
    
    if (receiver.id === sender.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer d\'argent à vous-même' });
    }
    
    // Récupérer le wallet admin
    const adminWallet = await get(
      `SELECT w.id FROM wallets w
       JOIN users u ON w.user_id = u.id
       WHERE u.role = 'admin' AND u.phone = '62787307'`
    );
    
    const reference = `CASH-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    await run('BEGIN TRANSACTION');
    
    // Débiter l'expéditeur
    await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, sender.id]);
    
    // Créditer le destinataire
    await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amountNum, receiver.id]);
    
    // Créditer les frais à l'admin
    if (adminWallet) {
      await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
    }
    
    // Générer XML ISO 20022
    const xml = generateISO20022XML({
      reference,
      sender_phone: sender.phone,
      receiver_phone: receiver.phone,
      amount: amountNum,
      net_amount: amountNum,
      fee
    });
    
    // Enregistrer la transaction
    await run(`
      INSERT INTO transactions 
      (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, xml_iso20022, description, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'transfer', 'completed', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [reference, sender.phone, receiver.phone, amountNum, fee, amountNum, xml, description || '']);
    
    await run('COMMIT');
    
    // Envoyer les notifications
    await sendTransactionNotification(sender.id, 'transfer_sent', {
      amount: amountNum,
      fee: fee,
      receiver_name: receiver.fullname,
      receiver_phone: receiver.phone,
      reference: reference,
      new_balance: senderWallet.balance - totalAmount
    });
    
    await sendTransactionNotification(receiver.id, 'transfer_received', {
      amount: amountNum,
      sender_name: sender.fullname,
      sender_phone: sender.phone,
      reference: reference,
      new_balance: (await get('SELECT balance FROM wallets WHERE user_id = ?', [receiver.id])).balance
    });
    
    // ✅ CORRECTION ICI : objet transaction correctement défini
    res.json({ 
      success: true, 
      transaction: {
        reference: reference,
        amount: amountNum,
        fee: fee,
        receiver: receiver.fullname,
        receiver_phone: receiver.phone,
        new_balance: senderWallet.balance - totalAmount
      }
    });
    
  } catch (error) {
    await run('ROLLBACK');
    console.error('Erreur transfert:', error);
    res.status(500).json({ error: 'Erreur lors du transfert' });
  }
});

// Correction de la fonction sendNotification
async function sendNotification(userId, title, message, type, category = 'info', metadata = {}) {
  try {
    const result = await run(`
      INSERT INTO notifications (user_id, title, message, type, category, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, title, message, type, category, JSON.stringify(metadata)]);
    
    // Envoyer via WebSocket - utiliser l'instance io globale
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
    console.error('Erreur envoi notification:', error);
    return null;
  }
}

// Stocker l'instance io globalement
let globalIo = null;

// Dans l'initialisation de Socket.IO
io.on('connection', (socket) => {
  globalIo = io;
  // ... reste du code
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
      `, [admin.id, `${fullname} a postulé pour devenir agent CashPays`]);
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
        VALUES (?, 'Bienvenue dans le réseau CashPays', ?, 'success', CURRENT_TIMESTAMP)
      `, [userResult.lastID, `Félicitations ! Votre agence "${application.agency_name}" est maintenant active.`]);
    }
    
    // Notification à l'utilisateur
    const title = action === 'approve' ? '✅ Candidature acceptée' : '❌ Candidature rejetée';
    const message = action === 'approve' 
      ? 'Félicitations ! Votre candidature pour devenir agent CashPays a été acceptée.'
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
      } catch (e) {}
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
    
    await run(`
      INSERT OR REPLACE INTO app_settings 
      (id, min_transaction, max_transaction, transfer_fee, deposit_fee, withdrawal_fee, 
       referral_bonus, maintenance_mode, allow_international, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      minTransaction || 25,
      maxTransaction || 10000000,
      transferFee || 2,
      depositFee || 0,
      withdrawalFee || 2,
      referralBonus || 500,
      maintenanceMode ? 1 : 0,
      allowInternationalTransfer ? 1 : 0
    ])
    
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
// ENDPOINTS KYC CORRIGÉS
// ============================================

// Obtenir le statut KYC de l'utilisateur
app.get('/api/kyc/status', authenticateToken, async (req, res) => {
    try {
        const kycRequest = await get(`
            SELECT kr.*, u.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.verified_by = u.id
            WHERE kr.user_id = ? 
            ORDER BY kr.submitted_at DESC 
            LIMIT 1
        `, [req.user.userId]);
        
        if (!kycRequest) {
            const limits = await get('SELECT * FROM kyc_limits WHERE level = 0');
            return res.json({
                status: 'none',
                level: 0,
                limits: limits || null,
                documents: []
            });
        }
        
        const documents = await query(`
            SELECT id, document_type, filename, uploaded_at
            FROM kyc_documents 
            WHERE kyc_request_id = ?
        `, [kycRequest.id]);
        
        const limits = await get('SELECT * FROM kyc_limits WHERE level = ?', [kycRequest.level || 1]);
        
        res.json({
            id: kycRequest.id,
            status: kycRequest.status,
            level: kycRequest.level,
            submittedAt: kycRequest.submitted_at,
            verifiedAt: kycRequest.verified_at,
            verifiedBy: kycRequest.verified_by_name,
            rejectionReason: kycRequest.rejection_reason,
            limits: limits,
            userData: {
                fullname: kycRequest.fullname,
                address: kycRequest.address,
                phone: kycRequest.phone_number
            },
            documents: documents
        });
    } catch (error) {
        console.error('Erreur récupération statut KYC:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du statut KYC' });
    }
});

// Admin: Récupérer toutes les demandes KYC
app.get('/api/admin/kyc/requests', authenticateToken, requireAdmin, async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query;
    
    try {
        let sql = `
            SELECT kr.*, 
                   u.fullname as user_name, 
                   u.phone as user_phone
            FROM kyc_requests kr
            JOIN users u ON kr.user_id = u.id
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
        
        // Récupérer les documents pour chaque demande
        for (let i = 0; i < requests.length; i++) {
            const docs = await query(`
                SELECT id, document_type, filename, uploaded_at
                FROM kyc_documents 
                WHERE kyc_request_id = ?
            `, [requests[i].id]);
            requests[i].documents = docs || [];
        }
        
        let countSql = 'SELECT COUNT(*) as count FROM kyc_requests kr WHERE 1=1';
        const countParams = [];
        
        if (status && status !== 'all') {
            countSql += ' AND kr.status = ?';
            countParams.push(status);
        }
        
        const total = await get(countSql, countParams);
        
        res.json({
            requests: requests || [],
            total: total?.count || 0,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Erreur récupération demandes KYC:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des demandes KYC' });
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

// Obtenir le statut KYC de l'utilisateur
app.get('/api/kyc/status', authenticateToken, async (req, res) => {
    try {
        const kycRequest = await get(`
            SELECT kr.*, u.fullname as verified_by_name
            FROM kyc_requests kr
            LEFT JOIN users u ON kr.verified_by = u.id
            WHERE kr.user_id = ? 
            ORDER BY kr.submitted_at DESC 
            LIMIT 1
        `, [req.user.userId]);
        
        if (!kycRequest) {
            // Obtenir les limites du niveau 0
            const limits = await get('SELECT * FROM kyc_limits WHERE level = 0');
            return res.json({
                status: 'none',
                level: 0,
                limits: limits,
                documents: []
            });
        }
        
        // Obtenir les documents
        const documents = await query(`
            SELECT id, document_type, filename, file_path, uploaded_at
            FROM kyc_documents 
            WHERE kyc_request_id = ?
        `, [kycRequest.id]);
        
        // Obtenir les limites selon le niveau
        const limits = await get('SELECT * FROM kyc_limits WHERE level = ?', [kycRequest.level || 1]);
        
        res.json({
            id: kycRequest.id,
            status: kycRequest.status,
            level: kycRequest.level,
            submittedAt: kycRequest.submitted_at,
            verifiedAt: kycRequest.verified_at,
            verifiedBy: kycRequest.verified_by_name,
            rejectionReason: kycRequest.rejection_reason,
            limits: limits,
            userData: {
                fullname: kycRequest.fullname,
                address: kycRequest.address,
                phone: kycRequest.phone_number
            },
            documents: documents
        });
    } catch (error) {
        console.error('Erreur récupération statut KYC:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du statut KYC' });
    }
});

// Soumettre une demande KYC
app.post('/api/kyc/submit', authenticateToken, upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'proofOfAddress', maxCount: 1 }
]), async (req, res) => {
    const {
        fullname, birthDate, birthPlace, nationality, idType,
        idNumber, idIssueDate, idExpiryDate, address, occupation, phoneNumber
    } = req.body;
    
    const files = req.files;
    
    // Validation
    if (!fullname || !idNumber || !address) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    
    if (!files?.idFront || !files?.selfie || !files?.proofOfAddress) {
        return res.status(400).json({ error: 'Documents obligatoires manquants' });
    }
    
    try {
        // Vérifier si une demande est déjà en cours
        const existingRequest = await get(`
            SELECT id, status FROM kyc_requests 
            WHERE user_id = ? AND status IN ('pending', 'verified')
        `, [req.user.userId]);
        
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(400).json({ error: 'Une demande KYC est déjà en cours de traitement' });
            }
            if (existingRequest.status === 'verified') {
                return res.status(400).json({ error: 'Votre compte est déjà vérifié' });
            }
        }
        
        // Créer la demande KYC
        const result = await run(`
            INSERT INTO kyc_requests (
                user_id, status, level, fullname, birth_date, birth_place,
                nationality, id_type, id_number, id_issue_date, id_expiry_date,
                address, occupation, phone_number, submitted_at
            ) VALUES (?, 'pending', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            req.user.userId, fullname, birthDate || null, birthPlace || null,
            nationality || 'Tchadienne', idType || 'cni', idNumber,
            idIssueDate || null, idExpiryDate || null,
            address, occupation || null, phoneNumber || req.user.phone
        ]);
        
        const kycRequestId = result.lastID;
        
        // Enregistrer les documents
        const documentTypes = ['idFront', 'idBack', 'selfie', 'proofOfAddress'];
        for (const docType of documentTypes) {
            if (files[docType]) {
                const file = files[docType][0];
                await run(`
                    INSERT INTO kyc_documents (kyc_request_id, document_type, filename, file_path, file_size, mime_type)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [kycRequestId, docType, file.filename, file.path, file.size, file.mimetype]);
            }
        }
        
        // Enregistrer dans l'historique
        await run(`
            INSERT INTO kyc_history (user_id, action, status_to, description, created_by)
            VALUES (?, 'submit', 'pending', 'Soumission de la demande KYC', ?)
        `, [req.user.userId, req.user.userId]);
        
        // Notification à l'admin
        const admin = await get('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        if (admin) {
            await run(`
                INSERT INTO notifications (user_id, title, message, type)
                VALUES (?, 'Nouvelle demande KYC', ?, 'alert')
            `, [admin.id, `L'utilisateur ${fullname} a soumis une demande KYC`]);
        }
        
        res.status(201).json({
            success: true,
            message: 'Demande KYC soumise avec succès',
            requestId: kycRequestId
        });
        
    } catch (error) {
        console.error('Erreur soumission KYC:', error);
        res.status(500).json({ error: 'Erreur lors de la soumission KYC' });
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

// Admin: Récupérer toutes les demandes KYC
app.get('/api/admin/kyc/requests', authenticateToken, requireAdmin, async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query;
    
    try {
        let sql = `
            SELECT kr.*, u.fullname as user_name, u.phone as user_phone, u.email as user_email
            FROM kyc_requests kr
            JOIN users u ON kr.user_id = u.id
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
        
        const total = await get(`
            SELECT COUNT(*) as count FROM kyc_requests 
            ${status && status !== 'all' ? 'WHERE status = ?' : ''}
        `, status && status !== 'all' ? [status] : []);
        
        res.json({
            requests,
            total: total.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Erreur récupération demandes KYC:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
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
// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
    try {
        await initDatabase();
        
        // Mettre à jour le mot de passe admin après initialisation
        const admin = await get('SELECT id, password_hash FROM users WHERE phone = ?', ['62787307']);
        if (admin && admin.password_hash === 'PLACEHOLDER_HASH') {
            const hashedPassword = await hashPassword('08093Ali');
            const privateKey = generatePrivateKey();
            const hashedKey = await hashPassword(privateKey);
            await run('UPDATE users SET password_hash = ?, private_key_6 = ? WHERE phone = ?', 
                     [hashedPassword, hashedKey, '62787307']);
            console.log('Admin configuré avec succès');
        }
        
        server.listen(PORT, () => {
            console.log(`🚀 Serveur CashPays démarré sur le port ${PORT}`);
            console.log(`📱 API disponible sur http://localhost:${PORT}`);
            console.log(`🔌 WebSocket actif`);
        });
        
    } catch (error) {
        console.error('Erreur au démarrage:', error);
    }
}

startServer();
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
        bonus: 500
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
        u.created_at as referred_date
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [req.user.userId]);
    
    res.json({
      referral_code: referralCode,
      totalReferrals: stats?.total_referrals || 0,
      totalBonus: stats?.total_bonus || 0,
      pendingBonus: stats?.pending_bonus || 0,
      referrals: referrals || []
    });
    
  } catch (error) {
    console.error('Erreur récupération stats parrainage:', error);
    res.json({
      totalReferrals: 0,
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

// Créer la table des parrainages
const createReferralsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      referral_code TEXT NOT NULL,
      bonus_amount INTEGER DEFAULT 500,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(referred_id)
    )
  `);
};
createReferralsTable();

// src/pages/Profile.jsx - Remplacer la fonction copyReferralLink

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
    const appName = 'CashPays';
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

// Récupérer une demande KYC spécifique par son ID
app.get('/api/admin/kyc/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Récupérer la demande KYC
    const kycRequest = await get(`
      SELECT kr.*, 
             u.fullname as user_name, 
             u.phone as user_phone,
             u.email as user_email
      FROM kyc_requests kr
      JOIN users u ON kr.user_id = u.id
      WHERE kr.id = ?
    `, [id]);
    
    if (!kycRequest) {
      return res.status(404).json({ error: 'Demande KYC non trouvée' });
    }
    
    // Récupérer les documents associés
    const documents = await query(`
      SELECT id, document_type, filename, file_path, file_size, mime_type, uploaded_at
      FROM kyc_documents 
      WHERE kyc_request_id = ?
      ORDER BY uploaded_at DESC
    `, [id]);
    
    // Récupérer l'historique
    const history = await query(`
      SELECT kh.*, u.fullname as created_by_name
      FROM kyc_history kh
      LEFT JOIN users u ON kh.created_by = u.id
      WHERE kh.user_id = ?
      ORDER BY kh.created_at DESC
    `, [kycRequest.user_id]);
    
    res.json({
      ...kycRequest,
      documents: documents || [],
      history: history || []
    });
    
  } catch (error) {
    console.error('Erreur récupération demande KYC:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la demande' });
  }
});

// Récupérer une candidature agent spécifique par son ID
app.get('/api/admin/agent-applications/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const application = await get(`
      SELECT * FROM agent_applications 
      WHERE id = ?
    `, [id]);
    
    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }
    
    // Récupérer l'utilisateur associé si la candidature a été approuvée
    if (application.status === 'approved') {
      const user = await get(`
        SELECT id, phone, fullname, email, role 
        FROM users 
        WHERE phone = ?
      `, [application.phone]);
      application.user = user;
    }
    
    res.json(application);
    
  } catch (error) {
    console.error('Erreur récupération candidature:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
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

// Réinitialiser le mot de passe d'un utilisateur (admin)
app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
  }
  
  try {
    const user = await get('SELECT id, fullname FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
    
    // Créer une notification pour l'utilisateur
    await run(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES (?, '🔐 Mot de passe réinitialisé', 'Votre mot de passe a été réinitialisé par l\'administrateur.', 'alert', CURRENT_TIMESTAMP)
    `, [userId]);
    
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

module.exports = { app, io };