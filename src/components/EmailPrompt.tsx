'use client';

import { useState } from 'react';
import { attachEmail } from '@/lib/actions';
import Modal from './Modal';
import { useFeedback } from './Feedback';

const input = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500';

// Ancien compte sans email : ajout d'une adresse (connexion et mot de passe oublié). Fermable ; revient à la connexion suivante.
export default function EmailPrompt({ onDone }: { onDone: (email?: string) => void }) {
  const { notify } = useFeedback();
  const [form, setForm] = useState({ email: '', emailConfirm: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await attachEmail(form.email, form.emailConfirm, form.password);
      if (res.success && 'email' in res) {
        notify('success', 'Email ajouté', `Votre compte est maintenant relié à ${res.email}.`);
        onDone(res.email);
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
    <Modal open onClose={() => onDone()} labelledBy="email-prompt-title">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 id="email-prompt-title" className="text-2xl font-bold text-gray-800">📧 Ajoutez votre email</h2>
          <button aria-label="Plus tard" onClick={() => onDone()} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Votre compte n&apos;a pas d&apos;adresse email : sans elle, impossible de retrouver votre mot de passe en cas d&apos;oubli.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input id="prompt-email" type="email" required autoComplete="email" className={input} placeholder="votre@email.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label htmlFor="prompt-email-confirm" className="block text-sm font-medium text-gray-700 mb-2">Confirmer l&apos;email</label>
            <input id="prompt-email-confirm" type="email" required autoComplete="off" className={input} placeholder="votre@email.com" value={form.emailConfirm} onChange={set('emailConfirm')} />
          </div>
          <div>
            <label htmlFor="prompt-password" className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
            <input id="prompt-password" type="password" required autoComplete="current-password" className={input} value={form.password} onChange={set('password')} />
          </div>
          {error && (
            <div role="alert" className="px-4 py-3 rounded-xl text-sm text-center bg-red-100 border border-red-200 text-red-700">{error}</div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => onDone()} className="flex-1 py-3 px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
              Plus tard
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl font-medium disabled:cursor-not-allowed">
              {isLoading ? '⏳ ' : ''}Ajouter
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
