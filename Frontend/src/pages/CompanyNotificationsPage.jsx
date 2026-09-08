// src/pages/CompanyNotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaBell, FaMoneyBillWave, FaExchangeAlt, FaExclamationTriangle } from 'react-icons/fa';
import Layout from '../components/Layout';

const CompanyNotificationsPage = ({ user, socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/company/notifications?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/company/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(`/api/company/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'bill_received': return <FaMoneyBillWave className="text-green-500 text-2xl" />;
      case 'transfer_sent': return <FaExchangeAlt className="text-blue-500 text-2xl" />;
      case 'low_balance': return <FaExclamationTriangle className="text-yellow-500 text-2xl" />;
      default: return <FaBell className="text-gray-500 text-2xl" />;
    }
  };

  if (!user || user.role !== 'agent') return null;

  return (
    <Layout user={user} socket={socket}>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Mes notifications</h2>
          <div className="flex gap-4">
            <div className="bg-blue-500/20 rounded-lg px-3 py-1 text-blue-400">
              Non lues: {stats.unread || 0}
            </div>
            <div className="bg-green-500/20 rounded-lg px-3 py-1 text-green-400">
              Paiements: {stats.payments_received || 0}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <FaBell className="w-16 h-16 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`bg-gray-700/50 rounded-xl p-4 transition-all hover:bg-gray-700 cursor-pointer ${!notif.is_read ? 'border-l-4 border-blue-500' : 'opacity-80'}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="flex gap-4">
                  {getIcon(notif.type)}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-white">{notif.title}</h3>
                      <span className="text-xs text-gray-400">
                        {new Date(notif.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-gray-300 mt-1">{notif.message}</p>
                    {!notif.is_read && (
                      <span className="text-xs text-blue-400 mt-2 inline-block">Cliquez pour marquer comme lu</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyNotificationsPage;