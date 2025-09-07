'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEvent, createShoppingItem, updateItemStatus, deleteShoppingItem, getCategories } from '@/lib/actions';
import Link from 'next/link';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';
import ImageCarousel from '@/components/ImageCarousel';
import ThankYouModal from '@/components/ThankYouModal';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
  owner: {
    id: string;
    username: string;
  };
  items: ShoppingItem[];
}

interface ShoppingItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  purchaseUrl: string | null;
  isPurchased: boolean;
  purchasedBy: string | null;
  purchasedAt: Date | null;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  } | null;
  photos: {
    id: string;
    imageUrl: string;
    altText: string | null;
    order: number;
  }[];
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

function ListePageContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    purchaseUrl: '',
    categoryId: '',
    photos: [{ imageUrl: '', altText: '' }]
  });
  
  // États pour le filtrage et la recherche
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery] = useState('');

  const loadEventData = useCallback(async () => {
    if (!eventId || !currentUser) return;
    
    try {
      setIsLoading(true);
      const [eventResult, categoriesResult] = await Promise.all([
        getEvent(eventId, currentUser.id),
        getCategories()
      ]);

      if (eventResult.success && eventResult.event) {
        setEvent(eventResult.event);
      } else {
        setMessage(`❌ ${eventResult.error || 'Erreur lors du chargement de l\'événement'}`);
      }

      if (categoriesResult.success && categoriesResult.categories) {
        setCategories(categoriesResult.categories);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setMessage('❌ Erreur lors du chargement de l\'événement');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, currentUser]);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({ id: user.id, username: user.username });
      } catch (error) {
        console.error('Erreur lors de la lecture des données utilisateur:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Charger les données de l'événement seulement si l'utilisateur est connecté et qu'il y a un eventId
    if (currentUser && eventId) {
      loadEventData();
    }
  }, [currentUser, eventId, loadEventData]);

  // Vérifier si l'utilisateur actuel est le propriétaire de l'événement
  const isOwner = () => {
    return currentUser && event && currentUser.id === event.owner.id;
  };

  // Vérifier si l'utilisateur actuel peut ajouter des articles
  const canAddItems = () => {
    return isOwner();
  };

  // Vérifier si l'utilisateur actuel peut supprimer des articles
  const canDeleteItems = () => {
    return isOwner();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier les permissions
    if (!canAddItems()) {
      setMessage('❌ Vous n\'avez pas la permission d\'ajouter des articles à cette liste');
      return;
    }
    
    if (!eventId || !newItem.name.trim()) {
      setMessage('❌ Veuillez remplir le nom de l\'article');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await createShoppingItem({
        eventId,
        name: newItem.name,
        description: newItem.description || undefined,
        price: newItem.price ? parseFloat(newItem.price) : undefined,
        purchaseUrl: newItem.purchaseUrl || undefined,
        categoryId: newItem.categoryId || undefined,
        photos: newItem.photos.filter(photo => photo.imageUrl.trim())
      });

      if (result.success) {
        setMessage('✅ Article ajouté avec succès !');
        setNewItem({ name: '', description: '', price: '', purchaseUrl: '', categoryId: '', photos: [{ imageUrl: '', altText: '' }] });
        setShowAddForm(false);
        await loadEventData();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de l'ajout de l'article: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (itemId: string, isPurchased: boolean) => {
    try {
      const result = await updateItemStatus({
        itemId,
        isPurchased,
        purchasedBy: 'Utilisateur'
      });

      if (result.success) {
        await loadEventData();
        // Afficher la modal de remerciement seulement pour les événements d'anniversaire
        if (isPurchased && event?.eventType === 'anniversaire') {
          setShowThankYouModal(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Vérifier les permissions
    if (!canDeleteItems()) {
      setMessage('❌ Vous n\'avez pas la permission de supprimer des articles de cette liste');
      return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const result = await deleteShoppingItem(itemId);
      if (result.success) {
        await loadEventData();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
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

  // Si l'utilisateur n'est pas connecté, afficher un message d'erreur
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Connexion requise</h1>
          <p className="text-gray-600 mb-6">
            Vous devez être connecté pour accéder à cette liste d&apos;achats.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la liste...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Événement non trouvé</h1>
          <p className="text-gray-600 mb-6">
            L&apos;événement que vous recherchez n&apos;existe pas ou vous n&apos;y avez pas accès.
          </p>
          <Link
            href="/user"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            ← Retour à l&apos;espace utilisateur
          </Link>
        </div>
      </div>
    );
  }

  if (!event.owner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erreur de données</h1>
          <p className="text-gray-600 mb-6">
            L&apos;événement existe mais les informations du propriétaire sont manquantes.
          </p>
          <Link
            href="/user"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            ← Retour à l&apos;espace utilisateur
          </Link>
        </div>
      </div>
    );
  }

  // Filtrage des articles par catégorie et recherche
  const filteredItems = event.items.filter(item => {
    // Filtre par catégorie
    if (selectedCategories.length > 0 && item.category && !selectedCategories.includes(item.category.id)) {
      return false;
    }
    
    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query) || false;
      const matchesCategory = item.category?.name.toLowerCase().includes(query) || false;
      
      if (!matchesName && !matchesDescription && !matchesCategory) {
        return false;
      }
    }
    
    return true;
  });

  const purchasedItems = filteredItems.filter(item => item.isPurchased);
  const pendingItems = filteredItems.filter(item => !item.isPurchased);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <header className="bg-white/30 backdrop-blur-sm border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">
                🛍️ {event.name}
              </h1>
                             <p className="text-sm text-gray-600">
                 Liste d&apos;achats • Créée par {event.owner.username}
                 {event.hasTargetDate && event.targetDate && (
                   <span> • Date cible : {new Date(event.targetDate).toLocaleDateString('fr-FR')}</span>
                 )}
                 {currentUser && (
                   <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                     isOwner() 
                       ? 'bg-green-100 text-green-800 border border-green-200' 
                       : 'bg-blue-100 text-blue-800 border border-blue-200'
                   }`}>
                     {isOwner() ? '👑 Propriétaire' : '👥 Utilisateur partagé'}
                   </span>
                 )}
               </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ← Retour à l&apos;accueil
              </Link>
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

        {/* Filtres et recherche */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="space-y-6">
            {/* Barre de recherche */}
            <SearchBar
              items={event.items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description || undefined,
                category: item.category ? {
                  name: item.category.name,
                  color: item.category.color
                } : undefined,
                shoppingListName: event.name
              }))}
              onItemSelect={(itemId) => {
                // Faire défiler vers l'article sélectionné
                const element = document.getElementById(`item-${itemId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Mettre en surbrillance temporaire
                  element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
                  setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
                  }, 2000);
                }
              }}
              placeholder="Rechercher un article dans cette liste..."
            />
            
            {/* Filtre par catégorie */}
            <CategoryFilter
              categories={categories.map(cat => ({
                ...cat,
                icon: cat.icon || undefined,
                itemCount: event.items.filter(item => item.category?.id === cat.id).length
              }))}
              selectedCategories={selectedCategories}
              onCategorySelect={setSelectedCategories}
              showAll={true}
            />
          </div>
        </div>

        {/* Bouton d'ajout - Seulement pour le propriétaire */}
        {canAddItems() && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium text-lg"
            >
              ➕ Ajouter un article
            </button>
          </div>
        )}

        {/* Message informatif pour les utilisateurs partagés */}
        {!canAddItems() && currentUser && (
          <div className="text-center mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
              <div className="text-blue-600 text-sm">
                <p className="font-medium mb-1">👥 Liste partagée</p>
                <p>Vous pouvez voir et marquer les articles comme achetés, mais seul le propriétaire peut les modifier.</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire d'ajout - Seulement pour le propriétaire */}
        {showAddForm && canAddItems() && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">✨ Ajouter un nouvel article</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom de l'article"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Description (optionnel)"
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix estimé (€)"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              
              <input
                type="url"
                placeholder="🔗 Lien d'achat (ex: Amazon, etc.) - Optionnel"
                value={newItem.purchaseUrl}
                onChange={(e) => setNewItem(prev => ({ ...prev, purchaseUrl: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />

              {/* Gestion des photos */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-3">📸 Photos</h4>
                <div className="space-y-3">
                  {newItem.photos.map((photo, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="url"
                        placeholder="URL de l'image"
                        value={photo.imageUrl}
                        onChange={(e) => updatePhotoField(index, 'imageUrl', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="Description de l'image (optionnel)"
                        value={photo.altText}
                        onChange={(e) => updatePhotoField(index, 'altText', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                      {newItem.photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhotoField(index)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhotoField}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    📷 + Ajouter une photo
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                >
                  {isLoading ? '⏳ Ajout...' : '✨ Ajouter l\'article'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Articles à acheter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            🛒 Articles à acheter ({pendingItems.length})
          </h2>
          
          {pendingItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-gray-600">Tous les articles ont été achetés !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingItems.map((item) => (
                <div key={item.id} id={`item-${item.id}`} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  {/* Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="mb-4">
                      <ImageCarousel photos={item.photos.map(photo => ({
                        ...photo,
                        altText: photo.altText || undefined
                      }))} className="h-48" />
                    </div>
                  )}
                  
                  {/* Informations de l'article */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800 text-lg">{item.name}</h3>
                      {item.category && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full text-white flex items-center gap-1"
                          style={{ backgroundColor: item.category.color }}
                        >
                          {item.category.icon} {item.category.name}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    
                    {item.price && (
                      <p className="text-green-600 font-semibold text-sm">💰 {item.price}€</p>
                    )}
                    
                    {item.purchaseUrl && (
                      <a
                        href={item.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        🔗 Voir le produit
                      </a>
                    )}
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleToggleItem(item.id, true)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✅ Acheté
                      </button>
                      
                      {canDeleteItems() && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Articles achetés */}
        {purchasedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              ✅ Articles achetés ({purchasedItems.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems.map((item) => (
                <div key={item.id} id={`item-${item.id}`} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 shadow-sm">
                  {/* Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="mb-4">
                      <ImageCarousel photos={item.photos.map(photo => ({
                        ...photo,
                        altText: photo.altText || undefined
                      }))} className="h-48" />
                    </div>
                  )}
                  
                  {/* Informations de l'article */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800 text-lg line-through">{item.name}</h3>
                      {item.category && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full text-white flex items-center gap-1"
                          style={{ backgroundColor: item.category.color }}
                        >
                          {item.category.icon} {item.category.name}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 line-through">{item.description}</p>
                    )}
                    
                    <p className="text-sm text-green-600">
                      ✅ Acheté par {item.purchasedBy} le {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString('fr-FR') : 'récemment'}
                    </p>
                    
                    {item.purchaseUrl && (
                      <a
                        href={item.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        🔗 Voir le produit
                      </a>
                    )}
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleToggleItem(item.id, false)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🔄 Annuler achat
                      </button>
                      
                      {canDeleteItems() && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal de remerciement */}
      <ThankYouModal 
        isOpen={showThankYouModal} 
        onClose={() => setShowThankYouModal(false)} 
      />
    </div>
  );
}

export default function ListePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <ListePageContent />
    </Suspense>
  );
}
