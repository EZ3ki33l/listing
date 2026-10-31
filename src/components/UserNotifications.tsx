'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Info, CheckCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, deleteNotification } from '@/lib/actions';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}

interface UserNotificationsProps {
  userId: string;
}

async function fetchNotifications() {
  try {
    const result = await getUserNotifications();
    return result.success && result.notifications ? result.notifications : null;
  } catch (error) {
    console.error('Erreur lors du chargement des notifications:', error);
    return null;
  }
}

export default function UserNotifications({ userId }: UserNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchNotifications().then(list => {
      if (list) setNotifications(list);
      setIsLoading(false);
    });
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markNotificationAsRead(notificationId);
      if (result.success) {
        // Mettre à jour l'état local
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const result = await deleteNotification(notificationId);
      if (result.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_LEAVE':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'EVENT_SHARE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-razzmatazz" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'EVENT_LEAVE':
        return 'border-orange-200 bg-orange-50';
      case 'EVENT_SHARE':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-ink bg-heliotrope/20';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
          <span className="ml-3 text-ink">Chargement des notifications...</span>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6">
        <div className="text-center">
          <Bell className="w-12 h-12 text-ink/60 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-ink mb-2">Aucune notification</h3>
          <p className="text-ink">Vous n&apos;avez pas encore reçu de notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full block bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 relative z-0">
      {/* Header avec bouton de réduction */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-razzmatazz" />
          <h3 className="text-xl font-semibold text-ink">
            Notifications
            {unreadCount > 0 && (
              <span className="btn btn-pink ml-2">
                {unreadCount}
              </span>
            )}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {notifications.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-razzmatazz hover:text-razzmatazz font-medium"
            >
              {showAll ? 'Voir moins' : `Voir toutes (${notifications.length})`}
            </button>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-none hover:bg-heliotrope/20 transition-colors"
            title={isCollapsed ? 'Développer' : 'Réduire'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-ink" />
            ) : (
              <ChevronUp className="w-5 h-5 text-ink" />
            )}
          </button>
        </div>
      </div>

      {/* Contenu conditionnel */}
      {!isCollapsed && (
        <>
          {/* Liste des notifications */}
          <div className="space-y-3">
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-none border-2 transition-all duration-200 ${
                  notification.isRead 
                    ? 'opacity-60' 
                    : 'opacity-100 border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a]'
                } ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`text-sm font-semibold mb-1 ${
                          notification.isRead ? 'text-ink' : 'text-ink'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className={`text-sm ${
                          notification.isRead ? 'text-ink/60' : 'text-ink'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-ink/60 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="flex-shrink-0 p-1 rounded-none hover:bg-white/50 transition-colors"
                            title="Marquer comme lue"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="flex-shrink-0 p-1 rounded-none hover:bg-white/50 transition-colors text-red-600"
                          title="Supprimer la notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton pour marquer toutes comme lues */}
          {unreadCount > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={async () => {
                  const unreadNotifications = notifications.filter(n => !n.isRead);
                  await Promise.all(
                    unreadNotifications.map(n => markNotificationAsRead(n.id))
                  );
                  setNotifications(prev => 
                    prev.map(n => ({ ...n, isRead: true }))
                  );
                }}
                className="btn"
              >
                <Check className="w-4 h-4 mr-2" />
                Marquer toutes comme lues
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
