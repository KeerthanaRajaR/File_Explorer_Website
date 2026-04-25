"use client";

import { Star, Folder, File as FileIcon, X } from 'lucide-react';
import type { Favorite } from '@/types/features';

interface FavoritesBarProps {
  favorites: Favorite[];
  onOpenFavorite: (favorite: Favorite) => void;
  onRemoveFavorite: (path: string) => void;
}

export function FavoritesBar({ favorites, onOpenFavorite, onRemoveFavorite }: FavoritesBarProps) {
  return (
    <section className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/30 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Star size={14} className="text-yellow-500" fill="currentColor" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pinned</h3>
      </div>

      {favorites.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No favorites yet</p>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          {favorites.map((favorite) => (
            <div
              key={favorite.path}
              className="group shrink-0 inline-flex items-center gap-2 pl-2 pr-1 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpenFavorite(favorite)}
                className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200"
                title={favorite.path}
              >
                {favorite.type === 'folder' ? (
                  <Folder size={14} className="text-blue-500" />
                ) : (
                  <FileIcon size={14} className="text-gray-500" />
                )}
                <span className="max-w-44 truncate">{favorite.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveFavorite(favorite.path)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="Remove from pinned"
                aria-label={`Remove ${favorite.name} from pinned`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
