'use server';

import { and, or } from '@prisma/orm-postgres/orm-client';
import { db } from './db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { auth } from './auth/server';
import { getSessionUser } from './session';
import { isLimited, recordFailure, clearFailures } from './rateLimit';
import { shouldAutoHide, reactivationDate } from './recurring';
import { parseTimestamp, toDates } from './dates';

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
}

const NO_AUTH = { success: false, error: 'Vous devez être connecté' } as const;
const FORBIDDEN = { success: false, error: 'Accès refusé' } as const;

// Droits de l'utilisateur sur un événement : null s'il n'y a aucun accès
async function eventAccess(eventId: string, userId: string) {
  const event = await db.orm.public.Event.where({ id: eventId }).select('ownerId').first();
  if (!event) return null;
  if (event.ownerId === userId) return { isOwner: true, canEdit: true };
  const share = await db.orm.public.EventShare.where({ eventId, userId }).first();
  return share ? { isOwner: false, canEdit: share.canEdit } : null;
}

// Neon Auth identifie par e-mail ; l'application identifie par pseudo (e-mail optionnel)
// -> sans e-mail réel, on en dérive un du pseudo (pas de réinitialisation de mot de passe par mail possible)
const authEmail = (username: string, email?: string | null) =>
  email || `${Buffer.from(username.toLowerCase()).toString('hex')}@listing.invalid`;

