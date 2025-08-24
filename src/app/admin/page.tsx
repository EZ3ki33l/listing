'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authenticateAdmin, createCategory, updateCategory, deleteCategory, getCategoriesWithItemCount } from '@/lib/actions';

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
  email: string | null;
  createdAt: Date;
  isAdmin?: boolean;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  
  // États pour les catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '#3B82F6', icon: '' });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6', icon: '' });
  


  useEffect(() => {
    // Vérifier si l'admin est déjà connecté
    console.log('🔍 [ADMIN] Vérification de la session...');
    
    // 1. Vérifier la session admin existante
    const savedAdmin = localStorage.getItem('adminSession');
    console.log('🔍 [ADMIN] Session admin trouvée:', savedAdmin ? 'OUI' : 'NON');
    
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin);
        console.log('🔍 [ADMIN] Admin parsé:', admin);
        setAdminData(admin);
        setIsLoggedIn(true);
        console.log('✅ [ADMIN] Session admin restaurée avec succès');
        setIsInitializing(false);
        return;
      } catch (error) {
        console.error('❌ [ADMIN] Erreur lors du chargement de la session admin:', error);
        localStorage.removeItem('adminSession');
      }
    }
    
    // 2. Vérifier si l'utilisateur connecté dans l'espace personnel est admin
    const savedUser = localStorage.getItem('user');
    console.log('🔍 [ADMIN] Session utilisateur trouvée:', savedUser ? 'OUI' : 'NON');
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('🔍 [ADMIN] Utilisateur parsé:', user);
        
        // Vérifier si cet utilisateur est admin
        if (user.isAdmin) {
          console.log('✅ [ADMIN] Utilisateur connecté est admin, connexion automatique');
          setAdminData(user);
          setIsLoggedIn(true);
          // Sauvegarder en tant qu'admin aussi
          localStorage.setItem('adminSession', JSON.stringify(user));
        } else {
          console.log('ℹ️ [ADMIN] Utilisateur connecté n\'est pas admin');
        }
      } catch (error) {
        console.error('❌ [ADMIN] Erreur lors du chargement de la session utilisateur:', error);
        localStorage.removeItem('userSession');
      }
    } else {
      console.log('ℹ️ [ADMIN] Aucune session utilisateur trouvée');
    }
    
    setIsInitializing(false);
    console.log('🔍 [ADMIN] Initialisation terminée, isLoggedIn:', isLoggedIn);
  }, [isLoggedIn]);

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
    console.log('🔍 Tentative de connexion avec:', { username, password });
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authenticateAdmin(username, password);
      console.log('🔍 Résultat de l\'authentification:', result);
      
      if (result.success && result.admin) {
        console.log('✅ Connexion réussie !');
        setIsLoggedIn(true);
        setAdminData(result.admin);
        // Sauvegarder la session
        localStorage.setItem('adminSession', JSON.stringify(result.admin));
        setError('');
      } else {
        console.log('❌ Échec de connexion:', result.error);
        setError(result.error || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('🔍 Erreur lors de la connexion:', error);
      setError(`Erreur lors de la connexion: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      setMessage('❌ Veuillez remplir le nom de la catégorie');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await createCategory(newCategory);
      if (result.success) {
        setMessage('✅ Catégorie créée avec succès !');
        setNewCategory({ name: '', color: '#3B82F6', icon: '' });
        setShowCategoryForm(false);
        await loadCategories();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch {
      setMessage('❌ Erreur lors de la création de la catégorie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryData.name.trim()) {
      setMessage('❌ Veuillez remplir le nom de la catégorie');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await updateCategory(editingCategory.id, editCategoryData);
      if (result.success) {
        setMessage('✅ Catégorie mise à jour avec succès !');
        setEditingCategory(null);
        setEditCategoryData({ name: '', color: '#3B82F6', icon: '' });
        await loadCategories();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de la mise à jour de la catégorie: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        setMessage('✅ Catégorie supprimée avec succès !');
        await loadCategories();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de la suppression de la catégorie: ${error}`);
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Administration</h1>
            <p className="text-gray-600">
              Accès réservé aux administrateurs
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const password = formData.get('password') as string;
              handleLogin(username, password);
            }} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="admin"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="Mot de passe"
                />
              </div>

              {error && (
                <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                  ❌ {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Connexion...' : '🚀 Se connecter'}
                </button>
              </div>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <header className="bg-white/30 backdrop-blur-sm border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">
                ⚙️ Administration
              </h1>
              {adminData && (
                <p className="text-sm text-gray-600 mt-1">
                  Connecté en tant que <span className="font-medium text-indigo-600">{adminData.username}</span>
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ← Retour
              </Link>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setAdminData(null);
                  localStorage.removeItem('adminSession');
                }}
                className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                🚪 Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {message && (
          <div className={`px-4 py-3 rounded-xl text-center mb-6 ${
            message.includes('✅') 
              ? 'bg-green-100 border border-green-200 text-green-700' 
              : 'bg-red-100 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Gestion des catégories */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">🏷️ Gestion des catégories</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
            >
              ➕ Nouvelle catégorie
            </button>
          </div>

          {/* Formulaire de création de catégorie */}
          {showCategoryForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-4">✨ Créer une nouvelle catégorie</h3>
              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Icône (optionnel)"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                >
                  {isLoading ? 'Création...' : 'Créer'}
                </button>
              </form>
            </div>
          )}

          {/* Liste des catégories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <h4 className="font-medium text-gray-800">{category.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditCategory(category)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
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
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span>{category.itemCount} article(s)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'édition de catégorie */}
          {editingCategory && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-800 mb-4">✏️ Modifier la catégorie</h3>
              <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={editCategoryData.name}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="color"
                  value={editCategoryData.color}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, color: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Icône (optionnel)"
                  value={editCategoryData.icon}
                  onChange={(e) => setEditCategoryData(prev => ({ ...prev, icon: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditCategory}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
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
