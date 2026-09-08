// src/pages/AdminBillCompanies.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaPlus, FaEdit, FaTrash, FaWater, FaBolt, 
  FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaCheckCircle, FaTimesCircle, FaSpinner
} from 'react-icons/fa';

const AdminBillCompanies = ({ user }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'water',
    description: '',
    logo: '',
    contactPhone: '',
    contactEmail: '',
    address: ''
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Accès non autorisé');
      return;
    }
    fetchCompanies();
  }, [user]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/service-companies');
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type) {
      toast.error('Nom et type requis');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      if (editingCompany) {
        await axios.put(`/api/admin/service-companies/${editingCompany.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Entreprise modifiée avec succès');
      } else {
        const response = await axios.post('/api/admin/service-companies', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          toast.success(`Entreprise créée avec succès`);
          if (response.data.company?.agent) {
            toast.success(`Compte agent créé - Tél: ${response.data.company.agent.phone}`, { duration: 10000 });
          }
        }
      }
      
      fetchCompanies();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'opération');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Supprimer l'entreprise "${name}" ?`)) {
      try {
        const token = localStorage.getItem('accessToken');
        await axios.delete(`/api/admin/service-companies/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Entreprise supprimée');
        fetchCompanies();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'water',
      description: '',
      logo: '',
      contactPhone: '',
      contactEmail: '',
      address: ''
    });
    setEditingCompany(null);
  };

  const getTypeIcon = (type) => {
    return type === 'water' ? 
      <FaWater className="text-blue-500" /> : 
      <FaBolt className="text-yellow-500" />;
  };

  const getTypeLabel = (type) => {
    return type === 'water' ? 'EAU' : 'ÉLECTRICITÉ';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Accès non autorisé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Fournisseurs</h1>
            <p className="text-gray-600 mt-1">Eau & Électricité - Gérer les entreprises partenaires</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition"
          >
            <FaPlus /> Ajouter un fournisseur
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <FaWater className="text-3xl mb-2" />
            <p className="text-2xl font-bold">{companies.filter(c => c.type === 'water').length}</p>
            <p className="opacity-90">Fournisseurs d'eau</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
            <FaBolt className="text-3xl mb-2" />
            <p className="text-2xl font-bold">{companies.filter(c => c.type === 'electricity').length}</p>
            <p className="opacity-90">Fournisseurs d'électricité</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <FaBuilding className="text-3xl mb-2" />
            <p className="text-2xl font-bold">{companies.length}</p>
            <p className="opacity-90">Total partenaires</p>
          </div>
        </div>

        {/* Liste des entreprises */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Entreprise</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <FaSpinner className="animate-spin w-8 h-8 mx-auto text-yellow-500" />
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      Aucune entreprise enregistrée
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr key={company.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{company.logo || (company.type === 'water' ? '💧' : '⚡')}</div>
                          <div>
                            <p className="font-semibold text-gray-800">{company.name}</p>
                            <p className="text-xs text-gray-500">{company.description?.substring(0, 50)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          company.type === 'water' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getTypeIcon(company.type)}
                          {getTypeLabel(company.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {company.contact_phone && (
                            <p className="flex items-center gap-1 text-gray-600">
                              <FaPhone className="text-xs" /> {company.contact_phone}
                            </p>
                          )}
                          {company.contact_email && (
                            <p className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                              <FaEnvelope className="text-xs" /> {company.contact_email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          company.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {company.is_active ? <FaCheckCircle className="text-xs" /> : <FaTimesCircle className="text-xs" />}
                          {company.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCompany(company);
                              setFormData({
                                name: company.name,
                                type: company.type,
                                description: company.description || '',
                                logo: company.logo || '',
                                contactPhone: company.contact_phone || '',
                                contactEmail: company.contact_email || '',
                                address: company.address || ''
                              });
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Modifier"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(company.id, company.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 sticky top-0">
              <h2 className="text-xl font-bold text-white">
                {editingCompany ? 'Modifier' : 'Ajouter'} un fournisseur
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Ex: STE, ZIZ, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de service <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'water'})}
                    className={`p-3 rounded-xl border-2 transition ${
                      formData.type === 'water'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <FaWater className="mx-auto text-xl mb-1" />
                    <span className="text-sm">Eau</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'electricity'})}
                    className={`p-3 rounded-xl border-2 transition ${
                      formData.type === 'electricity'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    <FaBolt className="mx-auto text-xl mb-1" />
                    <span className="text-sm">Électricité</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500"
                  placeholder="Description de l'entreprise"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone de contact
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500"
                  placeholder="Ex: 2255 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de contact
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500"
                  placeholder="contact@entreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500"
                  placeholder="Adresse complète"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl hover:shadow-lg transition font-medium"
                >
                  {editingCompany ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBillCompanies;