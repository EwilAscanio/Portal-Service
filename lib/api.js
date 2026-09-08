import api from "./axios";

export function getClients(params) {
  return api.get("/client", { params });
}

export function getClientById(id) {
  return api.get(`/client/${id}`);
}

export function createClient(data) {
  return api.post("/client", data);
}

export function updateClient(id, data) {
  return api.put(`/client/${id}`, data);
}

export function deleteClient(id) {
  return api.delete(`/client/${id}`);
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

export function getDashboard({ month, year } = {}) {
  return api.get("/dashboard", { params: { month, year } });
}

export function getConfiguration() {
  return api.get("/configuration");
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
