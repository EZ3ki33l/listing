'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// Types
export interface CreateEventData {
  name: string;
  eventType: string;
  targetDate?: Date;
  hasTargetDate?: boolean;
  isPrivate?: boolean;
  ownerId: string; // ID de l'utilisateur propriétaire
}

export interface CreateShoppingItemData {
  eventId: string; // Maintenant directement lié à l'événement
  name: string;
  description?: string;
  price?: number;
  purchaseUrl?: string; // Lien d'achat (ex: Amazon, etc.)
  categoryId?: string;
  photos: { imageUrl: string; altText?: string }[];
}

export interface UpdateItemStatusData {
  itemId: string;
  isPurchased: boolean;
  purchasedBy?: string;
}

// Actions pour l'authentification des utilisateurs
export async function registerUser(username: string, password: string, email?: string) {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' };
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email
      }
    });

    revalidatePath('/');
    return { success: true, user: { id: user.id, username: user.username, email: user.email } };
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return { success: false, error: 'Erreur lors de l\'inscription' };
  }
}

export async function authenticateUser(username: string, password: string) {
  try {
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { username },

    });

    if (!user) {
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }

    return { 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        isAdmin: user.isAdmin
      } 
    };
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return { success: false, error: 'Erreur lors de l\'authentification' };
  }
}

export async function getUserEvents(userId: string) {
  try {
    // Masquer automatiquement les événements récurrents passés (anniversaires, Noël, etc.)
    await autoHidePastRecurringEvents();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedEvents: {
          include: {
            items: {
              include: {
                category: true,
                photos: true
              }
            }
          }
        },
        sharedEvents: {
          include: {
            event: {
              include: {
                owner: true,
                items: {
                  include: {
                    category: true,
                    photos: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    // Séparer les événements personnels et partagés
    const ownedEvents = user.ownedEvents.map(event => ({
      ...event,
      isOwned: true,
      canEdit: true
    }));

    const sharedEvents = user.sharedEvents.map(share => ({
      ...share.event,
      isOwned: false,
      canEdit: share.canEdit,
      sharedBy: share.event.owner.username
    }));

    return { 
      success: true, 
      events: [...ownedEvents, ...sharedEvents] 
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

export async function shareEvent(eventId: string, targetUsername: string, canEdit: boolean = false) {
  try {
    // Vérifier que l'événement existe et que l'utilisateur est propriétaire
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { owner: true }
    });

    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername }
    });

    if (!targetUser) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    // Vérifier que l'utilisateur ne partage pas avec lui-même
    if (event.ownerId === targetUser.id) {
      return { success: false, error: 'Vous ne pouvez pas partager avec vous-même' };
    }

    // Vérifier que le partage n'existe pas déjà
    const existingShare = await prisma.eventShare.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUser.id
        }
      }
    });

    if (existingShare) {
      return { success: false, error: 'Cet événement est déjà partagé avec cet utilisateur' };
    }

    // Créer le partage
    await prisma.eventShare.create({
      data: {
        eventId,
        userId: targetUser.id,
        canEdit
      }
    });

    revalidatePath('/');
    revalidatePath('/liste');
    
    return { success: true, message: `Événement partagé avec ${targetUsername}` };
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    return { success: false, error: 'Erreur lors du partage' };
  }
}

// Actions pour les événements
export async function createEvent(data: CreateEventData) {
  try {
    const event = await prisma.event.create({
      data: {
        name: data.name,
        eventType: data.eventType,
        targetDate: data.hasTargetDate && data.targetDate ? data.targetDate : null,
        hasTargetDate: data.hasTargetDate ?? true,
        isPrivate: data.isPrivate ?? false,
        ownerId: data.ownerId,
      },
    });

    revalidatePath('/');
    return { success: true, event };
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la création de l\'événement' };
  }
}

export async function updateEvent(eventId: string, data: {
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
}) {
  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        eventType: data.eventType,
        targetDate: data.hasTargetDate && data.targetDate ? data.targetDate : null,
        hasTargetDate: data.hasTargetDate,
        isPrivate: data.isPrivate,
      },
    });

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true, event };
  } catch (error) {
    console.error('Erreur lors de la modification de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la modification de l\'événement' };
  }
}

