-- Insertar la entidad del administrador en public.entity
INSERT INTO public.entity
  (id, external_id, status, picture, name, lastname, phone, role, created_at, updated_at)
VALUES
  (2,
   'c0ffee00-cafe-babe-dead-beef00000002',
   TRUE,
   'USUARIO_ICONO.png',
   'Admin',
   'User',
   '0999999999',
   'ADMINISTRADOR',
   '2025-05-18 21:00:00-05',
   '2025-05-18 21:00:00-05'
);

-- Insertar la cuenta de administrador en public.account
INSERT INTO public.account
  (id, external_id, status, email, password, created_at, updated_at, id_entity)
VALUES
  (2,
   'deadbeef-dead-beef-dead-beefdeadbeef',
   TRUE,
   'admin-observatorio@unl.edu.ec',
   '$2a$08$vcbwdzAoBjH027Yt6B9PwO3G65afLhrMfejne1EJ7uoPGuLslHLC6',
   '2025-05-18 21:00:00-05',
   '2025-05-18 21:00:00-05',
   2
);


-- Insertar la entidad en public.entity
INSERT INTO public.entity
  (id, external_id, status, picture, name, lastname, phone, role, created_at, updated_at)
VALUES
  (1,
   '1c5440e7-8e96-457b-b326-22c3a7ce4ddf',
   TRUE,
   'USUARIO_ICONO.png',
   'Hilary Madeley',
   'Calva Camacho',
   '0985928699',
   'ADMINISTRADOR',
   '2025-05-12 08:59:31.162-05',
   '2025-05-12 08:59:31.162-05'
);

-- Insertar el usuario en public.account
INSERT INTO public.account
  (id, external_id, status, email, password, created_at, updated_at, id_entity)
VALUES
  (1,
   '46189f42-59a6-47a0-9603-a97ec40b1e7b',
   TRUE,
   'hilary.calva@unl.edu.ec',
   '$2b$10$KE.BOZiMlBcP45IMkDa9qOMDZaYsUHZ5PBO5Kpz1GQ28lAGUhTqz6',
   '2025-05-12 08:59:31.169-05',
   '2025-05-12 08:59:31.169-05',
   1
);


