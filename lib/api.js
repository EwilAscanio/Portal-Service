import api from "./axios";

export function getReportCatalogs(signal) {
  return api.get("/reports/catalogs", { signal });
}

export async function generateReport(filters, signal) {
  try {
    const blob = await api.post("/reports", filters, { signal, responseType: "blob", timeout: 120000 });
    if (blob.type.includes("application/json")) return JSON.parse(await blob.text());
    if (!blob.type.includes("application/pdf")) throw new Error("El servidor no devolvió un PDF válido.");
    const headers = blob.httpHeaders;
    return {
      blob,
      filename: /filename="([^"]+)"/.exec(headers["content-disposition"] || "")?.[1] || "reporte.pdf",
      generatedAt: headers["x-report-generated-at"],
      rowCount: Number(headers["x-report-rows"] || 0),
      undatedHistoryCount: Number(headers["x-report-history"] || 0),
      incompleteCount: Number(headers["x-report-incomplete"] || 0),
    };
  } catch (error) {
    // Axios devuelve también los errores JSON como Blob en esta solicitud.
    if (error.response?.data instanceof Blob) {
      try { error.message = JSON.parse(await error.response.data.text()).error || error.message; } catch { /* Mantener el error original si el cuerpo no es JSON. */ }
    }
    if (error.code === "ECONNABORTED") error.message = "Se agotó el tiempo para generar el reporte. Reduce el período e intenta nuevamente.";
    throw error;
  }
}

export function getClients(params) {
  return api.get("/client", { params });
}

export function getPlants(params) {
  return api.get("/plant", { params });
}

export function createPlant(data) {
  return api.post("/plant", data);
}

export function updatePlant(id, data) {
  return api.put(`/plant/${id}`, data);
}

export function deletePlant(id) {
  return api.delete(`/plant/${id}`);
}

export function getContacts(params) {
  return api.get("/contact", { params });
}

export function createContact(data) {
  return api.post("/contact", data);
}

export function updateContact(id, data) {
  return api.put(`/contact/${id}`, data);
}

export function deleteContact(id) {
  return api.delete(`/contact/${id}`);
}

export function getUsers(params) {
  return api.get("/user", { params });
}

export function getUserById(id) {
  return api.get(`/user/${id}`);
}

export function createUser(data) {
  return api.post("/user", data);
}

export function updateUser(id, data) {
  return api.put(`/user/${id}`, data);
}

export function deleteUser(id) {
  return api.delete(`/user/${id}`);
}

export function updateUserStatus(id, status) {
  return api.patch(`/user/${id}`, { status });
}

export function getTechnicians(params) {
  return api.get("/technical", { params });
}

export function getTechnicianById(id) {
  return api.get(`/technical/${id}`);
}

export function getAssignableTechnicianUsers(technicalId) {
  return api.get("/technical/users", { params: { technicalId } });
}

export function createTechnician(data) {
  return api.post("/technical", data);
}

export function updateTechnician(id, data) {
  return api.put(`/technical/${id}`, data);
}

export function updateTechnicianStatus(id, status) {
  return api.patch(`/technical/${id}`, { status });
}

export function deleteTechnician(id) {
  return api.delete(`/technical/${id}`);
}

export function getOrders(params) {
  return api.get("/service-order", { params });
}

export function getOrderCatalogs() {
  return api.get("/service-order/catalogs");
}

export function getOrderById(id) {
  return api.get(`/service-order/${id}`);
}

export function createOrder(data) {
  return api.post("/service-order", data);
}

export function updateOrder(id, data) {
  return api.put(`/service-order/${id}`, data);
}

export function deleteOrder(id) {
  return api.delete(`/service-order/${id}`);
}

export function getTechnicianCalendar(params) {
  return api.get("/technician-calendar", { params });
}

export function getEquipment(params) {
  return api.get("/equipment", { params });
}

export function getEquipmentById(id) {
  return api.get(`/equipment/${id}`);
}

