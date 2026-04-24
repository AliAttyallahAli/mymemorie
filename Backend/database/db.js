const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'cashpays.db');

// Initialisation de la base de données
let db = null;

function initDatabase() {
    return new Promise((resolve, reject) => {
        // Créer le dossier database s'il n'existe pas
        if (!fs.existsSync(__dirname)) {
            fs.mkdirSync(__dirname, { recursive: true });
        }

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Erreur de connexion à la base de données:', err);
                reject(err);
                return;
            }
            console.log('Connecté à la base de données SQLite');
            
            // Lire et exécuter le script SQL d'initialisation
            const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
            
            db.exec(initSQL, (err) => {
                if (err) {
                    console.error('Erreur lors de l\'initialisation:', err);
                    reject(err);
                } else {
                    console.log('Base de données initialisée avec succès');
                    resolve(db);
                }
            });
        });
    });
}

// Obtenir l'instance de la base de données
function getDb() {
    if (!db) {
        throw new Error('Base de données non initialisée. Appelez initDatabase() d\'abord.');
    }
    return db;
}

// Promisify les requêtes
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

module.exports = {
    initDatabase,
    getDb,
    query,
    run,
    get
};