// Actions pour l'authentification des utilisateurs
export async function registerUser(username: string, password: string, email?: string) {
  try {
    username = username.trim();
    if (!username || username.length > 32) {
      return { success: false, error: 'Nom d\'utilisateur requis (32 caractères maximum)' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.orm.public.User
      .where((u) => (email ? or(u.username.eq(username), u.email.eq(email)) : u.username.eq(username)))
      .first();

    if (existingUser) {
      return { success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' };
    }

    const { data, error } = await auth.signUp.email({ email: authEmail(username, email), name: username, password });
    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de l\'inscription' };
    }

    let user;
    try {
      user = await db.orm.public.User.create({ username, email: email ?? null, authId: data.user.id });
    } catch (dbError) {
      await auth.deleteUser(); // la session ouverte par l'inscription sert à supprimer le compte orphelin
      throw dbError;
    }
    await auth.signOut(); // l'interface renvoie vers l'écran de connexion

    revalidatePath('/');
    return { success: true, user: { id: user.id, username: user.username, email: user.email } };
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return { success: false, error: 'Erreur lors de l\'inscription' };
  }
}

const LOGIN_ERROR = { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect' } as const;

export async function authenticateUser(username: string, password: string) {
  try {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'inconnue';
    const userKey = `u:${username.toLowerCase()}`;
    const ipKey = `ip:${ip}`;

    if (isLimited(userKey, 5) || isLimited(ipKey, 20)) {
      return { success: false, error: 'Trop de tentatives, réessayez dans 15 minutes' };
    }

    const user = await db.orm.public.User.where({ username }).first();
    const email = user && authEmail(user.username, user.email);
    let ok = false;

    if (user && email && user.authId) {
      const { data, error } = await auth.signIn.email({ email, password });
      ok = !error && !!data;
    } else if (user && email && user.password && await bcrypt.compare(password, user.password)) {
      // Migration paresseuse : ancien compte (hash bcrypt) -> compte Neon Auth créé avec le mot de passe saisi
      // shortcut: retirer ce bloc, bcryptjs et User.password quand tous les comptes sont migrés
      let { data } = await auth.signUp.email({ email, name: user.username, password });
      if (!data) ({ data } = await auth.signIn.email({ email, password })); // compte Neon déjà créé par un essai précédent
      if (data) {
        await db.orm.public.User.where({ id: user.id }).update({ authId: data.user.id, password: null });
        ok = true;
      } else {
        return { success: false, error: 'Migration du compte impossible, contactez l\'administrateur' };
      }
    }

    if (!user || !ok) {
      recordFailure(userKey);
      recordFailure(ipKey);
      return LOGIN_ERROR;
    }

    clearFailures(userKey);
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

export async function logoutUser() {
  await auth.signOut();
  return { success: true };
}

// Utilisateur de la session, ou null (sert à l'interface pour savoir si la session serveur est valide)
export async function getCurrentUser() {
  return getSessionUser();
}

export async function getUserEvents() {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    // Masquer automatiquement les événements récurrents passés (anniversaires, Noël, etc.)
    await autoHidePastRecurringEvents(me.id);

    const owned = await db.orm.public.Event
      .where({ ownerId: me.id })
      .include('items', (items) => items.include('category').include('photos'))
      .all();

    const shares = await db.orm.public.EventShare
      .where({ userId: me.id })
      .include('event', (event) =>
        event
          .include('owner', (owner) => owner.select('id', 'username'))
          .include('items', (items) => items.include('category').include('photos'))
      )
      .all();

    // Séparer les événements personnels et partagés
    const ownedEvents = owned.map(event => ({
      ...event,
      isOwned: true,
      canEdit: true
    }));

    const sharedEvents = shares.flatMap(share => share.event ? [{
      ...share.event,
      isOwned: false,
      canEdit: share.canEdit,
      sharedBy: share.event.owner?.username
    }] : []);

    return {
      success: true,
      events: toDates([...ownedEvents, ...sharedEvents])
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

export async function shareEvent(eventId: string, targetUsername: string, canEdit: boolean = false) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    // Seul le propriétaire peut partager
    const event = await db.orm.public.Event.where({ id: eventId, ownerId: me.id }).first();

    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await db.orm.public.User.where({ username: targetUsername }).first();

    if (!targetUser) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    // Vérifier que l'utilisateur ne partage pas avec lui-même
    if (event.ownerId === targetUser.id) {
      return { success: false, error: 'Vous ne pouvez pas partager avec vous-même' };
    }

    // Vérifier que le partage n'existe pas déjà
    const existingShare = await db.orm.public.EventShare.where({ eventId, userId: targetUser.id }).first();

    if (existingShare) {
      return { success: false, error: 'Cet événement est déjà partagé avec cet utilisateur' };
    }

    // Créer le partage
    await db.orm.public.EventShare.create({ eventId, userId: targetUser.id, canEdit });

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
    const me = await getSessionUser();
    if (!me) return NO_AUTH;
    if (!data.name?.trim()) return { success: false, error: 'Nom de l\'événement requis' };

    await db.orm.public.Event.create({
      name: data.name,
      eventType: data.eventType,
      targetDate: data.hasTargetDate && data.targetDate ? data.targetDate.toISOString() : null,
      hasTargetDate: data.hasTargetDate ?? true,
      isPrivate: data.isPrivate ?? false,
      ownerId: me.id,
    });

    revalidatePath('/');
    return { success: true };
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
    const me = await getSessionUser();
    if (!me) return NO_AUTH;
    if (!data.name?.trim()) return { success: false, error: 'Nom de l\'événement requis' };

    const count = await db.orm.public.Event.where({ id: eventId, ownerId: me.id }).updateAndCount({
      name: data.name,
      eventType: data.eventType,
      targetDate: data.hasTargetDate && data.targetDate ? data.targetDate.toISOString() : null,
      hasTargetDate: data.hasTargetDate,
      isPrivate: data.isPrivate,
    });
    if (count === 0) return FORBIDDEN;

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la modification de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la modification de l\'événement' };
  }
}

// Action pour masquer un événement
export async function hideEvent(eventId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const count = await db.orm.public.Event.where({ id: eventId, ownerId: me.id }).updateAndCount({ isHidden: true });
    if (count === 0) return { success: false, error: 'Vous n\'êtes pas autorisé à masquer cet événement' };

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du masquage de l\'événement:', error);
    return { success: false, error: 'Erreur lors du masquage de l\'événement' };
  }
}

// Action pour réactiver un événement (avec incrémentation d'année pour les anniversaires)
export async function reactivateEvent(eventId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const event = await db.orm.public.Event.where({ id: eventId, ownerId: me.id }).first();
    if (!event) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à réactiver cet événement' };
    }

    const updateData: { isHidden: boolean; targetDate?: string } = { isHidden: false };

    // Anniversaire ou Noël avec date : si la date de cette année est passée, on passe à l'année suivante
    if ((event.eventType === 'anniversaire' || event.eventType === 'noel') && event.targetDate && event.hasTargetDate) {
      const now = new Date();
      const next = reactivationDate(parseTimestamp(event.targetDate), new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      if (next) updateData.targetDate = next.toISOString();
    }

    await db.orm.public.Event.where({ id: eventId }).update(updateData);

    revalidatePath('/');
    revalidatePath('/user');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la réactivation de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la réactivation de l\'événement' };
  }
}

