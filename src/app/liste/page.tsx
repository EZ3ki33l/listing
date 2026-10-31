'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { PageLoader, SiteHeader, PageHero } from '@/components/PageChrome';
import { useRouter, useSearchParams } from 'next/navigation';
import Slider, { revealSlide } from '@/components/Slider';
import UserMenu from '@/components/UserMenu';
import { getEvent, createShoppingItem, updateShoppingItem, importProductFromUrl, updateItemStatus, deleteShoppingItem, getCategories } from '@/lib/actions';
import Link from 'next/link';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';
import ImageCarousel from '@/components/ImageCarousel';
import ThankYouModal from '@/components/ThankYouModal';
import { useFeedback } from '@/components/Feedback';
import { useStoredUser } from '@/lib/useStoredUser';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
  purchasesHidden?: boolean; // propriétaire dont les achats sont cachés : ni bouton d'achat ni « Acheté par »
  isOwned?: boolean;
  canEdit?: boolean;
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

const EMPTY_ITEM = { name: '', description: '', price: '', purchaseUrl: '', categoryId: '', photos: [{ imageUrl: '', altText: '' }] };

function ListePageContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const { notify, confirm } = useFeedback();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();
  const currentUser = useStoredUser();
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingId, setEditingId] = useState<string | null>(null); // article en cours de modification (formulaire partagé avec l'ajout)
  
  // États pour le filtrage et la recherche
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery] = useState('');

  // Chaînage en .then (et non async/await) : le lint refuse un setState atteint de façon synchrone depuis un effet
  const fetchEventData = useCallback(() => {
    if (!eventId || !currentUser) return Promise.resolve();

    return Promise.all([getEvent(eventId), getCategories()])
      .then(([eventResult, categoriesResult]) => {
        if (eventResult.success && eventResult.event) {
          setEvent(eventResult.event);
        } else {
          notify('error', 'Erreur', eventResult.error || "Erreur lors du chargement de l'événement");
        }

        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories);
        }
      })
      .catch(error => {
        console.error('Erreur lors du chargement des données:', error);
        notify('error', 'Erreur', "Erreur lors du chargement de l'événement");
      })
      .finally(() => setIsLoading(false));
  }, [eventId, currentUser, notify]);

  // Rechargement après une modification : le loader de page repasse
  const loadEventData = () => {
    setIsLoading(true);
    return fetchEventData();
  };

  useEffect(() => {
    // Charger les données de l'événement seulement si l'utilisateur est connecté et qu'il y a un eventId
    // (isLoading vaut déjà true au premier rendu)
    if (currentUser && eventId) {
      fetchEventData();
    }
  }, [currentUser, eventId, fetchEventData]);

  // Vérifier si l'utilisateur actuel est le propriétaire de l'événement
  const isOwner = () => {
    return event?.isOwned || false;
  };

  // Vérifier si l'utilisateur actuel peut ajouter des articles
  const canAddItems = () => {
    return event?.canEdit || false;
  };

  // Vérifier si l'utilisateur actuel peut supprimer des articles
  const canDeleteItems = () => {
    return event?.canEdit || false;
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier les permissions
    if (!canAddItems()) {
      notify('error', 'Permission refusée', "Vous n'avez pas la permission d'ajouter des articles à cette liste");
      return;
    }
    
    if (!eventId || !newItem.name.trim()) {
      notify('error', 'Champ requis', "Veuillez remplir le nom de l'article");
      return;
    }

    setIsLoading(true);
    
    try {
      const payload = {
        name: newItem.name,
        description: newItem.description || undefined,
        price: newItem.price ? parseFloat(newItem.price) : undefined,
        purchaseUrl: newItem.purchaseUrl || undefined,
        categoryId: newItem.categoryId || undefined,
        photos: newItem.photos.filter(photo => photo.imageUrl.trim())
      };
      const result = editingId ? await updateShoppingItem(editingId, payload) : await createShoppingItem({ eventId, ...payload });

      if (result.success) {
        notify('success', editingId ? 'Article modifié' : 'Article ajouté', editingId ? 'Les modifications ont été enregistrées.' : 'L\'article a été ajouté avec succès.');
        closeForm();
        await loadEventData();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'article:", error);
      notify('error', 'Erreur', "Erreur lors de l'ajout de l'article");
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setNewItem(EMPTY_ITEM);
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (item: ShoppingItem) => {
    setNewItem({
      name: item.name,
      description: item.description ?? '',
      price: item.price != null ? String(item.price) : '',
      purchaseUrl: item.purchaseUrl ?? '',
      categoryId: item.category?.id ?? '',
      photos: item.photos.length ? item.photos.map(p => ({ imageUrl: p.imageUrl, altText: p.altText ?? '' })) : EMPTY_ITEM.photos,
    });
    setEditingId(item.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportItem = async () => {
    if (!eventId) return;
    setIsImporting(true);
    try {
      const result = await importProductFromUrl(eventId, newItem.purchaseUrl.trim());
      if (result.success) {
        const { name, description, price, photos } = result.product;
        setNewItem(prev => ({
          ...prev,
          name,
          description,
          price: price != null ? String(price) : prev.price,
          photos: photos.length ? photos : prev.photos,
        }));
        notify('success', 'Produit lu', photos.length ? 'Vérifiez les champs puis ajoutez l\'article.' : 'Aucune photo trouvée : ajoutez-en une à la main puis validez.');
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'import du produit:", error);
      notify('error', 'Erreur', "Impossible de lire ce produit");
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleItem = async (itemId: string, isPurchased: boolean) => {
    try {
      const result = await updateItemStatus({
        itemId,
        isPurchased
      });

      if (!result.success) notify('error', 'Erreur', result.error);
      await loadEventData();
      // Afficher la modal de remerciement seulement pour les événements d'anniversaire
      if (result.success && isPurchased && event?.eventType === 'anniversaire') {
        setShowThankYouModal(true);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      notify('error', 'Erreur', 'Impossible de mettre à jour le statut de l\'article');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Vérifier les permissions
    if (!canDeleteItems()) {
      notify('error', 'Permission refusée', "Vous n'avez pas la permission de supprimer des articles de cette liste");
      return;
    }
    
    const ok = await confirm({
      title: "Supprimer l'article",
      message: 'Êtes-vous sûr de vouloir supprimer cet article ?',
      confirmText: 'Supprimer',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const result = await deleteShoppingItem(itemId);
      if (result.success) {
        await loadEventData();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      notify('error', 'Erreur', "Erreur lors de la suppression de l'article");
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
      <div className="min-h-dvh flex items-center justify-center bg-stripes">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-ink mb-4">Connexion requise</h1>
          <p className="text-ink mb-6">
            Vous devez être connecté pour accéder à cette liste d&apos;achats.
          </p>
          <Link
            href="/"
            className="inline-block text-white px-6 py-3 rounded-none transition-all border-[3px] border-ink  font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <PageLoader message="Chargement de la liste…" />
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-stripes">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-ink mb-4">Événement non trouvé</h1>
          <p className="text-ink mb-6">
            L&apos;événement que vous recherchez n&apos;existe pas ou vous n&apos;y avez pas accès.
          </p>
          <Link
            href="/user"
            className="inline-block text-white px-6 py-3 rounded-none transition-all border-[3px] border-ink  font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
          >
            ← Retour à l&apos;espace utilisateur
          </Link>
        </div>
      </div>
    );
  }

  if (!event.owner) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-stripes">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-ink mb-4">Erreur de données</h1>
          <p className="text-ink mb-6">
            L&apos;événement existe mais les informations du propriétaire sont manquantes.
          </p>
          <Link
            href="/user"
            className="inline-block text-white px-6 py-3 rounded-none transition-all border-[3px] border-ink  font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
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
    <div className="min-h-dvh bg-paper">
      <SiteHeader>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          className="btn btn-pink"
        >
          ← Retour
        </button>
        <UserMenu />
      </SiteHeader>

      <PageHero kicker={`Liste d'achats · Créée par ${event.owner.username}`} title={`🛍️ ${event.name}`}>
        <div className="flex flex-wrap gap-2">
          {event.hasTargetDate && event.targetDate && (
            <span className="label !bg-paper !text-ink border-2 border-ink">
              Date cible : {new Date(event.targetDate).toLocaleDateString('fr-FR')}
            </span>
          )}
          {currentUser && (
            <span className={`label border-2 border-ink ${isOwner() ? '!bg-heliotrope !text-ink' : '!bg-razzmatazz'}`}>
              {isOwner() ? '👑 Propriétaire' : '👥 Utilisateur partagé'}
            </span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-start gap-4">
          <div className="w-full max-w-xl">
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
                  // L'article peut être dans une slide hors champ : on y glisse d'abord
                  const slid = revealSlide(element);
                  setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-razzmatazz');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-razzmatazz'), 2000);
                  }, slid ? 450 : 0);
                }
              }}
              placeholder="Rechercher un article dans cette liste..."
            />
            
                      </div>
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
      </PageHero>

      <main className="max-w-7xl mx-auto px-5 py-10">
        {/* Bouton d'ajout - Seulement pour le propriétaire */}
        {canAddItems() && (
          <div className="text-center mb-8">
            <button
              onClick={() => (showAddForm ? closeForm() : setShowAddForm(true))}
              className="inline-block text-white px-8 py-4 rounded-none transition-all border-[3px] border-ink  font-medium text-lg bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
            >
              ➕ Ajouter un article
            </button>
          </div>
        )}

        {/* Message informatif pour les utilisateurs partagés */}
        {!canAddItems() && currentUser && (
          <div className="text-center mb-8">
            <div className="bg-heliotrope/20 border border-ink rounded-none p-4 max-w-md mx-auto">
              <div className="text-razzmatazz text-sm">
                <p className="font-medium mb-1">👥 Liste partagée</p>
                <p>Vous pouvez voir et marquer les articles comme achetés, mais seul le propriétaire peut les modifier.</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire d'ajout - Seulement pour le propriétaire */}
        {showAddForm && canAddItems() && (
          <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-8">
            <h3 className="text-xl font-semibold text-ink mb-4">{editingId ? '✏️ Modifier l\'article' : '✨ Ajouter un nouvel article'}</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="url"
                  placeholder="🔗 Lien du produit (ex: Amazon, etc.) - Optionnel"
                  value={newItem.purchaseUrl}
                  onChange={(e) => setNewItem(prev => ({ ...prev, purchaseUrl: e.target.value }))}
                  className="flex-1 border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                />
                <button
                  type="button"
                  onClick={handleImportItem}
                  disabled={isImporting || !newItem.purchaseUrl.trim()}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? '⏳ Lecture du produit...' : '✨ Remplir avec l\'IA'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom de l'article"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                  required
                />
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
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
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix estimé (€)"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className="border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                />
              </div>
              
              {/* Gestion des photos */}
              <div>
                <h4 className="text-lg font-medium text-ink mb-3">📸 Photos</h4>
                <div className="space-y-3">
                  {newItem.photos.map((photo, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="url"
                        placeholder="URL de l'image"
                        value={photo.imageUrl}
                        onChange={(e) => updatePhotoField(index, 'imageUrl', e.target.value)}
                        className="flex-1 border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                      />
                      <input
                        type="text"
                        placeholder="Description de l'image (optionnel)"
                        value={photo.altText}
                        onChange={(e) => updatePhotoField(index, 'altText', e.target.value)}
                        className="flex-1 border border-ink rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-razzmatazz text-ink"
                      />
                      {newItem.photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhotoField(index)}
                          className="bg-razzmatazz hover:bg-razzmatazz text-white p-2 rounded-none transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhotoField}
                    className="btn"
                  >
                    📷 + Ajouter une photo
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Enregistrement...' : editingId ? '💾 Enregistrer' : '✨ Ajouter l\'article'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Articles à acheter */}
        <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-6">
          <h2 className="text-2xl uppercase mb-6 border-b-[3px] border-ink pb-3">
            🛒 Articles à acheter ({pendingItems.length})
          </h2>
          
          {pendingItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-ink">Tous les articles ont été achetés !</p>
            </div>
          ) : (
            <Slider threeUp label="Articles à acheter">
              {pendingItems.map((item, index) => (
                <div key={item.id}>
                <div id={`item-${item.id}`} className="border-ink p-4 border-[3px] shadow-[5px_5px_0_#0a0a0a] flex flex-col h-full bg-paper">
                  {/* Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="mb-4">
                      <ImageCarousel 
                        photos={item.photos.map(photo => ({
                          ...photo,
                          altText: photo.altText || undefined
                        }))} 
                        className="h-48" 
                        priority={index === 0}
                        isAboveFold={index < 3}
                      />
                    </div>
                  )}
                  
                  {/* Informations de l'article */}
                  <div className="flex flex-col flex-grow space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-ink text-lg">{item.name}</h3>
                      {item.category && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-none text-white flex items-center gap-1"
                          style={{ backgroundColor: item.category.color }}
                        >
                          {item.category.icon} {item.category.name}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-ink">{item.description}</p>
                    )}
                    
                    {item.price && (
                      <p className="text-green-600 font-semibold text-sm">💰 {item.price}€</p>
                    )}
                    
                    {/* Spacer pour pousser les boutons en bas */}
                    <div className="flex-grow"></div>
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2 pt-2 mt-auto">
                      {/* Bouton Acheté */}
                      {!event.purchasesHidden && (
                        <button
                          onClick={() => handleToggleItem(item.id, true)}
                          className="btn flex-1"
                        >
                          ✅ Acheté
                        </button>
                      )}
                      
                      {/* Bouton Acheter */}
                      {item.purchaseUrl && (
                        <a
                          href={item.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn flex-1"
                        >
                          🛒 Acheter
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      
                      {/* Boutons Modifier et Supprimer */}
                      {canDeleteItems() && (
                        <button
                          onClick={() => startEdit(item)}
                          className="btn"
                          aria-label="Modifier l'article"
                        >
                          ✏️
                        </button>
                      )}
                      {canDeleteItems() && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="btn btn-pink"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              ))}
            </Slider>
          )}
        </div>

        {/* Articles achetés */}
        {purchasedItems.length > 0 && (
          <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6">
            <h2 className="text-2xl uppercase mb-6 border-b-[3px] border-ink pb-3">
              ✅ Articles achetés ({purchasedItems.length})
            </h2>
            
            <Slider threeUp label="Articles achetés">
              {purchasedItems.map((item, index) => (
                <div key={item.id}>
                <div id={`item-${item.id}`} className="border-green-200 p-4 border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] flex flex-col h-full bg-paper">
                  {/* Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="mb-4">
                      <ImageCarousel 
                        photos={item.photos.map(photo => ({
                          ...photo,
                          altText: photo.altText || undefined
                        }))} 
                        className="h-48" 
                        priority={index === 0}
                        isAboveFold={index < 3}
                      />
                    </div>
                  )}
                  
                  {/* Informations de l'article */}
                  <div className="flex flex-col flex-grow space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-ink text-lg line-through">{item.name}</h3>
                      {item.category && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-none text-white flex items-center gap-1"
                          style={{ backgroundColor: item.category.color }}
                        >
                          {item.category.icon} {item.category.name}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-ink line-through">{item.description}</p>
                    )}
                    
                    {!event.purchasesHidden && (
                      <p className="text-sm text-green-600">
                        ✅ Acheté par {item.purchasedBy} le {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString('fr-FR') : 'récemment'}
                      </p>
                    )}
                    
                    {/* Spacer pour pousser les boutons en bas */}
                    <div className="flex-grow"></div>
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2 pt-2 mt-auto">
                      {/* Bouton Acheter */}
                      {item.purchaseUrl && (
                        <a
                          href={item.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn flex-1"
                        >
                          🛒 Acheter
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      
                      {/* Bouton Annuler achat */}
                      {!event.purchasesHidden && (
                        <button
                          onClick={() => handleToggleItem(item.id, false)}
                          className="flex-1 bg-heliotrope !text-ink hover:bg-heliotrope text-white px-3 py-2 rounded-none text-sm font-medium transition-colors"
                        >
                          🔄 Annuler
                        </button>
                      )}
                      
                      {/* Boutons Modifier et Supprimer */}
                      {canDeleteItems() && (
                        <button
                          onClick={() => startEdit(item)}
                          className="btn"
                          aria-label="Modifier l'article"
                        >
                          ✏️
                        </button>
                      )}
                      {canDeleteItems() && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="btn btn-pink"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              ))}
            </Slider>
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
      <PageLoader message="Chargement…" />
    }>
      <ListePageContent />
    </Suspense>
  );
}