// Action pour masquer un événement
export async function hideEvent(eventId: string, userId: string) {
  try {
    // Vérifier que l'utilisateur est propriétaire de l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { owner: true }
    });

    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }

    if (event.ownerId !== userId) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à masquer cet événement' };
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { isHidden: true },
    });

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true, event: updatedEvent };
  } catch (error) {
    console.error('Erreur lors du masquage de l\'événement:', error);
    return { success: false, error: 'Erreur lors du masquage de l\'événement' };
  }
}

// Action pour réactiver un événement (avec incrémentation d'année pour les anniversaires)
export async function reactivateEvent(eventId: string, userId: string) {
  try {
    // Vérifier que l'utilisateur est propriétaire de l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { owner: true }
    });

    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }

    if (event.ownerId !== userId) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à réactiver cet événement' };
    }

    const updateData: { isHidden: boolean; targetDate?: Date } = { isHidden: false };

    // Si c'est un anniversaire ou Noël avec une date, vérifier si la date de cette année est passée avant d'incrémenter
    if ((event.eventType === 'anniversaire' || event.eventType === 'noel') && event.targetDate && event.hasTargetDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(event.targetDate);
      const eventDateThisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      console.log(`🔍 [reactivateEvent] Événement: ${event.name}, Date stockée: ${eventDate.toISOString()}, Date cette année: ${eventDateThisYear.toISOString()}, Aujourd'hui: ${today.toISOString()}`);
      
      // Si la date de cette année est passée, incrémenter l'année de +1 par rapport à l'année actuelle
      if (eventDateThisYear < today) {
        const newDate = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        updateData.targetDate = newDate;
        console.log(`✅ [reactivateEvent] Date passée, incrémentation à: ${newDate.toISOString()}`);
      } else {
        console.log(`✅ [reactivateEvent] Date pas encore passée, réactivation sans modification de date`);
      }
      // Sinon, on garde la date actuelle (juste réactiver sans modifier la date)
    }

    console.log(`🔍 [reactivateEvent] Données de mise à jour:`, updateData);
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
    console.log(`✅ [reactivateEvent] Événement mis à jour: isHidden=${updatedEvent.isHidden}, targetDate=${updatedEvent.targetDate?.toISOString()}`);

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true, event: updatedEvent };
  } catch (error) {
    console.error('Erreur lors de la réactivation de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la réactivation de l\'événement' };
  }
}

// Fonction pour masquer automatiquement les événements récurrents passés (anniversaires, Noël, etc.)
async function autoHidePastRecurringEvents() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Trouver tous les événements récurrents actifs et non masqués avec une date passée
    const pastRecurringEvents = await prisma.event.findMany({
      where: {
        eventType: { in: ['anniversaire', 'noel'] },
        isActive: true,
        isHidden: false,
        hasTargetDate: true,
        targetDate: { not: null }
      }
    });

    console.log(`🔍 [autoHidePastRecurringEvents] Trouvé ${pastRecurringEvents.length} événement(s) récurrent(s) à vérifier`);

    // Filtrer ceux dont la date est passée (en comparant seulement le jour et le mois)
    const eventsToHide = pastRecurringEvents.filter(event => {
      if (!event.targetDate) return false;
      const eventDate = new Date(event.targetDate);
      
      // Si la date stockée est dans le futur, ne pas masquer
      if (eventDate > today) {
        console.log(`✅ [autoHidePastRecurringEvents] Pas de masquage pour ${event.name} (${event.id}): date stockée ${eventDate.toISOString()} est dans le futur`);
        return false;
      }
      
      // Comparer seulement le jour et le mois avec cette année
      const eventDateThisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      // Si la date de cette année est passée, masquer l'événement
      const shouldHide = eventDateThisYear < today;
      if (shouldHide) {
        console.log(`🔍 [autoHidePastRecurringEvents] Masquage de ${event.name} (${event.id}): date stockée ${eventDate.toISOString()}, date cette année ${eventDateThisYear.toISOString()} < aujourd'hui ${today.toISOString()}`);
      } else {
        console.log(`✅ [autoHidePastRecurringEvents] Pas de masquage pour ${event.name} (${event.id}): date cette année ${eventDateThisYear.toISOString()} >= aujourd'hui ${today.toISOString()}`);
      }
      return shouldHide;
    });

    // Masquer tous les événements récurrents passés
    if (eventsToHide.length > 0) {
      await prisma.event.updateMany({
        where: {
          id: { in: eventsToHide.map(e => e.id) }
        },
        data: {
          isHidden: true
        }
      });
      const birthdaysCount = eventsToHide.filter(e => e.eventType === 'anniversaire').length;
      const noelCount = eventsToHide.filter(e => e.eventType === 'noel').length;
      console.log(`✅ ${eventsToHide.length} événement(s) récurrent(s) masqué(s) automatiquement (${birthdaysCount} anniversaire(s), ${noelCount} Noël)`);
    }

    return { success: true, hiddenCount: eventsToHide.length };
  } catch (error) {
    console.error('Erreur lors du masquage automatique des événements récurrents:', error);
    return { success: false, error: 'Erreur lors du masquage automatique' };
  }
}

