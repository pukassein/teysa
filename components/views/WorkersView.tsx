import React, { useState, useEffect } from 'react';
import type { Worker } from '../../types';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';
import SearchIcon from '../icons/SearchIcon';

const EditWorkerForm: React.FC<{ worker: Worker; onSave: (id: number, updates: { name: string; shift: Worker['shift'] }) => void; onCancel: () => void }> = ({ worker, onSave, onCancel }) => {
    const [name, setName] = useState(worker.name);
    const [shift, setShift] = useState<Worker['shift']>(worker.shift);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(worker.id, { name, shift });
        }
    };

    return (
        <Card title="Editar Funcionario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor={`workerName-${worker.id}`} className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input
                        type="text"
                        id={`workerName-${worker.id}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        placeholder="Ej: Juan Pérez"
                        required
                    />
                </div>
                <div>
                    <label htmlFor={`workerShift-${worker.id}`} className="block text-sm font-medium text-gray-700">Turno</label>
                    <select
                        id={`workerShift-${worker.id}`}
                        value={shift}
                        onChange={(e) => setShift(e.target.value as Worker['shift'])}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option>Mañana</option>
                        <option>Tarde</option>
                        <option>Noche</option>
                        <option value="Todo el día">Todo el día</option>
                        <option value="Por hora">Por hora</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Guardar Cambios</button>
                </div>
            </form>
        </Card>
    );
};


const WorkerCard: React.FC<{ worker: Worker; onDelete: (id: number) => void; onEdit: (id: number) => void }> = ({ worker, onDelete, onEdit }) => (
    <Card>
        <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-gray-800 truncate">{worker.name}</h4>
                <p className="text-sm text-gray-500">Turno: {worker.shift}</p>
            </div>
            <div className="flex flex-col space-y-2">
                 <button
                    onClick={() => onEdit(worker.id)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition"
                >
                    Editar
                </button>
                <button
                    onClick={() => onDelete(worker.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition"
                >
                    Eliminar
                </button>
            </div>
        </div>
    </Card>
);

const AddWorkerForm: React.FC<{ onAdd: (worker: Omit<Worker, 'id'>) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const [name, setName] = useState('');
    const [shift, setShift] = useState<Worker['shift']>('Mañana');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd({ name, shift });
            setName('');
            setShift('Mañana');
        }
    };

    return (
        <Card title="Añadir Nuevo Funcionario" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="workerName" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input
                        type="text"
                        id="workerName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        placeholder="Ej: Juan Pérez"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="workerShift" className="block text-sm font-medium text-gray-700">Turno</label>
                    <select
                        id="workerShift"
                        value={shift}
                        onChange={(e) => setShift(e.target.value as Worker['shift'])}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option>Mañana</option>
                        <option>Tarde</option>
                        <option>Noche</option>
                        <option value="Todo el día">Todo el día</option>
                        <option value="Por hora">Por hora</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Guardar Funcionario</button>
                </div>
            </form>
        </Card>
    );
};


const WorkersView: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('workers').select('*').order('name');
        if (error) {
            console.error('Error fetching workers:', error);
        } else if (data) {
            setWorkers(data as Worker[]);
        }
        setLoading(false);
    };

    const handleDeleteWorker = async (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar a este funcionario? Esto desasignará todas sus tareas.')) {
            const { error } = await supabase.from('workers').delete().eq('id', id);
            if (error) {
                console.error('Error deleting worker:', error);
            } else {
                setWorkers(currentWorkers => currentWorkers.filter(w => w.id !== id));
            }
        }
    };
    
    const handleAddWorker = async (newWorkerData: Omit<Worker, 'id'>) => {
        const { data, error } = await supabase.from('workers').insert(newWorkerData).select();

        if (error) {
            console.error('Error adding worker:', error);
        } else if(data) {
            setWorkers(currentWorkers => [...currentWorkers, data[0] as Worker].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAddForm(false);
        }
    };

    const handleUpdateWorker = async (id: number, updates: { name: string; shift: Worker['shift'] }) => {
        const { data, error } = await supabase
            .from('workers')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating worker:', error);
        } else if (data) {
            setWorkers(currentWorkers =>
                currentWorkers.map(w => (w.id === id ? (data[0] as Worker) : w))
            );
            setEditingWorkerId(null);
        }
    };

    const filteredWorkers = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 self-start md:self-center">Gestión de Funcionarios</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar funcionario..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                    {!showAddForm && (
                        <button 
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition w-full md:w-auto"
                        >
                            Añadir Funcionario
                        </button>
                    )}
                </div>
            </div>

            {showAddForm && <AddWorkerForm onAdd={handleAddWorker} onCancel={() => setShowAddForm(false)} />}
            
            {loading && <p>Cargando funcionarios...</p>}

            {!loading && filteredWorkers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkers.map(worker => (
                        editingWorkerId === worker.id ? (
                            <EditWorkerForm 
                                key={worker.id} 
                                worker={worker} 
                                onSave={handleUpdateWorker} 
                                onCancel={() => setEditingWorkerId(null)} />
                        ) : (
                            <WorkerCard key={worker.id} worker={worker} onDelete={handleDeleteWorker} onEdit={setEditingWorkerId} />
                        )
                    ))}
                </div>
            )}
            {!loading && filteredWorkers.length === 0 && (
                <Card><p className="text-center text-gray-500 py-4">No se encontraron funcionarios {searchTerm && `con el término "${searchTerm}"`}.</p></Card>
            )}
        </div>
    );
};

export default WorkersView;
