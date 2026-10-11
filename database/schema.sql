-- 1. Návrh databáze
-- Aplikace pro sledování cen Pokémon karet a boxů.
-- Databáze je navržena pro PostgreSQL a rozděluje data do 3 hlavních oblastí:
-- 1) karty a sady, 2) uživatelé a portfolio, 3) tržní ceny a PSA hodnocení.

-- 2. Vytvoření databázových tabulek

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2.1 Tabulka pro karty a boxy
CREATE TABLE card_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    series TEXT,
    printed_total INTEGER,
    release_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES card_sets(id) ON DELETE RESTRICT,
    external_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    number TEXT,
    rarity TEXT,
    card_type TEXT,
    image_small TEXT,
    image_large TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cards_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    set_id UUID REFERENCES card_sets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    condition TEXT NOT NULL DEFAULT 'near_mint',
    purchase_price NUMERIC(10,2),
    purchase_date DATE,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT boxes_condition_valid CHECK (condition IN ('sealed', 'near_mint', 'light_play', 'played')),
    CONSTRAINT boxes_purchase_price_positive CHECK (purchase_price IS NULL OR purchase_price >= 0)
);

-- 2.2 Tabulka pro uživatele a portfolia
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT app_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
);

ALTER TABLE boxes
    ADD CONSTRAINT fk_boxes_user
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE RESTRICT,
    box_id UUID REFERENCES boxes(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    card_condition TEXT NOT NULL DEFAULT 'near_mint',
    psa_grade INTEGER,
    purchase_price NUMERIC(10,2),
    market_value NUMERIC(10,2),
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT portfolio_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT portfolio_items_condition_valid CHECK (card_condition IN ('sealed', 'near_mint', 'light_play', 'played')),
    CONSTRAINT portfolio_items_psa_grade_valid CHECK (psa_grade IS NULL OR (psa_grade BETWEEN 1 AND 10)),
    CONSTRAINT portfolio_items_price_positive CHECK (
        (purchase_price IS NULL OR purchase_price >= 0) AND
        (market_value IS NULL OR market_value >= 0)
    ),
    CONSTRAINT portfolio_items_card_or_box CHECK (card_id IS NOT NULL OR box_id IS NOT NULL)
);

-- 2.3 Tabulka pro tržní ceny (včetně PSA)
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    variant TEXT NOT NULL DEFAULT 'normal',
    low_price NUMERIC(10,2),
    mid_price NUMERIC(10,2),
    high_price NUMERIC(10,2),
    market_price NUMERIC(10,2),
    direct_low_price NUMERIC(10,2),
    psa_10 NUMERIC(10,2),
    psa_9 NUMERIC(10,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT market_prices_variant_valid CHECK (variant IN ('normal', 'holofoil', 'reverseHolofoil', '1stEditionHolofoil', 'unlimitedHolofoil')),
    CONSTRAINT market_prices_price_positive CHECK (
        (low_price IS NULL OR low_price >= 0) AND
        (mid_price IS NULL OR mid_price >= 0) AND
        (high_price IS NULL OR high_price >= 0) AND
        (market_price IS NULL OR market_price >= 0) AND
        (direct_low_price IS NULL OR direct_low_price >= 0) AND
        (psa_10 IS NULL OR psa_10 >= 0) AND
        (psa_9 IS NULL OR psa_9 >= 0)
    )
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    portfolio_item_id UUID REFERENCES portfolio_items(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2),
    fee NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transactions_type_valid CHECK (type IN ('purchase', 'sale', 'valuation_update')),
    CONSTRAINT transactions_quantity_positive CHECK (quantity > 0),
    CONSTRAINT transactions_price_positive CHECK (unit_price IS NULL OR unit_price >= 0),
    CONSTRAINT transactions_fee_positive CHECK (fee >= 0)
);

-- Indexy pro časté dotazy
CREATE INDEX idx_cards_set_id ON cards(set_id);
CREATE INDEX idx_cards_name ON cards(name);
CREATE INDEX idx_cards_external_id ON cards(external_id);
CREATE INDEX idx_boxes_user_id ON boxes(user_id);
CREATE INDEX idx_portfolio_user_id ON portfolio_items(user_id);
CREATE INDEX idx_portfolio_card_id ON portfolio_items(card_id);
CREATE INDEX idx_market_prices_card_id ON market_prices(card_id);
CREATE INDEX idx_market_prices_recorded_at ON market_prices(recorded_at DESC);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Příklad dotazů, které budou appka používat:
-- 1) Získání portfolio uživatele:
-- SELECT p.*, c.name, c.number, cs.name AS set_name
-- FROM portfolio_items p
-- JOIN cards c ON c.id = p.card_id
-- JOIN card_sets cs ON cs.id = c.set_id
-- WHERE p.user_id = :user_id;

-- 2) Poslední tržní ceny pro kartu:
-- SELECT *
-- FROM market_prices
-- WHERE card_id = :card_id
-- ORDER BY recorded_at DESC
-- LIMIT 1;

-- 3) Seznam karet podle jména a sady:
-- SELECT c.*, cs.name AS set_name
-- FROM cards c
-- JOIN card_sets cs ON cs.id = c.set_id
-- WHERE c.name ILIKE :query;
