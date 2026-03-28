# /supabase-schema

Design a production-ready Supabase schema (SQL migration) for a CarmelMart feature.

## Instructions

The user will describe what they need. Generate:
1. `CREATE TABLE` statements
2. Indexes for query performance
3. Row Level Security (RLS) policies
4. Useful DB functions/triggers if needed

---

## Project Context

**Existing tables**: `users`, `vendors`, `payments`, `referrals`

**Users table** (key columns):
```sql
users (id UUID PK FK auth.users, email TEXT, phone TEXT, role TEXT CHECK('customer','vendor','admin'), referral_code TEXT UNIQUE, wallet_balance NUMERIC DEFAULT 0, created_at TIMESTAMPTZ)
```

**Vendors table** (key columns):
```sql
vendors (id UUID PK FK users.id, business_name TEXT, nin_verified BOOLEAN, cac_verified BOOLEAN, cac_number TEXT, bank_account_number TEXT, bank_code TEXT, verification_status TEXT CHECK('pending','verified','rejected'), created_at TIMESTAMPTZ)
```

---

## Schema Design Rules

### Naming
- Tables: `snake_case` plural (e.g., `products`, `order_items`)
- Columns: `snake_case` (e.g., `created_at`, `vendor_id`)
- PKs: always `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- FKs: `[table_singular]_id UUID REFERENCES [table](id) ON DELETE CASCADE`
- Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`

### Nigerian E-Commerce Specifics
- Monetary amounts: store as `NUMERIC(12, 2)` in NGN (not kobo/integer)
- Phone numbers: `TEXT` (not integer), format `+2348XXXXXXXXX`
- Addresses: store as JSONB `{ street_address, landmark, area, city, lga, state, country }`
  - `landmark` is REQUIRED in Nigerian addresses (directions depend on it)
- Status columns: use `TEXT` with `CHECK` constraints or `ENUM` types
- All `user_id`/`vendor_id` FK to `users.id` (not `auth.users` directly)

### Performance Indexes
Always create indexes on:
- All FK columns
- Status columns used in WHERE clauses
- `created_at` for ORDER BY DESC queries
- Text search columns with `GIN` index for full-text search

### RLS Policies — Standard Patterns

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (status = 'active');

-- Vendor owns their data
CREATE POLICY "Vendors can manage own products"
  ON products FOR ALL
  USING (
    vendor_id = (SELECT id FROM vendors WHERE id = auth.uid())
  );

-- Admin full access
CREATE POLICY "Admins have full access"
  ON products FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Users own their records
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());
```

---

## Common CarmelMart Schemas

### Products
```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  sale_price NUMERIC(12, 2) CHECK (sale_price >= 0),
  sale_ends_at TIMESTAMPTZ,
  cost_price NUMERIC(12, 2), -- vendor's cost (not shown publicly)
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  images JSONB DEFAULT '[]', -- [{ url, alt, is_primary }]
  attributes JSONB DEFAULT '{}', -- { color, size, material, ... }
  weight_kg NUMERIC(6, 3), -- for shipping calculation
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'out_of_stock')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### Orders
```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL DEFAULT 'CM-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'payment_confirmed', 'confirmed', 'processing',
    'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'disputed'
  )),
  payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'ussd', 'wallet', 'pay_on_delivery')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,
  subtotal NUMERIC(12, 2) NOT NULL,
  delivery_fee NUMERIC(12, 2) DEFAULT 0,
  discount NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  delivery_address JSONB NOT NULL, -- { street_address, landmark, area, city, lga, state, phone }
  delivery_instructions TEXT,
  tracking_number TEXT,
  logistics_provider TEXT,
  estimated_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### Order Items
```sql
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  product_snapshot JSONB NOT NULL, -- snapshot of product at time of order
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  total NUMERIC(12, 2) NOT NULL,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'held', 'released', 'transferred')),
  payout_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### Wallet Transactions
```sql
CREATE TABLE wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(12, 2) NOT NULL,
  description TEXT NOT NULL,
  reference TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
```

---

## Useful DB Functions

```sql
-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Credit wallet safely (atomic)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE users SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, reference)
  VALUES (p_user_id, 'credit', p_amount, new_balance, p_description, p_reference);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Debit wallet with balance check
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  SELECT wallet_balance INTO current_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF current_balance < p_amount THEN RETURN FALSE; END IF;

  UPDATE users SET wallet_balance = wallet_balance - p_amount WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, reference)
  VALUES (p_user_id, 'debit', p_amount, new_balance, p_description, p_reference);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Now design the schema for: **$ARGUMENTS**
