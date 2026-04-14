/**
 * Connector configuration — maps the app to any database schema.
 * 
 * If no connector.json exists, the app uses its own built-in schema.
 * Users create this file to map their existing tables/columns.
 */

export interface ColumnMapping {
  /** Column name in the user's table */
  column: string;
  /** SQL transform (optional), e.g. "UPPER(?)", "CAST(? AS TEXT)" */
  transform?: string;
}

export interface TableMapping {
  /** Table or view name in the user's database */
  table: string;
  /** Schema name (default: public) */
  schema?: string;
  /** Column mappings: key = our field name, value = their column name */
  columns: Record<string, string>;
  /** Optional static WHERE filters, e.g. { "activo": true } */
  filters?: Record<string, any>;
  /** Optional JOIN clauses */
  joins?: string[];
}

export interface ConnectorConfig {
  /** Connector name/description */
  name?: string;
  /** Version of the connector schema */
  version?: number;

  entities: {
    table: string;
    columns: {
      id: string;
      name: string;
      type?: string;        // null = all treated as headquarters
      parentId?: string;    // null = flat structure
      country?: string;
      currency?: string;
      taxId?: string;
    };
    filters?: Record<string, any>;
  };

  accounts: {
    table: string;
    columns: {
      id: string;
      entityId: string;
      name: string;
      type?: string;         // null = all treated as 'bank'
      currency?: string;
      accountNumber?: string;
      bankName?: string;
      isActive?: string;     // null = all active
    };
    filters?: Record<string, any>;
  };

  balances: {
    /** "snapshot" = table has periodic balance snapshots */
    /** "transaction" = table has individual transactions, we sum them */
    mode: 'snapshot' | 'transaction';
    table: string;
    columns: {
      id?: string;
      accountId: string;
      date: string;
      balance: string;       // snapshot mode: the balance value
                              // transaction mode: the amount (we SUM)
      currency?: string;
    };
    /** For transaction mode: credits are positive, debits negative? */
    creditPositive?: boolean;
    /** For transaction mode: column that indicates credit/debit */
    directionColumn?: string;
    /** For transaction mode: value that means "credit" */
    creditValue?: string;
    filters?: Record<string, any>;
  };
}

/** Default connector — maps to our built-in schema */
export const defaultConnector: ConnectorConfig = {
  name: 'Built-in Treasury Schema',
  version: 1,
  entities: {
    table: 'entities',
    columns: {
      id: 'id',
      name: 'name',
      type: 'type',
      parentId: 'parent_id',
      country: 'country',
      currency: 'currency',
      taxId: 'tax_id',
    },
  },
  accounts: {
    table: 'accounts',
    columns: {
      id: 'id',
      entityId: 'entity_id',
      name: 'name',
      type: 'type',
      currency: 'currency',
      accountNumber: 'account_number',
      bankName: 'bank_name',
      isActive: 'is_active',
    },
  },
  balances: {
    mode: 'snapshot',
    table: 'balance_entries',
    columns: {
      id: 'id',
      accountId: 'account_id',
      date: 'date',
      balance: 'balance',
      currency: 'currency',
    },
  },
};
