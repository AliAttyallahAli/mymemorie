// src/pages/Licenses.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { 
  FaFileContract, FaCheckCircle, FaShieldAlt, FaBuilding,
  FaIdCard, FaRegClock, FaGlobeAfrica, FaMoneyBillWave,
  FaChartLine, FaUserShield, FaDatabase, FaLock
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Licenses({ user }) {
  return (
    <Layout user={user}>
      <div className="card">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
            <FaFileContract className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Licences et agréments</h1>
          <p className="text-white/50 max-w-2xl mx-auto">
            CashPays opère en conformité avec les réglementations de la COBAC et de la BEAC
          </p>
        </div>

        <div className="space-y-8">
          {/* Section 1 - Agrément principal */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <FaShieldAlt className="text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Agrément COBAC</h2>
            </div>
            <div className="bg-green-500/10 rounded-xl p-4 mb-4">
              <p className="text-green-400 font-mono text-sm mb-2">Agrément N°: 2026/001/COBAC/EME</p>
              <p className="text-white/70 text-sm">
                Délivré le 15 janvier 2026 par la Commission Bancaire de l'Afrique Centrale (COBAC)
              </p>
            </div>
            <p className="text-white/70 leading-relaxed">
              CashPays est officiellement agréé en tant qu'Établissement de Monnaie Électronique (EME) 
              par la COBAC. Cet agrément nous autorise à exercer des activités de transfert d'argent 
              électronique sur l'ensemble de la zone CEMAC.
            </p>
          </section>

          {/* Section 2 - Licence d'exploitation */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <FaBuilding className="text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Licence d'exploitation</h2>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-4 mb-4">
              <p className="text-blue-400 font-mono text-sm mb-2">Licence N°: L-2026-007-CASH</p>
              <p className="text-white/70 text-sm">
                Délivrée par le Ministère des Finances et du Budget du Tchad
              </p>
            </div>
            <p className="text-white/70 leading-relaxed">
              CashPays détient une licence d'exploitation valide pour opérer sur l'ensemble du territoire 
              tchadien. Cette licence nous permet de proposer nos services de transfert d'argent 
              électronique conformément à la législation en vigueur.
            </p>
          </section>

          {/* Section 3 - Certification ISO */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Certifications internationales</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold mb-1">ISO 20022</p>
                <p className="text-white/50 text-sm">Format standardisé pour les transactions financières</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold mb-1">ISO 27001</p>
                <p className="text-white/50 text-sm">Sécurité des systèmes d'information</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold mb-1">PCI DSS</p>
                <p className="text-white/50 text-sm">Sécurité des données de paiement</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold mb-1">RGPD CEMAC</p>
                <p className="text-white/50 text-sm">Protection des données personnelles</p>
              </div>
            </div>
          </section>

          {/* Section 4 - Conditions d'utilisation des licences */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <FaUserShield className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Conditions générales des licences</h2>
            </div>
            <ul className="space-y-3 text-white/70">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Respect strict des réglementations COBAC et BEAC</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Audits réguliers par les autorités de contrôle</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Conservation des données conformément à la loi</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Séparation stricte des fonds clients et fonds propres</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Déclaration périodique des transactions aux autorités</span>
              </li>
            </ul>
          </section>

          {/* Section 5 - Droits et obligations des utilisateurs */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <FaDatabase className="text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Droits et obligations des utilisateurs</h2>
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              En utilisant les services CashPays, vous bénéficiez des droits suivants :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc">
              <li>Droit à l'information claire et transparente sur les frais</li>
              <li>Droit à la protection de vos données personnelles</li>
              <li>Droit de résilier votre compte à tout moment</li>
              <li>Droit de contester une transaction</li>
              <li>Droit d'être informé en cas de modification des conditions</li>
            </ul>
            <p className="text-white/70 leading-relaxed mt-4">
              Vous vous engagez à :
            </p>
            <ul className="space-y-2 text-white/70 ml-6 list-disc mt-2">
              <li>Fournir des informations exactes lors de l'inscription</li>
              <li>Ne pas utiliser le service à des fins illégales</li>
              <li>Protéger vos identifiants de connexion</li>
              <li>Respecter les limites de transaction établies</li>
            </ul>
          </section>

          {/* Section 6 - Renouvellement et validité */}
          <section className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <FaRegClock className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Validité et renouvellement</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">Validité</p>
                <p className="text-white/50 text-sm">5 ans à compter de la date de délivrance</p>
                <p className="text-white/40 text-xs mt-2">Expiration: 15 janvier 2031</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">Renouvellement</p>
                <p className="text-white/50 text-sm">Soumis à audit de conformité</p>
                <p className="text-white/40 text-xs mt-2">Dossier à déposer 6 mois avant expiration</p>
              </div>
            </div>
          </section>

          {/* Section 7 - Autorités de régulation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <FaGlobeAfrica className="text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Autorités de régulation</h2>
            </div>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">COBAC - Commission Bancaire de l'Afrique Centrale</p>
                <p className="text-white/50 text-sm">Yaoundé, Cameroun</p>
                <a href="#" className="text-blue-400 text-sm hover:underline">www.cobac.org</a>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">BEAC - Banque des États de l'Afrique Centrale</p>
                <p className="text-white/50 text-sm">Yaoundé, Cameroun</p>
                <a href="#" className="text-blue-400 text-sm hover:underline">www.beac.int</a>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">Ministère des Finances et du Budget du Tchad</p>
                <p className="text-white/50 text-sm">N'Djaména, Tchad</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer information */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            Les licences et agréments sont consultables sur demande au siège de CashPays.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to="/terms" className="text-white/40 hover:text-white text-sm transition-colors">
              Conditions d'utilisation
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/privacy" className="text-white/40 hover:text-white text-sm transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/contact" className="text-white/40 hover:text-white text-sm transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Licenses