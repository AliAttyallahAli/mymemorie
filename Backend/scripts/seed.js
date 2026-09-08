// backend/scripts/seed.js
const { initDatabase, run, query, get } = require('../database/db')
const bcrypt = require('bcryptjs')

async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

async function seed() {
  console.log('🌱 Démarrage du seed des données...')
  
  await initDatabase()
  
  // Vérifier si l'admin existe déjà
  const adminExists = await get('SELECT id FROM users WHERE phone = ?', ['62787307'])
  
  if (!adminExists) {
    console.log('📝 Création de l\'administrateur principal...')
    
    const hashedPassword = await hashPassword('08093Ali')
    const privateKey = Math.floor(100000 + Math.random() * 900000).toString()
    const hashedKey = await hashPassword(privateKey)
    
    await run(
      `INSERT INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 'admin', 1, 1)`,
      ['62787307', 'Admin Core Team - AlkherPay', hashedPassword, hashedKey, 'N\'Djaména']
    )
    
    const admin = await get('SELECT id FROM users WHERE phone = ?', ['62787307'])
    
    await run(
      `INSERT INTO wallets (user_id, balance, is_principal)
       VALUES (?, 90000000, 1)`,
      [admin.id]
    )
    
    console.log(`✅ Admin créé avec succès`)
    console.log(`🔑 Clé privée admin: ${privateKey}`)
  } else {
    console.log('ℹ️ L\'administrateur existe déjà')
  }
  
  // Créer quelques utilisateurs de test
  const testUsers = [
    { phone: '66123456', fullname: 'Jean NDOUMBE', province: 'N\'Djaména' },
    { phone: '66234567', fullname: 'Marie MBALLA', province: 'Logone Occidental' },
    { phone: '66345678', fullname: 'Pierre MADJI', province: 'Mayo-Kebbi Est' },
    { phone: '66456789', fullname: 'Aïssa MAHAMAT', province: 'Ouaddaï' },
  ]
  
  for (const testUser of testUsers) {
    const existing = await get('SELECT id FROM users WHERE phone = ?', [testUser.phone])
    
    if (!existing) {
      const hashedPassword = await hashPassword('passer123')
      const privateKey = Math.floor(100000 + Math.random() * 900000).toString()
      const hashedKey = await hashPassword(privateKey)
      
      await run(
        `INSERT INTO users (phone, fullname, password_hash, private_key_6, province, role, is_active)
         VALUES (?, ?, ?, ?, ?, 'user', 1)`,
        [testUser.phone, testUser.fullname, hashedPassword, hashedKey, testUser.province]
      )
      
      console.log(`✅ Utilisateur test créé: ${testUser.fullname} (${testUser.phone}) - Clé: ${privateKey}`)
    }
  }
  
  console.log('🎉 Seed terminé avec succès!')
  process.exit(0)
}

seed().catch(console.error)