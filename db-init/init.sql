-- 1) Conéctate a la BD (en psql esto es opcional si ya estás en db_observatorio)
\c db_observatorio;

-- 2) Renombrar columna (solo si aún no lo ejecutaste)
ALTER TABLE public.station
  RENAME COLUMN IF EXISTS length TO longitude;

-- 3) Aseguramos que tu usuario original siga ahí (filtrado por email)
INSERT INTO public.entity (
  id, external_id, status, picture, name, lastname, phone, role, created_at, updated_at
)
SELECT
  1,
  '1c5440e7-8e96-457b-b326-22c3a7ce4ddf',
  TRUE,
  'USUARIO_ICONO.png',
  'Hilary Madeley',
  'Calva Camacho',
  '0985928699',
  'ADMINISTRADOR',
  NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity WHERE external_id = '1c5440e7-8e96-457b-b326-22c3a7ce4ddf'
);

INSERT INTO public.account (
  id, external_id, status, email, password, created_at, updated_at, id_entity
)
SELECT
  1,
  '46189f42-59a6-47a0-9603-a97ec40b1e7b',
  TRUE,
  'hilary.calva@unl.edu.ec',
  '$2b$10$KE.BOZiMlBcP45IMkDa9qOMDZaYsUHZ5PBO5Kpz1GQ28lAGUhTqz6',
  NOW(), NOW(),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.account WHERE external_id = '46189f42-59a6-47a0-9603-a97ec40b1e7b'
);

-- 4) Ahora insertamos la nueva entidad y cuenta del adminObservatorio
INSERT INTO public.entity (
  id, external_id, status, picture, name, lastname, phone, role, created_at, updated_at
) VALUES (
  2,
  '1376cf7e-908c-11ef-8f4d-30e37a2aa82d',
  TRUE,
  'USUARIO_ICONO.png',
  'adminObservatorio',
  'API',
  '0000000000',
  'ADMINISTRADOR',
  NOW(), NOW()
)
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO public.account (
  id, external_id, status, email, password, created_at, updated_at, id_entity
) VALUES (
  2,
  '594760f1-907e-11ef-8f4d-30e37a2aa82e',
  TRUE,
  'adminObservatorio@unl.edu.ec',
  '$2a$08$vcbwdzAoBjH027Yt6B9PwO3G65afLhrMfejne1EJ7uoPGuLslHLC6',
  NOW(), NOW(),
  2
)
ON CONFLICT (external_id) DO NOTHING;
