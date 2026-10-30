'use client';

import { useState, useEffect } from 'react';
import { PageLoader, SiteHeader, PageHero } from '@/components/PageChrome';
import UserEvents from '@/components/UserEvents';
import Landing from '@/components/Landing';
import UserAuth from '@/components/UserAuth';
import UserNotifications from '@/components/UserNotifications';
import UserMenu from '@/components/UserMenu';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/actions';

interface User {
  id: string;
  username: string;
  email?: string;
  isAdmin: boolean;
}

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // La session serveur fait foi : le localStorage ne sert qu'à l'affichage
    getCurrentUser().then(sessionUser => {
      const storedUser = localStorage.getItem('user');
      if (sessionUser && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      } else {
        localStorage.removeItem('user');
      }
      setIsInitializing(false);
    });
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setShowAuth(false);
  };



  // Afficher un loader pendant l'initialisation pour éviter le clipping
  if (isInitializing) {
    return (
      <PageLoader message="Initialisation…" />
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-paper">
        <SiteHeader>
          <Link href="/" className="btn">Accueil</Link>
        </SiteHeader>
        <Landing onStart={() => setShowAuth(true)} />
        {showAuth && (
          <UserAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader>
        <Link href="/" className="btn btn-pink">Accueil</Link>
        <UserMenu userId={user.id} />
      </SiteHeader>

      <PageHero kicker="Espace personnel" title={user.username}>
        <p className="label !bg-paper !text-ink border-2 border-ink">
          {user.email && `${user.email} · `}Bienvenue dans votre espace personnel
        </p>
      </PageHero>

      <main className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex flex-col gap-8">
          {/* Section principale - Événements */}
          <div className="lg:col-span-2">
            <UserEvents userId={user.id} />
          </div>
          
          {/* Section latérale - Notifications */}
          <div className="lg:col-span-1">
            <UserNotifications userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
