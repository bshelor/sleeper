-- DDL generated by Postico 1.5.22
-- Not all database features are supported. Do not use for backup.

-- Table Definition ----------------------------------------------

CREATE TABLE alternate_matchups (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    points double precision,
    week integer,
    roster_id text REFERENCES teams(external_id),
    created_by text,
    created_at timestamp without time zone,
    modified_by text,
    modified_at timestamp without time zone,
    type text,
    external_id text
);
COMMENT ON COLUMN alternate_matchups.type IS 'The type of alternate record stat this is (i.e. ''original_draft_picks'' or ''90% accuracy'')';
COMMENT ON COLUMN alternate_matchups.external_id IS 'The external id represented in the "matchups" table, provided by Sleeper''s API to denote a unique matchup (between two teams)';

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX alternate_matchups_pkey ON alternate_matchups(id int4_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE divisions (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    year integer,
    name text
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX divisions_pkey ON divisions(id int4_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE draft_order (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    draft_id integer REFERENCES drafts(id),
    member_id text REFERENCES members(external_id),
    "order" integer,
    created_at timestamp without time zone,
    created_by text,
    modified_at timestamp without time zone,
    modified_by text
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX draft_order_pkey ON draft_order(id int4_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE draft_picks (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    draft_id integer REFERENCES drafts(id),
    team_id text REFERENCES teams(external_id),
    player_id text REFERENCES players(external_id),
    round integer,
    pick integer,
    created_by text,
    created_at timestamp without time zone,
    modified_by text,
    modified_at timestamp without time zone,
    projected_starter boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX draft_picks_pkey ON draft_picks(id int4_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE drafts (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_id text UNIQUE,
    season text,
    seconds_per_pick integer,
    qb_slots integer,
    rb_slots integer,
    wr_slots integer,
    te_slots integer,
    flex_slots integer,
    super_flex_slots integer,
    k_slots integer,
    def_slots integer,
    bn_slots integer,
    teams integer,
    started timestamp without time zone,
    status text,
    type text,
    created_by text,
    created_at timestamp without time zone,
    modified_by text,
    modified_at timestamp without time zone
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX drafts_pkey ON drafts(id int4_ops);
CREATE UNIQUE INDEX drafts_external_id_key ON drafts(external_id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE matchup_players (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    matchup_id integer REFERENCES matchups(id) ON DELETE CASCADE,
    points double precision,
    starter boolean,
    created_at timestamp without time zone,
    created_by text,
    modified_at timestamp without time zone,
    modified_by text,
    player_id text REFERENCES players(external_id) ON DELETE CASCADE
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX matchup_players_pkey ON matchup_players(id int4_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE matchups (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    points double precision,
    created_at timestamp without time zone,
    created_by text,
    modified_at timestamp without time zone,
    modified_by text,
    week integer,
    roster_id text REFERENCES teams(external_id) ON DELETE CASCADE,
    external_id text,
    best_possible_pts double precision
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX matchups_pkey1 ON matchups(id int4_ops);
CREATE INDEX matchups_week_roster_id_external_id_idx ON matchups(week int4_ops,roster_id text_ops,external_id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE members (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name text,
    last_name text,
    full_name text,
    member_since integer,
    username text,
    external_id text UNIQUE
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX members_pkey ON members(id int4_ops);
CREATE UNIQUE INDEX members_external_id_key ON members(external_id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE players (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name text,
    last_name text,
    active boolean DEFAULT true,
    position text[],
    team text,
    status text,
    created_at timestamp without time zone,
    created_by text,
    modified_at timestamp without time zone,
    modified_by text,
    external_id text UNIQUE
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX players_pkey ON players(id int4_ops);
CREATE UNIQUE INDEX players_external_id_key ON players(external_id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE teams (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id integer REFERENCES members(id),
    name text,
    year integer,
    division_id integer REFERENCES divisions(id),
    external_id text UNIQUE
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX teams_pkey ON teams(id int4_ops);
CREATE UNIQUE INDEX teams_external_id_key ON teams(external_id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE transactions (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type text,
    status text,
    waiver_amount text,
    modified_at timestamp without time zone,
    modified_by text,
    created_at timestamp without time zone,
    created_by text,
    external_id text UNIQUE,
    add text REFERENCES players(external_id) ON DELETE SET NULL,
    drop text REFERENCES players(external_id) ON DELETE SET NULL,
    creator_id text REFERENCES members(external_id) ON DELETE CASCADE,
    timestamp timestamp without time zone
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX transactions_pkey ON transactions(id int4_ops);
CREATE UNIQUE INDEX transactions_external_id_key ON transactions(external_id text_ops);


-- Table Definition ----------------------------------------------

CREATE TABLE weeks (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    week integer,
    year integer,
    start timestamp without time zone,
    "end" timestamp without time zone,
    created_at timestamp without time zone,
    created_by text,
    modified_at timestamp without time zone,
    modified_by text
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX weeks_pkey ON weeks(id int4_ops);
