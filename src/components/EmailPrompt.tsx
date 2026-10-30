'use client';

import { useState } from 'react';
import { attachEmail } from '@/lib/actions';
import Modal from './Modal';
import { useFeedback } from './Feedback';

const input = 'w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink placeholder-gray-500';

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
      <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 id="email-prompt-title" className="text-2xl font-bold text-ink">📧 Ajoutez votre email</h2>
          <button aria-label="Plus tard" onClick={() => onDone()} className="text-ink/60 hover:text-ink transition-colors">✕</button>
        </div>
        <p className="text-sm text-ink mb-4">
          Votre compte n&apos;a pas d&apos;adresse email : sans elle, impossible de retrouver votre mot de passe en cas d&apos;oubli.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt-email" className="block text-sm font-medium text-ink mb-2">Email</label>
            <input id="prompt-email" type="email" required autoComplete="email" className={input} placeholder="votre@email.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label htmlFor="prompt-email-confirm" className="block text-sm font-medium text-ink mb-2">Confirmer l&apos;email</label>
            <input id="prompt-email-confirm" type="email" required autoComplete="off" className={input} placeholder="votre@email.com" value={form.emailConfirm} onChange={set('emailConfirm')} />
          </div>
          <div>
            <label htmlFor="prompt-password" className="block text-sm font-medium text-ink mb-2">Mot de passe actuel</label>
            <input id="prompt-password" type="password" required autoComplete="current-password" className={input} value={form.password} onChange={set('password')} />
          </div>
          {error && (
            <div role="alert" className="px-4 py-3 rounded-none text-sm text-center bg-red-100 border border-red-200 text-red-700">{error}</div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => onDone()} className="flex-1 py-3 px-6 rounded-none border border-ink text-ink hover:bg-heliotrope/20 font-medium">
              Plus tard
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 text-white py-3 px-6 rounded-none font-medium disabled:cursor-not-allowed bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] transition-all disabled:opacity-50">
              {isLoading ? '⏳ ' : ''}Ajouter
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
