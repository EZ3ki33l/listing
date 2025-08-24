'use client';

import { useState } from 'react';
import { registerUser, authenticateUser } from '@/lib/actions';

interface UserAuthProps {
  onLogin: (user: { id: string; username: string; email?: string; isAdmin: boolean }) => void;
  onClose: () => void;
}

export default function UserAuth({ onLogin, onClose }: UserAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        result = await authenticateUser(formData.username, formData.password);
      } else {
        result = await registerUser(formData.username, formData.password, formData.email || undefined);
      }

      if (result.success && result.user) {
        if (isLogin && 'isAdmin' in result.user) {
          onLogin({
            ...result.user,
            email: result.user.email || undefined,
            isAdmin: Boolean(result.user.isAdmin)
          });
        } else if (!isLogin) {
          // Après inscription, passer en mode connexion
          setIsLogin(true);
          setFormData({ username: formData.username, password: '', email: '' });
          setError('✅ Inscription réussie ! Connectez-vous maintenant.');
        }
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      setError(`Une erreur est survenue: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? '🔐 Connexion' : '✨ Inscription'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                placeholder="Votre pseudo"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optionnel)
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                placeholder="Votre mot de passe"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            {error && (
              <div className={`px-4 py-3 rounded-xl text-sm text-center ${
                error.includes('✅') 
                  ? 'bg-green-100 border border-green-200 text-green-700' 
                  : 'bg-red-100 border border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ ' : ''}
              {isLogin ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ username: '', password: '', email: '' });
              }}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
            >
              {isLogin 
                ? 'Pas encore de compte ? S\'inscrire' 
                : 'Déjà un compte ? Se connecter'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
