'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/actions';
import { useFeedback } from '@/components/Feedback';

const input = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900';

// Arrivée depuis le lien reçu par email (Neon Auth redirige vers /reset-password?token=…)
export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = use(searchParams);
  const { notify } = useFeedback();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas');
    setIsLoading(true);
    setError('');
    try {
      const res = await resetPassword(typeof token === 'string' ? token : '', password);
      if (res.success) {
        notify('success', 'Mot de passe modifié', 'Connectez-vous avec votre nouveau mot de passe.');
        setDone(true);
      } else {
        setError(res.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🔑 Nouveau mot de passe</h1>
        {done ? (
          <Link href="/" className="block text-center w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium">
            Retour à l&apos;accueil pour se connecter
          </Link>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe (8 caractères minimum)</label>
              <input id="new-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="new-password-confirm" className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
              <input id="new-password-confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && (
              <div role="alert" className="px-4 py-3 rounded-xl text-sm text-center bg-red-100 border border-red-200 text-red-700">{error}</div>
            )}
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl font-medium disabled:cursor-not-allowed">
              {isLoading ? '⏳ ' : ''}Changer le mot de passe
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