export async function getEvent(eventId: string, userId?: string) {
  try {
    // Si l'utilisateur n'est pas connecté, ne pas permettre l'accès
    if (!userId) {
      return { success: false, error: 'Accès non autorisé' };
    }

    // Construire la requête avec vérification des permissions
    const whereClause = {
      id: eventId,
      isActive: true,
      OR: [
        { ownerId: userId }, // L'utilisateur est propriétaire
        { shares: { some: { userId } } } // L'événement est partagé avec l'utilisateur
      ]
    };

    const event = await prisma.event.findFirst({
      where: whereClause,
      include: {
        owner: true,
        shares: {
          where: { userId },
          select: { canEdit: true }
        },
        items: {
          include: {
            photos: {
              orderBy: { order: 'asc' },
            },
            category: true,
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: 'Événement non trouvé ou accès non autorisé' };
    }

    // Déterminer si l'utilisateur peut modifier l'événement
    const isOwner = event.ownerId === userId;
    const canEdit = isOwner || (event.shares.length > 0 && event.shares[0].canEdit);

    // Ajouter les informations de permission à l'événement
    const eventWithPermissions = {
      ...event,
      isOwned: isOwner,
      canEdit: canEdit
    };

    return { success: true, event: eventWithPermissions };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la récupération de l\'événement' };
  }
}

// Fonction pour vérifier l'accès aux événements privés
export async function checkEventAccess(eventId: string, adminPassword?: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isPrivate: true }
    });

    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }

    // If the event is not private, access is allowed
    if (!event.isPrivate) {
      return { success: true, hasAccess: true };
    }

    // If the event is private, check the admin password
    if (!adminPassword) {
      return { success: true, hasAccess: false, requiresPassword: true };
    }

    // Check the admin password - vérifier si un utilisateur admin existe avec ce mot de passe
    const adminUser = await prisma.user.findFirst({
      where: { 
        isAdmin: true,
        password: adminPassword 
      }
    });

    if (adminUser) {
      return { success: true, hasAccess: true };
    } else {
      return { success: true, hasAccess: false, requiresPassword: true };
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'accès:', error);
    return { success: false, error: 'Erreur lors de la vérification de l\'accès' };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    // Supprimer l'événement et tous ses éléments associés en cascade
    await prisma.event.delete({
      where: { id: eventId }
    });
    
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'événement' };
  }
}

export async function getActiveEvent() {
  try {
    const event = await prisma.event.findFirst({
      where: { isActive: true },
      include: {
        items: {
          include: {
            photos: {
              orderBy: { order: 'asc' },
            },
            category: true,
          },
        },
      },
    });

    return { success: true, event };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement actif:', error);
    return { success: false, error: 'Erreur lors de la récupération de l\'événement' };
  }
}

// Actions pour les articles
export async function createShoppingItem(data: CreateShoppingItemData) {
  try {
    const item = await prisma.shoppingItem.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        purchaseUrl: data.purchaseUrl, // Lien d'achat
        eventId: data.eventId, // Maintenant directement lié à l'événement
        categoryId: data.categoryId, // Ajouter la catégorie
        photos: {
          create: data.photos.map((photo, index) => ({
            imageUrl: photo.imageUrl,
            altText: photo.altText,
            order: index + 1,
          })),
        },
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        category: true, // Inclure la catégorie dans le résultat
      },
    });

    revalidatePath('/admin');
    revalidatePath('/liste');
    return { success: true, item };
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    return { success: false, error: 'Erreur lors de la création de l\'article' };
  }
}

