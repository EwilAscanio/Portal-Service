-- Consultas de validación posterior a instalación o migración.
SELECT COUNT(*) AS orphan_par_items FROM par_item i LEFT JOIN par_header h ON h.id=i.par_id WHERE h.id IS NULL;
SELECT COUNT(*) AS orphan_par_equipment FROM par_equipment e LEFT JOIN par_header h ON h.id=e.par_id WHERE h.id IS NULL;
SELECT par_id, COUNT(*) AS duplicate_item_no FROM par_item GROUP BY par_id,item_no HAVING COUNT(*) > 1;
SELECT par_id, COUNT(*) AS main_equipment_count FROM par_equipment WHERE is_main GROUP BY par_id HAVING COUNT(*) <> 1;
SELECT h.id, h.total_usd, SUM(i.line_total_usd) AS calculated_total_usd FROM par_header h JOIN par_item i ON i.par_id=h.id GROUP BY h.id,h.total_usd HAVING h.total_usd <> SUM(i.line_total_usd);
SELECT last_value, (SELECT COALESCE(MAX(NULLIF(regexp_replace(par_number,'[^0-9]','','g'), '')::BIGINT),0) FROM par_header) AS max_par_number FROM par_number_seq;

-- Relaciones post-032: plantas, contactos y órdenes.
SELECT COUNT(*) AS orders_sin_cliente FROM service_order WHERE client_id IS NULL;
SELECT COUNT(*) AS orders_sin_planta FROM service_order WHERE plant_id IS NULL;
SELECT COUNT(*) AS orders_sin_equipo FROM service_order WHERE equipment_id IS NULL;
SELECT COUNT(*) AS orders_sin_tecnico FROM service_order WHERE technical_id IS NULL;
SELECT COUNT(*) AS orders_sin_contacto FROM service_order WHERE contact_id IS NULL;
SELECT so.id, so.order_code FROM service_order so LEFT JOIN equipment e ON e.id = so.equipment_id WHERE so.equipment_id IS NOT NULL AND e.client_id IS NOT NULL AND so.client_id IS NOT NULL AND so.client_id <> e.client_id;
SELECT so.id, so.order_code FROM service_order so LEFT JOIN equipment e ON e.id = so.equipment_id WHERE so.equipment_id IS NOT NULL AND e.plant_id IS NOT NULL AND so.plant_id IS NOT NULL AND so.plant_id <> e.plant_id;
SELECT COUNT(*) AS equipment_sin_planta FROM equipment WHERE plant_id IS NULL;
SELECT COUNT(*) AS par_header_sin_planta FROM par_header WHERE plant_id IS NULL;
SELECT COUNT(*) AS par_header_sin_contacto FROM par_header WHERE contact_id IS NULL;
SELECT COUNT(*) AS contact_client_plant_mismatch FROM contact c JOIN plant p ON p.id = c.plant_id WHERE p.client_id <> c.client_id;
SELECT COUNT(*) AS equipment_client_plant_mismatch FROM equipment e JOIN plant p ON p.id = e.plant_id WHERE p.client_id <> e.client_id;
SELECT COUNT(*) AS order_contact_scope_mismatch FROM service_order so JOIN contact c ON c.id = so.contact_id WHERE c.client_id <> so.client_id OR c.plant_id <> so.plant_id;

-- Flujo obligatorio PAR -> orden y asignaciones normalizadas (036/037).
SELECT COUNT(*) AS orders_without_par FROM service_order WHERE par_id IS NULL;
SELECT COUNT(*) AS orders_without_work_description FROM service_order WHERE NULLIF(trim(work_description), '') IS NULL;
SELECT COUNT(*) AS par_equipment_without_description FROM par_equipment WHERE NULLIF(trim(observaciones), '') IS NULL;
SELECT COUNT(*) AS orders_without_prepared_by FROM service_order WHERE prepared_by IS NULL;
SELECT service_order_id, COUNT(*) AS technician_count FROM service_order_technician GROUP BY service_order_id HAVING COUNT(*) NOT BETWEEN 1 AND 3;
SELECT service_order_id, COUNT(*) AS lead_count FROM service_order_technician WHERE is_lead GROUP BY service_order_id HAVING COUNT(*) <> 1;
SELECT so.id, so.order_code FROM service_order so JOIN par_header ph ON ph.id = so.par_id WHERE so.client_id <> ph.client_id OR so.plant_id <> ph.plant_id OR so.contact_id <> ph.contact_id;
SELECT COUNT(*) AS running_syncs_without_finish FROM integration_sync_run WHERE status = 'Running' AND started_at < now() - interval '30 minutes';

-- Calendario de técnicos derivado de aprobaciones (043).
SELECT COUNT(*) AS inconsistent_order_approval FROM service_order WHERE (approved_by IS NULL) <> (approved_at IS NULL);
SELECT COUNT(*) AS approved_orders_without_assignment FROM service_order so WHERE so.approved_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_order_technician sot WHERE sot.service_order_id = so.id);
SELECT user_id, COUNT(*) AS duplicate_technical_user FROM technical WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1;

-- CatÃ¡logo de productos y categorÃ­as canÃ³nicas (045/046).
SELECT COUNT(*) AS invalid_product_categories FROM product WHERE category NOT IN ('Servicio', 'Repuestos');
SELECT COUNT(*) AS invalid_par_item_categories FROM par_item WHERE categoria NOT IN ('Servicio', 'Repuestos');
SELECT COUNT(*) AS invalid_template_item_categories FROM par_template_item WHERE categoria NOT IN ('Servicio', 'Repuestos');
SELECT COUNT(*) AS par_product_category_mismatch FROM par_item item JOIN product ON product.id = item.product_id WHERE item.categoria <> product.category;
SELECT COUNT(*) AS template_product_category_mismatch FROM par_template_item item JOIN product ON product.id = item.product_id WHERE item.categoria <> product.category;

-- Mano de obra (051). Los resultados deben estar vacíos.
SELECT h.id FROM par_header h
WHERE h.budgeted_hours <> COALESCE((SELECT SUM(i.qty) FROM par_item i WHERE i.par_id=h.id AND i.requires_technician),0);
SELECT so.id FROM service_order so WHERE NOT so.labor_review_required
AND so.worked_hours <> COALESCE((SELECT SUM(a.hours) FROM service_order_labor_allocation a WHERE a.service_order_id=so.id),0);
-- El exceso real está permitido con justificación; ya no es anomalía por sí mismo.
SELECT a.id FROM service_order_labor_allocation a
JOIN service_order so ON so.id=a.service_order_id WHERE so.closed_at IS NOT NULL
AND a.actual_hours > a.hours AND COALESCE(length(trim(so.excess_reason)),0) < 5;
SELECT a.id FROM service_order_labor_allocation a JOIN service_order so ON so.id=a.service_order_id
LEFT JOIN par_item i ON i.id=a.par_item_id
WHERE (so.status <> 'Cancelada' AND (i.id IS NULL OR i.par_id <> so.par_id OR NOT i.requires_technician))
OR NOT EXISTS (SELECT 1 FROM service_order_technician sot WHERE sot.service_order_id=so.id AND sot.technical_id=a.technical_id);
