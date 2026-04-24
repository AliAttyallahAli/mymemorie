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

// Chargement des variables d'environnement
dotenv.config();

// Import des modules internes
const { initDatabase, getDb, query, run, get } = require('./database/db');

// Initialisation de l'application
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:5173",
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

// Transfert entre utilisateurs
app.post('/api/transfer', authenticateToken, async (req, res) => {
    const { receiver_phone, amount, description } = req.body;
    
    if (!receiver_phone || !amount) {
        return res.status(400).json({ error: 'Destinataire et montant requis' });
    }
    
    if (amount < 25) {
        return res.status(400).json({ error: 'Le montant minimum est de 25 FCFA' });
    }
    
    try {
        // Récupérer l'expéditeur
        const sender = await get('SELECT id, phone, fullname FROM users WHERE id = ?', [req.user.userId]);
        
        // Vérifier le solde de l'expéditeur
        const senderWallet = await get('SELECT balance FROM wallets WHERE user_id = ?', [sender.id]);
        
        const fee = Math.floor(amount * 0.02); // 2% de frais
        const totalAmount = amount + fee;
        
        if (senderWallet.balance < totalAmount) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }
        
        // Vérifier le destinataire
        const receiver = await get('SELECT id, phone, fullname, is_active FROM users WHERE phone = ?', [receiver_phone]);
        
        if (!receiver) {
            return res.status(404).json({ error: 'Destinataire non trouvé' });
        }
        
        if (!receiver.is_active) {
            return res.status(400).json({ error: 'Le compte du destinataire est inactif' });
        }
        
        // Récupérer le wallet principal admin
        const adminWallet = await get(
            `SELECT w.id, w.balance, u.id as user_id 
             FROM wallets w
             JOIN users u ON w.user_id = u.id
             WHERE u.role = 'admin' AND u.phone = '62787307'`
        );
        
        if (!adminWallet) {
            return res.status(500).json({ error: 'Wallet admin non trouvé' });
        }
        
        // Générer la référence
        const reference = generateTransactionReference();
        
        // Effectuer les transferts dans une transaction SQL
        await run('BEGIN TRANSACTION');
        
        try {
            // Débiter l'expéditeur
            await run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [totalAmount, sender.id]);
            
            // Créditer le destinataire
            await run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, receiver.id]);
            
            // Créditer le wallet admin des frais
            await run('UPDATE wallets SET balance = balance + ? WHERE id = ?', [fee, adminWallet.id]);
            
            // Générer XML ISO 20022
            const xml = generateISO20022XML({
                reference,
                sender_phone: sender.phone,
                receiver_phone: receiver.phone,
                amount,
                net_amount: amount,
                fee
            });
            
            // Enregistrer la transaction
            await run(
                `INSERT INTO transactions 
                 (reference, sender_phone, receiver_phone, amount, fee, net_amount, type, status, xml_iso20022, description)
                 VALUES (?, ?, ?, ?, ?, ?, 'transfer', 'completed', ?, ?)`,
                [reference, sender.phone, receiver.phone, amount, fee, amount, xml, description || '']
            );
            
            await run('COMMIT');
            
            // Notifications en temps réel
            await sendRealtimeNotification(
                receiver.id, 
                'Transfert reçu', 
                `Vous avez reçu ${amount.toLocaleString()} FCFA de ${sender.fullname}`,
                'transaction'
            );
            
            await sendRealtimeNotification(
                sender.id,
                'Transfert effectué',
                `Vous avez envoyé ${amount.toLocaleString()} FCFA à ${receiver.fullname}. Frais: ${fee} FCFA`,
                'transaction'
            );
            
            res.json({
                success: true,
                transaction: {
                    reference,
                    amount,
                    fee,
                    total: totalAmount,
                    receiver: receiver.fullname,
                    receiver_phone: receiver.phone,
                    new_balance: senderWallet.balance - totalAmount
                }
            });
            
        } catch (err) {
            await run('ROLLBACK');
            throw err;
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du transfert' });
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

// Obtenir les statistiques admin
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
    res.status(500).json({ error: 'Erreur lors de la récupération des stats' })
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

module.exports = { app, io };