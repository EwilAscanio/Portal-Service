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
CREATE OR REPLACE FUNCTION enforce_service_order_technician_limit() RETURNS TRIGGER AS $$ BEGIN IF (SELECT COUNT(*) FROM service_order_technician WHERE service_order_id = NEW.service_order_id) >= 4 THEN RAISE EXCEPTION 'Una orden de servicio admite un maximo de 4 tecnicos' USING ERRCODE = '23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
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

-- 053: descuento general del PAR; la base nueva inicia sin importes históricos.
ALTER TABLE par_header
  ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CONSTRAINT par_header_discount_percent_check CHECK (discount_percent BETWEEN 0 AND 100),
  ADD COLUMN subtotal_usd NUMERIC(14,2) NOT NULL DEFAULT 0
    CONSTRAINT par_header_subtotal_check CHECK (subtotal_usd >= 0),
  ADD COLUMN discount_amount_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT par_header_discount_amount_check
    CHECK (discount_amount_usd >= 0 AND discount_amount_usd <= subtotal_usd),
  ADD CONSTRAINT par_header_discount_total_check
    CHECK (total_usd = subtotal_usd - discount_amount_usd);
COMMENT ON COLUMN par_header.discount_percent IS 'Porcentaje de descuento general, 0 a 100; editable con los permisos del PAR.';
COMMENT ON COLUMN par_header.subtotal_usd IS 'Suma de importes de renglones antes del descuento general.';
COMMENT ON COLUMN par_header.discount_amount_usd IS 'Monto USD calculado: subtotal por porcentaje, redondeado a dos decimales.';

-- Vacaciones por días completos y reprogramación auditada de O/S antes de iniciar.
-- No modifica estados, técnicos, horas ni aprobaciones de documentos existentes.


