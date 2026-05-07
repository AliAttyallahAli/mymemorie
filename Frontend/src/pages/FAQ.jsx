// src/pages/FAQ.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaQuestionCircle, FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa'
import Layout from '../components/Layout'

function FAQ({ user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      category: 'Compte et inscription',
      questions: [
        {
          q: 'Comment créer un compte CashPays ?',
          a: 'Téléchargez l\'application ou rendez-vous sur notre site web, cliquez sur "Créer un compte", renseignez vos informations (nom, téléphone, mot de passe) et validez. Vous recevrez 1000 FCFA offerts à l\'inscription.'
        },
        {
          q: 'Que faire si j\'oublie mon mot de passe ?',
          a: 'Cliquez sur "Mot de passe oublié" sur la page de connexion. Vous recevrez un code par SMS pour réinitialiser votre mot de passe. Vous pouvez aussi contacter notre service client au 62 78 73 07.'
        },
        {
          q: 'Comment récupérer ma clé privée ?',
          a: 'Contactez l\'administrateur au 62 78 73 07. Après vérification de votre identité, une nouvelle clé vous sera fournie.'
        }
      ]
    },
    {
      category: 'Transactions',
      questions: [
        {
          q: 'Quels sont les frais de transaction ?',
          a: 'Les frais de transfert entre utilisateurs sont de 2% du montant. Les dépôts en agence sont gratuits. Les retraits sont à 2%.'
        },
        {
          q: 'Quelle est la limite de transaction ?',
          a: 'Le montant minimum est de 25 FCFA. Le montant maximum dépend de votre solde et du supply total de 100 000 000 FCFA.'
        },
        {
          q: 'Combien de temps dure un transfert ?',
          a: 'Les transferts sont instantanés. Le destinataire reçoit les fonds en quelques secondes.'
        },
        {
          q: 'Puis-je annuler un transfert ?',
          a: 'Une fois le transfert confirmé, il ne peut pas être annulé. Vérifiez bien les informations du destinataire avant de valider.'
        }
      ]
    },
    {
      category: 'Sécurité',
      questions: [
        {
          q: 'L\'application est-elle sécurisée ?',
          a: 'Oui, CashPays utilise un chiffrement AES-256 pour vos données et respecte les normes de sécurité de la COBAC et de la BEAC.'
        },
        {
          q: 'Que faire en cas de perte de mon téléphone ?',
          a: 'Contactez immédiatement notre service client au 62 78 73 07 pour bloquer votre compte. Nous vous aiderons à récupérer l\'accès.'
        },
        {
          q: 'Mes données sont-elles protégées ?',
          a: 'Absolument. Nous respectons la politique de confidentialité conforme aux réglementations CEMAC. Vos données ne sont jamais partagées sans votre consentement.'
        }
      ]
    },
    {
      category: 'Agents CashPays',
      questions: [
        {
          q: 'Comment devenir agent CashPays ?',
          a: 'Remplissez le formulaire sur notre page "Devenir agent". Notre équipe vous contactera pour étudier votre candidature.'
        },
        {
          q: 'Quelle est la commission des agents ?',
          a: 'Les agents perçoivent une commission sur chaque transaction effectuée. Le taux varie selon le volume et le type d\'agence.'
        }
      ]
    },
    {
      category: 'Support',
      questions: [
        {
          q: 'Comment contacter le service client ?',
          a: 'Vous pouvez nous joindre par téléphone au 62 78 73 07, par email à supportcashpays@gmail.com, ou via WhatsApp au même numéro.'
        },
        {
          q: 'Quels sont les horaires du support ?',
          a: 'Notre service client est disponible du lundi au vendredi de 08h00 à 18h00, et le samedi de 09h00 à 13h00.'
        }
      ]
    }
  ]

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <Layout user={user}>
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaQuestionCircle className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Foire aux questions
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Trouvez rapidement des réponses à vos questions
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-3xl mx-auto space-y-8">
        {filteredFaqs.map((category, catIndex) => (
          <div key={catIndex} className="card">
            <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10">
              {category.category}
            </h2>
            <div className="space-y-3">
              {category.questions.map((faq, qIndex) => {
                const isOpen = openIndex === `${catIndex}-${qIndex}`
                return (
                  <div key={qIndex} className="border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : `${catIndex}-${qIndex}`)}
                      className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-all"
                    >
                      <span className="text-white font-medium">{faq.q}</span>
                      {isOpen ? (
                        <FaChevronUp className="text-blue-400 flex-shrink-0 ml-2" />
                      ) : (
                        <FaChevronDown className="text-blue-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 border-t border-white/10 bg-white/5">
                        <p className="text-white/70">{faq.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="text-center mt-8">
        <p className="text-white/60 mb-4">Vous n'avez pas trouvé votre réponse ?</p>
        <Link to="/contact" className="btn-primary inline-flex items-center gap-2">
          Contactez-nous
        </Link>
      </div>
    </Layout>
  )
}

export default FAQ