export function createEquipment(data) {
  return api.post("/equipment", data);
}

export function updateEquipment(id, data) {
  return api.put(`/equipment/${id}`, data);
}

export function deleteEquipment(id) {
  return api.delete(`/equipment/${id}`);
}

export function getNotifications(params) {
  return api.get("/notification", { params });
}

export function markNotificationAsRead(id) {
  return api.patch(`/notification/${id}`, { read: true });
}

export function markAllNotificationsAsRead() {
  return api.post("/notification");
}

export function getRoles() {
  return api.get("/roles");
}

export function getProducts(params) {
  return api.get("/product", { params });
}

export function getProductById(id) {
  return api.get(`/product/${id}`);
}

export function createProduct(data) {
  return api.post("/product", data);
}

export function updateProduct(id, data) {
  return api.put(`/product/${id}`, data);
}

export function deleteProduct(id) {
  return api.delete(`/product/${id}`);
}

export function updateProductStatus(id, status) {
  return api.patch(`/product/${id}`, { status });
}

export function syncClients() {
  return api.post("/client/sync");
}

export function syncUbicacion(endpoint) {
  return api.post(`/ubicacion/${endpoint}`);
}

export function getDashboard() {
  return api.get("/dashboard");
}

export function getGlobalSearch(q) {
  return api.get("/search", { params: { q } });
}

export function getConfiguration() {
  return api.get("/configuration");
}

export function getExchangeRate() {
  return api.get("/configuration/exchange-rate");
}

export function updateConfiguration(data) {
  return api.put("/configuration", data);
}

// === PAR (Planilla de Atención de Requisiciones) ===

export function getParList(params) {
  return api.get("/par", { params });
}

export function getParById(id) {
  return api.get(`/par/${id}`);
}

export function createPar(data) {
  return api.post("/par", data);
}

export function updatePar(id, data) {
  return api.put(`/par/${id}`, data);
}

export function updateParStatus(id, status) {
  return api.patch(`/par/${id}`, { status });
}

export function deletePar(id) {
  return api.delete(`/par/${id}`);
}

// Equipos (incluye el equipo principal is_main)
export function addParEquipment(parId, data) {
  return api.post(`/par/${parId}/equipment`, data);
}

export function updateParEquipment(equipmentId, data) {
  return api.put(`/par/equipment/${equipmentId}`, data);
}

export function deleteParEquipment(equipmentId) {
  return api.delete(`/par/equipment/${equipmentId}`);
}

// Ítems (productos adicionales)
export function addParItem(parId, data) {
  return api.post(`/par/${parId}/items`, data);
}

export function updateParItem(itemId, data) {
  return api.put(`/par/items/${itemId}`, data);
}

export function deleteParItem(itemId) {
  return api.delete(`/par/items/${itemId}`);
}

// === Plantillas de PAR ===

export function getParTemplates() {
  return api.get("/par-template");
}

export function getParTemplateById(id) {
  return api.get(`/par-template/${id}`);
}

export function createParTemplate(data) {
  return api.post("/par-template", data);
}

export function updateParTemplate(id, data) {
  return api.put(`/par-template/${id}`, data);
}

export function deleteParTemplate(id) {
  return api.delete(`/par-template/${id}`);
}

export function getOrderLaborBudget(params) {
  return api.get("/service-order/labor", { params });
}

export function getOrderClosure(id) {
  return api.get(`/service-order/${id}/closure`);
}
export function updateOrderClosure(id, data) {
  return api.put(`/service-order/${id}/closure`, data);
}
export function uploadOrderClosureFile(id, data) {
  return api.post(`/service-order/${id}/closure/files`, data, { headers: { "Content-Type": undefined }, timeout: 120000 });
}
export function retireOrderClosureFile(id, fileId, data) {
  return api.delete(`/service-order/${id}/closure/files/${fileId}`, { data });
}
