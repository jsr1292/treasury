DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('headquarters','branch','subsidiary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('bank','savings','deposit','bond','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('credit','debit','interest','fee','fx_adjustment','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type entity_type NOT NULL DEFAULT 'headquarters',
  parent_id UUID REFERENCES entities(id),
  tax_id TEXT,
  country TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  name TEXT NOT NULL,
  type account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_number TEXT,
  bank_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  maturity_date DATE,
  interest_rate NUMERIC(8,4),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL,
  balance NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  balance_eur NUMERIC(18,2),
  fx_rate NUMERIC(12,6),
  source TEXT NOT NULL DEFAULT 'manual',
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  type transaction_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  date DATE NOT NULL,
  description TEXT,
  category TEXT,
  reference TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'ecb',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  user_id TEXT,
  ip TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_entry_id UUID NOT NULL REFERENCES balance_entries(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  previous_balance NUMERIC(18,2),
  change_percent NUMERIC(8,2),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
