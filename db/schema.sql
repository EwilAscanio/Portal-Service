-- Esquema consolidado para instalaciones nuevas.
-- No ejecutar junto con db/migrations/001-030: este archivo reemplaza esa cadena.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE role (id SMALLSERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), login VARCHAR(60) NOT NULL, name VARCHAR(120) NOT NULL, email VARCHAR(160) NOT NULL, password_hash TEXT NOT NULL, role_id SMALLINT NOT NULL REFERENCES role(id), status VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')), last_access_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX users_login_unique ON users(lower(login));
CREATE UNIQUE INDEX users_email_unique ON users(lower(email));

CREATE TABLE country (id SERIAL PRIMARY KEY, cod_saint INT UNIQUE NOT NULL, name VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE state (id SERIAL PRIMARY KEY, cod_saint INT UNIQUE NOT NULL, name VARCHAR(100) NOT NULL, country_id INT REFERENCES country(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE city (id SERIAL PRIMARY KEY, cod_saint INT UNIQUE NOT NULL, name VARCHAR(100) NOT NULL, state_id INT REFERENCES state(id), country_id INT REFERENCES country(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE client (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), codclie VARCHAR(20) NOT NULL UNIQUE, description VARCHAR(255), rif VARCHAR(30), address1 VARCHAR(255), address2 VARCHAR(255), status VARCHAR(5) NOT NULL DEFAULT '1' CHECK (status IN ('0','1')), country VARCHAR(100), state VARCHAR(100), phone VARCHAR(30), email VARCHAR(150), mobile VARCHAR(30), source_system VARCHAR(30) NOT NULL DEFAULT 'Saint', last_synced_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE integration_sync_run (id BIGSERIAL PRIMARY KEY, source_system VARCHAR(30) NOT NULL, entity_name VARCHAR(50) NOT NULL, status VARCHAR(20) NOT NULL CHECK (status IN ('Running','Completed','Failed')), started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ, received_count INTEGER NOT NULL DEFAULT 0 CHECK (received_count >= 0), inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (inserted_count >= 0), updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0), activated_count INTEGER NOT NULL DEFAULT 0 CHECK (activated_count >= 0), deactivated_count INTEGER NOT NULL DEFAULT 0 CHECK (deactivated_count >= 0), error_message TEXT);
CREATE TABLE plant (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, code VARCHAR(50) NOT NULL, address VARCHAR(255), client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(client_id,name), CONSTRAINT plant_id_client_unique UNIQUE(id,client_id));
CREATE TABLE contact (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(150) NOT NULL, department VARCHAR(150), client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT, plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE RESTRICT, phone VARCHAR(30), email VARCHAR(150) CHECK (email IS NULL OR position('@' in email) > 1), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT contact_id_client_plant_unique UNIQUE(id,client_id,plant_id), CONSTRAINT contact_plant_client_fk FOREIGN KEY(plant_id,client_id) REFERENCES plant(id,client_id) ON DELETE RESTRICT);
CREATE TABLE product (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(30) NOT NULL UNIQUE, description VARCHAR(255) NOT NULL, brand VARCHAR(100), cost NUMERIC(14,2) NOT NULL CHECK (cost >= 0), price NUMERIC(14,2) NOT NULL CHECK (price >= 0), category VARCHAR(50) NOT NULL CONSTRAINT product_category_check CHECK (category IN ('Servicio','Repuestos')), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), status VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), serial VARCHAR(50), modelo VARCHAR(100));
CREATE TABLE equipment (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, brand VARCHAR(100) NOT NULL, model VARCHAR(100) NOT NULL, serial VARCHAR(50) NOT NULL UNIQUE, location VARCHAR(200), status VARCHAR(30) NOT NULL DEFAULT 'Operativo' CHECK (status IN ('Operativo','En Mantenimiento','Fuera de Servicio','Mudado','Desechado','Validar')), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT, plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE RESTRICT, consortium VARCHAR(150), hp NUMERIC(10,2) CHECK (hp IS NULL OR hp >= 0), pressure NUMERIC(10,2) CHECK (pressure IS NULL OR pressure >= 0), CONSTRAINT equipment_id_client_plant_unique UNIQUE(id,client_id,plant_id), CONSTRAINT equipment_plant_client_fk FOREIGN KEY(plant_id,client_id) REFERENCES plant(id,client_id) ON DELETE RESTRICT);
CREATE TABLE technical (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cedula VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, phone VARCHAR(30), email VARCHAR(150), status VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')), user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX technical_user_id_uidx ON technical(user_id) WHERE user_id IS NOT NULL;
CREATE TABLE configuration (id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), company_name VARCHAR(200) NOT NULL DEFAULT 'Maquitech S.A.S.', rif VARCHAR(30), phone VARCHAR(30), email VARCHAR(150), address VARCHAR(255), website VARCHAR(150), city VARCHAR(100), country VARCHAR(100), logo VARCHAR(255) NOT NULL DEFAULT '/logo.webp', facebook VARCHAR(150), instagram VARCHAR(150), linkedin VARCHAR(150), exchange_rate NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (exchange_rate >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE SEQUENCE service_order_number_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE service_order (id SERIAL PRIMARY KEY, order_code VARCHAR(20) NOT NULL UNIQUE DEFAULT ('OS-' || lpad(nextval('service_order_number_seq')::text, 6, '0')), purchase_order_number VARCHAR(50), quotation_number VARCHAR(50), client_description VARCHAR(200) NOT NULL, equipment_name VARCHAR(200) NOT NULL, type VARCHAR(60) NOT NULL, work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('Internal','External')), service_type VARCHAR(30) NOT NULL CHECK (service_type IN ('Inspection','Maintenance','Emergency','Other')), call_date TIMESTAMPTZ NOT NULL, scheduled_start TIMESTAMPTZ NOT NULL, scheduled_end TIMESTAMPTZ NOT NULL, worked_hours NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (worked_hours >= 0), work_description TEXT NOT NULL, technician_name VARCHAR(120) NOT NULL, priority VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (priority IN ('Alta','Media','Baja')), status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','Aprobada','En Proceso','Completada','Cancelada')), scheduled_date TIMESTAMPTZ, amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0), client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT, plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE RESTRICT, equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT, technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT, contact_id UUID NOT NULL REFERENCES contact(id) ON DELETE RESTRICT, prepared_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, approved_by UUID REFERENCES users(id) ON DELETE RESTRICT, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT service_order_schedule_check CHECK (scheduled_end >= scheduled_start), CONSTRAINT service_order_approval_audit_check CHECK ((approved_by IS NULL AND approved_at IS NULL) OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)), CONSTRAINT service_order_plant_client_fk FOREIGN KEY(plant_id,client_id) REFERENCES plant(id,client_id) ON DELETE RESTRICT, CONSTRAINT service_order_equipment_scope_fk FOREIGN KEY(equipment_id,client_id,plant_id) REFERENCES equipment(id,client_id,plant_id) ON DELETE RESTRICT, CONSTRAINT service_order_contact_scope_fk FOREIGN KEY(contact_id,client_id,plant_id) REFERENCES contact(id,client_id,plant_id) ON DELETE RESTRICT);
ALTER SEQUENCE service_order_number_seq OWNED BY service_order.order_code;
CREATE TABLE service_order_technician (service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE, technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT, is_lead BOOLEAN NOT NULL DEFAULT false, assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(service_order_id,technical_id));
CREATE UNIQUE INDEX service_order_one_lead_technician_idx ON service_order_technician(service_order_id) WHERE is_lead;
CREATE INDEX service_order_technician_technical_id_idx ON service_order_technician(technical_id);
CREATE INDEX service_order_calendar_range_idx ON service_order(scheduled_start,scheduled_end) WHERE approved_at IS NOT NULL AND status <> 'Cancelada';
CREATE INDEX service_order_calendar_status_idx ON service_order(status,service_type,priority) WHERE approved_at IS NOT NULL;
CREATE OR REPLACE FUNCTION enforce_service_order_technician_limit() RETURNS TRIGGER AS $$ BEGIN IF (SELECT COUNT(*) FROM service_order_technician WHERE service_order_id = NEW.service_order_id) >= 3 THEN RAISE EXCEPTION 'Una orden de servicio admite un maximo de 3 tecnicos' USING ERRCODE = '23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER service_order_technician_limit BEFORE INSERT ON service_order_technician FOR EACH ROW EXECUTE FUNCTION enforce_service_order_technician_limit();
CREATE TABLE notification (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(30) NOT NULL, title VARCHAR(200) NOT NULL, description TEXT, read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE par_header (id SERIAL PRIMARY KEY, par_number VARCHAR(20) NOT NULL UNIQUE, client_id UUID NOT NULL REFERENCES client(id), plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE RESTRICT, contact_id UUID NOT NULL REFERENCES contact(id) ON DELETE RESTRICT, status VARCHAR(20) NOT NULL DEFAULT 'Creado' CHECK (status IN ('Creado','Aprobado','En Servicio','Finalizado','Rechazado')), exchange_rate NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (exchange_rate >= 0), fecha_emision DATE, observations TEXT, elaborado_por VARCHAR(120), total_usd NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_usd >= 0), total_bs NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_bs >= 0), created_by UUID NOT NULL REFERENCES users(id), approved_by UUID REFERENCES users(id), approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT par_header_order_scope_unique UNIQUE(id,client_id,plant_id,contact_id), CONSTRAINT par_header_plant_client_fk FOREIGN KEY(plant_id,client_id) REFERENCES plant(id,client_id) ON DELETE RESTRICT, CONSTRAINT par_header_contact_scope_fk FOREIGN KEY(contact_id,client_id,plant_id) REFERENCES contact(id,client_id,plant_id) ON DELETE RESTRICT);
CREATE TABLE par_equipment (id SERIAL PRIMARY KEY, par_id INTEGER NOT NULL REFERENCES par_header(id) ON DELETE CASCADE, item_no INTEGER NOT NULL DEFAULT 1 CHECK (item_no > 0), is_main BOOLEAN NOT NULL DEFAULT false, equipment_id UUID REFERENCES equipment(id), tipo VARCHAR(120), marca VARCHAR(100), serial VARCHAR(50), modelo VARCHAR(100), observaciones TEXT NOT NULL CHECK (NULLIF(trim(observaciones),'') IS NOT NULL), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT par_equipment_order_scope_unique UNIQUE(par_id,equipment_id));
CREATE TABLE par_item (id SERIAL PRIMARY KEY, par_id INTEGER NOT NULL REFERENCES par_header(id) ON DELETE CASCADE, item_no INTEGER NOT NULL DEFAULT 1 CHECK (item_no > 0), product_id UUID REFERENCES product(id), descripcion VARCHAR(255) NOT NULL, qty NUMERIC(10,2) CHECK (qty >= 0), categoria VARCHAR(50) NOT NULL DEFAULT 'Servicio' CONSTRAINT par_item_category_check CHECK (categoria IN ('Servicio','Repuestos')), ccn VARCHAR(30), us_list VARCHAR(30), multiplicador NUMERIC(8,4) NOT NULL DEFAULT 1 CHECK (multiplicador >= 0), valor_unit_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unit_usd >= 0), valor_percent NUMERIC(8,4) CHECK (valor_percent >= 0), line_total_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total_usd >= 0), observations TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE par_template (id SERIAL PRIMARY KEY, type VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE par_template_item (id SERIAL PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES par_template(id) ON DELETE CASCADE, item_no INTEGER NOT NULL DEFAULT 1 CHECK (item_no > 0), product_id UUID REFERENCES product(id) ON DELETE SET NULL, descripcion VARCHAR(255) NOT NULL, qty NUMERIC(10,2) CHECK (qty >= 0), categoria VARCHAR(50) NOT NULL DEFAULT 'Servicio' CONSTRAINT par_template_item_category_check CHECK (categoria IN ('Servicio','Repuestos')), ccn VARCHAR(30), us_list VARCHAR(30), multiplicador NUMERIC(8,4) NOT NULL DEFAULT 1 CHECK (multiplicador >= 0), valor_unit_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unit_usd >= 0), valor_percent NUMERIC(8,4) CHECK (valor_percent >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE service_order ADD COLUMN par_id INTEGER NOT NULL REFERENCES par_header(id) ON DELETE RESTRICT;
ALTER TABLE service_order ADD CONSTRAINT service_order_par_scope_fk FOREIGN KEY(par_id,client_id,plant_id,contact_id) REFERENCES par_header(id,client_id,plant_id,contact_id) ON DELETE RESTRICT;
ALTER TABLE service_order ADD CONSTRAINT service_order_par_equipment_fk FOREIGN KEY(par_id,equipment_id) REFERENCES par_equipment(par_id,equipment_id) ON DELETE RESTRICT;
CREATE SEQUENCE par_number_seq START WITH 1;
CREATE UNIQUE INDEX par_equipment_one_main_idx ON par_equipment(par_id) WHERE is_main;
CREATE UNIQUE INDEX par_item_par_item_no_uidx ON par_item(par_id,item_no);
CREATE INDEX par_header_approved_by_idx ON par_header(approved_by);
CREATE INDEX par_item_product_id_idx ON par_item(product_id);
CREATE INDEX par_equipment_equipment_id_idx ON par_equipment(equipment_id);
CREATE INDEX par_template_item_product_id_idx ON par_template_item(product_id);
CREATE INDEX service_order_par_id_idx ON service_order(par_id);
CREATE INDEX equipment_client_id_idx ON equipment(client_id);
CREATE INDEX plant_client_id_idx ON plant(client_id);
CREATE UNIQUE INDEX plant_client_code_uidx ON plant(client_id, code);
CREATE INDEX contact_client_id_idx ON contact(client_id);
CREATE INDEX contact_plant_id_idx ON contact(plant_id);
CREATE INDEX equipment_plant_id_idx ON equipment(plant_id);
CREATE INDEX par_header_plant_id_idx ON par_header(plant_id);
CREATE INDEX par_header_contact_id_idx ON par_header(contact_id);
CREATE INDEX service_order_client_id_idx ON service_order(client_id);
CREATE INDEX service_order_plant_id_idx ON service_order(plant_id);
CREATE INDEX service_order_equipment_id_idx ON service_order(equipment_id);
CREATE INDEX service_order_technical_id_idx ON service_order(technical_id);
CREATE INDEX service_order_contact_id_idx ON service_order(contact_id);
CREATE TABLE data_import_batch (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), original_file_name VARCHAR(255) NOT NULL, file_hash VARCHAR(64) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'Validado' CHECK (status IN ('Validado','Importando','Completado','Fallido')), total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0), create_count INTEGER NOT NULL DEFAULT 0 CHECK (create_count >= 0), update_count INTEGER NOT NULL DEFAULT 0 CHECK (update_count >= 0), error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0), warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0), created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, failure_message TEXT);
CREATE TABLE data_import_row (id BIGSERIAL PRIMARY KEY, batch_id UUID NOT NULL REFERENCES data_import_batch(id) ON DELETE CASCADE, sheet_name VARCHAR(50) NOT NULL, row_number INTEGER NOT NULL CHECK (row_number >= 2), entity_name VARCHAR(30) NOT NULL, operation VARCHAR(20) NOT NULL CHECK (operation IN ('Crear','Actualizar','Error')), status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente','Error','Completado')), payload JSONB NOT NULL, errors JSONB NOT NULL DEFAULT '[]'::jsonb, warnings JSONB NOT NULL DEFAULT '[]'::jsonb, target_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(batch_id,sheet_name,row_number));
CREATE INDEX data_import_batch_created_at_idx ON data_import_batch(created_at DESC);
CREATE INDEX data_import_row_batch_id_idx ON data_import_row(batch_id);
CREATE TABLE schema_migrations (version VARCHAR(50) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now(), checksum TEXT);
INSERT INTO role(name, description) VALUES
  ('Superadministrador', 'Acceso funcional completo al sistema'),
  ('Administrador', 'Acceso total al sistema'),
  ('Supervisor', 'Supervisión operativa'),
  ('Coordinador', 'Coordinación de operaciones'),
  ('Técnico', 'Ejecución de servicios'),
  ('Usuario', 'Consulta básica')
ON CONFLICT (name) DO NOTHING;
INSERT INTO schema_migrations(version, checksum) VALUES ('schema-consolidated', 'schema-consolidated-v1');

-- Triggers de actualizacion automatica de updated_at (paridad con la BD migrada).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_technical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS technical_updated_at ON technical;
CREATE TRIGGER technical_updated_at
  BEFORE UPDATE ON technical
  FOR EACH ROW EXECUTE FUNCTION set_technical_updated_at();

CREATE OR REPLACE FUNCTION set_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_updated_at ON product;
CREATE TRIGGER product_updated_at
  BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION set_product_updated_at();

CREATE OR REPLACE FUNCTION set_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_updated_at ON client;
CREATE TRIGGER client_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW EXECUTE FUNCTION set_client_updated_at();

CREATE OR REPLACE FUNCTION set_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_country_updated ON country;
CREATE TRIGGER trg_country_updated
  BEFORE UPDATE ON country
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

DROP TRIGGER IF EXISTS trg_state_updated ON state;
CREATE TRIGGER trg_state_updated
  BEFORE UPDATE ON state
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

DROP TRIGGER IF EXISTS trg_city_updated ON city;
CREATE TRIGGER trg_city_updated
  BEFORE UPDATE ON city
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

CREATE OR REPLACE FUNCTION set_service_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_order_updated_at ON service_order;
CREATE TRIGGER trg_service_order_updated_at
  BEFORE UPDATE ON service_order
  FOR EACH ROW EXECUTE FUNCTION set_service_order_updated_at();

CREATE OR REPLACE FUNCTION set_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_updated_at ON equipment;
CREATE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION set_equipment_updated_at();

CREATE OR REPLACE FUNCTION set_par_header_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_par_header_updated_at ON par_header;
CREATE TRIGGER trg_par_header_updated_at
  BEFORE UPDATE ON par_header
  FOR EACH ROW EXECUTE FUNCTION set_par_header_updated_at();

CREATE OR REPLACE FUNCTION set_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plant_updated_at ON plant;
CREATE TRIGGER plant_updated_at
  BEFORE UPDATE ON plant
  FOR EACH ROW EXECUTE FUNCTION set_catalog_updated_at();

DROP TRIGGER IF EXISTS contact_updated_at ON contact;
CREATE TRIGGER contact_updated_at
  BEFORE UPDATE ON contact
  FOR EACH ROW EXECUTE FUNCTION set_catalog_updated_at();

CREATE OR REPLACE FUNCTION set_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_configuration_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La configuración de la empresa no puede eliminarse.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS configuration_updated_at ON configuration;
CREATE TRIGGER configuration_updated_at
  BEFORE UPDATE ON configuration
  FOR EACH ROW EXECUTE FUNCTION set_configuration_updated_at();

DROP TRIGGER IF EXISTS configuration_no_delete ON configuration;
CREATE TRIGGER configuration_no_delete
  BEFORE DELETE ON configuration
  FOR EACH ROW EXECUTE FUNCTION prevent_configuration_delete();

-- Horas de mano de obra (migraci?n 051).
-- Horas cotizadas: qty es el presupuesto compartido, sin multiplicador comercial.
ALTER TABLE product ADD COLUMN requires_technician BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE product ADD CONSTRAINT product_labor_category_check CHECK (NOT requires_technician OR category = 'Servicio');

-- Clasificación inicial por códigos conocidos del catálogo, nunca por coincidencias de texto.
UPDATE product SET requires_technician = true
WHERE category = 'Servicio' AND code IN (
  'ESP001','MOB-001','SRV-AYUDANTES','SRV-CENTAC','SRV-INSTRUM',
  'SRV-TEC-123','SRV-TEC-123-AD','SRV-TSU-SEG',
  'TEC010','TEC011','TEC012','TEC013','TSU001'
);

ALTER TABLE par_item ADD COLUMN requires_technician BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE par_item ADD CONSTRAINT par_item_labor_category_check CHECK (NOT requires_technician OR categoria = 'Servicio');
UPDATE par_item i SET requires_technician = p.requires_technician
FROM product p WHERE p.id = i.product_id AND i.categoria = 'Servicio';
ALTER TABLE par_header ADD COLUMN budgeted_hours NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budgeted_hours >= 0);
UPDATE par_header h SET budgeted_hours = COALESCE((
  SELECT SUM(i.qty) FROM par_item i WHERE i.par_id = h.id AND i.requires_technician
), 0);

