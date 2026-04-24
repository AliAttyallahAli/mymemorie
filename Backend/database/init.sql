-- ============================================
-- CASHPAYS - BASE DE DONNÉES COMPLÈTE
-- ============================================

PRAGMA foreign_keys = ON;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT(8) UNIQUE NOT NULL,
    fullname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    private_key_6 TEXT NOT NULL,
    country TEXT DEFAULT 'Tchad',
    province TEXT NOT NULL,
    city TEXT,
    address TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'agent', 'admin')),
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';

-- Table des wallets
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0,
    is_principal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des agents (informations supplémentaires)
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    agency_number TEXT UNIQUE NOT NULL,
    agency_name TEXT NOT NULL,
    agency_address TEXT NOT NULL,
    agency_phone TEXT(8),
    agency_type TEXT DEFAULT 'secondaire' CHECK(agency_type IN ('principale', 'secondaire')),
    commission_rate INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    sender_phone TEXT(8) NOT NULL,
    receiver_phone TEXT(8) NOT NULL,
    amount INTEGER NOT NULL,
    fee INTEGER DEFAULT 0,
    net_amount INTEGER NOT NULL,
    type TEXT CHECK(type IN ('transfer', 'deposit', 'withdraw', 'fee_collection')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
    xml_iso20022 TEXT,
    qr_data TEXT,
    description TEXT,
    created_by_agent INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (created_by_agent) REFERENCES agents(id)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'alert', 'transaction', 'promo')),
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des annonces (page d'accueil)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    facebook_link TEXT,
    whatsapp_link TEXT,
    telegram_link TEXT,
    website_link TEXT,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table des provinces du Tchad
CREATE TABLE IF NOT EXISTS provinces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    region TEXT
);

-- Table des logs système
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Table des articles de blog
CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    image TEXT,
    published INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index pour le blog
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);
-- ============================================
-- INDEXES pour performances
-- ============================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_sender ON transactions(sender_phone);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_phone);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);


-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Insertion des 23 provinces du Tchad
INSERT OR IGNORE INTO provinces (name, region) VALUES 
('Batha', 'Centre-Est'),
('Chari-Baguirmi', 'Centre-Ouest'),
('Hadjer-Lamis', 'Ouest'),
('Wadi Fira', 'Est'),
('Barh El Gazel', 'Nord'),
('Borkou', 'Nord'),
('Ennedi Est', 'Nord-Est'),
('Ennedi Ouest', 'Nord-Est'),
('Guéra', 'Centre'),
('Kanem', 'Ouest'),
('Lac', 'Ouest'),
('Logone Occidental', 'Sud-Ouest'),
('Logone Oriental', 'Sud-Est'),
('Mandoul', 'Sud'),
('Mayo-Kebbi Est', 'Sud-Ouest'),
('Mayo-Kebbi Ouest', 'Sud-Ouest'),
('Moyen-Chari', 'Sud'),
('Ouaddaï', 'Est'),
('Salamat', 'Sud-Est'),
('Sila', 'Est'),
('Tandjilé', 'Sud'),
('Tibesti', 'Nord'),
('N''Djaména', 'Centre');

-- Création de l'admin principal (phone: 62787307, password: 08093Ali)
-- Note: Le mot de passe sera hashé par l'application, ici c'est un placeholder
INSERT OR IGNORE INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified)
VALUES ('62787307', 'Admin Core Team - CashPays', 'PLACEHOLDER_HASH', 'PLACEHOLDER_KEY', 'N''Djaména', 'admin', 1, 1);

-- Création du wallet principal pour l'admin (90 000 000 FCFA)
INSERT OR IGNORE INTO wallets (user_id, balance, is_principal)
SELECT id, 90000000, 1 FROM users WHERE phone = '62787307';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_wallets_timestamp 
AFTER UPDATE ON wallets
BEGIN
    UPDATE wallets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour créer automatiquement un wallet lors de l'inscription d'un user
CREATE TRIGGER IF NOT EXISTS create_wallet_on_user_insert
AFTER INSERT ON users
WHEN NEW.role = 'user'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 1000);
END;

-- Trigger pour créer automatiquement un wallet agent lors de l'inscription
CREATE TRIGGER IF NOT EXISTS create_wallet_on_agent_insert
AFTER INSERT ON users
WHEN NEW.role = 'agent'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
END;

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des transactions avec noms des utilisateurs
CREATE VIEW IF NOT EXISTS v_transactions_details AS
SELECT 
    t.*,
    s.fullname as sender_name,
    r.fullname as receiver_name,
    CASE 
        WHEN t.type = 'transfer' THEN 'Transfert'
        WHEN t.type = 'deposit' THEN 'Dépôt'
        WHEN t.type = 'withdraw' THEN 'Retrait'
        ELSE t.type
    END as type_label,
    CASE 
        WHEN t.status = 'pending' THEN 'En attente'
        WHEN t.status = 'completed' THEN 'Complété'
        WHEN t.status = 'failed' THEN 'Échoué'
        ELSE t.status
    END as status_label
FROM transactions t
LEFT JOIN users s ON s.phone = t.sender_phone
LEFT JOIN users r ON r.phone = t.receiver_phone;

-- Vue du solde global des wallets
CREATE VIEW IF NOT EXISTS v_global_balance AS
SELECT 
    SUM(balance) as total_balance,
    (SELECT balance FROM wallets w2 JOIN users u2 ON w2.user_id = u2.id WHERE u2.role = 'admin' AND u2.phone = '62787307') as admin_wallet_balance,
    (SELECT SUM(balance) FROM wallets w3 JOIN users u3 ON w3.user_id = u3.id WHERE u3.role = 'user') as users_total_balance,
    (SELECT SUM(balance) FROM wallets w4 JOIN users u4 ON w4.user_id = u4.id WHERE u4.role = 'agent') as agents_total_balance
FROM wallets w
JOIN users u ON w.user_id = u.id;