// Shared currency list (ISO 4217 - most common)
export const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK',
  'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'TRY', 'BRL', 'MXN',
  'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'KRW', 'INR', 'ZAR', 'AED',
  'SAR', 'ILS', 'THB', 'MYR', 'PHP', 'IDR', 'RUB',
];

// Account type display config
export const ACCOUNT_TYPES = {
  bank: { label: 'Bank Account', icon: '🏦', badge: 'badge-blue' },
  savings: { label: 'Savings', icon: '💰', badge: 'badge-green' },
  deposit: { label: 'Deposit', icon: '📋', badge: 'badge-green' },
  bond: { label: 'Bond', icon: '📜', badge: 'badge-gold' },
  credit: { label: 'Credit Line', icon: '💳', badge: 'badge-red' },
  other: { label: 'Other', icon: '💳', badge: 'badge-gold' },
};

// Entity type display config
export const ENTITY_TYPES = {
  headquarters: { label: 'Headquarters', icon: '🏢', badge: 'badge-gold' },
  branch: { label: 'Branch', icon: '📍', badge: 'badge-blue' },
  subsidiary: { label: 'Subsidiary', icon: '🏗️', badge: 'badge-green' },
};