-- No se inventan distribuciones a partir de worked_hours de órdenes anteriores.
ALTER TABLE service_order
  ADD COLUMN labor_review_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN legacy_worked_hours NUMERIC(8,2),
  ADD COLUMN labor_review_note TEXT,
  ADD COLUMN labor_reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN labor_reviewed_at TIMESTAMPTZ;
UPDATE service_order SET legacy_worked_hours = worked_hours;

CREATE TABLE service_order_labor_allocation (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  par_item_id INTEGER REFERENCES par_item(id) ON DELETE SET NULL,
  source_item_id INTEGER NOT NULL,
  source_item_no INTEGER NOT NULL,
  product_id UUID REFERENCES product(id) ON DELETE RESTRICT,
  product_code VARCHAR(30),
  description VARCHAR(255) NOT NULL,
  technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT,
  technician_name VARCHAR(120) NOT NULL,
  hours NUMERIC(10,2) NOT NULL CHECK (hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_order_id, source_item_id, technical_id)
);
-- Las copias de código, descripción, técnico e ID original sobreviven a la edición
-- del PAR cuando todas sus órdenes están canceladas. El FK vivo puede quedar nulo.
CREATE INDEX service_order_labor_item_idx ON service_order_labor_allocation(par_item_id) WHERE par_item_id IS NOT NULL;
CREATE INDEX service_order_labor_technical_idx ON service_order_labor_allocation(technical_id);
CREATE INDEX service_order_labor_review_idx ON service_order(par_id) WHERE labor_review_required AND status <> 'Cancelada';


