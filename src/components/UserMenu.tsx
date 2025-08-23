'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

interface UserMenuProps {
  userId: string;
}

interface UserData {
  id: string;
  username: string;
  email?: string;
  isAdmin: boolean;
}

export default function UserMenu({ userId }: UserMenuProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Récupérer les données utilisateur depuis localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erreur lors de la lecture des données utilisateur:', error);
      }
    }
  }, [userId]);

  useEffect(() => {
    // Fermer le menu si on clique à l'extérieur
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return null;

  // Générer une couleur de fond basée sur le nom d'utilisateur
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bouton du menu utilisateur */}
              <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center space-x-2 p-2 rounded-full hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
        {/* Avatar avec initiales */}
        <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold text-sm`}>
          {getInitials(user.username)}
        </div>
        
        {/* Nom d'utilisateur (visible sur desktop) */}
        <span className="hidden md:block text-sm font-medium text-gray-700">
          {user.username}
        </span>
        
        {/* Icône de chevron */}
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
            isMenuOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

                      {/* Menu déroulant simple */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[9999]">
            {/* En-tête du menu */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold text-lg`}>
                  {getInitials(user.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.username}
                  </p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  )}
                  {user.isAdmin && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      👑 Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Options du menu */}
            <div className="py-1">
              <Link
                href="/user"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-4 h-4 mr-3 text-gray-400" />
                Mon espace personnel
              </Link>
               
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-4 h-4 mr-3 text-gray-400" />
                  Administration
                </Link>
              )}
               
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4 mr-3 text-red-400" />
                Se déconnecter
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
