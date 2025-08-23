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

  // Initialiser le state avec le calcul initial
  useEffect(() => {
    if (finalTargetDate && finalHasTargetDate) {
      const initialTimeLeft = calculateTimeLeft();
      setTimeLeft(initialTimeLeft);
    }
  }, [finalTargetDate, finalHasTargetDate, calculateTimeLeft]);

  // Mettre à jour toutes les secondes
  useEffect(() => {
    if (!finalTargetDate || !finalHasTargetDate) return;

    const timer = setInterval(() => {
      const currentTimeLeft = calculateTimeLeft();
      setTimeLeft(currentTimeLeft);
      
      if (currentTimeLeft.days <= 0 && currentTimeLeft.hours <= 0 && currentTimeLeft.minutes <= 0) {
        onComplete();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [finalTargetDate, finalHasTargetDate, onComplete, calculateTimeLeft]);

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'anniversaire':
        return {
          icon: Cake,
          colors: {
            primary: 'from-pink-500 to-rose-500',
            secondary: 'from-pink-400 to-rose-400',
            accent: 'from-pink-300 to-rose-300'
          },
          emoji: '🎂',
          title: 'Anniversaire'
        };
      case 'noel':
        return {
          icon: Gift,
          colors: {
            primary: 'from-red-500 to-green-500',
            secondary: 'from-red-400 to-green-400',
            accent: 'from-red-300 to-green-300'
          },
          emoji: '🎄',
          title: 'Noël'
        };
      case 'saint-valentin':
        return {
          icon: Heart,
          colors: {
            primary: 'from-red-500 to-pink-500',
            secondary: 'from-red-400 to-pink-400',
            accent: 'from-red-300 to-pink-300'
          },
          emoji: '💝',
          title: 'Saint-Valentin'
        };
      case 'anniversaire-rencontre':
        return {
          icon: Users,
          colors: {
            primary: 'from-blue-500 to-purple-500',
            secondary: 'from-blue-400 to-purple-400',
            accent: 'from-blue-300 to-purple-300'
          },
          emoji: '💕',
          title: 'Anniversaire de rencontre'
        };
      default:
        return {
          icon: Gift,
          colors: {
            primary: 'from-blue-500 to-indigo-500',
            secondary: 'from-blue-400 to-indigo-400',
            accent: 'from-blue-300 to-indigo-300'
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
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-gray-100 h-full min-h-[280px] md:min-h-[300px] lg:min-h-[320px] flex flex-col justify-between">
        {showTitle && (
          <div className="text-center mb-4">
            <div className="text-4xl mb-2 animate-bounce">{config.emoji}</div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">{finalEventName}</h3>
            {finalHasTargetDate && finalTargetDate && (
              <p className="text-gray-600 text-sm font-medium">{config.title}</p>
            )}
            {event?.isPrivate && (
              <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full mt-2">
                🔒 Liste privée
              </span>
            )}
          </div>
        )}
        
        {finalHasTargetDate && finalTargetDate ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200 shadow-sm">
              <div className="text-2xl font-bold text-blue-700 mb-1">{timeLeft.days}</div>
              <div className="text-xs text-blue-600 font-medium">Jours</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-purple-700 mb-1">{timeLeft.hours}</div>
              <div className="text-xs text-purple-600 font-medium">Heures</div>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-3 border border-pink-200 shadow-sm">
              <div className="text-2xl font-bold text-pink-700 mb-1">{timeLeft.minutes}</div>
              <div className="text-xs text-pink-600 font-medium">Minutes</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Link
              href={`/liste?type=${finalEventType}`}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
            >
              🛍️ Voir la liste
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${config.colors.primary} rounded-2xl p-8 text-white text-center shadow-xl`}>
      <div className="text-6xl mb-4">{config.emoji}</div>
      
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{finalEventName}</h2>
          {finalHasTargetDate && finalTargetDate && (
            <p className="text-xl opacity-90">{config.title}</p>
          )}
          {event?.isPrivate && (
            <span className="inline-block px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full mt-2">
              🔒 Liste privée
            </span>
          )}
        </div>
      )}

      {finalHasTargetDate && finalTargetDate ? (
        <>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white bg-opacity-20 rounded-xl p-4">
              <div className="text-4xl font-bold">{timeLeft.days}</div>
              <div className="text-lg">Jours</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-4">
              <div className="text-4xl font-bold">{timeLeft.hours}</div>
              <div className="text-lg">Heures</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
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
            href={`/liste?type=${finalEventType}`}
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            🛍️ Voir la liste
          </Link>
        </div>
      )}
    </div>
  );
}
