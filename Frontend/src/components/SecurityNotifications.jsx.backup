// src/components/SecurityNotifications.jsx
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';

function SecurityNotifications({ socket }) {
    useEffect(() => {
        if (!socket) return;
        
        const handleNotification = (notification) => {
            if (notification.type === 'security') {
                toast.success(notification.message, {
                    duration: 10000,
                    icon: notification.title.includes('Clé') ? '🔑' : '🔐',
                    style: {
                        background: '#1e3a8a',
                        color: '#fff',
                        borderRadius: '12px',
                    }
                });
            }
        };
        
        socket.on('notification', handleNotification);
        
        return () => {
            socket.off('notification', handleNotification);
        };
    }, [socket]);
    
    return null;
}

export default SecurityNotifications;