"use client";

import { useCallback, useEffect, useState } from "react";
import { getClients, getProducts } from "@/lib/api";

export function useParCatalogs() {
  const [clients, setClients] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsData, productsData] = await Promise.all([getClients(), getProducts()]);
      setClients(clientsData.filter((client) => client.status === "1"));
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

  return { clients, productCatalog, loading, error, retry: loadCatalogs };
}
