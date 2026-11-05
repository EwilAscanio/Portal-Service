-- Catálogo de vendedores sincronizado desde Saint.
-- No vincula PAR, órdenes ni comisiones. Una sincronización posterior
-- actualiza por codvend y no borra filas ausentes en la respuesta.
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

-- La cédula (ID3) puede repetirse o venir vacía; el índice solo acelera la consulta.
CREATE INDEX vendor_cedula_idx ON vendor(cedula) WHERE cedula IS NOT NULL;

DROP TRIGGER IF EXISTS vendor_set_updated_at ON vendor;
CREATE TRIGGER vendor_set_updated_at
  BEFORE UPDATE ON vendor
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE vendor IS 'Catálogo Saint de vendedores. status usa 1/0. country, state y city guardan cod_saint.';
COMMENT ON COLUMN vendor.codvend IS 'Código Saint CodVend. Clave de sincronización.';
COMMENT ON COLUMN vendor.cedula IS 'Cédula proveniente de ID3. Puede repetirse o quedar vacía.';
COMMENT ON COLUMN vendor.status IS 'Estado Saint: 1 activo, 0 inactivo. No usar Activo/Inactivo.';
