-- Seed: 30 hand-curated mid-difficulty Street View locations for v0.
-- All pano coverage verified-by-known-recognition (city centers / iconic
-- streets). pano_id resolved at runtime on first use.
-- Idempotent: re-running updates lat/lng if labels already exist.

insert into public.geostakes_locations (lat, lng, label, difficulty) values
    (40.7580, -73.9855, 'Times Square, New York',          3),
    (37.7884, -122.4076, 'Market St, San Francisco',       3),
    (41.8826, -87.6231, 'Michigan Ave, Chicago',           3),
    (34.1018, -118.3410, 'Hollywood Blvd, Los Angeles',    3),
    (43.6453, -79.3806, 'Front St, Toronto',               3),
    (49.2827, -123.1207, 'Robson St, Vancouver',           3),
    (19.4326, -99.1332, 'Zócalo, Mexico City',             3),
    (-34.6087, -58.3819, 'Avenida 9 de Julio, Buenos Aires', 3),
    (-22.9711, -43.1822, 'Copacabana, Rio de Janeiro',     3),
    (51.5080, -0.1281, 'Trafalgar Square, London',         3),
    (48.8556, 2.2986, 'Champ de Mars, Paris',              3),
    (52.5163, 13.3777, 'Brandenburg Gate, Berlin',         3),
    (41.8990, 12.4730, 'Piazza Navona, Rome',              3),
    (52.3728, 4.8936, 'Dam Square, Amsterdam',             3),
    (40.4169, -3.7038, 'Puerta del Sol, Madrid',           3),
    (38.7075, -9.1364, 'Praça do Comércio, Lisbon',        3),
    (37.9715, 23.7257, 'Plaka, Athens',                    3),
    (48.2082, 16.3713, 'Stephansplatz, Vienna',            3),
    (59.3251, 18.0710, 'Gamla Stan, Stockholm',            3),
    (55.6796, 12.5919, 'Nyhavn, Copenhagen',               3),
    (64.1466, -21.9353, 'Laugavegur, Reykjavik',           3),
    (32.0640, 34.7717, 'Rothschild Blvd, Tel Aviv',        3),
    (-33.9036, 18.4203, 'V&A Waterfront, Cape Town',       3),
    (35.6595, 139.7005, 'Shibuya Crossing, Tokyo',         3),
    (37.5635, 126.9824, 'Myeongdong, Seoul',               3),
    (13.7367, 100.5602, 'Sukhumvit, Bangkok',              3),
    (1.2839, 103.8607, 'Marina Bay, Singapore',            3),
    (18.9220, 72.8347, 'Colaba, Mumbai',                   3),
    (-33.8612, 151.2107, 'Circular Quay, Sydney',          3),
    (-36.8485, 174.7651, 'Queen St, Auckland',             3)
on conflict (label) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        difficulty = excluded.difficulty;
