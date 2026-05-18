-- ============================================
-- CASHPAYS - BASE DE DONNÉES COMPLÈTE
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- TABLE DES UTILISATEURS (MISE À JOUR)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT(8) UNIQUE NOT NULL,
    fullname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    private_key_6 TEXT NOT NULL,
    email TEXT,
    country TEXT DEFAULT 'Tchad',
    province TEXT,
    city TEXT,
    address TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'agent', 'admin', 'commune')),
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    preferences TEXT DEFAULT '{}',
    
    -- Champs spécifiques pour les communes (services d'impôts)
    commune_name TEXT,
    commune_address TEXT,
    commune_logo TEXT,
    commune_phone TEXT(8),
    commune_email TEXT,
    
    -- Code de parrainage
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    
    -- Transaction PIN
    transaction_pin TEXT,
    is_pin_set INTEGER DEFAULT 0,
    pin_attempts INTEGER DEFAULT 0,
    pin_blocked_until DATETIME,
    
    -- 2FA
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret TEXT,
    two_factor_method TEXT,
    two_factor_phone TEXT,
    two_factor_email TEXT,
    two_factor_backup_codes TEXT,
    two_factor_pending INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TABLE DES WALLETS 
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0,
    bonus_balance INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'XAF',
    is_principal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- WALLET PRINCIPAL
-- ============================================
CREATE TABLE IF NOT EXISTS main_wallet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
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
    total_sales INTEGER DEFAULT 0,
    total_commission INTEGER DEFAULT 0,
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
    type TEXT CHECK(type IN ('transfer', 'deposit', 'withdraw', 'fee_collection', 'tax_payment')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
    pin_verified INTEGER DEFAULT 0,
    xml_iso20022 TEXT,
    qr_data TEXT,
    description TEXT,
    created_by_agent INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (created_by_agent) REFERENCES agents(id)
);

-- ============================================
-- TABLE DES COMMUNES (SERVICES D'IMPÔTS)
-- ============================================
CREATE TABLE IF NOT EXISTS communes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT(8) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    contact_name TEXT,
    contact_phone TEXT(8),
    email TEXT,
    logo TEXT,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- TABLE DES PAIEMENTS DE TAXES
-- ============================================
CREATE TABLE IF NOT EXISTS tax_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE NOT NULL,
    payer_id INTEGER NOT NULL,
    commune_id INTEGER NOT NULL,
    taxpayer_name TEXT NOT NULL,
    taxpayer_phone TEXT(8) NOT NULL,
    taxpayer_address TEXT,
    business_number TEXT,
    property_address TEXT,
    tax_type TEXT NOT NULL,
    tax_period TEXT,
    amount INTEGER NOT NULL,
    fee INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_status TEXT DEFAULT 'paid',
    cashpays_transaction_ref TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (commune_id) REFERENCES users(id)
);

-- Vérifier que les communes existent dans users avec role='commune'
-- Ajouter un index pour les performances
CREATE INDEX IF NOT EXISTS idx_tax_payments_payer_id ON tax_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_commune_id ON tax_payments(commune_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_receipt ON tax_payments(receipt_number);

-- ============================================
-- TABLE DES TYPES DE TAXES
-- ============================================
CREATE TABLE IF NOT EXISTS tax_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    default_amount INTEGER,
    is_active INTEGER DEFAULT 1
);

-- ============================================
-- TABLE DES NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    category TEXT DEFAULT 'info',
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
-- TABLE DES LOGS SYSTÈME
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
-- TABLE DES DEMANDES KYC
-- ============================================
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- ============================================
-- TABLE DES DOCUMENTS KYC
-- ============================================
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

-- ============================================
-- TABLE DES LIMITES KYC
-- ============================================
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
-- TABLE DES CANDIDATURES AGENTS
-- ============================================
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
);

