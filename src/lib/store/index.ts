import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, CartItem, HeldCart, LocalInvoice, LocalInvoiceItem } from '../client/db';
import type { AuthUser } from '../client/auth';
import type { Language } from '../../i18n';

// Auth Store
interface AuthState {
  user: AuthUser | null;
  exchangeRateKHR: number;
  isOnline: boolean;
  setUser: (user: AuthUser | null) => void;
  setExchangeRate: (rate: number) => void;
  setOnline: (online: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      exchangeRateKHR: 4100,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setUser: (user) => set({ user }),
      setExchangeRate: (rate) => set({ exchangeRateKHR: rate }),
      setOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        exchangeRateKHR: state.exchangeRateKHR 
      }),
    }
  )
);

// Language Store
interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Cart Store
interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find(item => item.productId === product.id);
      if (existing) {
        return {
          items: state.items.map(item =>
            item.productId === product.id
              ? { ...item, qty: item.qty + 1 }
              : item
          ),
        };
      }
      return {
        items: [...state.items, {
          productId: product.id,
          name: product.name,
          priceUSDcents: product.priceUSDcents,
          qty: 1,
        }],
      };
    });
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.productId !== productId),
    }));
  },
  updateQuantity: (productId, qty) => {
    set((state) => {
      if (qty <= 0) {
        return { items: state.items.filter(item => item.productId !== productId) };
      }
      return {
        items: state.items.map(item =>
          item.productId === productId ? { ...item, qty } : item
        ),
      };
    });
  },
  clearCart: () => set({ items: [] }),
  setCart: (items) => set({ items }),
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.priceUSDcents * item.qty, 0);
  },
}));

// Products Store
interface ProductsState {
  products: Product[];
  searchQuery: string;
  selectedCategory: string | null;
  setProducts: (products: Product[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  getFilteredProducts: () => Product[];
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  searchQuery: '',
  selectedCategory: null,
  setProducts: (products) => set({ products }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  getFilteredProducts: () => {
    const { products, searchQuery, selectedCategory } = get();
    return products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || 
        product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  },
}));

// Held Carts Store
interface HeldCartsState {
  heldCarts: HeldCart[];
  setHeldCarts: (carts: HeldCart[]) => void;
  addHeldCart: (cart: HeldCart) => void;
  removeHeldCart: (id: string) => void;
}

export const useHeldCartsStore = create<HeldCartsState>((set) => ({
  heldCarts: [],
  setHeldCarts: (heldCarts) => set({ heldCarts }),
  addHeldCart: (cart) => set((state) => ({ heldCarts: [cart, ...state.heldCarts] })),
  removeHeldCart: (id) => set((state) => ({ 
    heldCarts: state.heldCarts.filter(c => c.id !== id) 
  })),
}));

// Sync Store
interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