// Masque les événements récurrents passés (anniversaires, Noël) de cet utilisateur
// shortcut: écrit en base lors d'une lecture, déplacer dans un cron quotidien si le volume grossit
async function autoHidePastRecurringEvents(ownerId: string) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const recurringEvents = await db.orm.public.Event
      .where((e) => and(
        e.ownerId.eq(ownerId),
        e.eventType.in(['anniversaire', 'noel']),
        e.isActive.eq(true),
        e.isHidden.eq(false),
        e.hasTargetDate.eq(true),
        e.targetDate.isNotNull()
      ))
      .select('id', 'targetDate')
      .all();

    const idsToHide = recurringEvents
      .filter(event => event.targetDate && shouldAutoHide(parseTimestamp(event.targetDate), today))
      .map(event => event.id);

    if (idsToHide.length > 0) {
      await db.orm.public.Event.where((e) => e.id.in(idsToHide)).updateAll({ isHidden: true });
    }
  } catch (error) {
    console.error('Erreur lors du masquage automatique des événements récurrents:', error);
  }
}

export async function getEvent(eventId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;
    const userId = me.id;

    const event = await db.orm.public.Event
      .where((e) => and(
        e.id.eq(eventId),
        e.isActive.eq(true),
        or(
          e.ownerId.eq(userId), // L'utilisateur est propriétaire
          e.shares.some((s) => s.userId.eq(userId)) // L'événement est partagé avec l'utilisateur
        )
      ))
      .include('owner', (owner) => owner.select('id', 'username'))
      .include('shares', (shares) => shares.where({ userId }))
      .include('items', (items) =>
        items.include('photos', (photos) => photos.orderBy((p) => p.order.asc())).include('category')
      )
      .first();

    if (!event) {
      return { success: false, error: 'Événement non trouvé ou accès non autorisé' };
    }

    // Déterminer si l'utilisateur peut modifier l'événement
    const isOwner = event.ownerId === userId;
    const canEdit = isOwner || (event.shares.length > 0 && event.shares[0].canEdit);

    // Ajouter les informations de permission à l'événement
    const eventWithPermissions = {
      ...event,
      owner: event.owner!, // clé étrangère obligatoire
      isOwned: isOwner,
      canEdit: canEdit
    };

    return { success: true, event: toDates(eventWithPermissions) };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return { success: false, error: 'Erreur lors de la récupération de l\'événement' };
  }
}

// Actions pour les articles
export async function createShoppingItem(data: CreateShoppingItemData) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const access = await eventAccess(data.eventId, me.id);
    if (!access?.canEdit) return FORBIDDEN;

    if (!data.name?.trim()) return { success: false, error: 'Nom de l\'article requis' };
    if (data.price != null && (!Number.isFinite(data.price) || data.price < 0)) {
      return { success: false, error: 'Prix invalide' };
    }
    if (data.purchaseUrl && !/^https?:\/\//i.test(data.purchaseUrl)) {
      return { success: false, error: 'Le lien d\'achat doit commencer par http:// ou https://' };
    }

    await db.transaction(async (tx) => {
      const item = await tx.orm.public.ShoppingItem.create({
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? null,
        purchaseUrl: data.purchaseUrl ?? null, // Lien d'achat
        eventId: data.eventId, // Maintenant directement lié à l'événement
        categoryId: data.categoryId ?? null, // Ajouter la catégorie
      });
      for (const [index, photo] of data.photos.entries()) {
        await tx.orm.public.ShoppingItemPhoto.create({
          itemId: item.id,
          imageUrl: photo.imageUrl,
          altText: photo.altText ?? null,
          order: index + 1,
        });
      }
    });

    revalidatePath('/liste');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    return { success: false, error: 'Erreur lors de la création de l\'article' };
  }
}

