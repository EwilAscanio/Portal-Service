import { query } from "@/lib/db";

export async function findAllCountries() {
  const { rows } = await query("SELECT id, cod_saint, name FROM country ORDER BY name");
  return rows;
}

export async function upsertCountry(countries) {
  let count = 0;
  for (const c of countries) {
    await query(
      `INSERT INTO country (cod_saint, name) VALUES ($1, $2)
       ON CONFLICT (cod_saint) DO UPDATE SET name = EXCLUDED.name`,
      [c.Pais, c.Descrip]
    );
    count++;
  }
  return count;
}

export async function findAllStates() {
  const { rows } = await query(
    `SELECT e.id, e.cod_saint, e.name, p.name AS pais_name
     FROM state e
     LEFT JOIN country p ON e.country_id = p.id
     ORDER BY e.name`
  );
  return rows;
}

export async function upsertState(states) {
  let count = 0;
  for (const e of states) {
    await query(
      `INSERT INTO country (cod_saint, name)
       VALUES ($1, 'Desconocido')
       ON CONFLICT (cod_saint) DO NOTHING`,
      [e.Pais]
    );
    const { rows: paisRows } = await query("SELECT id FROM country WHERE cod_saint = $1", [e.Pais]);
    const countryId = paisRows[0]?.id ?? null;

    await query(
      `INSERT INTO state (cod_saint, name, country_id) VALUES ($1, $2, $3)
       ON CONFLICT (cod_saint) DO UPDATE SET name = EXCLUDED.name, country_id = EXCLUDED.country_id`,
      [e.Estado, e.Descrip, countryId]
    );
    count++;
  }
  return count;
}

export async function findAllCities() {
  const { rows } = await query(
    `SELECT c.id, c.cod_saint, c.name,
            e.name AS estado_name, p.name AS pais_name
     FROM city c
     LEFT JOIN state e ON c.state_id = e.id
     LEFT JOIN country p ON c.country_id = p.id
     ORDER BY c.name`
  );
  return rows;
}

export async function upsertCity(cities) {
  let count = 0;
  for (const c of cities) {
    await query(
      `INSERT INTO country (cod_saint, name)
       VALUES ($1, 'Desconocido')
       ON CONFLICT (cod_saint) DO NOTHING`,
      [c.Pais]
    );
    const { rows: paisRows } = await query("SELECT id FROM country WHERE cod_saint = $1", [c.Pais]);
    const countryId = paisRows[0]?.id ?? null;

    await query(
      `INSERT INTO state (cod_saint, name, country_id)
       VALUES ($1, 'Desconocido', $2)
       ON CONFLICT (cod_saint) DO NOTHING`,
      [c.Estado, countryId]
    );
    const { rows: estadoRows } = await query("SELECT id FROM state WHERE cod_saint = $1", [c.Estado]);
    const stateId = estadoRows[0]?.id ?? null;

    await query(
      `INSERT INTO city (cod_saint, name, state_id, country_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (cod_saint) DO UPDATE SET name = EXCLUDED.name, state_id = EXCLUDED.state_id, country_id = EXCLUDED.country_id`,
      [c.Ciudad, c.Descrip, stateId, countryId]
    );
    count++;
  }
  return count;
}
