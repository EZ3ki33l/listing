'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageLoader, SiteHeader } from '@/components/PageChrome';
import EventCountdown from '@/components/EventCountdown';
import Link from 'next/link';
import { getAllActiveEvents, getCurrentUser, leaveSharedEvent } from '@/lib/actions';
import { useFeedback } from '@/components/Feedback';
import UserMenu from '@/components/UserMenu';
import UserAuth from '@/components/UserAuth';
import Landing from '@/components/Landing';
import Slider from '@/components/Slider';

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
  const [eventsLoaded, setEventsLoaded] = useState(false);
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

  // Chaînage en .then (et non async/await) : le lint refuse un setState atteint de façon synchrone depuis un effet
  const loadEvents = useCallback(() => {
    // Récupérer les événements de l'utilisateur connecté
    return getAllActiveEvents()
      .then(result => {
        if (result.success && result.events) {
          setEvents(result.events);
        }
      })
      .catch(error => console.error('Erreur lors du chargement des événements:', error))
      .finally(() => setEventsLoaded(true));
  }, []);

  useEffect(() => {
    // Charger les listes d'achats seulement si l'utilisateur est connecté, une fois l'initialisation terminée
    if (!isInitializing && userId !== null) {
      loadEvents();
    }
  }, [userId, isInitializing, loadEvents]);

  // Sans utilisateur connecté, il n'y a rien à charger
  const isLoading = userId !== null && !eventsLoaded;

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




  const dated = (list: Event[]) => list.filter(e => e.hasTargetDate && e.targetDate);
  const undated = (list: Event[]) => list.filter(e => !e.hasTargetDate || !e.targetDate);

  const sections = [
    { key: 'owned', title: 'Mes événements', events: dated(ownedEvents), shared: false },
    { key: 'shared', title: 'Partagés avec moi', events: dated(sharedEvents), shared: true },
    { key: 'owned-undated', title: 'Mes listes sans date', events: undated(ownedEvents), shared: false },
    { key: 'shared-undated', title: 'Listes partagées sans date', events: undated(sharedEvents), shared: true },
  ].filter(section => section.events.length > 0);

  if (isInitializing || isLoading) {
    return <PageLoader message={isInitializing ? 'Initialisation…' : 'Chargement des événements…'} />;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <SiteHeader>
        {userId ? (
          <UserMenu />
        ) : (
          <button onClick={() => setShowAuthModal(true)} className="btn">
            Se connecter
          </button>
        )}
      </SiteHeader>

      {!userId ? (
        <Landing onStart={() => setShowAuthModal(true)} />
      ) : (
        <>
      <section className="bg-stripes px-5 py-8 sm:py-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <p className="label !text-sm !block w-fit">Gestionnaire de listes d&apos;achats familial</p>
          <h1 className="brut mt-4 block w-fit px-5 py-3 text-4xl sm:text-6xl uppercase leading-[1]">
            Célébrez vos moments
            <br />
            spéciaux
          </h1>
        </div>
      </section>

      <main className="flex-1 py-8">
        {sections.map(section => (
          <section key={section.key} className="mb-10 last:mb-0" aria-labelledby={`h-${section.key}`}>
            <div className="max-w-7xl mx-auto px-5 mb-6 flex items-end justify-between gap-4">
              <h2 id={`h-${section.key}`} className="text-3xl sm:text-4xl font-extrabold uppercase">
                {section.title}
              </h2>
              <span className="label">
                {String(section.events.length).padStart(2, '0')} · Glisser
              </span>
            </div>

            <div className="pl-5 pr-0 sm:pl-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))]">
              <Slider label={section.title}>
                {section.events.map(event => (
                  <div key={event.id} className="flex flex-col">
                    <div className="flex-1">
                      <EventCountdown event={eventsWithCountdown.find(e => e.id === event.id) ?? event} showTitle compact />
                    </div>
                    {event.hasTargetDate && event.targetDate && (
                      <div className="mt-5 flex gap-3">
                        <Link href={`/liste?event=${event.id}`} className={`btn flex-1 ${section.shared ? '' : 'btn-pink'}`}>
                          Voir la liste
                        </Link>
                        {section.shared && (
                          <button
                            onClick={() => handleLeaveEvent(event.id, event.name)}
                            className="btn"
                            aria-label={`Se retirer de ${event.name}`}
                          >
                            Quitter
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </Slider>
            </div>
          </section>
        ))}

        {!userId ? (
          <div className="px-5 flex justify-center">
            <div className="brut brut-shadow-pink max-w-md p-8 text-center">
              <h2 className="text-3xl font-extrabold uppercase mb-3">Connectez-vous</h2>
              <p className="mb-6">Créez un compte ou connectez-vous pour organiser vos listes et vos événements.</p>
              <button onClick={() => setShowAuthModal(true)} className="btn btn-pink">
                Se connecter
              </button>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="px-5 flex justify-center">
            <div className="brut brut-shadow-pink max-w-md p-8 text-center">
              <h2 className="text-3xl font-extrabold uppercase mb-3">Aucune liste</h2>
              <p className="mb-6">Vous n&apos;avez pas encore de liste d&apos;achats.</p>
              <Link href="/user" className="btn btn-pink">
                Créer ma première liste
              </Link>
            </div>
          </div>
        ) : null}
      </main>
        </>
      )}

      {showAuthModal && (
        <UserAuth onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