export async function updateItemStatus(data: UpdateItemStatusData) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const item = await db.orm.public.ShoppingItem.where({ id: data.itemId }).select('eventId', 'purchasedBy').first();
    if (!item || !(await eventAccess(item.eventId, me.id))) return FORBIDDEN;

    if (data.isPurchased) {
      // Atomique : si deux personnes cliquent en même temps, une seule passe
      const count = await db.orm.public.ShoppingItem.where({ id: data.itemId, isPurchased: false }).updateAndCount({
        isPurchased: true,
        purchasedBy: me.username,
        purchasedAt: new Date().toISOString()
      });
      if (count === 0) return { success: false, error: 'Cet article a déjà été acheté' };
    } else {
      // Seul l'acheteur (ou un admin) peut annuler ; 'Utilisateur' = ancien libellé générique
      const canUndo = me.isAdmin || item.purchasedBy === me.username || item.purchasedBy === 'Utilisateur';
      if (!canUndo) return { success: false, error: 'Seul l\'acheteur peut annuler cet achat' };
      await db.orm.public.ShoppingItem.where({ id: data.itemId, isPurchased: true }).updateAndCount({
        isPurchased: false,
        purchasedBy: null,
        purchasedAt: null
      });
    }

    revalidatePath('/liste');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du statut' };
  }
}

export async function deleteShoppingItem(itemId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const item = await db.orm.public.ShoppingItem.where({ id: itemId }).select('eventId').first();
    if (!item || !(await eventAccess(item.eventId, me.id))?.canEdit) return FORBIDDEN;

    await db.orm.public.ShoppingItem.where({ id: itemId }).delete();

    revalidatePath('/liste');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'article' };
  }
}

async function requireAdmin() {
  const me = await getSessionUser();
  return me?.isAdmin ? me : null;
}

