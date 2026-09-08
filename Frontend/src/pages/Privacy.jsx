// src/pages/Privacy.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { FaUserSecret, FaDatabase, FaCookie, FaEnvelope, FaShieldAlt, FaEye } from 'react-icons/fa'
import Layout from '../components/Layout'

function Privacy({ user }) {
  return (
    <Layout user={user}>
      <div className="card">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
            <FaUserSecret className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
          <p className="text-white/50 text-sm">Dernière mise à jour : 1er Avril 2026</p>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" /> 1. Collecte des informations
            </h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Nous collectons les informations suivantes :
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-semibold text-white mb-2">Informations personnelles</p>
                <ul className="text-white/60 text-sm space-y-1">
                  <li>• Nom complet</li>
                  <li>• Numéro de téléphone</li>
                  <li>• Adresse email (optionnelle)</li>
                  <li>• Province et ville</li>
                  <li>• Pièce d'identité (KYC)</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-semibold text-white mb-2">Informations transactionnelles</p>
                <ul className="text-white/60 text-sm space-y-1">
                  <li>• Historique des transactions</li>
                  <li>• Solde du portefeuille</li>
                  <li>• Adresse IP</li>
                  <li>• Type d'appareil</li>
                  <li>• Données de localisation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaDatabase className="text-blue-400" /> 2. Utilisation des informations
            </h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Vos informations sont utilisées pour :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Traiter vos transactions financières</li>
              <li>Vérifier votre identité (conformité KYC)</li>
              <li>Améliorer nos services et l'expérience utilisateur</li>
              <li>Vous envoyer des notifications importantes</li>
              <li>Prévenir la fraude et les activités illégales</li>
              <li>Respecter les obligations légales et réglementaires</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaEye className="text-blue-400" /> 3. Partage des informations
            </h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Nous ne vendons pas vos informations personnelles. Cependant, nous pouvons partager vos données avec :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Les autorités réglementaires (COBAC, BEAC) sur demande</li>
              <li>Nos partenaires bancaires pour le traitement des transactions</li>
              <li>Les opérateurs mobiles (Airtel, Moov) pour les transferts</li>
              <li>Nos agents agréés pour les dépôts et retraits</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaCookie className="text-blue-400" /> 4. Cookies et technologies similaires
            </h2>
            <p className="text-white/70 leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience, mémoriser vos préférences 
              de connexion et analyser l'utilisation de l'application. Vous pouvez contrôler l'utilisation 
              des cookies via les paramètres de votre navigateur.
            </p>
          </section>

          {/* Section 5 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4">5. Sécurité des données</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Nous mettons en œuvre des mesures de sécurité avancées :
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-500/10 rounded-xl">
                <p className="text-green-400 text-2xl mb-1">🔒</p>
                <p className="text-white text-sm">Chiffrement AES-256</p>
                <p className="text-white/40 text-xs">Données au repos</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-xl">
                <p className="text-green-400 text-2xl mb-1">🔐</p>
                <p className="text-white text-sm">TLS 1.3</p>
                <p className="text-white/40 text-xs">Données en transit</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-xl">
                <p className="text-green-400 text-2xl mb-1">🛡️</p>
                <p className="text-white text-sm">Authentification 2FA</p>
                <p className="text-white/40 text-xs">Bientôt disponible</p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4">6. Conservation des données</h2>
            <p className="text-white/70 leading-relaxed">
              Vos données sont conservées aussi longtemps que votre compte est actif. 
              Après fermeture du compte, nous conservons vos données pendant 5 ans 
              conformément aux obligations légales (lutte contre le blanchiment d'argent). 
              Vous avez le droit d'accéder, modifier ou supprimer vos données personnelles 
              en nous contactant.
            </p>
          </section>

          {/* Section 7 */}
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-xl font-semibold text-white mb-4">7. Vos droits</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Conformément à la réglementation CEMAC, vous disposez des droits suivants :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Droit d'accès à vos données personnelles</li>
              <li>Droit de rectification des informations inexactes</li>
              <li>Droit d'opposition au traitement de vos données</li>
              <li>Droit à la portabilité de vos données</li>
              <li>Droit de demander la suppression de votre compte</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaEnvelope className="text-blue-400" /> 8. Contact
            </h2>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70">Pour toute question relative à la confidentialité :</p>
              <div className="mt-3 space-y-2">
                <p className="text-white">📧 Email : <span className="text-blue-300">AlkherPay@gmail.com</span></p>
                <p className="text-white">📞 Téléphone : <span className="text-blue-300">+235 62 78 73 07</span></p>
                <p className="text-white">📍 Adresse : Mongo, Tchad</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm">
            Cette politique de confidentialité est conforme aux exigences de la COBAC et de la BEAC.
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default Privacy