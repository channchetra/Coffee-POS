export interface Product {
  id: string;
  nameEn: string;
  nameKm: string;
  category: string;
  categories: string[];
  priceUSDcents: number;
  priceKHR: number;
  imageUrl: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  sortOrder: number;
}

export interface ProductFormData {
  nameEn: string;
  nameKm: string;
  categories: string[];
  priceKHR: string;
  imageUrl: string;
}