export async function updateItemStatus(data: UpdateItemStatusData) {
  try {
    const item = await prisma.shoppingItem.update({
      where: { id: data.itemId },
      data: {
        isPurchased: data.isPurchased,
        purchasedBy: data.purchasedBy,
        purchasedAt: data.isPurchased ? new Date() : null,
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    revalidatePath('/admin');
    revalidatePath('/liste');
    return { success: true, item };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du statut' };
  }
}

export async function deleteShoppingItem(itemId: string) {
  try {
    await prisma.shoppingItem.delete({
      where: { id: itemId },
    });

    revalidatePath('/admin');
    revalidatePath('/liste');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'article' };
  }
}

// Actions pour l'authentification admin
export async function authenticateAdmin(username: string, password: string) {
  try {
    console.log('🔍 [SERVER] Tentative d\'authentification admin pour:', username);
    const user = await prisma.user.findUnique({
      where: { username }
    });
    console.log('🔍 [SERVER] Utilisateur trouvé:', user ? { id: user.id, username: user.username, isAdmin: user.isAdmin } : null);
    
    if (!user) {
      console.log('❌ [SERVER] Utilisateur non trouvé');
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }
    
    if (!user.isAdmin) {
      console.log('❌ [SERVER] Utilisateur n\'est pas admin');
      return { success: false, error: 'Accès administrateur refusé' };
    }
    
    console.log('🔍 [SERVER] Vérification du mot de passe...');
    console.log('🔍 [SERVER] Mot de passe reçu:', password);
    console.log('🔍 [SERVER] Hash stocké en base:', user.password.substring(0, 20) + '...');
    
    // Vérifier le mot de passe avec bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔍 [SERVER] Résultat de la vérification du mot de passe:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ [SERVER] Mot de passe incorrect');
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }
    
    console.log('✅ [SERVER] Authentification réussie !');
    return {
      success: true,
      admin: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    };
  } catch (error) {
    console.error('❌ [SERVER] Erreur lors de l\'authentification:', error);
    return { success: false, error: 'Erreur lors de l\'authentification' };
  }
}



export async function createCategory(data: { name: string; color?: string; icon?: string }) {
  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        color: data.color || '#3B82F6',
        icon: data.icon
      }
    });
    
    revalidatePath('/admin');
    return { success: true, category };
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la création de la catégorie' };
  }
}

export async function updateCategory(id: string, data: { name: string; color?: string; icon?: string }) {
  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color || '#3B82F6',
        icon: data.icon
      }
    });
    
    revalidatePath('/admin');
    return { success: true, category };
  } catch (error) {
    console.error('Erreur lors de la modification de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la modification de la catégorie' };
  }
}

export async function deleteCategory(id: string) {
  try {
    // Vérifier si la catégorie est utilisée par des articles
    const itemsWithCategory = await prisma.shoppingItem.findMany({
      where: { categoryId: id }
    });
    
    if (itemsWithCategory.length > 0) {
      return { 
        success: false, 
        error: `Impossible de supprimer cette catégorie car elle est utilisée par ${itemsWithCategory.length} article(s)` 
      };
    }
    
    await prisma.category.delete({
      where: { id }
    });
    
    revalidatePath('/admin');
    return { success: true, message: 'Catégorie supprimée avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la suppression de la catégorie' };
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, categories };
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return { success: false, error: 'Erreur lors de la récupération des catégories' };
  }
}

export async function getCategoriesWithItemCount() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    return {
      success: true,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        itemCount: cat._count.items
      }))
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return { success: false, error: 'Erreur lors de la récupération des catégories' };
  }
}

