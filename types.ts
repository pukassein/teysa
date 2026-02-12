
export type View = 'dashboard' | 'tasks' | 'inventory' | 'machines' | 'reports' | 'workers' | 'productionOrders' | 'suppliers' | 'productionLog';

export enum TaskStatus {
  Pendiente = 'Pendiente',
  EnProceso = 'En Proceso',
  Terminado = 'Terminado',
  Bloqueado = 'Bloqueado'
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
    estimatedTime: number; // in hours
    startTime?: Date;
    endTime?: Date;
    status: TaskStatus;
    is_archived?: boolean;
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

export interface ProductionLog {
  id: number;
  worker_id: number;
  inventory_id: number;
  quantity: number;
  production_date: string; // 'YYYY-MM-DD'
  created_at: string;
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