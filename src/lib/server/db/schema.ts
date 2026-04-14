import { pgTable, text, integer, numeric, timestamp, boolean, uuid, date, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Entity types: headquarters, branch, subsidiary
export const entityTypeEnum = pgEnum('entity_type', ['headquarters', 'branch', 'subsidiary']);

// Account types
export const accountTypeEnum = pgEnum('account_type', ['bank', 'savings', 'deposit', 'bond', 'other']);

// Transaction types
export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit', 'interest', 'fee', 'fx_adjustment', 'other']);

/**
 * ENTITIES — companies/persons with hierarchical structure
 * A parent entity (headquarters) can have branches (same legal entity)
 * and subsidiaries (separate legal entities, own books)
 */
export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: entityTypeEnum('type').default('headquarters').notNull(),
  parentId: uuid('parent_id'),  // self-reference — null = top-level
  taxId: text('tax_id'),         // CIF/NIF
  country: text('country'),      // ISO 3166-1 alpha-2 (ES, PT, DE...)
  currency: text('currency').default('EUR').notNull(), // base currency
  metadata: jsonb('metadata'),   // flexible: address, sector, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * ACCOUNTS — financial accounts owned by entities
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').references(() => entities.id).notNull(),
  name: text('name').notNull(),        // "Banco Santander - Cuenta Operativa"
  type: accountTypeEnum('type').notNull(),
  currency: text('currency').default('EUR').notNull(),
  accountNumber: text('account_number'),  // IBAN or account ref
  bankName: text('bank_name'),
  isActive: boolean('is_active').default(true).notNull(),
  maturityDate: date('maturity_date'),    // for deposits/bonds
  interestRate: numeric('interest_rate', { precision: 8, scale: 4 }), // e.g. 3.5000
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * BALANCE ENTRIES — daily/periodic snapshots of account balances
 * This is the core data: what's the balance on a given date
 */
export const balanceEntries = pgTable('balance_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  date: date('date').notNull(),
  balance: numeric('balance', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').default('EUR').notNull(),
  balanceEur: numeric('balance_eur', { precision: 18, scale: 2 }), // converted to base
  fxRate: numeric('fx_rate', { precision: 12, scale: 6 }),         // rate used
  source: text('source').default('manual'), // manual, import, api
  isReconciled: boolean('is_reconciled').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * TRANSACTIONS — individual movements within accounts
 */
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').default('EUR').notNull(),
  date: date('date').notNull(),
  description: text('description'),
  category: text('category'),       // optional: payroll, rent, transfer, etc.
  reference: text('reference'),     // bank reference number
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * FX RATES — currency exchange rates
 */
export const fxRates = pgTable('fx_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: numeric('rate', { precision: 12, scale: 6 }).notNull(),
  date: date('date').notNull(),
  source: text('source').default('ecb'), // ecb, manual, import
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * AUDIT LOG — every change to the system
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: text('action').notNull(),       // create, update, delete
  table: text('table_name').notNull(),    // which table changed
  recordId: uuid('record_id'),            // which record
  oldValue: jsonb('old_value'),           // before
  newValue: jsonb('new_value'),           // after
  userId: text('user_id'),               // who (if auth enabled)
  ip: text('ip'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

/**
 * ANOMALY FLAGS — detected anomalies in balance entries
 */
export const anomalies = pgTable('anomalies', {
  id: uuid('id').defaultRandom().primaryKey(),
  balanceEntryId: uuid('balance_entry_id').references(() => balanceEntries.id).notNull(),
  type: text('type').notNull(),           // spike, duplicate, negative, unusual_currency
  severity: text('severity').default('warning').notNull(), // info, warning, critical
  message: text('message').notNull(),
  previousBalance: numeric('previous_balance', { precision: 18, scale: 2 }),
  changePercent: numeric('change_percent', { precision: 8, scale: 2 }),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
