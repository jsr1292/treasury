/**
 * Transform Presets — named transform chains for one-click application.
 */

import type { TransformStep } from './transforms';

export interface Preset {
  name: string;
  description: string;
  transforms: TransformStep[];
}

export const PRESETS: Record<string, Preset> = {
  'european-balance': {
    name: 'European Balance',
    description: 'Parse "4.000,69 EUR" → 4000.69',
    transforms: [
      { type: 'regex_replace', params: { pattern: '[^0-9.,-]', replacement: '' } },
      { type: 'number_format', params: { format: 'EU' } },
    ],
  },
  'extract-currency': {
    name: 'Extract Currency',
    description: '"4.000,69 EUR" → "EUR"',
    transforms: [
      { type: 'currency_extract', params: {} },
    ],
  },
  'spanish-account-type': {
    name: 'Spanish Account Type',
    description: '"Cuenta corriente" → "bank"',
    transforms: [
      { type: 'lower', params: {} },
      {
        type: 'lookup',
        params: {
          table: {
            'cuenta corriente': 'bank',
            'corriente': 'bank',
            'checking': 'bank',
            'cuenta de ahorro': 'savings',
            'ahorro': 'savings',
            'depósito': 'deposit',
            'deposito': 'deposit',
            'plazo fijo': 'deposit',
            'línea de crédito': 'credit',
            'prestamo': 'credit',
          },
          fallback: 'other',
        },
      },
    ],
  },
  'spanish-entity-type': {
    name: 'Spanish Entity Type',
    description: '"Matriz" → "headquarters"',
    transforms: [
      { type: 'lower', params: {} },
      {
        type: 'lookup',
        params: {
          table: {
            'matriz': 'headquarters',
            'casa matriz': 'headquarters',
            'sede': 'headquarters',
            'sucursal': 'branch',
            'oficina': 'branch',
            'filial': 'subsidiary',
          },
          fallback: 'other',
        },
      },
    ],
  },
  'trim-lower': {
    name: 'Clean Text',
    description: 'Trim + lowercase',
    transforms: [
      { type: 'trim', params: {} },
      { type: 'lower', params: {} },
    ],
  },
  'default-eur': {
    name: 'Default EUR',
    description: 'Fallback to EUR if empty',
    transforms: [
      { type: 'default', params: { fallback: 'EUR' } },
    ],
  },
};

export const PRESET_ENTRIES = Object.entries(PRESETS);
