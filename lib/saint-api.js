import axios from "axios";

const saintApi = axios.create({
  baseURL: process.env.SAINT_API_URL || "http://localhost:3001",
  headers: {
    "x-api-key": process.env.SAINT_API_KEY || "",
  },
  timeout: 15000,
});

async function fetchSaint(endpoint) {
  const { data } = await saintApi.get(endpoint);
  return data;
}

export async function fetchClientsFromSaint() {
  return fetchSaint("/api/clientes");
}

export async function fetchPaisesFromSaint() {
  return fetchSaint("/api/paises");
}

export async function fetchEstadosFromSaint() {
  return fetchSaint("/api/estados");
}

export async function fetchCiudadesFromSaint() {
  return fetchSaint("/api/ciudades");
}
