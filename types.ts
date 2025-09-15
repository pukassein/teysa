export type View = 'dashboard' | 'tasks' | 'inventory' | 'machines' | 'reports' | 'workers' | 'productionOrders';

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
    orderId: string;
    is_archived?: boolean;
}

export interface ProductionGoal {
    id: number;
    productName: string;
    target: number;
    current: number;
    deadline: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    type: 'Materia Prima' | 'Producto Terminado';
    quantity: number;
    low_stock_threshold: number;
    unit: string;
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