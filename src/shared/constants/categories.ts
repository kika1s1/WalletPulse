export type DefaultCategory = {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {name: 'Food and Dining', icon: 'fork-knife', color: '#FF6B6B', type: 'expense'},
  {name: 'Groceries', icon: 'shopping-cart', color: '#E17055', type: 'expense'},
  {name: 'Transportation', icon: 'car', color: '#4ECDC4', type: 'expense'},
  {name: 'Shopping', icon: 'bag', color: '#45B7D1', type: 'expense'},
  {name: 'Entertainment', icon: 'film', color: '#96CEB4', type: 'expense'},
  {name: 'Health and Medical', icon: 'heart-pulse', color: '#FFEAA7', type: 'expense'},
  {name: 'Rent and Housing', icon: 'home', color: '#DDA0DD', type: 'expense'},
  {name: 'Utilities', icon: 'lightbulb', color: '#98D8C8', type: 'expense'},
  {name: 'Business', icon: 'briefcase', color: '#6C5CE7', type: 'both'},
  {name: 'Travel', icon: 'airplane', color: '#FD79A8', type: 'expense'},
  {name: 'Education', icon: 'graduation-cap', color: '#74B9FF', type: 'expense'},
  {name: 'Personal Care', icon: 'sparkles', color: '#FDA7DF', type: 'expense'},
  {name: 'Gifts and Donations', icon: 'gift', color: '#FF9FF3', type: 'expense'},
  {name: 'Insurance', icon: 'shield-check', color: '#55EFC4', type: 'expense'},
  {name: 'Taxes', icon: 'receipt', color: '#636E72', type: 'expense'},
  {name: 'Salary', icon: 'banknotes', color: '#00B894', type: 'income'},
  {name: 'Freelance Income', icon: 'laptop', color: '#0984E3', type: 'income'},
  {name: 'Investment Returns', icon: 'trending-up', color: '#6C5CE7', type: 'income'},
  {name: 'Transfer', icon: 'arrows-right-left', color: '#636E72', type: 'both'},
  {name: 'Subscriptions', icon: 'refresh', color: '#E056A0', type: 'expense'},
  {name: 'Other', icon: 'ellipsis', color: '#B2BEC3', type: 'both'},
];

export function getDefaultCategoriesByType(type: 'expense' | 'income'): DefaultCategory[] {
  return DEFAULT_CATEGORIES.filter((c) => c.type === type || c.type === 'both');
}
