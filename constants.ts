import { TaskStatus, MachineStatus, type Worker, type Task, type ProductionGoal, type InventoryItem, type Machine } from './types';

export const WORKERS: Worker[] = [
    { id: 1, name: 'Ana García', shift: 'Mañana' },
    { id: 2, name: 'Luis Fernández', shift: 'Mañana' },
    { id: 3, name: 'Carlos Martínez', shift: 'Tarde' },
    { id: 4, name: 'Sofía Rodríguez', shift: 'Tarde' },
    { id: 5, name: 'Javier Pérez', shift: 'Noche' },
    { id: 6, name: 'María López', shift: 'Noche' },
];

export const TASKS: Task[] = [
    { id: 1, title: 'Pulido de Chasis', workerIds: [1], estimatedTime: 4, status: TaskStatus.Terminado, startTime: new Date('2023-10-27T08:00:00'), endTime: new Date('2023-10-27T11:45:00') },
    { id: 2, title: 'Ensamblaje de Motor', workerIds: [2], estimatedTime: 6, status: TaskStatus.EnProceso, startTime: new Date('2023-10-27T09:15:00') },
    { id: 3, title: 'Empaquetado', workerIds: [3], estimatedTime: 2, status: TaskStatus.Pendiente },
    { id: 4, title: 'Control de Calidad Final', workerIds: [4], estimatedTime: 3, status: TaskStatus.Pendiente },
    { id: 5, title: 'Corte de Material', workerIds: [5], estimatedTime: 8, status: TaskStatus.EnProceso, startTime: new Date('2023-10-27T22:00:00') },
    { id: 6, title: 'Pintura', workerIds: [6], estimatedTime: 5, status: TaskStatus.Bloqueado },
    { id: 7, title: 'Soldadura de Componentes', workerIds: [1], estimatedTime: 3, status: TaskStatus.EnProceso, startTime: new Date() },
    { id: 8, title: 'Preparación de Envío', workerIds: [4], estimatedTime: 2, status: TaskStatus.Pendiente },
];

export const PRODUCTION_GOALS: ProductionGoal[] = [
    { id: 1, productName: 'Escobas Modelo A', target: 200, current: 150, deadline: 'Esta Semana' },
    { id: 2, productName: 'Cepillos Industriales', target: 50, current: 15, deadline: 'Hoy' },
];

export const MACHINES: Machine[] = [
    { id: 1, name: 'Torno CNC', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-15') },
    { id: 2, name: 'Torno Horizontal #1', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-09-20') },
    { id: 3, name: 'Torno Horizontal #2', status: MachineStatus.Mantenimiento, lastMaintenance: new Date('2023-10-25') },
    { id: 4, name: 'Insertadora de Filamentos', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-05') },
    { id: 5, name: 'Inyectora 120 Toneladas', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-09-30') },
    { id: 6, name: 'Inyectora 130 Toneladas', status: MachineStatus.Inactivo, lastMaintenance: new Date('2023-08-10') },
    { id: 7, name: 'Inyectora 300 Toneladas', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-18') },
    { id: 8, name: 'Aglutinador', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-01') },
    { id: 9, name: 'Rectificadora de Gomas', status: MachineStatus.Mantenimiento, lastMaintenance: new Date('2023-10-22') },
    { id: 10, name: 'Máquina de Mopas', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-09-12') },
    { id: 11, name: 'Soldador MIG', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-20') },
    { id: 12, name: 'Prensa Hidráulica', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-02') },
    { id: 13, name: 'Molino 600mm', status: MachineStatus.Inactivo, lastMaintenance: new Date('2023-07-15') },
    { id: 14, name: 'Molino 300mm', status: MachineStatus.Disponible, lastMaintenance: new Date('2023-10-11') },
];

// FIX: Export QUALITY_ISSUES to resolve import error in QualityView.tsx
export const QUALITY_ISSUES = [
    { id: 1, taskId: 1, reportedBy: 1, description: 'Rayas en el pulido final.', timestamp: new Date('2023-10-27T10:00:00'), resolved: false },
    { id: 2, taskId: 5, reportedBy: 5, description: 'Corte de material con dimensiones incorrectas.', timestamp: new Date('2023-10-28T01:30:00'), resolved: true },
    { id: 3, taskId: 6, reportedBy: 6, description: 'Pintura con burbujas de aire, bloqueando la tarea.', timestamp: new Date('2023-10-28T15:00:00'), resolved: false },
];

// FIX: Export SHIFTS to resolve import error in ScheduleView.tsx
export const SHIFTS = [
    { name: 'Mañana', time: '06:00 - 14:00' },
    { name: 'Tarde', time: '14:00 - 22:00' },
    { name: 'Noche', time: '22:00 - 06:00' },
];

// Helper function to calculate the intersection of two time intervals in milliseconds
const getIntervalOverlap = (start1: number, end1: number, start2: number, end2: number): number => {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapEnd > overlapStart) {
        return overlapEnd - overlapStart;
    }
    return 0;
};


/**
 * Calculates the total working hours between a start and end date, considering a fixed daily schedule.
 * Working schedule: 07:00 - 12:00 and 13:00 - 17:30 on weekdays.
 * @param startTime The start date and time of the task.
 * @param endTime The end date and time of the task.
 * @returns The total number of working hours.
 */
export function calculateWorkingHours(startTime: Date, endTime: Date): number {
    if (!startTime || !endTime || endTime.getTime() < startTime.getTime()) {
        return 0;
    }

    let totalWorkingMilliseconds = 0;
    const cursor = new Date(startTime);
    cursor.setHours(0, 0, 0, 0); // Start iterating from the beginning of the start day.

    while (cursor.getTime() <= endTime.getTime()) {
        const dayOfWeek = cursor.getDay(); // 0 = Sunday, 6 = Saturday

        // Only calculate for weekdays
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Define working periods for the current day
            const morningStart = new Date(cursor).setHours(7, 0, 0, 0);
            const morningEnd = new Date(cursor).setHours(12, 0, 0, 0);
            const afternoonStart = new Date(cursor).setHours(13, 0, 0, 0);
            const afternoonEnd = new Date(cursor).setHours(17, 30, 0, 0);

            // Add overlap with morning shift
            totalWorkingMilliseconds += getIntervalOverlap(startTime.getTime(), endTime.getTime(), morningStart, morningEnd);

            // Add overlap with afternoon shift
            totalWorkingMilliseconds += getIntervalOverlap(startTime.getTime(), endTime.getTime(), afternoonStart, afternoonEnd);
        }
        
        // Move to the next day
        cursor.setDate(cursor.getDate() + 1);
    }

    return totalWorkingMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours
}