CREATE TABLE technical_vacation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  CHECK (start_date >= DATE '1900-01-01' AND end_date <= DATE '9998-12-31' AND end_date >= start_date),
  CHECK ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
    OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) >= 5))
);
CREATE INDEX technical_vacation_period_idx ON technical_vacation(technical_id,start_date,end_date) WHERE cancelled_at IS NULL;
CREATE TABLE technical_vacation_event (
  id BIGSERIAL PRIMARY KEY,
  vacation_id UUID NOT NULL REFERENCES technical_vacation(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('Registradas','Modificadas','Canceladas')),
  reason TEXT,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX technical_vacation_event_vacation_idx ON technical_vacation_event(vacation_id,id);

ALTER TABLE service_order ADD COLUMN schedule_revision INTEGER NOT NULL DEFAULT 0 CHECK (schedule_revision >= 0);
CREATE TABLE service_order_schedule_event (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('Reprogramada','Aprobada')),
  reason TEXT,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_order_schedule_event_order_idx ON service_order_schedule_event(service_order_id,id);

-- 056-service-order-photos-pending

CREATE TABLE service_order_photo (
  id UUID PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  storage_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  CHECK ((retired_at IS NULL AND retired_by IS NULL AND retirement_reason IS NULL)
    OR (retired_at IS NOT NULL AND retired_by IS NOT NULL AND length(trim(retirement_reason)) >= 5))
);
-- Cinco posiciones vigentes: el límite también se cumple ante escrituras concurrentes.
CREATE UNIQUE INDEX service_order_photo_slot_idx ON service_order_photo(service_order_id,slot) WHERE retired_at IS NULL;
CREATE INDEX service_order_photo_order_idx ON service_order_photo(service_order_id);

ALTER TABLE service_order ADD CONSTRAINT service_order_pending_scope_unique UNIQUE(id,par_id,client_id,plant_id);
CREATE TABLE service_pending_item (
  id UUID PRIMARY KEY,
  service_order_id INTEGER NOT NULL,
  par_id INTEGER NOT NULL,
  client_id UUID NOT NULL,
  plant_id UUID NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
  position INTEGER NOT NULL CHECK (position >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (status IN ('Borrador','Pendiente','Completado')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  retired_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  client_code VARCHAR(20), client_name TEXT, plant_code VARCHAR(50), plant_name TEXT,
  order_code VARCHAR(20), par_number VARCHAR(20),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  resolution TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  FOREIGN KEY(service_order_id,par_id,client_id,plant_id) REFERENCES service_order(id,par_id,client_id,plant_id) ON DELETE RESTRICT,
  CHECK ((retired_at IS NULL) = (retired_by IS NULL)),
  CHECK ((status='Borrador' AND published_at IS NULL AND published_by IS NULL)
    OR (status IN ('Pendiente','Completado') AND published_at IS NOT NULL AND published_by IS NOT NULL
      AND retired_at IS NULL AND client_code IS NOT NULL AND plant_name IS NOT NULL AND order_code IS NOT NULL)),
  CHECK ((status='Completado' AND completed_at IS NOT NULL AND completed_by IS NOT NULL AND resolution IS NOT NULL AND length(trim(resolution)) BETWEEN 5 AND 2000)
    OR (status<>'Completado' AND completed_at IS NULL AND completed_by IS NULL AND resolution IS NULL))
);
CREATE INDEX service_pending_order_idx ON service_pending_item(service_order_id);
CREATE INDEX service_pending_open_idx ON service_pending_item(published_at,id) WHERE status='Pendiente';
CREATE INDEX service_pending_scope_idx ON service_pending_item(client_id,plant_id,status) WHERE published_at IS NOT NULL;

CREATE TABLE service_pending_event (
  id BIGSERIAL PRIMARY KEY,
  pending_id UUID NOT NULL REFERENCES service_pending_item(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('Publicado','Completado')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_pending_event_item_idx ON service_pending_event(pending_id,id);

-- Resolver el seguimiento no reescribe lo que se reportó en el expediente cerrado.
CREATE FUNCTION preserve_published_pending() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Un pendiente publicado conserva su historial' USING ERRCODE='23514'; END IF;
    IF (to_jsonb(NEW) - ARRAY['status','completed_at','completed_by','resolution','revision','updated_at','updated_by'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','completed_at','completed_by','resolution','revision','updated_at','updated_by'])
       OR OLD.status='Completado' OR NEW.status<>'Completado' THEN
      RAISE EXCEPTION 'El origen publicado es inmutable y solo admite completar el seguimiento' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER preserve_published_pending_trigger BEFORE UPDATE OR DELETE ON service_pending_item
FOR EACH ROW EXECUTE FUNCTION preserve_published_pending();

-- 057-service-order-warranty
-- Garantías independientes del presupuesto comercial; no reconstruye servicios históricos.
ALTER TABLE par_header ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'Comercial'
  CHECK (purpose IN ('Comercial','ReferenciaGarantia'));
ALTER TABLE par_header ADD CONSTRAINT par_reference_zero_check CHECK
  (purpose <> 'ReferenciaGarantia' OR (budgeted_hours=0 AND subtotal_usd=0 AND discount_percent=0
    AND discount_amount_usd=0 AND total_usd=0 AND total_bs=0));

CREATE FUNCTION preserve_par_purpose() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.purpose IS DISTINCT FROM OLD.purpose THEN RAISE EXCEPTION 'La finalidad del PAR no se puede convertir' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_par_purpose_trigger BEFORE UPDATE OF purpose ON par_header
  FOR EACH ROW EXECUTE FUNCTION preserve_par_purpose();

-- Los renglones de referencia identifican productos, no ventas ni presupuestos inventados.
CREATE FUNCTION normalize_reference_par_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM par_header WHERE id=NEW.par_id AND purpose='ReferenciaGarantia') THEN
    NEW.qty:=0; NEW.valor_unit_usd:=0; NEW.valor_percent:=0; NEW.line_total_usd:=0; NEW.multiplicador:=1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER normalize_reference_par_item_trigger BEFORE INSERT OR UPDATE ON par_item
  FOR EACH ROW EXECUTE FUNCTION normalize_reference_par_item();

ALTER TABLE service_order
  ADD COLUMN order_kind VARCHAR(15) NOT NULL DEFAULT 'Normal' CHECK (order_kind IN ('Normal','Garantia')),
  ADD COLUMN warranty_origin VARCHAR(15) CHECK (warranty_origin IN ('Registered','External')),
  ADD COLUMN warranty_origin_order_id INTEGER REFERENCES service_order(id) ON DELETE RESTRICT,
  ADD COLUMN warranty_reference VARCHAR(500),
  ADD COLUMN warranty_service_date DATE,
  ADD COLUMN warranty_reason TEXT,
  ADD CONSTRAINT service_order_warranty_check CHECK (
    (order_kind='Normal' AND warranty_origin IS NULL AND warranty_origin_order_id IS NULL
      AND warranty_reference IS NULL AND warranty_service_date IS NULL AND warranty_reason IS NULL)
    OR (order_kind='Garantia' AND warranty_origin IS NOT NULL AND warranty_reason IS NOT NULL
      AND length(trim(warranty_reason)) BETWEEN 5 AND 2000
      AND ((warranty_origin='Registered' AND warranty_origin_order_id IS NOT NULL AND warranty_origin_order_id<>id
          AND warranty_reference IS NULL AND warranty_service_date IS NULL)
        OR (warranty_origin='External' AND warranty_origin_order_id IS NULL AND warranty_reference IS NOT NULL
          AND length(trim(warranty_reference)) BETWEEN 5 AND 500))));

CREATE FUNCTION validate_service_order_warranty() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.order_kind,NEW.warranty_origin,NEW.warranty_origin_order_id,NEW.warranty_reference,NEW.warranty_service_date)
      IS DISTINCT FROM (OLD.order_kind,OLD.warranty_origin,OLD.warranty_origin_order_id,OLD.warranty_reference,OLD.warranty_service_date) THEN
    RAISE EXCEPTION 'El origen de la garantía no se puede cambiar' USING ERRCODE='23514';
  END IF;
  IF NEW.order_kind='Normal' AND EXISTS (SELECT 1 FROM par_header WHERE id=NEW.par_id AND purpose='ReferenciaGarantia') THEN
    RAISE EXCEPTION 'Un PAR de referencia solo admite garantías' USING ERRCODE='23514';
  END IF;
  IF NEW.warranty_origin='Registered' AND NOT EXISTS (
    SELECT 1 FROM service_order o WHERE o.id=NEW.warranty_origin_order_id AND o.status='Completada'
      AND o.par_id=NEW.par_id AND o.client_id=NEW.client_id AND o.plant_id=NEW.plant_id) THEN
    RAISE EXCEPTION 'La garantía requiere una O/S completada del mismo PAR y ámbito' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_service_order_warranty_trigger BEFORE INSERT OR UPDATE ON service_order
  FOR EACH ROW EXECUTE FUNCTION validate_service_order_warranty();
CREATE INDEX service_order_warranty_origin_idx ON service_order(warranty_origin_order_id) WHERE warranty_origin_order_id IS NOT NULL;
CREATE INDEX service_order_kind_par_idx ON service_order(par_id,order_kind,status);

CREATE FUNCTION validate_warranty_equipment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origin_id INTEGER;
BEGIN
  SELECT warranty_origin_order_id INTO origin_id FROM service_order WHERE id=NEW.service_order_id;
  IF origin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_order_equipment WHERE service_order_id=origin_id AND equipment_id=NEW.equipment_id) THEN
    RAISE EXCEPTION 'El equipo debe pertenecer a la O/S de origen' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_warranty_equipment_trigger BEFORE INSERT OR UPDATE ON service_order_equipment
  FOR EACH ROW EXECUTE FUNCTION validate_warranty_equipment();

-- 058-technician-unavailability
-- Generaliza vacaciones sin reemplazar filas ni reescribir snapshots de auditoría.
SET LOCAL lock_timeout = '10s';

ALTER TABLE technical_vacation RENAME TO technical_unavailability;
ALTER TABLE technical_vacation_event RENAME TO technical_unavailability_event;
ALTER TABLE technical_unavailability_event RENAME COLUMN vacation_id TO unavailability_id;

-- El valor inicial clasifica todos los períodos existentes, incluidos los cancelados.
-- Las nuevas escrituras deben indicar explícitamente el motivo.
ALTER TABLE technical_unavailability ADD COLUMN reason_type VARCHAR(24) NOT NULL DEFAULT 'Vacaciones';
ALTER TABLE technical_unavailability ALTER COLUMN reason_type DROP DEFAULT;
ALTER TABLE technical_unavailability ADD CONSTRAINT technical_unavailability_reason_type_check
  CHECK (reason_type IN ('Vacaciones','DiasCompensatorios','Enfermedad','Permisos','Otros'));
ALTER TABLE technical_unavailability ADD CONSTRAINT technical_unavailability_other_note_check
  CHECK (reason_type <> 'Otros' OR (note IS NOT NULL AND length(trim(note)) >= 5));

-- Renombrar también las restricciones mantiene legible el catálogo físico.
-- PostgreSQL conserva las referencias por OID y renombra los índices de las PK.
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN
    SELECT conrelid::regclass AS relation, conname FROM pg_constraint
    WHERE conrelid IN ('technical_unavailability'::regclass,'technical_unavailability_event'::regclass)
      AND conname LIKE '%vacation%'
  LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', item.relation,
      item.conname, replace(item.conname,'vacation','unavailability'));
  END LOOP;
END $$;
ALTER INDEX technical_vacation_period_idx RENAME TO technical_unavailability_period_idx;
ALTER INDEX technical_vacation_event_vacation_idx RENAME TO technical_unavailability_event_unavailability_idx;
ALTER SEQUENCE technical_vacation_event_id_seq RENAME TO technical_unavailability_event_id_seq;

COMMENT ON TABLE technical_unavailability IS 'Períodos de no disponibilidad por días completos inclusivos, interpretados en America/Caracas; independiente del estado Activo/Inactivo.';
COMMENT ON COLUMN technical_unavailability.reason_type IS 'Categoría administrativa restringida; calendarios y selectores públicos exponen solo fechas y bloqueo.';
COMMENT ON TABLE technical_unavailability_event IS 'Historial conservado. Snapshots anteriores a 058 no incluyen reason_type y representan Vacaciones; no reescribirlos.';

-- 059-vendor
-- Catálogo Saint de solo lectura. No referencia PAR ni órdenes.
CREATE TABLE vendor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codvend VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(255),
  cedula VARCHAR(30),
  phone VARCHAR(30),
  status VARCHAR(5) NOT NULL DEFAULT '1' CHECK (status IN ('0','1')),
  email VARCHAR(150),
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  source_system VARCHAR(30) NOT NULL DEFAULT 'Saint',
  last_synced_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vendor_cedula_idx ON vendor(cedula) WHERE cedula IS NOT NULL;
DROP TRIGGER IF EXISTS vendor_set_updated_at ON vendor;
CREATE TRIGGER vendor_set_updated_at
  BEFORE UPDATE ON vendor
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
COMMENT ON TABLE vendor IS 'Catálogo Saint de vendedores. status usa 1/0. country, state y city guardan cod_saint.';
COMMENT ON COLUMN vendor.codvend IS 'Código Saint CodVend. Clave de sincronización.';
COMMENT ON COLUMN vendor.cedula IS 'Cédula proveniente de ID3. Puede repetirse o quedar vacía.';
COMMENT ON COLUMN vendor.status IS 'Estado Saint: 1 activo, 0 inactivo. No usar Activo/Inactivo.';

-- 060-client-visit
-- Visitas de campo y posibles clientes creados desde la app móvil.
-- client sigue siendo el catálogo Saint: el prospecto no recibe codclie.
CREATE TABLE client_prospect (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description VARCHAR(255) NOT NULL,
  rif VARCHAR(30) NOT NULL,
  contact_name VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150),
  address1 VARCHAR(255),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'Sincronizado'
    CHECK (sync_status IN ('Pendiente','Sincronizando','Sincronizado','Error')),
  source_system VARCHAR(30) NOT NULL DEFAULT 'Mobile',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_prospect_description_check CHECK (NULLIF(trim(description), '') IS NOT NULL),
  CONSTRAINT client_prospect_rif_check CHECK (NULLIF(trim(rif), '') IS NOT NULL),
  CONSTRAINT client_prospect_email_check CHECK (email IS NULL OR position('@' in email) > 1),
  UNIQUE (user_id, local_id)
);

CREATE INDEX client_prospect_updated_idx ON client_prospect(updated_at);
CREATE INDEX client_prospect_user_idx ON client_prospect(user_id);

DROP TRIGGER IF EXISTS client_prospect_set_updated_at ON client_prospect;
CREATE TRIGGER client_prospect_set_updated_at
  BEFORE UPDATE ON client_prospect
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE client_visit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name VARCHAR(120) NOT NULL,
  client_id UUID REFERENCES client(id) ON DELETE RESTRICT,
  client_prospect_id UUID REFERENCES client_prospect(id) ON DELETE RESTRICT,
  plant_id UUID,
  plant_name VARCHAR(200),
  visited_at TIMESTAMPTZ NOT NULL,
  client_class VARCHAR(40) NOT NULL
    CHECK (client_class IN ('A','B','C','Recuperado','Gobierno','Potencial (Cliente Nuevo)')),
  visit_objective VARCHAR(30) NOT NULL
    CHECK (visit_objective IN ('Servicio','Seguimiento','Repuestos','Máquinas','Cliente Nuevo','Renta')),
  visit_type VARCHAR(20) NOT NULL
    CHECK (visit_type IN ('En Físico','Por Telf','Por Mail')),
  contact_name VARCHAR(150),
  contact_email VARCHAR(150),
  will_quote BOOLEAN NOT NULL,
  office_zone VARCHAR(20) NOT NULL
    CHECK (office_zone IN ('Valencia','Caracas','Otro')),
  observations TEXT,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'Sincronizado'
    CHECK (sync_status IN ('Pendiente','Sincronizando','Sincronizado','Error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id),
  CONSTRAINT client_visit_user_name_check CHECK (NULLIF(trim(user_name), '') IS NOT NULL),
  CONSTRAINT client_visit_subject_check CHECK (
    (client_id IS NOT NULL AND client_prospect_id IS NULL)
    OR (client_id IS NULL AND client_prospect_id IS NOT NULL)
  ),
  CONSTRAINT client_visit_plant_catalog_check CHECK (client_prospect_id IS NULL OR plant_id IS NULL),
  CONSTRAINT client_visit_plant_name_check CHECK (client_id IS NULL OR plant_name IS NULL),
  CONSTRAINT client_visit_contact_email_check CHECK (contact_email IS NULL OR position('@' in contact_email) > 1),
  CONSTRAINT client_visit_plant_client_fk FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id)
);

CREATE INDEX client_visit_user_idx ON client_visit(user_id);
CREATE INDEX client_visit_visited_idx ON client_visit(visited_at);
CREATE INDEX client_visit_client_idx ON client_visit(client_id);
CREATE INDEX client_visit_prospect_idx ON client_visit(client_prospect_id);
CREATE INDEX client_updated_at_idx ON client(updated_at);
CREATE INDEX plant_updated_at_idx ON plant(updated_at);

DROP TRIGGER IF EXISTS client_visit_set_updated_at ON client_visit;
CREATE TRIGGER client_visit_set_updated_at
  BEFORE UPDATE ON client_visit
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE client_prospect IS 'Posible cliente creado en campo. No entra en client ni recibe codclie.';
COMMENT ON COLUMN client_prospect.local_id IS 'UUID generado por el teléfono. Junto con user_id evita duplicar un reintento.';
COMMENT ON COLUMN client_prospect.sync_status IS 'En PostgreSQL la fila nace Sincronizado. Pendiente, Sincronizando y Error viven en el teléfono.';
COMMENT ON TABLE client_visit IS 'Visita registrada por un usuario del portal. La cotización es solo un indicador.';
COMMENT ON COLUMN client_visit.user_name IS 'Copia del nombre al guardar la visita.';
COMMENT ON COLUMN client_visit.will_quote IS 'Indica si la visita va a generar cotización. No crea un PAR.';
COMMENT ON COLUMN client_visit.plant_id IS 'Planta del catálogo cuando la visita es a un cliente Saint.';
COMMENT ON COLUMN client_visit.plant_name IS 'Planta en texto libre cuando la visita es a un posible cliente.';
