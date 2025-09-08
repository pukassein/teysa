
import React, { useState, useEffect } from 'react';
import type { Machine } from '../../types';
import { MachineStatus } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../supabaseClient';

const getStatusColor = (status: MachineStatus): 'green' | 'yellow' | 'gray' => {
    switch (status) {
        case MachineStatus.Disponible: return 'green';
        case MachineStatus.Mantenimiento: return 'yellow';
        case MachineStatus.Inactivo: return 'gray';
    }
};

const MachineCard: React.FC<{ machine: Machine; onUpdate: (id: number, updates: Partial<Machine>) => void; }> = ({ machine, onUpdate }) => {
    
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate(machine.id, { status: e.target.value as MachineStatus });
    };

    const handleMaintenanceUpdate = () => {
        const today = new Date();
        // Formatear a YYYY-MM-DD para Supabase, ignorando la zona horaria para 'date'
        const formattedDate = today.getFullYear() + '-' + ('0' + (today.getMonth()+1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        onUpdate(machine.id, { lastMaintenance: new Date(formattedDate) });
    };

    return (
        <Card>
            <div className="flex justify-between items-start">
                <h4 className="text-lg font-bold text-gray-800">{machine.name}</h4>
                <Badge color={getStatusColor(machine.status)}>{machine.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2 mb-4">
                Último mantenimiento: {machine.lastMaintenance ? new Date(machine.lastMaintenance).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A'}
            </p>
            <div className="border-t pt-4 space-y-3">
                 <div>
                    <label htmlFor={`status-${machine.id}`} className="block text-sm font-medium text-gray-700">Cambiar Estado</label>
                    <select
                        id={`status-${machine.id}`}
                        value={machine.status}
                        onChange={handleStatusChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {Object.values(MachineStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                 <button 
                    onClick={handleMaintenanceUpdate}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                 >
                    Registrar Mantenimiento Hoy
                </button>
            </div>
        </Card>
    );
};

const MachinesView: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('machines').select('*').order('name');
        if (error) {
            console.error('Error fetching machines:', error);
        } else if (data) {
            setMachines(data as Machine[]);
        }
        setLoading(false);
    };

    const handleUpdateMachine = async (id: number, updates: Partial<Machine>) => {
        const oldMachines = [...machines];
        const updatedMachines = machines.map(m => m.id === id ? { ...m, ...updates } : m);
        setMachines(updatedMachines);

        const { error } = await supabase.from('machines').update(updates).eq('id', id);

        if (error) {
            console.error('Error updating machine:', error);
            setMachines(oldMachines);
        }
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Estado de Máquinas y Herramientas</h2>
            {loading ? (
                <p>Cargando máquinas...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {machines.map(machine => (
                        <MachineCard key={machine.id} machine={machine} onUpdate={handleUpdateMachine} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MachinesView;
