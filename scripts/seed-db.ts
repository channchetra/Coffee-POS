import { Database } from 'bun:sqlite';
import { join } from 'path';
import { hashPassword } from '../src/lib/auth/password';

const DB_PATH = join(process.cwd(), 'data', 'coffee-pos.db');
const db = new Database(DB_PATH);

async function seed() {
  console.log('Seeding database...\n');

  // Create users
  const adminPasswordHash = await hashPassword('admin123');
  const cashierPasswordHash = await hashPassword('cashier123');

  const users = [
    { id: crypto.randomUUID(), username: 'admin', passwordHash: adminPasswordHash, role: 'admin' },
    { id: crypto.randomUUID(), username: 'cashier', passwordHash: cashierPasswordHash, role: 'cashier' },
  ];

  for (const user of users) {
    db.query('INSERT OR REPLACE INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)').run(
      user.id, user.username, user.passwordHash, user.role
    );
    console.log(`✓ Created user: ${user.username} (${user.role})`);
  }

  // Create default categories (with translations)
  const categories = [
    { id: crypto.randomUUID(), nameEn: 'Coffee', nameKm: 'កាហ្វេ', slug: 'coffee', sortOrder: 1 },
    { id: crypto.randomUUID(), nameEn: 'Wine', nameKm: 'ស្រាទំពាំងបាយជូរ', slug: 'wine', sortOrder: 2 },
    { id: crypto.randomUUID(), nameEn: 'Soft Drinks', nameKm: 'ភេសជ្ជៈ', slug: 'soft_drink', sortOrder: 3 },
  ];

  for (const category of categories) {
    db.query('INSERT OR REPLACE INTO categories (id, nameEn, nameKm, slug, sortOrder) VALUES (?, ?, ?, ?, ?)').run(
      category.id, category.nameEn, category.nameKm, category.slug, category.sortOrder
    );
    console.log(`✓ Created category: ${category.nameEn} (${category.nameKm})`);
  }

  // Create products (with translations)
  const products = [
    // Coffee
    { id: crypto.randomUUID(), nameEn: 'Espresso', nameKm: 'អេស្ប្រេសូ', category: 'coffee', priceUSDcents: 250, imageUrl: '/images/products/espresso.svg' },
    { id: crypto.randomUUID(), nameEn: 'Americano', nameKm: 'អាមេរិកាណូ', category: 'coffee', priceUSDcents: 300, imageUrl: '/images/products/americano.svg' },
    { id: crypto.randomUUID(), nameEn: 'Cappuccino', nameKm: 'កាពូឈីណូ', category: 'coffee', priceUSDcents: 350, imageUrl: '/images/products/cappuccino.svg' },
    { id: crypto.randomUUID(), nameEn: 'Latte', nameKm: 'ឡាតេ', category: 'coffee', priceUSDcents: 400, imageUrl: '/images/products/latte.svg' },
    { id: crypto.randomUUID(), nameEn: 'Mocha', nameKm: 'ម៉ូកា', category: 'coffee', priceUSDcents: 450, imageUrl: '/images/products/mocha.svg' },
    { id: crypto.randomUUID(), nameEn: 'Iced Coffee', nameKm: 'កាហ្វេទឹកកក', category: 'coffee', priceUSDcents: 350, imageUrl: '/images/products/iced-coffee.svg' },
    
    // Wine
    { id: crypto.randomUUID(), nameEn: 'Red Wine', nameKm: 'ស្រាក្រហម', category: 'wine', priceUSDcents: 800, imageUrl: '/images/products/red-wine.svg' },
    { id: crypto.randomUUID(), nameEn: 'White Wine', nameKm: 'ស្រាស', category: 'wine', priceUSDcents: 750, imageUrl: '/images/products/white-wine.svg' },
    { id: crypto.randomUUID(), nameEn: 'Rosé Wine', nameKm: 'ស្រាផ្កាឈូក', category: 'wine', priceUSDcents: 700, imageUrl: '/images/products/rose-wine.svg' },
    
    // Soft Drinks
    { id: crypto.randomUUID(), nameEn: 'Cola', nameKm: 'កូកា កូឡា', category: 'soft_drink', priceUSDcents: 150, imageUrl: '/images/products/cola.svg' },
    { id: crypto.randomUUID(), nameEn: 'Lemonade', nameKm: 'ទឹកក្រូចឆ្មារ', category: 'soft_drink', priceUSDcents: 200, imageUrl: '/images/products/lemonade.svg' },
    { id: crypto.randomUUID(), nameEn: 'Orange Juice', nameKm: 'ទឹកក្រូចពោធិ៍សាត់', category: 'soft_drink', priceUSDcents: 250, imageUrl: '/images/products/orange-juice.svg' },
    { id: crypto.randomUUID(), nameEn: 'Sparkling Water', nameKm: 'ទឹកសូដា', category: 'soft_drink', priceUSDcents: 150, imageUrl: '/images/products/sparkling-water.svg' },
    { id: crypto.randomUUID(), nameEn: 'Iced Tea', nameKm: 'តែទឹកកក', category: 'soft_drink', priceUSDcents: 200, imageUrl: '/images/products/iced-tea.svg' },
  ];

  for (const product of products) {
    db.query('INSERT OR REPLACE INTO products (id, nameEn, nameKm, category, priceUSDcents, imageUrl) VALUES (?, ?, ?, ?, ?, ?)').run(
      product.id, product.nameEn, product.nameKm, product.category, product.priceUSDcents, product.imageUrl
    );
    console.log(`✓ Created product: ${product.nameEn} (${product.nameKm})`);
  }

  // Create default settings
  const settings = [
    { key: 'defaultExchangeRateKHR', value: 4100 },
  ];

  for (const setting of settings) {
    db.query('INSERT OR REPLACE INTO settings (id, key, valueJson) VALUES (?, ?, ?)').run(
      crypto.randomUUID(), setting.key, JSON.stringify(setting.value)
    );
    console.log(`✓ Created setting: ${setting.key} = ${setting.value}`);
  }

  db.close();
  
  console.log('\n✅ Database seeding complete!');
  console.log('\nDefault credentials:');
  console.log('  Admin:   admin / admin123');
  console.log('  Cashier: cashier / cashier123');
}

seed().catch(console.error);
