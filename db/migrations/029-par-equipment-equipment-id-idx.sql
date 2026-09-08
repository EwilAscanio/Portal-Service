-- 029-par-equipment-equipment-id-idx.sql
-- Acelera la consulta de PARs que referencian un equipo (guard de reasignación
-- en PUT /api/equipment/[id]).

CREATE INDEX IF NOT EXISTS par_equipment_equipment_id_idx
  ON par_equipment(equipment_id);