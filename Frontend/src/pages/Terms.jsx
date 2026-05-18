// src/pages/Terms.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { FaGavel, FaShieldAlt, FaMoneyBillWave, FaMobile, FaUserSecret, FaFileContract } from 'react-icons/fa'
import Layout from '../components/Layout'

function Terms({ user }) {
  return (
    <Layout user={user}>
      <div className="card">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
            <FaGavel className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Conditions d'utilisation</h1>
          <p className="text-white/50 text-sm">Dernière mise à jour : 1er Avril 2026</p>
        </div>

        <div className="space-y-8">
          {/* Article 1 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Acceptation des conditions</h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              En utilisant l'application CashPays ("l'Application"), vous acceptez d'être lié par les présentes 
              conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'Application. 
              CashPays est un service de transfert d'argent électronique opérant au Tchad et dans la zone CEMAC.
            </p>
          </section>

          {/* Article 2 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Description du service</h2>
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              CashPays offre les services suivants :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Transfert d'argent instantané entre utilisateurs</li>
              <li>Dépôt et retrait d'espèces via notre réseau d'agents</li>
              <li>Portefeuille électronique (wallet) sécurisé</li>
              <li>Paiement par QR code</li>
              <li>Historique des transactions et export XML ISO 20022</li>
            </ul>
          </section>

          {/* Article 3 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">3</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Inscription et sécurité</h2>
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              Pour utiliser CashPays, vous devez :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Être âgé d'au moins 18 ans</li>
              <li>Fournir des informations d'identification valides</li>
              <li>Conserver votre mot de passe et votre clé privée en sécurité</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée</li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
              <p className="text-yellow-400 text-sm">
                ⚠️ Important : Ne partagez jamais votre clé privée à 6 chiffres avec personne, 
                y compris les agents CashPays. L'administration ne vous la demandera jamais.
              </p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">4</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Frais et limites</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Transfert entre utilisateurs</span>
                <span className="text-white font-semibold">2% du montant</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Dépôt en agence</span>
                <span className="text-white font-semibold">0% (gratuit)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Retrait en agence</span>
                <span className="text-white font-semibold">2% du montant</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Montant minimum</span>
                <span className="text-white font-semibold">25 FCFA</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Montant maximum</span>
                <span className="text-white font-semibold">100 000 000 FCFA (supply total)</span>
              </div>
            </div>
          </section>

          {/* Article 5 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">5</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Responsabilités</h2>
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              CashPays s'engage à :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Fournir un service fiable et sécurisé</li>
              <li>Protéger vos données personnelles</li>
              <li>Traiter les transactions dans les meilleurs délais</li>
              <li>Respecter la réglementation de la COBAC et de la BEAC</li>
            </ul>
            <p className="text-white/70 leading-relaxed mt-4">
              CashPays ne peut être tenu responsable des pertes dues à :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc mt-2">
              <li>Un accès non autorisé dû à une négligence de l'utilisateur</li>
              <li>Des problèmes techniques indépendants de notre volonté</li>
              <li>Des retards de traitement dus aux opérateurs mobiles</li>
            </ul>
          </section>

          {/* Article 6 */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">6</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Suspension et résiliation</h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              CashPays se réserve le droit de suspendre ou résilier votre compte en cas de :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc mt-3">
              <li>Violation des présentes conditions</li>
              <li>Activités frauduleuses ou illégales</li>
              <li>Utilisation abusive du service</li>
              <li>Demande des autorités réglementaires</li>
            </ul>
          </section>

          {/* Article 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">7</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Modification des conditions</h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              CashPays se réserve le droit de modifier ces conditions à tout moment. 
              Les modifications seront notifiées via l'application et entreront en vigueur 
              immédiatement après leur publication. Votre utilisation continue du service 
              vaut acceptation des nouvelles conditions.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm">
            Pour toute question concernant ces conditions, contactez-nous à <strong className="text-blue-300">cashpays@gmail.com</strong>
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default Terms