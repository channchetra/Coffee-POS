import React, { useEffect, useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { t } from '../../i18n';

interface Product {
  id: string;
  nameEn: string;
  nameKm: string;
  category: string; // Legacy single category (first category or comma-separated)
  categories: string[]; // Multiple categories
  priceUSDcents: number;
  priceKHR: number;
  imageUrl: string;
}

interface Category {
  id: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  sortOrder: number;
}

export function ProductManager() {
  const { language } = useLanguageStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameKm: '',
    categories: [] as string[],
    priceKHR: '',
    imageUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Exchange rate from settings (fetched on mount)
  const [displayExchangeRate, setDisplayExchangeRate] = useState(4000);
  
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
          setDisplayExchangeRate(data.defaultExchangeRateKHR);
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
      setError(err instanceof Error ? err.message : 'Error loading products');
    } finally {
      setLoading(false);
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
    setEditingProduct(null);
    setFormData({ 
      nameEn: '',
      nameKm: '',
      categories: categories.length > 0 ? [categories[0].slug] : [], 
      priceKHR: '', 
      imageUrl: '' 
    });
    setShowModal(true);
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Use priceKHR directly from product (source of truth)
    setFormData({
      nameEn: product.nameEn,
      nameKm: product.nameKm,
      categories: product.categories || (product.category ? [product.category] : []),
      priceKHR: (product.priceKHR || 0).toString(),
      imageUrl: product.imageUrl || ''
    });
    setShowModal(true);
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
    
    setUploading(true);
    setError('');
    
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
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Store priceKHR directly (source of truth)
      const priceKHR = parseInt(formData.priceKHR) || 0;
      // Calculate USD cents for compatibility
      const priceUSDcents = Math.round((priceKHR / displayExchangeRate) * 100);
      
      if (editingProduct) {
        // Update
        const response = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
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
      
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving product');
    } finally {
      setSaving(false);
    }
  };
  
  // Helper to get product name (with translation)
  const getProductName = (product: Product) => {
    return language === 'km' ? product.nameKm : product.nameEn;
  };
  
  // Helper to get category name by slug (with translation)
  const getCategoryName = (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) return slug.replace('_', ' ');
    return language === 'km' ? cat.nameKm : cat.nameEn;
  };
  
  if (loading) {
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
      
      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-gray-400">
            {language === 'km' ? 'មិនមានផលិតផល' : 'No products found'}
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="card p-3 md:p-4">
              <div className="w-full h-24 md:h-32 bg-gray-100 rounded-xl mb-2 md:mb-3 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={getProductName(product)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Row 1: Name and Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{getProductName(product)}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(product.categories && product.categories.length > 0 ? product.categories : [product.category]).map((slug, idx) => (
                      <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {getCategoryName(slug)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary-600 text-sm">{formatKHR(product.priceKHR || 0)}</p>
                  <p className="text-xs text-gray-500">{formatUSD(product.priceUSDcents)}</p>
                </div>
              </div>
              {/* Row 2: Actions */}
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                  title={t(language, 'common.edit')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                  title={t(language, 'common.delete')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? t(language, 'admin.editProduct') : t(language, 'admin.addProduct')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={language === 'km' ? 'ឈ្មោះផលិតផល (English)' : 'Product Name (English)'}
            value={formData.nameEn}
            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
            required
            placeholder="e.g. Espresso"
          />
          
          <Input
            label={language === 'km' ? 'ឈ្មោះផលិតផល (ខ្មែរ)' : 'Product Name (Khmer)'}
            value={formData.nameKm}
            onChange={(e) => setFormData({ ...formData, nameKm: e.target.value })}
            required
            placeholder="ឧ. អេស្ប្រេសូ"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {language === 'km' ? 'ប្រភេទ (ជ្រើសរើសបានច្រើន)' : 'Categories (select multiple)'}
            </label>
            {categories.length === 0 ? (
              <div className="input text-gray-400">
                {language === 'km' ? 'មិនមានប្រភេទ' : 'No categories available'}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, categories: [...formData.categories, cat.slug] });
                        } else {
                          setFormData({ ...formData, categories: formData.categories.filter(s => s !== cat.slug) });
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {language === 'km' ? cat.nameKm : cat.nameEn}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {categories.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                <a href="/admin/categories" className="underline hover:text-amber-700">
                  {language === 'km' ? 'បន្ថែមប្រភេទមុន' : 'Add categories first'}
                </a>
              </p>
            )}
            {formData.categories.length === 0 && categories.length > 0 && (
              <p className="mt-1 text-sm text-amber-600">
                {language === 'km' ? 'សូមជ្រើសរើសយ៉ាងហោចណាស់មួយប្រភេទ' : 'Please select at least one category'}
              </p>
            )}
          </div>
          
          <div>
            <Input
              label={language === 'km' ? 'តម្លៃ (រៀល)' : 'Price (KHR)'}
              type="number"
              step="100"
              min="0"
              value={formData.priceKHR}
              onChange={(e) => setFormData({ ...formData, priceKHR: e.target.value })}
              required
              placeholder="e.g. 10000"
            />
            {formData.priceKHR && (
              <p className="mt-1 text-sm text-gray-500">
                ≈ {formatUSD(Math.round((parseInt(formData.priceKHR) / displayExchangeRate) * 100))}
              </p>
            )}
          </div>
          
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {language === 'km' ? 'រូបភាពផលិតផល' : 'Product Image'}
            </label>
            
            {/* Current image preview */}
            {formData.imageUrl && (
              <div className="mb-3 relative">
                <img 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className="w-full h-40 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Upload button */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600">{language === 'km' ? 'កំពុងផ្ទុកឡើង...' : 'Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600">{language === 'km' ? 'ផ្ទុករូបភាពឡើង' : 'Upload Image'}</span>
                  </>
                )}
              </label>
            </div>
            
            {/* Or enter URL */}
            <div className="mt-3">
              <Input
                label={language === 'km' ? 'ឬបញ្ចូល URL រូបភាព' : 'Or enter image URL'}
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="/images/products/example.svg"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              {t(language, 'common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saving} className="flex-1">
              {t(language, 'common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
