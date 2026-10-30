'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageLoader, SiteHeader, PageHero } from '@/components/PageChrome';
import Link from 'next/link';
import { authenticateUser, getCurrentUser, logoutUser, createCategory, updateCategory, deleteCategory, getCategoriesWithItemCount } from '@/lib/actions';
import DefaultCategoriesInitializer from '@/components/DefaultCategoriesInitializer';
import { useFeedback } from '@/components/Feedback';

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  itemCount: number;
}

interface AdminData {
  id: string;
  username: string;
}

export default function AdminPage() {
  const { notify, confirm } = useFeedback();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState('');
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  
  // États pour les catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '#3B82F6', icon: '' });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6', icon: '' });
  


  useEffect(() => {
    // Seul le serveur décide : cookie de session + isAdmin lu en base
    getCurrentUser().then(user => {
      if (user?.isAdmin) {
        setAdminData(user);
        setIsLoggedIn(true);
      }
      setIsInitializing(false);
    });
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await getCategoriesWithItemCount();
      if (result.success && result.categories) {
        setCategories(result.categories.map(cat => ({
          ...cat,
          icon: cat.icon || undefined
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadCategories();
    }
  }, [isLoggedIn, loadCategories]);



  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await authenticateUser(username, password);

      if (result.success && result.user?.isAdmin) {
        setIsLoggedIn(true);
        setAdminData(result.user);
      } else if (result.success) {
        await logoutUser();
        setError('Accès administrateur refusé');
      } else {
        setError(result.error || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      notify('error', 'Champ requis', 'Veuillez remplir le nom de la catégorie');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await createCategory(newCategory);
      if (result.success) {
        notify('success', 'Catégorie créée', 'La catégorie a été créée avec succès.');
        setNewCategory({ name: '', color: '#3B82F6', icon: '' });
        setShowCategoryForm(false);
        await loadCategories();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      notify('error', 'Erreur', 'Erreur lors de la création de la catégorie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryData.name.trim()) {
      notify('error', 'Champ requis', 'Veuillez remplir le nom de la catégorie');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updateCategory(editingCategory.id, editCategoryData);
      if (result.success) {
        notify('success', 'Catégorie mise à jour', 'La catégorie a été mise à jour avec succès.');
        setEditingCategory(null);
        setEditCategoryData({ name: '', color: '#3B82F6', icon: '' });
        await loadCategories();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      notify('error', 'Erreur', 'Erreur lors de la mise à jour de la catégorie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const ok = await confirm({
      title: 'Supprimer la catégorie',
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ?',
      confirmText: 'Supprimer',
      type: 'danger'
    });
    if (!ok) return;

    setIsLoading(true);
    
    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        notify('success', 'Catégorie supprimée', 'La catégorie a été supprimée avec succès.');
        await loadCategories();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      notify('error', 'Erreur', 'Erreur lors de la suppression de la catégorie');
    } finally {
      setIsLoading(false);
    }
  };





  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryData({
      name: category.name,
      color: category.color,
      icon: category.icon || ''
    });
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryData({ name: '', color: '#3B82F6', icon: '' });
  };

  // Afficher un loader pendant l'initialisation
  if (isInitializing) {
    return (
      <PageLoader message="Vérification de la session…" />
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-dvh flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stripes">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-ink mb-2">🔐 Administration</h1>
            <p className="text-ink">
              Accès réservé aux administrateurs
            </p>
          </div>

          <div className="bg-white p-6 rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a]">
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const password = formData.get('password') as string;
              handleLogin(username, password);
            }} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-ink mb-2">
                  Nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink placeholder:text-ink placeholder:font-medium bg-white transition-all duration-200"
                  placeholder="admin"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink placeholder:text-ink placeholder:font-medium bg-white transition-all duration-200"
                  placeholder="Mot de passe"
                />
              </div>

              {error && (
                <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-none text-sm text-center">
                  ❌ {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-block text-white py-3 px-6 rounded-none transition-all border-[3px] border-ink  font-medium disabled:transform-none disabled:cursor-not-allowed bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-50"
                >
                  {isLoading ? '⏳ Connexion...' : '🚀 Se connecter'}
                </button>
              </div>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-razzmatazz hover:text-razzmatazz font-medium transition-colors"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader>
        <Link href="/" className="btn btn-pink">← Retour</Link>
        <button
          onClick={async () => {
            await logoutUser();
            localStorage.removeItem('user');
            setIsLoggedIn(false);
            setAdminData(null);
          }}
          className="btn"
        >
          Déconnexion
        </button>
      </SiteHeader>

      <PageHero kicker="Administration" title="⚙️ Catégories">
        {adminData && (
          <p className="label !bg-paper !text-ink border-2 border-ink">Connecté en tant que {adminData.username}</p>
        )}
      </PageHero>

      <main className="max-w-6xl mx-auto p-6">
        {/* Gestion des catégories */}
        <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl uppercase">🏷️ Gestion des catégories</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-block text-white px-4 py-2 rounded-none transition-all border-[3px] border-ink  text-sm font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
            >
              ➕ Nouvelle catégorie
            </button>
          </div>

          {/* Message informatif */}
          {categories.length === 0 && (
            <div className="mb-6 p-4 bg-heliotrope/20 rounded-none border border-ink">
              <div className="flex items-start gap-3">
                <div className="text-razzmatazz text-xl">💡</div>
                <div>
                  <h4 className="font-medium text-razzmatazz mb-1">Aucune catégorie existante</h4>
                  <p className="text-razzmatazz text-sm">
                    Vous pouvez créer des catégories manuellement ou utiliser l&apos;outil d&apos;initialisation 
                    pour créer automatiquement 15 catégories prédéfinies (vêtements & chaussures, électronique & tech, livres & médias, etc.).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Initialisation des catégories par défaut */}
          <DefaultCategoriesInitializer 
            onCategoriesCreated={loadCategories}
            hasExistingCategories={categories.length > 0}
          />

          {/* Formulaire de création de catégorie */}
          {showCategoryForm && (
            <div className="mb-6 p-4 bg-heliotrope/20 rounded-none">
              <h3 className="text-lg font-medium text-ink mb-4">✨ Créer une nouvelle catégorie</h3>
              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-ink placeholder:font-medium bg-white"
                  required
                />
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
                <input
                  type="text"
                  placeholder="Icône (optionnel)"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-ink placeholder:font-medium bg-white"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Création...' : 'Créer'}
                </button>
              </form>
            </div>
          )}

          {/* Liste des catégories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-ink rounded-none p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <h4 className="font-medium text-ink">{category.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditCategory(category)}
                      className="text-razzmatazz hover:text-razzmatazz text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-ink">
                  <div 
                    className="w-4 h-4 rounded-none border border-ink"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span>{category.itemCount} article(s)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'édition de catégorie */}
          {editingCategory && (
            <div className="mt-6 p-4 bg-heliotrope/20 rounded-none border border-ink">
              <h3 className="text-lg font-medium text-razzmatazz mb-4">✏️ Modifier la catégorie</h3>
              <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={editCategoryData.name}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz placeholder:text-ink placeholder:font-medium bg-white"
                  required
                />
                <input
                  type="color"
                  value={editCategoryData.color}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, color: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz bg-white"
                />
                <input
                  type="text"
                  placeholder="Icône (optionnel)"
                  value={editCategoryData.icon}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, icon: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz placeholder:text-ink placeholder:font-medium bg-white"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditCategory}
                    className="btn"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
