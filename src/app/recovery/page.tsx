'use client';

import { useState } from 'react';
import { recreateAdmin } from '@/lib/actions';
import Link from 'next/link';

export default function RecoveryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleRecreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setMessage('❌ Veuillez entrer le mot de passe administrateur');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await recreateAdmin();
      if (result.success) {
        setMessage('✅ Administrateur recréé avec succès ! Vous pouvez maintenant vous connecter.');
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de la recréation de l&apos;admin: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-800 mb-2">🚨 Récupération d'urgence</h1>
          <p className="text-red-600">
            Cette page permet de recréer l&apos;administrateur si la base de données a été nettoyée.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-200">
          <form onSubmit={handleRecreateAdmin} className="space-y-6">
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe administrateur (depuis le fichier .env)
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                placeholder="Mot de passe du fichier .env"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>

            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm text-center ${
                message.includes('✅') 
                  ? 'bg-green-100 border border-green-200 text-green-700' 
                  : 'bg-red-100 border border-red-200 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-block bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳ Récupération...' : '🔑 Recréer l&apos;administrateur'}
              </button>
              
              <Link
                href="/"
                className="w-full inline-block bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium text-center"
              >
                ← Retour à l'accueil
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center text-sm text-red-600">
          <p>⚠️ Utilisez cette page uniquement en cas d'urgence</p>
          <p>Assurez-vous que votre fichier .env contient les bonnes informations</p>
        </div>
      </div>
    </div>
  );
}