export async function createCategory(data: { name: string; color?: string; icon?: string }) {
  try {
    if (!(await requireAdmin())) return FORBIDDEN;

    await db.orm.public.Category.create({
      name: data.name,
      color: data.color || '#3B82F6',
      icon: data.icon ?? null
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la création de la catégorie' };
  }
}

export async function updateCategory(id: string, data: { name: string; color?: string; icon?: string }) {
  try {
    if (!(await requireAdmin())) return FORBIDDEN;

    await db.orm.public.Category.where({ id }).update({
      name: data.name,
      color: data.color || '#3B82F6',
      icon: data.icon ?? null
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la modification de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la modification de la catégorie' };
  }
}

export async function deleteCategory(id: string) {
  try {
    if (!(await requireAdmin())) return FORBIDDEN;

    // Vérifier si la catégorie est utilisée par des articles
    const itemsWithCategory = await db.orm.public.ShoppingItem.where({ categoryId: id }).select('id').all();

    if (itemsWithCategory.length > 0) {
      return {
        success: false,
        error: `Impossible de supprimer cette catégorie car elle est utilisée par ${itemsWithCategory.length} article(s)`
      };
    }

    await db.orm.public.Category.where({ id }).delete();

    revalidatePath('/admin');
    return { success: true, message: 'Catégorie supprimée avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return { success: false, error: 'Erreur lors de la suppression de la catégorie' };
  }
}

export async function getCategories() {
  try {
    const categories = await db.orm.public.Category.orderBy((c) => c.name.asc()).all();
    return { success: true, categories: toDates(categories) };
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return { success: false, error: 'Erreur lors de la récupération des catégories' };
  }
}

export async function getCategoriesWithItemCount() {
  try {
    const categories = await db.orm.public.Category
      .orderBy((c) => c.name.asc())
      .include('items', (items) => items.count())
      .all();

    return {
      success: true,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        itemCount: cat.items
      }))
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return { success: false, error: 'Erreur lors de la récupération des catégories' };
  }
}

// Action pour récupérer les événements actifs de l'utilisateur (les siens + ceux partagés avec lui)
// Note: Cette fonction filtre les événements masqués pour la page d'accueil
export async function getAllActiveEvents() {
  try {
    const me = await getSessionUser();
    if (!me) return { success: true, events: [] };
    const userId = me.id;

    // Masquer automatiquement les événements récurrents passés (anniversaires, Noël, etc.)
    await autoHidePastRecurringEvents(userId);

    const events = await db.orm.public.Event
      .where((e) => and(
        e.isActive.eq(true),
        e.isHidden.eq(false), // Ne pas afficher les événements masqués sur la page d'accueil
        or(
          e.ownerId.eq(userId), // Ses propres événements
          e.shares.some((s) => s.userId.eq(userId)) // Événements partagés avec lui
        )
      ))
      .orderBy((e) => e.targetDate.asc())
      .include('owner', (owner) => owner.select('id', 'username'))
      .include('items', (items) =>
        items.include('photos', (photos) => photos.orderBy((p) => p.order.asc())).include('category')
      )
      .all();

    return { success: true, events: toDates(events.map(e => ({ ...e, owner: e.owner! }))) }; // clé étrangère obligatoire
  } catch (error) {
    console.error('Erreur lors de la récupération des événements actifs:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

// Action pour se retirer d'un événement partagé
export async function leaveSharedEvent(eventId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    // Vérifier que l'utilisateur est bien partagé sur cet événement
    const eventShare = await db.orm.public.EventShare
      .where({ eventId, userId: me.id })
      .include('event', (event) => event.include('owner', (owner) => owner.select('id', 'username')))
      .first();

    if (!eventShare?.event) {
      return { success: false, error: 'Vous n\'êtes pas partagé sur cet événement' };
    }

    // Supprimer le partage
    await db.orm.public.EventShare.where({ id: eventShare.id }).delete();

    // Créer une notification pour le propriétaire
    try {
      await db.orm.public.Notification.create({
        userId: eventShare.event.ownerId,
        type: 'EVENT_LEAVE',
        title: 'Un utilisateur s\'est retiré de votre événement',
        message: `${me.username} s'est retiré de l'événement "${eventShare.event.name}"`,
        data: {
          eventId: eventId,
          eventName: eventShare.event.name,
          leavingUserId: me.id,
          leavingUsername: me.username
        },
        isRead: false
      });
    } catch (notificationError) {
      console.error('Erreur lors de la création de la notification:', notificationError);
      // On continue même si la notification échoue
    }

    return {
      success: true,
      message: 'Vous vous êtes retiré de l\'événement',
      eventName: eventShare.event.name,
      ownerUsername: eventShare.event.owner?.username ?? ''
    };
  } catch (error) {
    console.error('Erreur lors du retrait de l\'événement partagé:', error);
    return { success: false, error: 'Erreur lors du retrait de l\'événement' };
  }
}

// Action pour récupérer les notifications de l'utilisateur connecté
export async function getUserNotifications() {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const notifications = await db.orm.public.Notification
      .where({ userId: me.id })
      .orderBy((n) => n.createdAt.desc())
      .limit(50) // Limiter à 50 notifications récentes
      .all();

    return { success: true, notifications: toDates(notifications) };
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return { success: false, error: 'Erreur lors de la récupération des notifications' };
  }
}

// Action pour marquer une notification comme lue
export async function markNotificationAsRead(notificationId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const count = await db.orm.public.Notification
      .where({ id: notificationId, userId: me.id })
      .updateAndCount({ isRead: true });

    return count > 0 ? { success: true } : FORBIDDEN;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de la notification' };
  }
}

// Action pour supprimer une notification
export async function deleteNotification(notificationId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return NO_AUTH;

    const count = await db.orm.public.Notification
      .where({ id: notificationId, userId: me.id })
      .deleteAndCount();

    return count > 0 ? { success: true } : FORBIDDEN;
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    return { success: false, error: 'Erreur lors de la suppression de la notification' };
  }
}

// Action pour initialiser les catégories par défaut
export async function initializeDefaultCategories() {
  try {
    if (!(await requireAdmin())) return FORBIDDEN;

    // Vérifier si des catégories existent déjà
    const existingCategories = await db.orm.public.Category.select('id').limit(1).all();

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

    // Créer toutes les catégories (tout ou rien)
    await db.transaction(async (tx) => {
      for (const category of defaultCategories) {
        await tx.orm.public.Category.create(category);
      }
    });

    revalidatePath('/admin');
    return {
      success: true,
      message: `${defaultCategories.length} catégories par défaut ont été créées avec succès !`
    };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des catégories par défaut:', error);
    return { success: false, error: 'Erreur lors de l\'initialisation des catégories par défaut' };
  }
}
