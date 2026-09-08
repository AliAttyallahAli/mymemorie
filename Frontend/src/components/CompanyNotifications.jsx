// src/components/CompanyNotifications.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaBell, FaTimes, FaCheckCircle, FaMoneyBillWave, 
  FaExchangeAlt, FaExclamationTriangle, FaTrashAlt,
  FaCheckDouble, FaEye, FaEyeSlash
} from 'react-icons/fa';

const CompanyNotifications = ({ user, socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchNotificationStats();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Écouter les événements de paiement
      socket.on('bill-payment', (data) => {
        console.log('📢 Nouveau paiement reçu:', data);
        toast.success(`💰 Nouveau paiement reçu ! ${data.amount?.toLocaleString()} FCFA`, {
          duration: 10000,
          icon: '💰',
          position: 'top-right'
        });
        fetchNotifications();
        fetchNotificationStats();
      });
      
      // Écouter les notifications générales
      socket.on('notification', (notification) => {
        console.log('📢 Notification reçue:', notification);
        if (notification.type === 'bill_received') {
          toast.success(notification.message, {
            duration: 8000,
            icon: '💰'
          });
        } else {
          toast.info(notification.message, {
            duration: 5000
          });
        }
        fetchNotifications();
        fetchNotificationStats();
      });
    }
    
    return () => {
      if (socket) {
        socket.off('bill-payment');
        socket.off('notification');
      }
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/company/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
        setCompany(response.data.company);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/company/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.stats) {
        setUnreadCount(response.data.stats.unread || 0);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(`/api/company/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, is_read: 1 } : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Erreur marquage:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put('/api/company/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: 1 })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
      
    } catch (error) {
      console.error('Erreur marquage toutes:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`/api/company/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      toast.success('Notification supprimée');
      
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'bill_received': return <FaMoneyBillWave className="text-green-500" />;
      case 'transfer_sent': return <FaExchangeAlt className="text-blue-500" />;
      case 'low_balance': return <FaExclamationTriangle className="text-yellow-500" />;
      default: return <FaBell className="text-gray-500" />;
    }
  };

  const getColorClass = (type) => {
    switch(type) {
      case 'bill_received': return 'border-l-4 border-green-500';
      case 'transfer_sent': return 'border-l-4 border-blue-500';
      case 'low_balance': return 'border-l-4 border-yellow-500';
      default: return 'border-l-4 border-gray-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  };

  if (!user || user.role !== 'agent') return null;

  return (
    <>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <FaBell size={18} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau des notifications */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* En-tête */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaBell /> Notifications
                  {company && (
                    <span className="text-sm font-normal text-gray-400">
                      - {company.name}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {unreadCount} non lue(s)
                </p>
              </div>
              <div className="flex gap-2">
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                    title="Tout marquer comme lu"
                  >
                    <FaCheckDouble size={14} />
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FaBell className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`bg-gray-700/50 rounded-xl p-4 transition-all hover:bg-gray-700 ${getColorClass(notif.type)} ${!notif.is_read ? 'bg-gray-700' : 'opacity-80'}`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-white text-sm">
                              {notif.title}
                            </h4>
                            <span className="text-xs text-gray-400 ml-2">
                              {formatDate(notif.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">
                            {notif.message}
                          </p>
                          {notif.metadata && (
                            <div className="mt-2 text-xs text-gray-400 bg-black/20 rounded-lg p-2">
                              {typeof notif.metadata === 'string' ? 
                                JSON.parse(notif.metadata)?.amount && (
                                  <div className="flex justify-between">
                                    <span>Montant reçu:</span>
                                    <span className="text-green-400 font-bold">
                                      {JSON.parse(notif.metadata).amount?.toLocaleString()} FCFA
                                    </span>
                                  </div>
                                ) : notif.metadata?.amount && (
                                  <div className="flex justify-between">
                                    <span>Montant reçu:</span>
                                    <span className="text-green-400 font-bold">
                                      {notif.metadata.amount.toLocaleString()} FCFA
                                    </span>
                                  </div>
                                )
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="ml-2 p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition"
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    </div>
                    {!notif.is_read && (
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs text-blue-400">Nouveau</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pied de page */}
            <div className="p-4 border-t border-gray-700 text-center">
              <button
                onClick={() => setShowPanel(false)}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyNotifications;