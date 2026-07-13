-- Add welcome tracking to balances table
-- Tracks how many free welcome rounds a user has played (max 5)

ALTER TABLE balances ADD COLUMN IF NOT EXISTS welcome_rounds_played INT NOT NULL DEFAULT 0;

-- Mark ~10 recognizable locations as easy (difficulty 1-2) for welcome mode
-- Pick locations with famous landmarks that are easier to guess

-- Most recognizable, iconic landmarks (difficulty 1)
UPDATE geostakes_locations SET difficulty = 1 WHERE label ILIKE '%times square%';
UPDATE geostakes_locations SET difficulty = 1 WHERE label ILIKE '%shibuya%';
UPDATE geostakes_locations SET difficulty = 1 WHERE label ILIKE '%eiffel%' OR label ILIKE '%champ de mars%';
UPDATE geostakes_locations SET difficulty = 1 WHERE label ILIKE '%copacabana%';
UPDATE geostakes_locations SET difficulty = 1 WHERE label ILIKE '%colosseum%' OR label ILIKE '%piazza navona%';

-- Very recognizable but slightly harder (difficulty 2)
UPDATE geostakes_locations SET difficulty = 2 WHERE label ILIKE '%trafalgar%';
UPDATE geostakes_locations SET difficulty = 2 WHERE label ILIKE '%brandenburg%';
UPDATE geostakes_locations SET difficulty = 2 WHERE label ILIKE '%marina bay%';
UPDATE geostakes_locations SET difficulty = 2 WHERE label ILIKE '%circular quay%';
UPDATE geostakes_locations SET difficulty = 2 WHERE label ILIKE '%dam square%';
