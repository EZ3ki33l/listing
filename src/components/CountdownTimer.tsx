'use client';

import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete: () => void;
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      
      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      
      setTimeLeft({ days, hours, minutes });
      
      if (days <= 0 && hours <= 0 && minutes <= 0) {
        onComplete();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  return (
    <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
      <div className="bg-blue-500 text-white rounded-lg p-6">
        <div className="text-6xl font-bold">{timeLeft.days}</div>
        <div className="text-xl">Jours</div>
      </div>
      
      <div className="bg-green-500 text-white rounded-lg p-6">
        <div className="text-6xl font-bold">{timeLeft.hours}</div>
        <div className="text-xl">Heures</div>
      </div>
      
      <div className="bg-purple-500 text-white rounded-lg p-6">
        <div className="text-6xl font-bold">{timeLeft.minutes}</div>
        <div className="text-xl">Minutes</div>
      </div>
    </div>
  );
}
