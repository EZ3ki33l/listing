'use client';

import { useState, useEffect } from 'react';
import EventCountdown from '@/components/EventCountdown';
import Link from 'next/link';
import { getAllActiveEvents } from '@/lib/actions';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger les listes d'achats
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      // Essayer de récupérer tous les événements actifs
      const result = await getAllActiveEvents();
      
      if (result.success && result.events) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Filtrer et trier les événements
  const eventsWithDate = eventsWithCountdown.filter(event => event.daysUntil !== null);
  const eventsWithoutDate = eventsWithCountdown.filter(event => event.daysUntil === null);
  
  // Trier par nombre de jours restants
  const sortedEvents = eventsWithDate.sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-4">
          🎉 Gestionnaire de Listes d&apos;Achats Familial
        </h1>
        <p className="text-center text-gray-600 text-lg mb-16 max-w-2xl mx-auto">
          Célébrez ensemble vos moments spéciaux avec amour et joie ✨
        </p>

        {/* Affichage de tous les comptes à rebours des listes d'achats */}
        {sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 items-stretch">
            {sortedEvents.map((event) => (
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
            ))}
          </div>
        ) : null}

        {/* Affichage des événements sans date */}
        {eventsWithoutDate.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
              📋 Listes d&apos;achats sans date
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
              {eventsWithoutDate.map((event) => (
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

        {/* Message quand aucun événement n'est configuré */}
        {sortedEvents.length === 0 && eventsWithoutDate.length === 0 && (
          <div className="text-center mb-16">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-auto border border-gray-100">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-lg text-gray-600 mb-6">
                Aucune liste d&apos;achats configurée. 
              </p>
              <div className="space-y-4">
                <Link
                  href="/admin"
                  className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  ⚙️ Configurer les listes d&apos;achats
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Lien vers l'administration */}
        <div className="text-center">
          <Link
            href="/admin"
            className="inline-block bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium text-lg"
          >
            🔐 Accès administration
          </Link>
        </div>
      </div>
    </div>
  );
}