-- 052-service-order-closure
-- La programación permanece intacta; el cierre registra ejecución y expediente.
ALTER TABLE service_order
  ADD COLUMN equipment_scope_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN closure_legacy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN closure_revision INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN actual_hours NUMERIC(8,2) CHECK (actual_hours >= 0),
  ADD COLUMN closure_notes TEXT,
  ADD COLUMN excess_reason TEXT,
  ADD COLUMN closed_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  ADD COLUMN closed_at TIMESTAMPTZ,
  ADD CONSTRAINT service_order_closure_stamp_check CHECK ((closed_by IS NULL) = (closed_at IS NULL));
UPDATE service_order SET closure_legacy = true WHERE status = 'Completada';
UPDATE service_order SET equipment_scope_confirmed = true WHERE status IN ('Completada', 'Cancelada');
ALTER TABLE service_order ADD CONSTRAINT service_order_closure_state_check CHECK (
  (status <> 'Completada' OR closure_legacy OR closed_at IS NOT NULL)
  AND (closed_at IS NULL OR (status = 'Completada' AND actual_hours IS NOT NULL AND NOT closure_legacy AND equipment_scope_confirmed))
);

ALTER TABLE service_order_labor_allocation
  ADD COLUMN actual_hours NUMERIC(10,2) CHECK (actual_hours >= 0 AND actual_hours <= 999999.99),
  ADD COLUMN actual_note TEXT;

