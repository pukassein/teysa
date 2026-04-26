
export type View = 'dashboard' | 'tasks' | 'inventory' | 'machines' | 'reports' | 'workers' | 'productionOrders' | 'suppliers' | 'productionLog' | 'sellers' | 'activityLog';

export enum TaskStatus {
  Pendiente = 'Pendiente',
  EnProceso = 'En Proceso',
  Terminado = 'Terminado',
  Bloqueado = 'Bloqueado'
}

export interface ActivityLog {
    id: number;
    action_type: string;
    details: string;
    created_at: string;
}

export enum MachineStatus {
    Disponible = 'Disponible',
    Mantenimiento = 'Mantenimiento',
    Inactivo = 'Inactivo'
}

export interface Worker {
    id: number;
    name: string;
    shift: 'Mañana' | 'Tarde' | 'Noche' | 'Todo el día' | 'Por hora';
}

export interface Task {
    id: number;
    title: string;
    workerIds: number[];
    startTime?: string;
    endTime?: string;
    status: TaskStatus;
    is_archived?: boolean;
    created_at?: string;
}

export interface ProductionGoal {
    id: number;
    productName: string;
    target: number;
    current: number;
    deadline: string;
}

export type Brand = 'Duramaxi' | 'Avanty' | 'Diletta' | 'Generica';

export interface InventoryItem {
    id: number;
    name: string;
    type: 'Materia Prima' | 'Producto Terminado';
    quantity: number;
    low_stock_threshold: number;
    unit: string;
    brand: Brand;
}

export interface Machine {
    id: number;
    name: string;
    status: MachineStatus;
    lastMaintenance: Date;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_id: number | null;
  comment: string;
  created_at: string; // ISO string
}

export interface Product {
  id: number;
  name: string;
  finished_product_inventory_id: number;
  created_at: string;
}

export interface ProductRecipe {
  id: number;
  product_id: number;
  raw_material_inventory_id: number;
  quantity_required: number;
}

export interface ProductionOrder {
  id: number;
  product_id: number;
  quantity_to_produce: number;
  status: 'Pendiente' | 'En Proceso' | 'Completado';
  created_at: string;
  completed_at?: string;
  programmed_date?: string;
  start_time?: string;
  end_time?: string;
}

export interface Supplier {
  id: number;
  company_name: string;
  location?: string;
  phone_number?: string;
  contact_person?: string;
  supplies_details?: string;
  created_at: string;
}

export type ProductionLogStatus = 'Para empaquetar' | 'Para guardar' | 'Archivado';

export interface ProductionLog {
  id: number;
  worker_id?: number | null;
  inventory_id: number;
  cantidad_total: number;
  cantidad_restante: number;
  quantity?: number; // legacy fallback before migration
  stored_quantity?: number | null; // legacy fallback before migration
  production_date: string; // 'YYYY-MM-DD'
  created_at: string;
  motivo?: string;
  status: ProductionLogStatus;
}

export interface InventoryMovement {
  id: number;
  created_at: string;
  inventory_id: number;
  quantity_change: number; // positive for entry, negative for exit
  reason?: string;
  type: 'Entrada' | 'Salida';
  is_cancelled: boolean;
}

export interface Seller {
    id: number;
    name: string;
    created_at: string;
}

export interface SellerInventory {
    id: number;
    seller_id: number;
    inventory_id: number;
    quantity: number;
    last_updated: string;
}

export interface SellerMovement {
    id: number;
    seller_id: number;
    inventory_id: number;
    type: 'Carga' | 'Venta' | 'Devolución';
    quantity: number;
    date: string;
    notes?: string;
}