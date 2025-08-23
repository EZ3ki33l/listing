'use client';

import { useState, useEffect } from 'react';
import AdminLogin from '@/components/AdminLogin';
import Link from 'next/link';
import ImageCarousel from '@/components/ImageCarousel';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import { 
  getAllActiveEvents, 
  createShoppingItem, 
  updateItemStatus, 
  deleteShoppingItem,
  authenticateAdmin as authenticateAdminAction,
  getCategoriesWithItemCount,
  createCategory,
  updateCategory,
  deleteCategory,
  ensureAdminExists,
  deleteEvent
} from '@/lib/actions';
import type { ShoppingItem, ShoppingItemPhoto } from '@prisma/client';
import PersonalEvents from '@/components/PersonalEvents';

// Type étendu avec les relations
type ShoppingItemWithPhotos = ShoppingItem & {
  photos: ShoppingItemPhoto[];
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  shoppingListName?: string;
};

// Type pour les catégories
type Category = {
  id: string;
  name: string;
  color: string;
  icon?: string;
  itemCount: number;
};

// Type pour l'événement avec les relations Prisma
type EventWithRelations = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    isPurchased: boolean;
    purchasedBy: string | null;
    photos: Array<{
      id: string;
      imageUrl: string;
      altText: string | null;
      order: number;
    }>;
    category: {
      id: string;
      name: string;
      color: string;
      icon: string | null;
    } | null;
  }>;
};