CREATE TABLE service_order_equipment (
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT, brand TEXT, model TEXT, serial TEXT, description TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (service_order_id, equipment_id)
);
CREATE INDEX service_order_equipment_catalog_idx ON service_order_equipment(equipment_id);
-- Es la representación anterior, no una confirmación de los equipos atendidos.
INSERT INTO service_order_equipment
  (service_order_id, equipment_id, position, name, type, brand, model, serial, description, is_main)
SELECT so.id, pe.equipment_id, pe.item_no, COALESCE(e.name, pe.tipo, 'Equipo'),
       pe.tipo, pe.marca, pe.modelo, COALESCE(e.serial, pe.serial), pe.observaciones, pe.is_main
FROM service_order so JOIN par_equipment pe ON pe.par_id = so.par_id
JOIN equipment e ON e.id = pe.equipment_id;

CREATE TABLE service_order_closure_requirement (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL,
  equipment_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service_report','work_checklist','pre_verification','post_verification')),
  not_applicable BOOLEAN NOT NULL DEFAULT false,
  justification TEXT,
  updated_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (service_order_id, equipment_id) REFERENCES service_order_equipment(service_order_id, equipment_id) ON DELETE CASCADE,
  UNIQUE (service_order_id, equipment_id, category),
  CHECK (NOT not_applicable OR COALESCE(length(trim(justification)), 0) >= 5)
);
INSERT INTO service_order_closure_requirement(service_order_id, equipment_id, category)
SELECT e.service_order_id, e.equipment_id, c.category FROM service_order_equipment e
CROSS JOIN (VALUES ('service_report'),('work_checklist'),('pre_verification'),('post_verification')) AS c(category)
JOIN service_order so ON so.id = e.service_order_id AND NOT so.closure_legacy;

CREATE TABLE service_order_closure_file (
  id UUID PRIMARY KEY,
  requirement_id BIGINT NOT NULL REFERENCES service_order_closure_requirement(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 CHAR(64) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  CHECK ((retired_by IS NULL) = (retired_at IS NULL))
);
CREATE INDEX service_order_closure_file_requirement_idx ON service_order_closure_file(requirement_id);

CREATE TABLE service_order_closure_event (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_order_closure_event_order_idx ON service_order_closure_event(service_order_id, id);
CREATE INDEX service_order_closure_event_actor_idx ON service_order_closure_event(actor_id);
