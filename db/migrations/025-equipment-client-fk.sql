-- 025-equipment-client-fk.sql
-- Enlaza cada equipo a un cliente real (FK a client) y elimina la columna
-- denormalizada client_description.
--
-- Justificación:
--   - Antes equipment.client_description era un VARCHAR libre sin relación real
--     con la tabla client. Se reemplaza por una FK obligatoria equipment.client_id
--     -> client.id (ON DELETE RESTRICT: no se puede borrar un cliente con equipos).
--   - El dashboard (app/api/dashboard/route.js) leía client_description para la
--     lista de próximos mantenimientos; en el mismo cambio pasa a JOIN client.
--   - service_order.client_description es OTRA columna de otra tabla; NO se toca.
-- Solo forward (no runner). Si hay dudas del estado real, no reaplicar.

-- 1) Columna FK (nullable primero para poder backfillear si existieran datos)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client(id) ON DELETE RESTRICT;

-- 2) Sembrado de equipos de ejemplo ligados a clientes reales (maestros de
--    compresores). Solo inserta si el cliente existe (clave por codclie).
INSERT INTO equipment (name, brand, model, serial, client_id, location, status, last_maintenance, next_maintenance)
SELECT
  v.name,
  v.brand,
  v.model,
  v.serial,
  c.id,
  v.location,
  v.status,
  v.last_maintenance,
  v.next_maintenance
FROM (VALUES
  ('Compresor de Aire GA55',   'Atlas Copco',   'GA55 VSD+',     'AC-2023-88412',  '30101',  'Planta principal',  'Operativo',          now() - interval '45 day', now() + interval '45 day'),
  ('Compresor GA-37',          'Atlas Copco',   'GA-37',         'AC-2024-10233',  '30164',  'Sala de compresores','Operativo',          now() - interval '20 day', now() + interval '70 day'),
  ('Compresor Industrial ROY', 'Ingersoll Rand','NIRVANA 150',   'IR-2021-55410',  '30190',  'Planta de producción','En Mantenimiento',   now() - interval '5 day',  now() + interval '25 day'),
  ('Compresor CENTAC 4',       'Ingersoll Rand','CENTAC 4',      'IR-2020-77891',  '30101',  'Planta principal',  'Operativo',          now() - interval '60 day', now() + interval '5 day'),
  ('Compresor de Tornillo',    'Sullair',       'LS-25',         'SL-2019-33220',  '30308',  'Bodega',            'Fuera de Servicio',  now() - interval '90 day', now() - interval '10 day'),
  ('Compresor GS 220',         'Atlas Copco',   'GS-220',        'AC-2022-45678',  '30236',  'Sala de compresores','Operativo',          now() - interval '15 day', now() + interval '75 day'),
  ('Compresor Pistón T30',     'Ingersoll Rand','T30',           'IR-2018-99123',  '302143', 'Taller',            'Operativo',          now() - interval '35 day', now() + interval '55 day')
) AS v(name, brand, model, serial, codclie, location, status, last_maintenance, next_maintenance)
JOIN client c ON c.codclie = v.codclie
ON CONFLICT (serial) DO NOTHING;

-- 3) El cliente es obligatorio a partir de ahora
ALTER TABLE equipment ALTER COLUMN client_id SET NOT NULL;

-- 4) Eliminar la columna denormalizada (reemplazada por la FK)
ALTER TABLE equipment DROP COLUMN IF EXISTS client_description;

-- 5) Índice para filtros por cliente
CREATE INDEX IF NOT EXISTS equipment_client_id_idx ON equipment(client_id);