// Action pour nettoyer complètement la base de données
export async function clearDatabase() {
  try {
    // Supprimer tous les événements et leurs relations
    await prisma.shoppingItemPhoto.deleteMany();
    await prisma.shoppingItem.deleteMany();
    await prisma.event.deleteMany();
    await prisma.category.deleteMany();


    // S'assurer qu'un admin existe toujours après le nettoyage
    await ensureAdminExists();

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/liste');
    
    return { success: true, message: 'Base de données nettoyée avec succès (administrateur préservé)' };
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base:', error);
    return { success: false, error: 'Erreur lors du nettoyage de la base' };
  }
}

// Action simple pour s'assurer qu'un admin existe avec les identifiants du .env
export async function ensureAdminExists() {
  try {
    const adminUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { username: adminUsername }
    });
    
    if (existingAdmin && existingAdmin.isAdmin) {
      console.log('✅ Admin existe déjà:', existingAdmin.username);
      return { success: true, admin: existingAdmin };
    }
    
    // Créer un nouvel admin
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const newAdmin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        email: `${adminUsername}@admin.local`,
        isAdmin: true
      }
    });
    
    console.log('✅ Nouvel admin créé:', newAdmin.username);
    return { success: true, admin: newAdmin };
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    return { success: false, error: 'Erreur lors de la création de l\'admin' };
  }
}

// Action pour récupérer tous les événements actifs (sécurisée)
// Note: Cette fonction filtre les événements masqués pour la page d'accueil
export async function getAllActiveEvents(userId?: string) {
  try {
    // Masquer automatiquement les événements récurrents passés (anniversaires, Noël, etc.)
    await autoHidePastRecurringEvents();

    // Construire la requête de base
    const whereClause: { 
      isActive: boolean; 
      isHidden?: boolean;
      OR?: Array<{ ownerId: string } | { shares: { some: { userId: string } } }> 
    } = { 
      isActive: true,
      isHidden: false // Ne pas afficher les événements masqués sur la page d'accueil
    };
    
    // Si l'utilisateur n'est pas connecté, ne montrer AUCUN événement
    if (!userId) {
      return { success: true, events: [] };
    }
    
    // Si l'utilisateur est connecté, montrer ses événements + événements partagés
    whereClause.OR = [
      { ownerId: userId }, // Ses propres événements
      { shares: { some: { userId } } } // Événements partagés avec lui
    ];

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { targetDate: 'asc' },
      include: {
        owner: true,
        items: {
          include: {
            photos: {
              orderBy: { order: 'asc' },
            },
            category: true,
          },
        },
      },
    });

    return { success: true, events };
  } catch (error) {
    console.error('Erreur lors de la récupération des événements actifs:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

// Action pour récupérer les événements par type
export async function getEventsByType(eventType: string) {
  try {
    const events = await prisma.event.findMany({
      where: { 
        isActive: true,
        eventType: eventType
      },
      include: {
        items: {
          include: {
            photos: {
              orderBy: { order: 'asc' },
            },
            category: true,
          },
        },
      },
      orderBy: { targetDate: 'asc' }
    });

    return { success: true, events };
  } catch (error) {
    console.error('Erreur lors de la récupération des événements par type:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

// Action pour se retirer d'un événement partagé
export async function leaveSharedEvent(eventId: string, userId: string) {
  try {
    // Vérifier que l'utilisateur est bien partagé sur cet événement
    const eventShare = await prisma.eventShare.findFirst({
      where: {
        eventId: eventId,
        userId: userId
      },
      include: {
        event: {
          include: {
            owner: true
          }
        },
        user: true
      }
    });

    if (!eventShare) {
      return { success: false, error: 'Vous n\'êtes pas partagé sur cet événement' };
    }

    // Supprimer le partage
    await prisma.eventShare.delete({
      where: {
        id: eventShare.id
      }
    });

    // Créer une notification pour le propriétaire
    try {
      await prisma.notification.create({
        data: {
          userId: eventShare.event.ownerId,
          type: 'EVENT_LEAVE',
          title: 'Un utilisateur s\'est retiré de votre événement',
          message: `${eventShare.user.username || 'Un utilisateur'} s'est retiré de l'événement "${eventShare.event.name}"`,
          data: {
            eventId: eventId,
            eventName: eventShare.event.name,
            leavingUserId: userId,
            leavingUsername: eventShare.user.username || 'Utilisateur inconnu'
          },
          isRead: false
        }
      });
      console.log('✅ Notification créée pour le propriétaire');
    } catch (notificationError) {
      console.error('⚠️ Erreur lors de la création de la notification:', notificationError);
      // On continue même si la notification échoue
    }

    console.log('✅ Utilisateur retiré de l\'événement partagé');
    return { 
      success: true, 
      message: 'Vous vous êtes retiré de l\'événement',
      eventName: eventShare.event.name,
      ownerUsername: eventShare.event.owner.username
    };
  } catch (error) {
    console.error('❌ Erreur lors du retrait de l\'événement partagé:', error);
    return { success: false, error: 'Erreur lors du retrait de l\'événement' };
  }
}

// Action pour récupérer les notifications d'un utilisateur
export async function getUserNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limiter à 50 notifications récentes
    });

    return { success: true, notifications };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des notifications:', error);
    return { success: false, error: 'Erreur lors de la récupération des notifications' };
  }
}

// Action pour marquer une notification comme lue
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la notification:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de la notification' };
  }
}

// Action pour supprimer une notification
export async function deleteNotification(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la notification:', error);
    return { success: false, error: 'Erreur lors de la suppression de la notification' };
  }
}

// Action pour recréer l'administrateur manuellement
export async function recreateAdmin() {
  try {
    // Supprimer tous les utilisateurs admin existants
    await prisma.user.deleteMany({
      where: { isAdmin: true }
    });
    
    console.log('✅ Tous les admin supprimés');
    
    // Recréer l'admin
    return await ensureAdminExists();
  } catch (error) {
    console.error('❌ Erreur lors de la recréation de l\'admin:', error);
    return { success: false, error: 'Erreur lors de la recréation de l\'admin' };
  }
}

// Action pour initialiser les catégories par défaut
export async function initializeDefaultCategories() {
  try {
    // Vérifier si des catégories existent déjà
    const existingCategories = await prisma.category.findMany();
    
    if (existingCategories.length > 0) {
      return { 
        success: false, 
        error: 'Des catégories existent déjà. Cette action ne peut être effectuée que sur une base vide.' 
      };
    }

    // Définir les catégories par défaut
    const defaultCategories = [
      { name: 'Vêtements & Chaussures', color: '#EF4444', icon: '👕' },
      { name: 'Électronique & Tech', color: '#3B82F6', icon: '📱' },
      { name: 'Livres & Médias', color: '#10B981', icon: '📚' },
      { name: 'Beauté & Soins', color: '#EC4899', icon: '💄' },
      { name: 'Cuisine & Maison', color: '#F97316', icon: '🍳' },
      { name: 'Gaming & Loisirs', color: '#8B5CF6', icon: '🎮' },
      { name: 'Sport & Fitness', color: '#06B6D4', icon: '🏃' },
      { name: 'Bijoux & Accessoires', color: '#A855F7', icon: '💍' },
      { name: 'Santé & Bien-être', color: '#F43F5E', icon: '💊' },
      { name: 'Bricolage & Jardinage', color: '#22C55E', icon: '🔨' },
      { name: 'Alimentation & Boissons', color: '#84CC16', icon: '🍎' },
      { name: 'Décoration & Art', color: '#EAB308', icon: '🎨' },
      { name: 'Outils & Équipements', color: '#6B7280', icon: '🛠️' },
      { name: 'Mode & Accessoires', color: '#14B8A6', icon: '👜' },
      { name: 'Loisirs & Hobbies', color: '#D97706', icon: '🎯' }
    ];

    // Créer toutes les catégories
    const createdCategories = await Promise.all(
      defaultCategories.map(category => 
        prisma.category.create({
          data: {
            name: category.name,
            color: category.color,
            icon: category.icon
          }
        })
      )
    );

    console.log(`✅ ${createdCategories.length} catégories par défaut créées avec succès`);
    
    revalidatePath('/admin');
    return { 
      success: true, 
      message: `${createdCategories.length} catégories par défaut ont été créées avec succès !`,
      categories: createdCategories
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des catégories par défaut:', error);
    return { success: false, error: 'Erreur lors de l\'initialisation des catégories par défaut' };
  }
}
