import React, { useEffect, useState, useRef } from 'react';
import { ProductGrid } from './ProductGrid';
import { ProductFormModal } from './ProductFormModal';
import { Button } from '../ui/Button';
import { useLanguageStore } from '../../lib/store';
import type { Product, Category, ProductFormData } from './product-types';
import { t } from '../../i18n';

export function ProductManager() {
  const { language } = useLanguageStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editor, setEditor] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [meta, setMeta] = useState({ loading: true, saving: false, uploading: false, error: '', exchangeRate: 4000 });
  const [formData, setFormData] = useState<ProductFormData>({
    nameEn: '',
    nameKm: '',
    categories: [] as string[],
    priceKHR: '',
    imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (slug: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      categories: checked
        ? [...prev.categories, slug]
        : prev.categories.filter((item) => item !== slug),
    }));
  };
  
  // Exchange rate from settings (fetched on mount)
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    await Promise.all([fetchProducts(), fetchCategories(), fetchExchangeRate()]);
  };
  
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.defaultExchangeRateKHR) {
          setMeta((prev) => ({ ...prev, exchangeRate: data.defaultExchangeRateKHR }));
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setMeta((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Error loading products' }));
    } finally {
      setMeta((prev) => ({ ...prev, loading: false }));
    }
  };
  
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };
  
  const handleAdd = () => {
    setEditor((prev) => ({ ...prev, product: null }));
    setFormData({ 
      nameEn: '',
      nameKm: '',
      categories: categories.length > 0 ? [categories[0].slug] : [], 
      priceKHR: '', 
      imageUrl: '' 
    });
    setEditor((prev) => ({ ...prev, open: true }));
  };
  
  const handleEdit = (product: Product) => {
    setEditor((prev) => ({ ...prev, product }));
    // Use priceKHR directly from product (source of truth)
    setFormData({
      nameEn: product.nameEn,
      nameKm: product.nameKm,
      categories: product.categories || (product.category ? [product.category] : []),
      priceKHR: (product.priceKHR || 0).toString(),
      imageUrl: product.imageUrl || ''
    });
    setEditor((prev) => ({ ...prev, open: true }));
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm(language === 'km' ? 'តើអ្នកប្រាកដថាចង់លុបផលិតផលនេះ?' : 'Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting product');
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setMeta((prev) => ({ ...prev, uploading: true, error: '' }));
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      setFormData({ ...formData, imageUrl: data.imageUrl });
    } catch (err) {
      setMeta((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Error uploading image' }));
    } finally {
      setMeta((prev) => ({ ...prev, uploading: false }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeta((prev) => ({ ...prev, saving: true, error: '' }));
    
    try {
      // Store priceKHR directly (source of truth)
      const priceKHR = parseInt(formData.priceKHR) || 0;
      // Calculate USD cents for compatibility
      const priceUSDcents = Math.round((priceKHR / meta.exchangeRate) * 100);
      
      if (editor.product) {
        // Update
        const response = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editor.product.id,
            nameEn: formData.nameEn,
            nameKm: formData.nameKm,
            categories: formData.categories,
            priceKHR,
            priceUSDcents,
            imageUrl: formData.imageUrl
          })
        });
        
        if (!response.ok) throw new Error('Failed to update product');
        
        await fetchProducts(); // Refetch to get updated categories
      } else {
        // Create
        const response = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: formData.nameEn,
            nameKm: formData.nameKm,
            categories: formData.categories,
            priceKHR,
            priceUSDcents,
            imageUrl: formData.imageUrl
          })
        });
        
        if (!response.ok) throw new Error('Failed to create product');
        
        await fetchProducts(); // Refetch to get new product with categories
      }
      
      setEditor((prev) => ({ ...prev, open: false }));
    } catch (err) {
      setMeta((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Error saving product' }));
    } finally {
      setMeta((prev) => ({ ...prev, saving: false }));
    }
  };
  
  if (meta.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t(language, 'admin.products')}</h2>
        <Button variant="primary" onClick={handleAdd}>
          + {t(language, 'admin.addProduct')}
        </Button>
      </div>
      
      <ProductGrid
        products={products}
        categories={categories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductFormModal
        isOpen={editor.open}
        product={editor.product}
        categories={categories}
        formData={formData}
        setFormData={setFormData}
        onToggleCategory={toggleCategory}
        fileInputRef={fileInputRef}
        onImageUpload={handleImageUpload}
        uploading={meta.uploading}
        saving={meta.saving}
        error={meta.error}
        displayExchangeRate={meta.exchangeRate}
        onClose={() => setEditor((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
