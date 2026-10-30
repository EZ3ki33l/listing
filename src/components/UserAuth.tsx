'use client';

import { useState } from 'react';
import { registerUser, authenticateUser, requestPasswordReset } from '@/lib/actions';
import Modal from './Modal';
import { useFeedback } from './Feedback';
import EmailPrompt from './EmailPrompt';

type LoggedUser = { id: string; username: string; email?: string; isAdmin: boolean };
const EMPTY = { username: '', password: '', email: '', emailConfirm: '' };

interface UserAuthProps {
  onLogin: (user: LoggedUser) => void;
  onClose: () => void;
}

export default function UserAuth({ onLogin, onClose }: UserAuthProps) {
  const { notify } = useFeedback();
  const [isLogin, setIsLogin] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(EMPTY);
  // Ancien compte sans email : invitation à en ajouter un, à chaque connexion tant que ce n'est pas fait
  const [noEmailUser, setNoEmailUser] = useState<LoggedUser | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (forgot) {
        const res = await requestPasswordReset(formData.email);
        if (res.success) {
          notify('info', 'Mot de passe oublié', res.message);
          setForgot(false);
        } else {
          setError(res.error);
        }
        return;
      }

      let result;
      
      if (isLogin) {
        result = await authenticateUser(formData.username, formData.password);
      } else {
        result = await registerUser(formData.username, formData.password, formData.email, formData.emailConfirm);
      }

      if (result.success && result.user) {
        if (isLogin && 'isAdmin' in result.user) {
          const user = { ...result.user, email: result.user.email || undefined, isAdmin: Boolean(result.user.isAdmin) };
          if (user.email) onLogin(user);
          else setNoEmailUser(user);
        } else if (!isLogin) {
          // Après inscription, passer en mode connexion
          setIsLogin(true);
          setFormData({ ...EMPTY, username: formData.username });
          notify('success', 'Inscription réussie', 'Connectez-vous maintenant.');
        }
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (noEmailUser) {
    return <EmailPrompt onDone={(email) => onLogin({ ...noEmailUser, email: email ?? noEmailUser.email })} />;
  }

  const input = 'w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink placeholder-gray-500 transition-all duration-200';

  return (
    <Modal open onClose={onClose} labelledBy="auth-title">
      <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 id="auth-title" className="text-2xl font-bold text-ink">
              {forgot ? '🔑 Mot de passe oublié' : isLogin ? '🔐 Connexion' : '✨ Inscription'}
            </h2>
            <button
              aria-label="Fermer"
              onClick={onClose}
              className="text-ink/60 hover:text-ink transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {forgot ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                  Email du compte
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={input}
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
                <p className="mt-2 text-xs text-ink/60">Un lien pour choisir un nouveau mot de passe vous sera envoyé.</p>
              </div>
            ) : (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-ink mb-2">
                  Nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  className={input}
                  placeholder="Votre pseudo"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={input}
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="emailConfirm" className="block text-sm font-medium text-ink mb-2">
                    Confirmer l&apos;email
                  </label>
                  <input
                    id="emailConfirm"
                    type="email"
                    required
                    autoComplete="off"
                    className={input}
                    placeholder="votre@email.com"
                    value={formData.emailConfirm}
                    onChange={(e) => setFormData(prev => ({ ...prev, emailConfirm: e.target.value }))}
                  />
                </div>
              </>
            )}

            {!forgot && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={isLogin ? undefined : 8}
                  maxLength={128}
                  className={input}
                  placeholder="Votre mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setForgot(true); setError(''); }}
                    className="mt-2 text-sm text-razzmatazz hover:text-razzmatazz font-medium transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="px-4 py-3 rounded-none text-sm text-center bg-red-100 border border-red-200 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-block text-white py-3 px-6 rounded-none transition-all border-[3px] border-ink  font-medium disabled:transform-none disabled:cursor-not-allowed bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-50"
            >
              {isLoading ? '⏳ ' : ''}
              {forgot ? 'Envoyer le lien' : isLogin ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => {
                if (forgot) setForgot(false);
                else setIsLogin(!isLogin);
                setError('');
                setFormData(EMPTY);
              }}
              className="text-razzmatazz hover:text-razzmatazz text-sm font-medium transition-colors"
            >
              {forgot
                ? 'Retour à la connexion'
                : isLogin
                  ? 'Pas encore de compte ? S\'inscrire'
                  : 'Déjà un compte ? Se connecter'
              }
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
