const ENTITY_ORDER = { Producto: 1, Planta: 2, Contacto: 3, Equipo: 4 };

async function resolveScope(client, payload) {
  const { rows } = await client.query(
    `SELECT c.id AS client_id, p.id AS plant_id
     FROM client c JOIN plant p ON p.client_id = c.id
     WHERE lower(c.codclie) = lower($1) AND lower(p.code) = lower($2) AND c.status = '1'`,
    [payload.clientCode, payload.plantCode]
  );
  if (!rows[0]) throw new Error(`No se pudo resolver la planta ${payload.plantCode} del cliente ${payload.clientCode} durante la importación.`);
  return rows[0];
}

async function importProduct(client, row) {
  const p = row.payload;
  if (row.target_id) {
    // La importación conserva la clasificación de mano de obra, que se administra en Productos.
    const { rows: current } = await client.query("SELECT requires_technician FROM product WHERE id = $1 FOR UPDATE", [row.target_id]);
    if (current[0]?.requires_technician && p.category !== "Servicio") throw new Error("Un producto que requiere técnico debe seguir siendo Servicio.");
    await client.query(
      `UPDATE product SET code=$2, description=$3, brand=COALESCE($4,brand), serial=COALESCE($5,serial),
       modelo=COALESCE($6,modelo), cost=$7, price=$8, category=$9, stock=$10, status=$11 WHERE id=$1`,
      [row.target_id, p.code, p.description, p.brand, p.serial, p.modelo, p.cost, p.price, p.category, p.stock, p.status]
    );
    return row.target_id;
  }
  const { rows } = await client.query(
    `INSERT INTO product(code,description,brand,serial,modelo,cost,price,category,stock,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [p.code, p.description, p.brand, p.serial, p.modelo, p.cost, p.price, p.category, p.stock, p.status]
  );
  return rows[0].id;
}

async function importPlant(client, row) {
  const p = row.payload;
  const { rows: clients } = await client.query("SELECT id FROM client WHERE lower(codclie)=lower($1) AND status='1'", [p.clientCode]);
  if (!clients[0]) throw new Error("Cliente inexistente o inactivo durante la importación.");
  if (row.target_id) {
    await client.query("UPDATE plant SET name=$2, code=$3, address=COALESCE($4,address) WHERE id=$1", [row.target_id, p.name, p.code, p.address]);
    return row.target_id;
  }
  const { rows } = await client.query("INSERT INTO plant(name,code,address,client_id) VALUES($1,$2,$3,$4) RETURNING id", [p.name, p.code, p.address, clients[0].id]);
  return rows[0].id;
}

async function importContact(client, row) {
  const p = row.payload;
  const scope = await resolveScope(client, p);
  if (row.target_id) {
    await client.query(
      `UPDATE contact SET name=$2, client_id=$3, plant_id=$4, phone=COALESCE($5,phone), email=COALESCE($6,email), department=COALESCE($7,department) WHERE id=$1`,
      [row.target_id, p.name, scope.client_id, scope.plant_id, p.phone, p.email, p.department]
    );
    return row.target_id;
  }
  const { rows } = await client.query(
    "INSERT INTO contact(name,client_id,plant_id,phone,email,department) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [p.name, scope.client_id, scope.plant_id, p.phone, p.email, p.department]
  );
  return rows[0].id;
}

async function importEquipment(client, row) {
  const p = row.payload;
  const scope = await resolveScope(client, p);
  if (row.target_id) {
    const { rows: blocked } = await client.query(
      `SELECT 1 FROM equipment e WHERE e.id=$1 AND (e.client_id<>$2 OR e.plant_id<>$3)
       AND EXISTS(SELECT 1 FROM par_equipment pe WHERE pe.equipment_id=e.id)`,
      [row.target_id, scope.client_id, scope.plant_id]
    );
    if (blocked.length) throw new Error("El equipo está asociado a un PAR y no puede cambiar de cliente o planta.");
    await client.query(
      `UPDATE equipment SET name=$2,brand=$3,model=$4,serial=$5,client_id=$6,plant_id=$7,
       location=COALESCE($8,location),consortium=COALESCE($9,consortium),hp=COALESCE($10,hp),pressure=COALESCE($11,pressure),
       status=$12 WHERE id=$1`,
      [row.target_id,p.name,p.brand,p.model,p.serial,scope.client_id,scope.plant_id,p.location,p.consortium,p.hp,p.pressure,p.status]
    );
    return row.target_id;
  }
  const { rows } = await client.query(
    `INSERT INTO equipment(name,brand,model,serial,client_id,plant_id,location,consortium,hp,pressure,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [p.name,p.brand,p.model,p.serial,scope.client_id,scope.plant_id,p.location,p.consortium,p.hp,p.pressure,p.status]
  );
  return rows[0].id;
}

export async function executeRows(client, batchId) {
  const { rows } = await client.query(
    "SELECT * FROM data_import_row WHERE batch_id=$1 AND status='Pendiente'",
    [batchId]
  );
  rows.sort((a, b) => ENTITY_ORDER[a.entity_name] - ENTITY_ORDER[b.entity_name] || a.row_number - b.row_number);
  const handlers = { Producto: importProduct, Planta: importPlant, Contacto: importContact, Equipo: importEquipment };
  for (const row of rows) {
    const targetId = await handlers[row.entity_name](client, row);
    await client.query("UPDATE data_import_row SET status='Completado', target_id=$2 WHERE id=$1", [row.id, targetId]);
  }
  return { imported: rows.length };
}
