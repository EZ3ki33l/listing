'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCountdown from '@/components/EventCountdown';
import Link from 'next/link';
import { getAllActiveEvents, getCurrentUser, leaveSharedEvent } from '@/lib/actions';
import { useFeedback } from '@/components/Feedback';
import UserMenu from '@/components/UserMenu';
import UserAuth from '@/components/UserAuth';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
  owner: {
    id: string;
    username: string;
  };
}

export default function HomePage() {
  const { notify, confirm } = useFeedback();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // La session serveur fait foi : le localStorage ne sert qu'à l'affichage
    getCurrentUser().then(user => {
      if (!user) localStorage.removeItem('user');
      setUserId(user?.id ?? null);
      setIsInitializing(false);
    });

    // Déconnexion depuis un autre onglet
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue === null) {
        setUserId(null);
        setEvents([]);
      }
    };

    // Déconnexion depuis ce même onglet (UserMenu)
    const handleUserLogout = () => {
      setUserId(null);
      setEvents([]);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogout', handleUserLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogout', handleUserLogout);
    };
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      // Récupérer les événements de l'utilisateur connecté
      const result = await getAllActiveEvents();
      
      if (result.success && result.events) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Attendre que l'initialisation soit terminée
    if (!isInitializing) {
      // Charger les listes d'achats seulement si l'utilisateur est connecté
      if (userId !== null) {
        loadEvents();
      } else {
        setIsLoading(false);
      }
    }
  }, [userId, isInitializing, loadEvents]);

  const handleLeaveEvent = async (eventId: string, eventName: string) => {
    const ok = await confirm({
      title: "Se retirer de l'événement",
      message: `Êtes-vous sûr de vouloir vous retirer de l'événement "${eventName}" ?\n\nVous ne pourrez plus accéder à cette liste d'achats partagée.`,
      confirmText: 'Oui, me retirer',
      type: 'warning'
    });
    if (!ok) return;

    try {
      const result = await leaveSharedEvent(eventId);

      if (result.success) {
        notify('success', 'Retrait réussi', `${result.message}\n\nL'événement "${result.eventName}" de ${result.ownerUsername} a été retiré de vos événements partagés.`);
        await loadEvents();
      } else {
        notify('error', 'Erreur', result.error || "Erreur lors du retrait de l'événement");
      }
    } catch (error) {
      console.error('Erreur lors du retrait de l\'événement:', error);
      notify('error', 'Erreur', "Erreur lors du retrait de l'événement");
    }
  };

  const handleLogin = (userData: { id: string; username: string; email?: string; isAdmin: boolean }) => {
    // Mettre à jour l'état local avec les données de l'utilisateur
    setUserId(userData.id);
    // Stocker dans localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    // Fermer la modal
    setShowAuthModal(false);
    // Recharger les événements
    loadEvents();
  };

  // Séparer les événements par type (possédés vs partagés)
  const ownedEvents = events.filter(event => event.owner.id === userId);
  const sharedEvents = events.filter(event => event.owner.id !== userId);

  // Calculer les jours restants pour chaque événement
  const eventsWithCountdown = events.map(event => {
    // Si l'événement n'a pas de date cible, ne pas afficher de compte à rebours
    if (!event.hasTargetDate || !event.targetDate) {
      return {
        ...event,
        daysUntil: null,
        nextTargetDate: null
      };
    }

    const now = new Date();
    let targetDate = new Date(event.targetDate);
    
    // Si la date est passée, calculer la prochaine occurrence
    if (targetDate < now) {
      // Calculer la prochaine occurrence selon le type d'événement (à minuit)
      let nextOccurrence: Date;
      const currentYear = now.getFullYear();
      
      switch (event.eventType) {
        case 'anniversaire':
          // Calculer la prochaine occurrence de l'anniversaire
          const birthdayDate = new Date(`${currentYear}-09-28T00:00:00`);
          if (birthdayDate < now) {
            // Si l'anniversaire de cette année est passé, prendre l'année suivante
            nextOccurrence = new Date(`${currentYear + 1}-09-28T00:00:00`);
          } else {
            nextOccurrence = birthdayDate;
          }
          break;
        case 'saint-valentin':
          const valentineDate = new Date(`${currentYear}-02-14T00:00:00`);
          if (valentineDate < now) {
            nextOccurrence = new Date(`${currentYear + 1}-02-14T00:00:00`);
          } else {
            nextOccurrence = valentineDate;
          }
          break;
        case 'noel':
          const christmasDate = new Date(`${currentYear}-12-25T00:00:00`);
          if (christmasDate < now) {
            nextOccurrence = new Date(`${currentYear + 1}-12-25T00:00:00`);
          } else {
            nextOccurrence = christmasDate;
          }
          break;
        case 'anniversaire-rencontre':
          const meetingDate = new Date(`${currentYear}-11-04T00:00:00`);
          if (meetingDate < now) {
            nextOccurrence = new Date(`${currentYear + 1}-11-04T00:00:00`);
          } else {
            nextOccurrence = meetingDate;
          }
          break;
        default:
          // Pour les événements personnalisés, utiliser la date cible si elle existe
          if (event.targetDate) {
            const customDate = new Date(event.targetDate);
            const customDateThisYear = new Date(`${currentYear}-${(customDate.getMonth() + 1).toString().padStart(2, '0')}-${customDate.getDate().toString().padStart(2, '0')}T00:00:00`);
            
            if (customDateThisYear < now) {
              // Si la date de cette année est passée, prendre l'année suivante
              nextOccurrence = new Date(`${currentYear + 1}-${(customDate.getMonth() + 1).toString().padStart(2, '0')}-${customDate.getDate().toString().padStart(2, '0')}T00:00:00`);
            } else {
              nextOccurrence = customDateThisYear;
            }
          } else {
            nextOccurrence = targetDate;
          }
      }
      targetDate = nextOccurrence;
    }
    
    // Utiliser la même logique que dans EventCountdown pour la cohérence
    const timeDiff = targetDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return {
      ...event,
      daysUntil,
      nextTargetDate: targetDate
    };
  });




  // Afficher un loader pendant l'initialisation pour éviter le clipping
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header avec menu utilisateur */}
      {userId && (
        <header className="bg-white/30 backdrop-blur-sm border-b border-gray-200/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center py-4">
              {/* Menu utilisateur compact */}
              <UserMenu userId={userId} />
            </div>
          </div>
        </header>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-4">
          🎉 Gestionnaire de Listes d&apos;Achats Familial
        </h1>
        <p className="text-center text-gray-600 text-lg mb-16 max-w-2xl mx-auto">
          Célébrez ensemble vos moments spéciaux avec amour et joie ✨
        </p>

        {/* Affichage de tous les comptes à rebours des listes d'achats */}
        {/* Affichage des événements avec compte à rebours (seulement si connecté) */}
        {userId && events.length > 0 && (
          <>
            {/* Mes événements */}
            {ownedEvents.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                  🏠 Mes événements
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                  {ownedEvents
                    .filter(event => event.hasTargetDate && event.targetDate)
                    .map((event) => {
                      const eventWithCountdown = eventsWithCountdown.find(e => e.id === event.id);
                      if (!eventWithCountdown || eventWithCountdown.daysUntil === null) return null;
                      
                      return (
                        <div key={event.id} className="h-full flex flex-col transform hover:scale-105 transition-all duration-300">
                          <div className="flex-1">
                            <EventCountdown 
                              event={event}
                              showTitle={true}
                              compact={true}
                            />
                          </div>
                          <div className="text-center mt-4 flex-shrink-0">
                            <Link
                              href={`/liste?event=${event.id}`}
                              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                            >
                              🛍️ Voir la liste
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Événements partagés */}
            {sharedEvents.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                  🤝 Événements partagés avec moi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                  {sharedEvents
                    .filter(event => event.hasTargetDate && event.targetDate)
                    .map((event) => {
                      const eventWithCountdown = eventsWithCountdown.find(e => e.id === event.id);
                      if (!eventWithCountdown || eventWithCountdown.daysUntil === null) return null;
                      
                      return (
                        <div key={event.id} className="h-full flex flex-col transform hover:scale-105 transition-all duration-300">
                          <div className="flex-1">
                            <EventCountdown 
                              event={event}
                              showTitle={true}
                              compact={true}
                            />
                          </div>
                          <div className="text-center mt-4 flex-shrink-0 space-y-2">
                            <Link
                              href={`/liste?event=${event.id}`}
                              className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium w-full"
                            >
                              🛍️ Voir la liste
                            </Link>
                            <button
                              onClick={() => handleLeaveEvent(event.id, event.name)}
                              className="inline-block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium w-full text-sm"
                            >
                              🚪 Se retirer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Mes événements sans date */}
            {ownedEvents.filter(event => !event.hasTargetDate || !event.targetDate).length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                  📋 Mes listes d&apos;achats sans date
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                  {ownedEvents
                    .filter(event => !event.hasTargetDate || !event.targetDate)
                    .map((event) => (
                      <div key={event.id} className="h-full flex flex-col transform hover:scale-105 transition-all duration-300">
                        <div className="flex-1">
                          <EventCountdown 
                            event={event}
                            showTitle={true}
                            compact={true}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Événements partagés sans date */}
            {sharedEvents.filter(event => !event.hasTargetDate || !event.targetDate).length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                  📋 Listes d&apos;achats partagées sans date
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                  {sharedEvents
                    .filter(event => !event.hasTargetDate || !event.targetDate)
                    .map((event) => (
                      <div key={event.id} className="h-full flex flex-col transform hover:scale-105 transition-all duration-300">
                        <div className="flex-1">
                          <EventCountdown 
                            event={event}
                            showTitle={true}
                            compact={true}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}


        {/* Message quand aucun événement n'est configuré ou utilisateur non connecté */}
        {!userId ? (
          // Utilisateur non connecté - Hauteur minimale pour éviter le clipping
          <div className="text-center mb-16 min-h-[400px] flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-auto border border-gray-100">
              <div className="text-6xl mb-4">🔐</div>
              <p className="text-lg text-gray-600 mb-6">
                Connectez-vous pour voir vos listes d&apos;achats
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Créez un compte ou connectez-vous pour organiser vos événements
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  🔑 Se connecter
                </button>
              </div>
            </div>
          </div>
        ) : (ownedEvents.length === 0 && sharedEvents.length === 0) ? (
          // Utilisateur connecté mais sans événements - Hauteur minimale pour éviter le clipping
          <div className="text-center mb-16 min-h-[400px] flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-auto border border-gray-100">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-lg text-gray-600 mb-6">
                Aucune liste d&apos;achats configurée. 
              </p>
              <div className="space-y-4">
                <Link
                  href="/user"
                  className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  ➕ Créer ma première liste
                </Link>
              </div>
            </div>
          </div>
        ) : null}


      </div>

      {/* Modal de connexion */}
      {showAuthModal && (
        <UserAuth onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
