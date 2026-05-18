// src/pages/AdminTaxes.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from '../utils/toast';
import { FaLandmark, FaPlus, FaEdit, FaKey, FaTrash, FaTimes, FaSave, FaPhone, FaMapMarkerAlt, FaUser, FaBuilding, FaEnvelope, FaWallet } from 'react-icons/fa';

function AdminTaxes({ user }) {
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communeToDelete, setCommuneToDelete] = useState(null);
  const [editingCommune, setEditingCommune] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: '',
    fullname: '',
    commune_name: '',
    commune_address: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchCommunes();
  }, []);

  const fetchCommunes = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await axios.get('/api/admin/communes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Communes chargées:', response.data);
      setCommunes(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur chargement des communes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== SOUMISSION ===');
    console.log('Données formulaire:', formData);
    
    // Validation
    if (!formData.phone || !formData.commune_name) {
      toast.error('Téléphone et nom de la commune requis');
      return;
    }
    
    if (!formData.password && !editingCommune) {
      toast.error('Mot de passe requis pour la création');
      return;
    }
    
    if (!/^\d{8}$/.test(formData.phone)) {
      toast.error('Le numéro de téléphone doit contenir 8 chiffres');
      return;
    }
    
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');
    
    const dataToSend = {
      phone: formData.phone,
      fullname: formData.fullname || formData.commune_name,
      commune_name: formData.commune_name,
      commune_address: formData.commune_address || '',
      email: formData.email || '',
      password: formData.password
    };
    
    try {
      if (editingCommune) {
        await axios.put(`/api/admin/communes/${editingCommune.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Commune modifiée avec succès');
        setShowModal(false);
        setEditingCommune(null);
        resetForm();
        fetchCommunes();
      } else {
        await axios.post('/api/admin/communes', dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Commune créée avec succès');
        setShowModal(false);
        resetForm();
        fetchCommunes();
      }
    } catch (error) {
      console.error('Erreur réponse:', error.response?.data);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (commune) => {
    setCommuneToDelete(commune);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!communeToDelete) return;
    
    setDeleting(true);
    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`/api/admin/communes/${communeToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Commune supprimée avec succès');
      setShowDeleteModal(false);
      setCommuneToDelete(null);
      fetchCommunes();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phone: '',
      fullname: '',
      commune_name: '',
      commune_address: '',
      email: '',
      password: ''
    });
  };

  const openEditModal = (commune) => {
    setEditingCommune(commune);
    setFormData({
      phone: commune?.phone || '',
      fullname: commune?.fullname || commune?.contact_name || '',
      commune_name: commune?.commune_name || commune?.name || '',
      commune_address: commune?.commune_address || commune?.address || '',
      email: commune?.email || '',
      password: ''
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingCommune(null);
    resetForm();
    setShowModal(true);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Accès non autorisé. Zone administrateur.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <FaLandmark className="text-primary-500 text-xl" />
          </div>
          Gestion des Communes (Services d'Impôts)
        </h3>
        <button
          onClick={openAddModal}
          className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold hover:opacity-90 transition-all"
        >
          <FaPlus /> Nouvelle commune
        </button>
      </div>

      {/* Tableau des communes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      ) : communes.length === 0 ? (
        <div className="text-center py-12 bg-gray-700/30 rounded-xl">
          <FaLandmark className="text-gray-500 text-5xl mx-auto mb-3" />
          <p className="text-gray-400">Aucune commune enregistrée</p>
          <button onClick={openAddModal} className="mt-4 text-primary-400 hover:text-primary-300">
            + Ajouter la première commune
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Téléphone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Commune</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Responsable</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Adresse</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Solde</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {communes.map((commune, index) => (
                <tr key={commune.id || index} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-primary-400 bg-primary-500/10 px-2 py-1 rounded-md text-sm">
                      {commune.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {commune.commune_name || commune.name}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {commune.fullname || commune.contact_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {commune.commune_address || commune.address || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {commune.email || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400 font-semibold">
                      {(commune.balance || 0).toLocaleString()} FCFA
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(commune)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => confirmDelete(commune)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && communeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-red-500/30">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FaTrash className="text-red-500" />
                Confirmer la suppression
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-300 mb-4">
                Êtes-vous sûr de vouloir supprimer la commune <span className="font-bold text-white">{communeToDelete.commune_name || communeToDelete.name}</span> ?
              </p>
              <p className="text-red-400 text-sm mb-6">
                ⚠️ Cette action est irréversible. Son wallet sera également supprimé.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FaTrash /> Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création/modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-primary-500/30">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingCommune ? <FaEdit className="text-primary-500" /> : <FaPlus className="text-primary-500" />}
                {editingCommune ? 'Modifier la commune' : 'Ajouter une commune'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <FaPhone className="text-primary-500" /> Téléphone (8 chiffres) *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  maxLength="8"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="62787301"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Numéro pour se connecter et recevoir les paiements</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <FaBuilding className="text-primary-500" /> Nom de la commune *
                </label>
                <input
                  type="text"
                  value={formData.commune_name}
                  onChange={(e) => setFormData({ ...formData, commune_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mairie de N'Djaména"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <FaUser className="text-primary-500" /> Nom du responsable
                </label>
                <input
                  type="text"
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nom du responsable"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <FaMapMarkerAlt className="text-primary-500" /> Adresse
                </label>
                <input
                  type="text"
                  value={formData.commune_address}
                  onChange={(e) => setFormData({ ...formData, commune_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Adresse complète"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <FaEnvelope className="text-primary-500" /> Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="contact@commune.td"
                />
              </div>

              {!editingCommune && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <FaKey className="text-primary-500" /> Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Mot de passe pour se connecter à l'espace commune</p>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-gray-300 font-medium hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FaSave /> {editingCommune ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTaxes;