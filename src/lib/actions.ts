'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';

// Types
export interface CreateEventData {
  name: string;
  eventType: string;
  targetDate?: Date;
  hasTargetDate?: boolean;
  isPrivate?: boolean;
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
      },
    });

    revalidatePath('/');
    return { success: true, event };
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la création de l\'événement' };
  }
}

export async function getEvent(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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

    // Check the admin password
    const admin = await prisma.admin.findFirst({
      where: { password: adminPassword }
    });

    if (admin) {
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
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }

    // Vérifier le mot de passe (en production, utiliser bcrypt)
    if (admin.password !== password) {
      return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' };
    }

    return { success: true, admin };
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
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
    await prisma.admin.deleteMany();

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/liste');
    
    return { success: true, message: 'Base de données nettoyée avec succès' };
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base:', error);
    return { success: false, error: 'Erreur lors du nettoyage de la base' };
  }
}

// Action simple pour s'assurer qu'un admin existe avec les identifiants du .env
export async function ensureAdminExists() {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.admin.findFirst();
    
    if (!existingAdmin) {
      // Créer un admin avec les identifiants du .env
      await prisma.admin.create({
        data: {
          username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
          password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin',
        },
      });
      console.log('Admin créé avec les identifiants du .env');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    return { success: false, error: 'Erreur lors de la création de l\'admin' };
  }
}

// Action pour récupérer tous les événements actifs
export async function getAllActiveEvents() {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { targetDate: 'asc' },
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
