'use client';

import { useState, useEffect } from 'react';
import UserEvents from '@/components/UserEvents';
import UserAuth from '@/components/UserAuth';
import UserNotifications from '@/components/UserNotifications';
import UserMenu from '@/components/UserMenu';
import Link from 'next/link';

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
    // Vérifier si l'utilisateur est connecté (stocké dans localStorage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erreur lors de la lecture des données utilisateur:', error);
        localStorage.removeItem('user');
      }
    }
    // Marquer l'initialisation comme terminée
    setIsInitializing(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setShowAuth(false);
  };



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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            👋 Bienvenue !
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Connectez-vous ou créez un compte pour gérer vos listes d&apos;achats personnelles et partagées.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => setShowAuth(true)}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium text-lg"
            >
              🔐 Se connecter / S&apos;inscrire
            </button>
            
            <div>
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>

        {showAuth && (
          <UserAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <header className="bg-white/30 backdrop-blur-sm border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">
                👤 {user.username}
              </h1>
              <p className="text-sm text-gray-600">
                {user.email && `${user.email} • `}Bienvenue dans votre espace personnel
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Bouton retour à l'accueil */}
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                🏠 Accueil
              </Link>
              
              {/* Menu utilisateur compact */}
              <UserMenu userId={user.id} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
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
