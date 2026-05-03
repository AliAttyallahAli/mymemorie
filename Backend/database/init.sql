-- ============================================
-- CASHPAYS - BASE DE DONNÉES COMPLÈTE
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- TABLE DES UTILISATEURS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT(8) UNIQUE NOT NULL,
    fullname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    private_key_6 TEXT NOT NULL,
    email TEXT,
    country TEXT DEFAULT 'Tchad',
    province TEXT NOT NULL,
    city TEXT,
    address TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'agent', 'admin')),
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE DES WALLETS
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0,
    is_principal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE DES AGENTS
-- ============================================

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

-- ============================================
-- TABLE DES TRANSACTIONS
-- ============================================

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

-- ============================================
-- TABLE DES NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'alert', 'transaction', 'kyc')),
    category TEXT DEFAULT 'info' CHECK(category IN ('info', 'transaction', 'kyc', 'alert', 'security')),
    is_read INTEGER DEFAULT 0,
    metadata TEXT,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE DES ANNONCES
-- ============================================

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

-- ============================================
-- TABLE DES PROVINCES
-- ============================================

CREATE TABLE IF NOT EXISTS provinces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    region TEXT
);

-- ============================================
-- TABLE DES LOGS SYSTEME
-- ============================================

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

-- ============================================
-- TABLE DES SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE DES ARTICLES DE BLOG
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'actualite',
    tags TEXT,
    image_url TEXT,
    author_id INTEGER,
    author_name TEXT,
    status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'archived')),
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- ============================================
-- TABLES KYC (KNOW YOUR CUSTOMER)
-- ============================================

-- Table des demandes KYC
CREATE TABLE IF NOT EXISTS kyc_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected', 'cancelled')),
    level INTEGER DEFAULT 1,
    fullname TEXT NOT NULL,
    birth_date TEXT,
    birth_place TEXT,
    nationality TEXT DEFAULT 'Tchadienne',
    id_type TEXT CHECK(id_type IN ('cni', 'passeport', 'permis')),
    id_number TEXT,
    id_issue_date TEXT,
    id_expiry_date TEXT,
    address TEXT,
    occupation TEXT,
    phone_number TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    verified_by INTEGER,
    rejection_reason TEXT,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Table des documents KYC
CREATE TABLE IF NOT EXISTS kyc_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kyc_request_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id) ON DELETE CASCADE
);

-- Table de l'historique KYC
CREATE TABLE IF NOT EXISTS kyc_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    status_from TEXT,
    status_to TEXT,
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table des limites KYC
CREATE TABLE IF NOT EXISTS kyc_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER DEFAULT 1,
    daily_transaction_limit INTEGER DEFAULT 100000,
    monthly_transaction_limit INTEGER DEFAULT 500000,
    single_transaction_limit INTEGER DEFAULT 50000,
    withdrawal_limit INTEGER DEFAULT 100000,
    description TEXT
);

-- ============================================
-- TABLE DES PARAMETRES APPLICATION
-- ============================================

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE DES MESSAGES DE CONTACT
-- ============================================

CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- INDEXES POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_kyc_request_id ON kyc_documents(kyc_request_id);
CREATE INDEX IF NOT EXISTS idx_kyc_history_user_id ON kyc_history(user_id);

-- ============================================
-- DONNEES INITIALES
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
('Guera', 'Centre'),
('Kanem', 'Ouest'),
('Lac', 'Ouest'),
('Logone Occidental', 'Sud-Ouest'),
('Logone Oriental', 'Sud-Est'),
('Mandoul', 'Sud'),
('Mayo-Kebbi Est', 'Sud-Ouest'),
('Mayo-Kebbi Ouest', 'Sud-Ouest'),
('Moyen-Chari', 'Sud'),
('Ouaddai', 'Est'),
('Salamat', 'Sud-Est'),
('Sila', 'Est'),
('Tandjile', 'Sud'),
('Tibesti', 'Nord'),
('NDjamena', 'Centre');

-- Insertion des limites KYC par defaut
INSERT OR IGNORE INTO kyc_limits (level, daily_transaction_limit, monthly_transaction_limit, single_transaction_limit, withdrawal_limit, description)
VALUES 
    (0, 25000, 100000, 25000, 50000, 'Non verifie - Limites reduites'),
    (1, 100000, 500000, 50000, 100000, 'Niveau 1 - Verification de base'),
    (2, 500000, 2000000, 200000, 500000, 'Niveau 2 - Verification complete');

-- Insertion des parametres par defaut
INSERT OR IGNORE INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
    ('min_transaction', '25', 'integer', 'Montant minimum de transaction'),
    ('max_transaction', '10000000', 'integer', 'Montant maximum de transaction'),
    ('transfer_fee', '2', 'integer', 'Frais de transfert en pourcentage'),
    ('deposit_fee', '0', 'integer', 'Frais de depot en pourcentage'),
    ('withdrawal_fee', '2', 'integer', 'Frais de retrait en pourcentage'),
    ('referral_bonus', '500', 'integer', 'Bonus de parrainage en FCFA'),
    ('maintenance_mode', 'false', 'boolean', 'Mode maintenance'),
    ('app_version', '1.0.0', 'string', 'Version de l''application');

-- ============================================
-- ADMIN PAR DEFAUT
-- ============================================

INSERT OR IGNORE INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified, email)
VALUES ('62787307', 'Admin Core Team - CashPays', 'PLACEHOLDER_HASH', 'PLACEHOLDER_KEY', 'NDjamena', 'admin', 1, 1, 'admin@cashpays.td');

-- Creation du wallet principal pour l'admin
INSERT OR IGNORE INTO wallets (user_id, balance, is_principal)
SELECT id, 90000000, 1 FROM users WHERE phone = '62787307';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger pour mettre a jour updated_at users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour mettre a jour updated_at wallets
CREATE TRIGGER IF NOT EXISTS update_wallets_timestamp 
AFTER UPDATE ON wallets
BEGIN
    UPDATE wallets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour creer automatiquement un wallet lors de l'inscription d'un user
CREATE TRIGGER IF NOT EXISTS create_wallet_on_user_insert
AFTER INSERT ON users
WHEN NEW.role = 'user'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 1000);
END;

-- Trigger pour creer automatiquement un wallet agent lors de l'inscription
CREATE TRIGGER IF NOT EXISTS create_wallet_on_agent_insert
AFTER INSERT ON users
WHEN NEW.role = 'agent'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
END;

-- Trigger pour mettre a jour updated_at blog_posts
CREATE TRIGGER IF NOT EXISTS update_blog_posts_timestamp 
AFTER UPDATE ON blog_posts
BEGIN
    UPDATE blog_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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
        WHEN t.type = 'deposit' THEN 'Depot'
        WHEN t.type = 'withdraw' THEN 'Retrait'
        ELSE t.type
    END as type_label,
    CASE 
        WHEN t.status = 'pending' THEN 'En attente'
        WHEN t.status = 'completed' THEN 'Complete'
        WHEN t.status = 'failed' THEN 'Echoue'
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

-- Vue des statistiques KYC
CREATE VIEW IF NOT EXISTS v_kyc_stats AS
SELECT 
    COUNT(*) as total_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_count,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
FROM kyc_requests;

-- Vue des articles de blog avec auteurs
CREATE VIEW IF NOT EXISTS v_blog_posts AS
SELECT 
    bp.*,
    u.fullname as author_fullname,
    u.phone as author_phone
FROM blog_posts bp
LEFT JOIN users u ON bp.author_id = u.id;