-- ============================================
-- TABLE DES AVIS AGENTS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- TABLE DES HORAIRES AGENTS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL UNIQUE,
    monday_open TEXT DEFAULT '08:00',
    monday_close TEXT DEFAULT '18:00',
    monday_closed INTEGER DEFAULT 0,
    tuesday_open TEXT DEFAULT '08:00',
    tuesday_close TEXT DEFAULT '18:00',
    tuesday_closed INTEGER DEFAULT 0,
    wednesday_open TEXT DEFAULT '08:00',
    wednesday_close TEXT DEFAULT '18:00',
    wednesday_closed INTEGER DEFAULT 0,
    thursday_open TEXT DEFAULT '08:00',
    thursday_close TEXT DEFAULT '18:00',
    thursday_closed INTEGER DEFAULT 0,
    friday_open TEXT DEFAULT '08:00',
    friday_close TEXT DEFAULT '18:00',
    friday_closed INTEGER DEFAULT 0,
    saturday_open TEXT DEFAULT '09:00',
    saturday_close TEXT DEFAULT '13:00',
    saturday_closed INTEGER DEFAULT 0,
    sunday_open TEXT DEFAULT NULL,
    sunday_close TEXT DEFAULT NULL,
    sunday_closed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE DES PARAMÈTRES APPLICATION
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
-- TABLE DE L'HISTORIQUE KYC
-- ============================================
-- Recréer avec la structure attendue par le backend
CREATE TABLE IF NOT EXISTS kyc_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    status_from TEXT,
    status_to TEXT,
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    kyc_request_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id)
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
-- TABLE DES APPAREILS DE CONFIANCE
-- ============================================
CREATE TABLE IF NOT EXISTS trusted_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT,
    device_token TEXT,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE DES DEMANDES DE RÉINITIALISATION PIN
-- ============================================
CREATE TABLE IF NOT EXISTS pin_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table pour stocker les demandes de réinitialisation
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
-- ============================================
-- TABLE DES STATISTIQUES DE PARRAINAGE
-- ============================================
CREATE TABLE IF NOT EXISTS referral_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_bonus INTEGER DEFAULT 0,
    claimed_bonus INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);
-- ============================================
-- INDEXES POUR PERFORMANCES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_communes_phone ON communes(phone);
CREATE INDEX IF NOT EXISTS idx_tax_payments_payer_id ON tax_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_commune_id ON tax_payments(commune_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_receipt ON tax_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_user_id ON pin_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_token ON pin_reset_requests(token);
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_status ON pin_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_token ON trusted_devices(device_token);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Insertion des 23 provinces
INSERT OR IGNORE INTO provinces (name, region) VALUES 
('Batha', 'Centre-Est'), ('Chari-Baguirmi', 'Centre-Ouest'),
('Hadjer-Lamis', 'Ouest'), ('Wadi Fira', 'Est'), ('Barh El Gazel', 'Nord'),
('Borkou', 'Nord'), ('Ennedi Est', 'Nord-Est'), ('Ennedi Ouest', 'Nord-Est'),
('Guéra', 'Centre'), ('Kanem', 'Ouest'), ('Lac', 'Ouest'),
('Logone Occidental', 'Sud-Ouest'), ('Logone Oriental', 'Sud-Est'),
('Mandoul', 'Sud'), ('Mayo-Kebbi Est', 'Sud-Ouest'), ('Mayo-Kebbi Ouest', 'Sud-Ouest'),
('Moyen-Chari', 'Sud'), ('Ouaddaï', 'Est'), ('Salamat', 'Sud-Est'),
('Sila', 'Est'), ('Tandjilé', 'Sud'), ('Tibesti', 'Nord'), ('N''Djaména', 'Centre');

-- Insertion des limites KYC
INSERT OR IGNORE INTO kyc_limits (level, daily_transaction_limit, monthly_transaction_limit, single_transaction_limit, withdrawal_limit, description)
VALUES 
    (0, 25000, 100000, 25000, 50000, 'Non vérifié - Limites réduites'),
    (1, 100000, 500000, 50000, 100000, 'Niveau 1 - Vérification de base'),
    (2, 500000, 2000000, 200000, 500000, 'Niveau 2 - Vérification complète');

-- Insertion des paramètres par défaut
INSERT OR IGNORE INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
    ('min_transaction', '25', 'integer', 'Montant minimum de transaction'),
    ('max_transaction', '10000000', 'integer', 'Montant maximum de transaction'),
    ('transfer_fee', '2', 'integer', 'Frais de transfert en pourcentage'),
    ('deposit_fee', '0', 'integer', 'Frais de dépôt en pourcentage'),
    ('withdrawal_fee', '2', 'integer', 'Frais de retrait en pourcentage'),
    ('referral_bonus', '500', 'integer', 'Bonus de parrainage en FCFA'),
    ('maintenance_mode', 'false', 'boolean', 'Mode maintenance'),
    ('app_version', '1.0.0', 'string', 'Version de l''application');

-- Insertion des types de taxes par défaut
INSERT OR IGNORE INTO tax_types (name, description, default_amount) VALUES
('Taxe Commerçante', 'Taxe pour les commerçants et boutiques', 25000),
("Taxe d'Habitation", 'Taxe pour les résidences', 15000),
('Taxe Foncière', 'Taxe pour les terrains et propriétés', 30000),
('Patente', 'Taxe professionnelle', 40000),
('Taxe de Séjour', 'Taxe pour les hôtels et logements touristiques', 5000);

-- Insertion de l'admin principal
INSERT OR IGNORE INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified, email)
VALUES ('62787307', 'Admin Core Team - CashPays', 'PLACEHOLDER_HASH', 'PLACEHOLDER_KEY', 'N''Djaména', 'admin', 1, 1, 'admin@cashpays.td');

