type CategoryRule = {
  keywords: string[];
  category: string;
};

const RULES: CategoryRule[] = [
  {keywords: ['uber eats', 'doordash', 'grubhub', 'deliveroo'], category: 'Food and Dining'},
  {keywords: ['shoprite', 'grocery', 'supermarket', 'market', 'mart'], category: 'Groceries'},
  {keywords: ['uber', 'lyft', 'taxi', 'transit', 'bus', 'metro', 'bolt'], category: 'Transportation'},
  {keywords: ['restaurant', 'cafe', 'food', 'eat', 'pizza', 'sushi', 'burger'], category: 'Food and Dining'},
  {keywords: ['amazon', 'store', 'shop', 'mall', 'ebay', 'aliexpress'], category: 'Shopping'},
  {keywords: ['rent', 'mortgage', 'housing', 'lease'], category: 'Rent and Housing'},
  {keywords: ['netflix', 'spotify', 'cinema', 'movie', 'game', 'hulu', 'disney', 'hbo'], category: 'Entertainment'},
  {keywords: ['pharmacy', 'hospital', 'doctor', 'clinic', 'dental', 'cvs', 'walgreens'], category: 'Health and Medical'},
  {keywords: ['electric', 'water', 'gas', 'internet', 'phone', 'telecom'], category: 'Utilities'},
  {keywords: ['airbnb', 'hotel', 'flight', 'booking', 'airline', 'swiss air'], category: 'Travel'},
  {keywords: ['gym', 'fitness', 'spa', 'salon'], category: 'Personal Care'},
];

export function categorizeByMerchant(merchant: string): string {
  const lower = merchant.toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return rule.category;
      }
    }
  }

  return 'Other';
}
