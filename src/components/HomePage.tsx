'use client';

import Link from 'next/link';
import { Gift, Users, Calendar, ShoppingCart, Heart, Cake } from 'lucide-react';
import EventsOverview from './EventsOverview';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            🎉 Gestionnaire d&apos;événements
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organisez vos événements spéciaux et gérez vos listes d&apos;achats en toute simplicité
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-center">
              <div className="bg-gradient-to-br from-pink-500 to-rose-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cake className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Anniversaires</h3>
              <p className="text-gray-600">Célébrez les moments spéciaux</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-500 to-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Noël</h3>
              <p className="text-gray-600">La magie des fêtes de fin d&apos;année</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Saint-Valentin</h3>
              <p className="text-gray-600">L&apos;amour est dans l&apos;air</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Rencontres</h3>
              <p className="text-gray-600">Célébrez vos relations</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-6">
          <Link
            href="/liste"
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-colors shadow-lg hover:shadow-xl"
          >
            <ShoppingCart className="w-6 h-6" />
            Voir la liste des achats
          </Link>
          
          <div className="block">
            <Link
              href="/admin"
              className="inline-flex items-center gap-3 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Accès administrateur
            </Link>
          </div>
        </div>
      </div>
      
      {/* Aperçu des événements */}
      <EventsOverview />
    </div>
  );
}