// Liste prédéfinie d'icônes
const PREDEFINED_ICONS = [
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '🎁', label: 'Cadeau' },
  { emoji: '🍽️', label: 'Nourriture' },
  { emoji: '👕', label: 'Vêtements' },
  { emoji: '📱', label: 'Électronique' },
  { emoji: '🏠', label: 'Maison' },
  { emoji: '🚗', label: 'Transport' },
  { emoji: '💄', label: 'Beauté' },
  { emoji: '🎮', label: 'Loisirs' },
  { emoji: '📚', label: 'Livre' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '🏃', label: 'Sport' },
  { emoji: '💊', label: 'Santé' },
  { emoji: '🎵', label: 'Musique' },
  { emoji: '✈️', label: 'Voyage' },
  { emoji: '💻', label: 'Informatique' },
  { emoji: '🔧', label: 'Outils' },
  { emoji: '🌱', label: 'Jardin' },
  { emoji: '🐾', label: 'Animaux' },
  { emoji: '🎭', label: 'Divertissement' }
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ShoppingItemWithPhotos[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShoppingItemWithPhotos[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [newItem, setNewItem] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    purchaseUrl: '', // Lien d'achat (ex: Amazon, etc.)
    categoryId: '',
    photos: [{ imageUrl: '', altText: '' }] 
  });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    icon: ''
  });
  const [itemMessage, setItemMessage] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '#3B82F6', icon: '🏷️' });
  const [categoryMessage, setCategoryMessage] = useState('');
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadEvent();
      loadCategories();
    } else {
      // S'assurer qu'un admin existe avec les identifiants du .env
      ensureAdminExists();
    }
  }, [isLoggedIn]);

  // Filtrer les articles par catégorie
  useEffect(() => {
    if (selectedCategory === null) {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.categoryId === selectedCategory));
    }
  }, [items, selectedCategory]);

  const loadEvent = async () => {
    try {
      const result = await getAllActiveEvents();
      if (result.success && result.events) {
        // Set all events
        setEvents(result.events);
        
        if (result.events.length > 0) {
          // Set the first event as the default selected event
          const firstEvent = result.events[0];
          setSelectedEventId(firstEvent.id);
          
          // Extraire tous les articles de tous les événements
          const allItems = result.events.flatMap(event => 
            event.items.map((item) => ({
              ...item,
              shoppingListName: event.name,
              category: item.category ? {
                id: item.category.id,
                name: item.category.name,
                color: item.category.color,
                icon: item.category.icon || undefined
              } : undefined
            }))
          );
          setItems(allItems);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  };

  const loadCategories = async () => {
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
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authenticateAdminAction(username, password);
      
      if (result.success) {
        setIsLoggedIn(true);
        setError('');
      } else {
        setError(result.error || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (error) {
      setError(`Erreur lors de la connexion: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemToggle = async (itemId: string, isPurchased: boolean, purchaserName?: string) => {
    try {
      const result = await updateItemStatus({
        itemId,
        isPurchased,
        purchasedBy: purchaserName || 'Admin'
      });

      if (result.success) {
        // Mettre à jour l'état local
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  isPurchased, 
                  purchasedBy: purchaserName || 'Admin',
                  purchasedAt: isPurchased ? new Date() : null
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemMessage('');
    setIsAddingItem(true);
    
    try {
      if (newItem.name.trim() && selectedEventId) {
        const result = await createShoppingItem({
          eventId: selectedEventId,
          name: newItem.name,
          description: newItem.description || undefined,
          price: newItem.price ? parseFloat(newItem.price) : undefined,
          purchaseUrl: newItem.purchaseUrl || undefined,
          categoryId: newItem.categoryId || undefined,
          photos: newItem.photos.filter(photo => photo.imageUrl.trim())
        });

        if (result.success && result.item) {
          setItemMessage('✅ Article ajouté avec succès !');
          
          // Ajouter le nouvel article à la liste locale
          const selectedList = events.find(event => event.id === selectedEventId);
          setItems(prev => [...prev, {
            ...result.item,
            photos: (result.item.photos || []),
            shoppingListName: selectedList?.name || 'Liste inconnue'
          } as ShoppingItemWithPhotos]);
          
          // Réinitialiser le formulaire
          setNewItem({ 
            name: '', 
            description: '', 
            price: '', 
            purchaseUrl: '',
            categoryId: '',
            photos: [{ imageUrl: '', altText: '' }] 
          });
          
          // Recharger les données pour mettre à jour l'affichage
          await loadEvent();
          
          // Effacer le message de succès après 3 secondes
          setTimeout(() => setItemMessage(''), 3000);
        } else {
          setItemMessage(`❌ Erreur: ${result.error || 'Erreur lors de l\'ajout'}`);
        }
      } else {
        setItemMessage('❌ Veuillez remplir le nom de l\'article et sélectionner une liste');
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'article:', error);
      setItemMessage('❌ Erreur lors de la création de l\'article');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const result = await deleteShoppingItem(itemId);
      if (result.success) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'article:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.name.trim()) {
      try {
        const result = await createCategory({
          name: newCategory.name,
          color: newCategory.color,
          icon: newCategory.icon || undefined
        });

        if (result.success) {
          await loadCategories();
          setNewCategory({ name: '', color: '#3B82F6', icon: '' });
          setShowCategoryForm(false);
          setCategoryMessage('✅ Catégorie créée avec succès !');
          setTimeout(() => setCategoryMessage(''), 3000);
        } else {
          setCategoryMessage(`❌ Erreur: ${result.error}`);
        }
      } catch (error) {
        console.error('Erreur lors de la création de la catégorie:', error);
        setCategoryMessage('❌ Erreur lors de la création de la catégorie');
      }
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategoryData({
      name: category.name,
      color: category.color,
      icon: category.icon || ''
    });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryData.name.trim()) return;

    try {
      const result = await updateCategory(editingCategory, {
        name: editCategoryData.name,
        color: editCategoryData.color,
        icon: editCategoryData.icon || undefined
      });

      if (result.success) {
        await loadCategories();
        setEditingCategory(null);
        setEditCategoryData({ name: '', color: '#3B82F6', icon: '' });
        setCategoryMessage('✅ Catégorie modifiée avec succès !');
        setTimeout(() => setCategoryMessage(''), 3000);
      } else {
        setCategoryMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la modification de la catégorie:', error);
      setCategoryMessage('❌ Erreur lors de la modification de la catégorie');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        setCategoryMessage('✅ Catégorie supprimée avec succès !');
        await loadCategories();
        await loadEvent();
      } else {
        setCategoryMessage(`❌ Erreur: ${result.error}`);
      }
      setTimeout(() => setCategoryMessage(''), 3000);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    const result = await deleteEvent(eventToDelete);
    if (result.success) {
      setShowDeleteEventModal(false);
      setEventToDelete(null);
      await loadEvent();
      alert('✅ Événement supprimé avec succès !');
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryData({ name: '', color: '#3B82F6', icon: '' });
  };

  const handleItemSelect = (itemId: string) => {
    // Faire défiler vers l'article sélectionné
    const element = document.getElementById(`item-${itemId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Ajouter un effet de surbrillance temporaire
      element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    }
  };

  const addPhotoField = () => {
    setNewItem(prev => ({
      ...prev,
      photos: [...prev.photos, { imageUrl: '', altText: '' }]
    }));
  };

  const removePhotoField = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const updatePhotoField = (index: number, field: 'imageUrl' | 'altText', value: string) => {
    setNewItem(prev => ({
      ...prev,
      photos: prev.photos.map((photo, i) => 
        i === index ? { ...photo, [field]: value } : photo
      )
    }));
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} isLoading={isLoading} error={error} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <header className="bg-white/30 backdrop-blur-sm border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-semibold text-gray-700">
              🔐 Administration
            </h1>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ← Retour
              </Link>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                🚪 Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Vos événements personnels */}
        <PersonalEvents />
        
        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Rechercher un article</h2>
          <SearchBar 
            items={items.map(item => ({
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              category: item.category ? {
                name: item.category.name,
                color: item.category.color
              } : undefined,
              shoppingListName: item.shoppingListName || ''
            }))}
            onItemSelect={handleItemSelect}
            placeholder="Tapez le nom d'un article, une description ou une catégorie..."
          />
        </div>

        {/* Gestion des catégories */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">🏷️ Gestion des catégories</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
            >
              {showCategoryForm ? '❌ Annuler' : '➕ Nouvelle catégorie'}
            </button>
          </div>
          
          {/* Message de succès/erreur pour les catégories */}
          {categoryMessage && (
            <div className={`p-3 rounded-lg mb-4 ${
              categoryMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {categoryMessage}
            </div>
          )}
          
          {showCategoryForm && (
            <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                  required
                />
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <select
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Sélectionner une icône</option>
                  {PREDEFINED_ICONS.map((icon, index) => (
                    <option key={index} value={icon.emoji}>
                      {icon.emoji} {icon.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="mt-4 inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
              >
                ✨ Créer la catégorie
              </button>
            </form>
          )}
          
          {/* Liste des catégories avec actions */}
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon || '📁'}</span>
                  <div>
                    <h4 className="font-medium text-gray-800">{category.name}</h4>
                    <p className="text-sm text-gray-500">
                      {category.itemCount} article{category.itemCount > 1 ? 's' : ''} • 
                      Couleur: <span className="inline-block w-4 h-4 rounded border shadow-sm" style={{ backgroundColor: category.color }}></span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-1 rounded-full transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md text-sm font-medium"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-3 py-1 rounded-full transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md text-sm font-medium"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Formulaire de modification de catégorie */}
          {editingCategory && (
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-200">
              <h4 className="text-lg font-medium text-blue-800 mb-4">✏️ Modifier la catégorie</h4>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Nom de la catégorie"
                    value={editCategoryData.name}
                    onChange={(e) => setEditCategoryData(prev => ({ ...prev, name: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                  <input
                    type="color"
                    value={editCategoryData.color}
                    onChange={(e) => setEditCategoryData(prev => ({ ...prev, color: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={editCategoryData.icon}
                    onChange={(e) => setEditCategoryData(prev => ({ ...prev, icon: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Aucune icône</option>
                    {PREDEFINED_ICONS.map((icon, index) => (
                      <option key={index} value={icon.emoji}>
                        {icon.emoji} {icon.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    💾 Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-block bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    ❌ Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Filtre par catégorie */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-lg font-medium text-gray-800 mb-3">🔍 Filtrer par catégorie</h4>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        </div>

        {/* Formulaire d'ajout */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">➕ Ajouter un article</h2>
          
          {/* Message de succès/erreur */}
          {itemMessage && (
            <div className={`p-3 rounded-lg mb-4 ${
              itemMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {itemMessage}
            </div>
          )}
          
          <form onSubmit={handleAddItem} className="space-y-6">
            {/* Sélecteur d'événement */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Sélectionner un événement</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    🎯 {event.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Nom de l'article"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Prix estimé (€)"
                value={newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
              />
              <select
                value={newItem.categoryId}
                onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Lien d'achat */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <input
                type="url"
                placeholder="🔗 Lien d'achat (ex: Amazon, etc.) - Optionnel"
                value={newItem.purchaseUrl}
                onChange={(e) => setNewItem(prev => ({ ...prev, purchaseUrl: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
              />
            </div>

            {/* Gestion des photos */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">📸 Photos</h3>
              <div className="space-y-3">
                {newItem.photos.map((photo, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="url"
                      placeholder="URL de l'image"
                      value={photo.imageUrl}
                      onChange={(e) => updatePhotoField(index, 'imageUrl', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="Description de l'image (optionnel)"
                      value={photo.altText}
                      onChange={(e) => updatePhotoField(index, 'altText', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                    />
                    {newItem.photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhotoField(index)}
                        className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white p-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhotoField}
                  className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-medium"
                >
                  📷 + Ajouter une photo
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddingItem}
              className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none"
            >
              {isAddingItem ? '⏳ Ajout en cours...' : '✨ Ajouter l\'article'}
            </button>
          </form>
        </div>

        {/* Liste des articles */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">
              📋 Gestion des articles {selectedCategory && `- ${categories.find(c => c.id === selectedCategory)?.name}`}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredItems.length} article{filteredItems.length > 1 ? 's' : ''})
              </span>
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <div key={item.id} id={`item-${item.id}`} className="p-6 transition-all duration-200">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Photos */}
                    <div className="lg:col-span-1">
                      <ImageCarousel photos={item.photos.map(photo => ({
                        id: photo.id,
                        imageUrl: photo.imageUrl,
                        altText: photo.altText || undefined,
                        order: photo.order
                      }))} />
                    </div>
                    
                    {/* Informations */}
                    <div className="lg:col-span-2 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                          {item.category && (
                            <span
                              className="px-3 py-1 text-xs font-medium rounded-full text-white shadow-sm"
                              style={{ backgroundColor: item.category.color }}
                            >
                              {item.category.icon} {item.category.name}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-gray-600 mt-2">{item.description}</p>
                        )}
                        {item.price && (
                          <p className="text-green-600 font-semibold text-lg mt-2">💰 Prix: {item.price}€</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          Statut: {item.isPurchased ? '✅ Acheté' : '🛒 À acheter'}
                          {item.purchasedBy && ` par ${item.purchasedBy}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleItemToggle(item.id, !item.isPurchased)}
                          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                            item.isPurchased
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                          }`}
                        >
                          {item.isPurchased ? '🔄 Annuler achat' : '✅ Marquer acheté'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de suppression d'événement */}
        {showDeleteEventModal && eventToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Confirmation de suppression</h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer l&apos;événement « {events.find(event => event.id === eventToDelete)?.name} » ?
                Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={confirmDeleteEvent}
                  className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  ✅ Oui, supprimer
                </button>
                <button
                  onClick={() => setShowDeleteEventModal(false)}
                  className="inline-block bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  ❌ Non, annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