-- Création du wallet principal
INSERT OR IGNORE INTO wallets (user_id, balance, is_principal)
SELECT id, 90000000, 1 FROM users WHERE phone = '62787307';

-- Insertion du wallet principal
INSERT OR IGNORE INTO main_wallet (id, balance, total_revenue) VALUES (1, 0, 0);

-- Insertion des communes de test
INSERT OR IGNORE INTO communes (phone, name, address, contact_name, contact_phone, email) VALUES
('62787301', 'Commune de Mongogo', 'rue principale, Mongo', 'Mongo', '62787301', 'contact@mongogo.td');


-- Insérer des utilisateurs agents de test
INSERT OR IGNORE INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified) 
VALUES 
('66234567', 'Jean NDOUMBE', 'temp_hash', '123456', 'N''Djaména', 'agent', 1, 1);

-- ============================================
-- TRIGGERS
-- ============================================

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

CREATE TRIGGER IF NOT EXISTS update_communes_timestamp 
AFTER UPDATE ON communes
BEGIN
    UPDATE communes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS create_wallet_on_user_insert
AFTER INSERT ON users
WHEN NEW.role = 'user'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 1000);
END;

CREATE TRIGGER IF NOT EXISTS create_wallet_on_agent_insert
AFTER INSERT ON users
WHEN NEW.role = 'agent'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
END;

CREATE TRIGGER IF NOT EXISTS create_wallet_on_commune_insert
AFTER INSERT ON users
WHEN NEW.role = 'commune'
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
END;

-- ============================================
-- VUES UTILES
-- ============================================

CREATE VIEW IF NOT EXISTS v_transactions_details AS
SELECT 
    t.*,
    s.fullname as sender_name,
    r.fullname as receiver_name,
    CASE 
        WHEN t.type = 'transfer' THEN 'Transfert'
        WHEN t.type = 'deposit' THEN 'Dépôt'
        WHEN t.type = 'withdraw' THEN 'Retrait'
        WHEN t.type = 'tax_payment' THEN 'Paiement de taxe'
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

CREATE VIEW IF NOT EXISTS v_tax_payments_details AS
SELECT 
    tp.*,
    u.fullname as payer_name,
    u.phone as payer_phone,
    c.name as commune_name,
    c.phone as commune_phone
FROM tax_payments tp
LEFT JOIN users u ON tp.payer_id = u.id
LEFT JOIN communes c ON tp.commune_id = c.id;

CREATE VIEW IF NOT EXISTS v_global_balance AS
SELECT 
    SUM(balance) as total_balance,
    (SELECT balance FROM wallets w2 JOIN users u2 ON w2.user_id = u2.id WHERE u2.role = 'admin' AND u2.phone = '62787307') as admin_wallet_balance,
    (SELECT SUM(balance) FROM wallets w3 JOIN users u3 ON w3.user_id = u3.id WHERE u3.role = 'user') as users_total_balance,
    (SELECT SUM(balance) FROM wallets w4 JOIN users u4 ON w4.user_id = u4.id WHERE u4.role = 'agent') as agents_total_balance,
    (SELECT SUM(balance) FROM wallets w5 JOIN users u5 ON w5.user_id = u5.id WHERE u5.role = 'commune') as communes_total_balance
FROM wallets w
JOIN users u ON w.user_id = u.id;

CREATE VIEW IF NOT EXISTS v_kyc_stats AS
SELECT 
    COUNT(*) as total_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_count,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
FROM kyc_requests;