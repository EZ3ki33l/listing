'use client';

import { useState, useEffect, useCallback } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { Heart, Gift, Cake, Users } from 'lucide-react';
import Link from 'next/link';

interface EventCountdownProps {
  event?: {
    id: string;
    name: string;
    eventType: string;
    targetDate: Date | null;
    hasTargetDate: boolean;
    isPrivate: boolean;
    daysUntil?: number | null;
    nextTargetDate?: Date | null;
  };
  targetDate?: Date;
  eventName?: string;
  eventType?: string;
  onComplete?: () => void;
  showTitle?: boolean;
  compact?: boolean;
}

export default function EventCountdown({ 
  event, 
  targetDate, 
  eventName, 
  eventType, 
  onComplete = () => {}, 
  showTitle = false,
  compact = false 
}: EventCountdownProps) {
  // Utiliser l'objet event s'il est fourni, sinon les props individuelles
  const finalTargetDate = event?.nextTargetDate || event?.targetDate || targetDate;
  const finalEventName = event?.name || eventName || '';
  const finalEventType = event?.eventType || eventType || '';
  const finalHasTargetDate = event?.hasTargetDate ?? true;

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0
  });

  // Fonction pour calculer le temps restant (mémorisée)
  const calculateTimeLeft = useCallback(() => {
    if (!finalTargetDate || !finalHasTargetDate) return { days: 0, hours: 0, minutes: 0 };
    
    const now = new Date();
    const target = new Date(finalTargetDate);
    
    const days = differenceInDays(target, now);
    const hours = differenceInHours(target, now) % 24;
    const minutes = differenceInMinutes(target, now) % 60;
    
    return { days, hours, minutes };
  }, [finalTargetDate, finalHasTargetDate]);

  // Premier calcul immédiat, puis mise à jour toutes les secondes
  useEffect(() => {
    if (!finalTargetDate || !finalHasTargetDate) return;

    const first = setTimeout(() => setTimeLeft(calculateTimeLeft()), 0);
    const timer = setInterval(() => {
      const currentTimeLeft = calculateTimeLeft();
      setTimeLeft(currentTimeLeft);
      
      if (currentTimeLeft.days <= 0 && currentTimeLeft.hours <= 0 && currentTimeLeft.minutes <= 0) {
        onComplete();
        clearInterval(timer);
      }
    }, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [finalTargetDate, finalHasTargetDate, onComplete, calculateTimeLeft]);

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'anniversaire':
        return {
          icon: Cake,
          colors: {
            primary: 'bg-razzmatazz text-paper',
            secondary: '',
            accent: ''
          },
          emoji: '🎂',
          title: 'Anniversaire'
        };
      case 'noel':
        return {
          icon: Gift,
          colors: {
            primary: 'bg-razzmatazz text-paper',
            secondary: '',
            accent: ''
          },
          emoji: '🎄',
          title: 'Noël'
        };
      case 'saint-valentin':
        return {
          icon: Heart,
          colors: {
            primary: 'bg-razzmatazz text-paper',
            secondary: '',
            accent: ''
          },
          emoji: '💝',
          title: 'Saint-Valentin'
        };
      case 'anniversaire-rencontre':
        return {
          icon: Users,
          colors: {
            primary: 'bg-razzmatazz text-paper',
            secondary: '',
            accent: ''
          },
          emoji: '💕',
          title: 'Anniversaire de rencontre'
        };
      default:
        return {
          icon: Gift,
          colors: {
            primary: 'bg-razzmatazz text-paper',
            secondary: '',
            accent: ''
          },
          emoji: '🎉',
          title: 'Événement'
        };
    }
  };

  if (!finalEventName) return null;

  const config = getEventConfig(finalEventType);

  if (compact) {
    return (
      <div className="brut h-full min-h-[260px] flex flex-col">
        {showTitle && (
          <div className={`${config.colors.primary} border-b-[3px] border-ink px-5 py-4`}>
            <span className="label">{config.title}</span>
            <h3 className="mt-3 text-2xl font-extrabold uppercase leading-tight break-words">
              <span aria-hidden="true">{config.emoji} </span>
              {finalEventName}
            </h3>
            {event?.isPrivate && (
              <span className="label mt-3 !bg-paper !text-ink">Liste privée</span>
            )}
          </div>
        )}

        {finalHasTargetDate && finalTargetDate ? (
          <div className="grid grid-cols-3 flex-1 divide-x-[3px] divide-ink">
            {[
              { value: timeLeft.days, unit: 'Jours', bg: 'bg-malachite' },
              { value: timeLeft.hours, unit: 'Heures', bg: 'bg-heliotrope' },
              { value: timeLeft.minutes, unit: 'Min', bg: 'bg-paper' },
            ].map(({ value, unit, bg }) => (
              <div key={unit} className={`${bg} flex flex-col items-center justify-center p-3`}>
                <div className="text-4xl font-extrabold tabular-nums">{value}</div>
                <div className="font-mono text-xs font-bold uppercase tracking-widest mt-1">{unit}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-malachite p-6">
            <Link
              href={event?.id ? `/liste?event=${event.id}` : `/liste?type=${finalEventType}`}
              className="btn btn-pink"
            >
              Voir la liste
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`brut ${config.colors.primary} p-8 text-center`}>
      <div className="text-6xl mb-4">{config.emoji}</div>
      
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{finalEventName}</h2>
          {finalHasTargetDate && finalTargetDate && (
            <p className="text-xl opacity-90">{config.title}</p>
          )}
          {event?.isPrivate && (
            <span className="label mt-2 !bg-paper !text-ink">
              🔒 Liste privée
            </span>
          )}
        </div>
      )}

      {finalHasTargetDate && finalTargetDate ? (
        <>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-ink/20 border-[3px] border-ink p-4">
              <div className="text-4xl font-bold">{timeLeft.days}</div>
              <div className="text-lg">Jours</div>
            </div>
            <div className="bg-ink/20 border-[3px] border-ink p-4">
              <div className="text-4xl font-bold">{timeLeft.hours}</div>
              <div className="text-lg">Heures</div>
            </div>
            <div className="bg-ink/20 border-[3px] border-ink p-3">
              <div className="text-4xl font-bold">{timeLeft.minutes}</div>
              <div className="text-lg">Minutes</div>
            </div>
          </div>

          <div className="text-sm opacity-75">
            {finalTargetDate.toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Link
            href={event?.id ? `/liste?event=${event.id}` : `/liste?type=${finalEventType}`}
            className="btn btn-pink"
          >
            Voir la liste
          </Link>
        </div>
      )}
    </div>
  );
}
