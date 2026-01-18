
import { useState, useEffect } from 'react';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Error loading ${key} from localStorage`, error);
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => loadFromStorage(key, initialValue));

  useEffect(() => {
    // 1. Save to localStorage whenever state changes
    localStorage.setItem(key, JSON.stringify(state));

    // 2. Dispatch a custom event to notify other components in the SAME tab
    // (This is useful if you use the same hook multiple times in one app)
    window.dispatchEvent(new StorageEvent('storage', {
      key: key,
      newValue: JSON.stringify(state)
    }));

  }, [key, state]);

  useEffect(() => {
    // 3. Listen for changes from OTHER tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          // Check if deep equal could be added here for performance, 
          // but for now simple set is enough.
          setState(newState);
        } catch (err) {
          console.error('Error parsing storage change', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [state, setState] as const;
}
