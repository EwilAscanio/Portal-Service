"use client";

import { useCallback, useEffect, useState } from "react";
import { getClients, getContacts, getPlants, getProducts } from "@/lib/api";

export function useParCatalogs() {
  const [clients, setClients] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [plants, setPlants] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsData, plantsData, contactsData, productsData] = await Promise.all([getClients(), getPlants(), getContacts(), getProducts()]);
      setClients(clientsData);
      setPlants(plantsData);
      setContacts(contactsData);
      setProductCatalog(productsData);
    } catch (err) {
      console.error("Error cargando catálogos:", err);
      setError("No se pudieron cargar los catálogos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // La carga inicial sincroniza el estado del hook con la API externa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCatalogs();
  }, [loadCatalogs]);

  return { clients, plants, contacts, productCatalog, loading, error, retry: loadCatalogs };
}
