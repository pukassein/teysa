import React, { useState, useEffect, useRef } from 'react';
import type { Task, Worker } from '../../types';
import { TaskStatus } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ClockIcon from '../icons/ClockIcon';
import { supabase } from '../../supabaseClient';
import { calculateWorkingHours } from '../../constants';

const getStatusColor = (status: TaskStatus): 'gray' | 'blue' | 'green' | 'red' => {
    switch (status) {
        case TaskStatus.Pendiente: return 'gray';
        case TaskStatus.EnProceso: return 'blue';
        case TaskStatus.Terminado: return 'green';
        case TaskStatus.Bloqueado: return 'red';
    }
};

const TimeRangeCalculator: React.FC<{
    onDurationCalculated: (hours: number) => void;
}> = ({ onDurationCalculated }) => {
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('16:00');
    const [calculatedHours, setCalculatedHours] = useState<number | null>(null);

    useEffect(() => {
        if (startTime && endTime) {
            const today = new Date();
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);

            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
            const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);

            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            
            const hours = calculateWorkingHours(startDate, endDate);
            setCalculatedHours(hours);
        }
    }, [startTime, endTime]);

    const handleApply = () => {
        if (calculatedHours !== null) {
            onDurationCalculated(calculatedHours);
        }
    };

    return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm font-semibold text-gray-700 mb-2">Opcional: Calcular por rango</p>
            <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                    <label htmlFor="calc-start-time" className="text-xs text-gray-600">Desde</label>
                    <input type="time" id="calc-start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full p-1 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                    <label htmlFor="calc-end-time" className="text-xs text-gray-600">Hasta</label>
                    <input type="time" id="calc-end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full p-1 border border-gray-300 rounded-md text-sm" />
                </div>
            </div>
            {calculatedHours !== null && (
                <div className="mt-3 text-center">
                    <p className="text-sm text-gray-800">
                        Horas útiles: <span className="font-bold">{calculatedHours.toFixed(2)}</span>
                    </p>
                    <button type="button" onClick={handleApply} className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium transition">
                        Usar esta duración
                    </button>
                </div>
            )}
        </div>
    );
};

interface ManagerTaskCardProps {
    task: Task;
    workers: Worker[];
    onUpdateTask: (taskId: number, updatedTask: Partial<Task>) => void;
    onDeleteTask: (taskId: number) => void;
    isEditing: boolean;
    onSetEditing: (taskId: number) => void;
    onCancelEditing: () => void;
}

const ManagerTaskCard: React.FC<ManagerTaskCardProps> = ({ task, workers, onUpdateTask, onDeleteTask, isEditing, onSetEditing, onCancelEditing }) => {
    const assignedWorkers = workers.filter(w => task.workerIds?.includes(w.id));
    const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const [editedFields, setEditedFields] = useState({
        title: task.title,
        estimatedTime: task.estimatedTime,
    });

    useEffect(() => {
        setEditedFields({
            title: task.title,
            estimatedTime: task.estimatedTime,
        });
    }, [task, isEditing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsWorkerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedFields(prev => ({
            ...prev,
            [name]: name === 'estimatedTime' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSave = () => {
        onUpdateTask(task.id, editedFields);
    };
    
    const handleWorkersChange = (workerId: number) => {
        const currentIds = task.workerIds || [];
        const newIds = currentIds.includes(workerId)
            ? currentIds.filter(id => id !== workerId)
            : [...currentIds, workerId];
        onUpdateTask(task.id, { workerIds: newIds });
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as TaskStatus;
        const update: Partial<Task> = { status: newStatus };

        if (newStatus === TaskStatus.EnProceso && task.status === TaskStatus.Pendiente) {
            update.startTime = new Date();
        }
        if (newStatus === TaskStatus.Terminado) {
            update.endTime = new Date();
            if (!task.startTime) {
                 update.startTime = new Date();
            }
        }
        onUpdateTask(task.id, update);
    };
    
    const handleArchive = () => onUpdateTask(task.id, { is_archived: true });
    const handleUnarchive = () => onUpdateTask(task.id, { is_archived: false });

    const calculateDuration = () => {
        if (!task.startTime || !task.endTime) return null;
        const workingHours = calculateWorkingHours(new Date(task.startTime), new Date(task.endTime));
        return `${workingHours.toFixed(2)} horas útiles`;
    };

    return (
        <Card className="mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                 {isEditing ? (
                    <div className="flex-1 space-y-2 mr-4 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-medium text-gray-500">Título de la Tarea</label>
                                <input name="title" value={editedFields.title} onChange={handleFieldChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                             <div>
                                <label className="text-xs font-medium text-gray-500">Tiempo Est. (hrs)</label>
                                <input type="number" name="estimatedTime" value={editedFields.estimatedTime} onChange={handleFieldChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                                <TimeRangeCalculator onDurationCalculated={(hours) => {
                                    setEditedFields(prev => ({
                                        ...prev,
                                        estimatedTime: parseFloat(hours.toFixed(2))
                                    }));
                                }} />
                             </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h4 className="text-xl font-bold text-gray-800">{task.title}</h4>
                        <p className="text-gray-500">Tiempo estimado: {task.estimatedTime} horas</p>
                    </div>
                )}
                 <div className="flex items-center space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                    <Badge color={getStatusColor(task.status)}>{task.status}</Badge>
                     {isEditing ? (
                         <>
                            <button onClick={handleSave} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm font-medium transition hover:bg-green-600">Guardar</button>
                            <button onClick={onCancelEditing} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition hover:bg-gray-300">Cancelar</button>
                         </>
                    ) : (
                        <>
                             {task.is_archived ? (
                                <button onClick={handleUnarchive} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium transition">Desarchivar</button>
                            ) : task.status === TaskStatus.Terminado && (
                                <button onClick={handleArchive} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition">Archivar</button>
                            )}
                            <button onClick={() => onSetEditing(task.id)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition">Editar</button>
                            <button onClick={() => onDeleteTask(task.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition">Eliminar</button>
                        </>
                    )}
                </div>
            </div>
             {task.status === TaskStatus.Terminado && calculateDuration() && (
                <div className="flex items-center text-sm text-gray-600 mt-3 pt-3 border-t">
                    <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <span>Tiempo Real: <span className="font-semibold text-gray-800">{calculateDuration()}</span></span>
                </div>
            )}
            <div className="border-t my-4"></div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex items-center flex-wrap gap-2">
                    {assignedWorkers.length > 0 ? (
                        assignedWorkers.map(worker => (
                            <div key={worker.id} className="flex items-center bg-gray-100 rounded-full py-1 pl-1 pr-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 ring-2 ring-white flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <span className="ml-2 font-medium text-gray-700">{worker.name}</span>
                            </div>
                        ))
                    ) : <p className="text-sm text-gray-500">No asignado</p>}
                </div>
                <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <div className="relative" ref={dropdownRef}>
                        <label htmlFor={`worker-${task.id}`} className="block text-sm font-medium text-gray-700">Asignar a:</label>
                        <button
                            type="button"
                            onClick={() => setIsWorkerDropdownOpen(!isWorkerDropdownOpen)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-left"
                        >
                            {assignedWorkers.length > 0 ? `${assignedWorkers.length} asignado(s)`: 'Seleccionar...'}
                        </button>
                        {isWorkerDropdownOpen && (
                             <div className="absolute z-10 w-56 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto right-0">
                                {workers.map(worker => (
                                    <label key={worker.id} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={task.workerIds?.includes(worker.id) || false}
                                            onChange={() => handleWorkersChange(worker.id)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{worker.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                     <div>
                        <label htmlFor={`status-${task.id}`} className="block text-sm font-medium text-gray-700">Estado:</label>
                        <select
                            id={`status-${task.id}`}
                            value={task.status}
                            onChange={handleStatusChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            {Object.values(TaskStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </Card>
    );
};


const AddTaskForm: React.FC<{ workers: Worker[], onAddTask: (task: Omit<Task, 'id'>) => void, onCancel: () => void }> = ({ workers, onAddTask, onCancel }) => {
    const [title, setTitle] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [workerIds, setWorkerIds] = useState<number[]>([]);
    
    const handleWorkerSelect = (workerId: number) => {
        setWorkerIds(prev => 
            prev.includes(workerId) 
            ? prev.filter(id => id !== workerId) 
            : [...prev, workerId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !estimatedTime) return;
        
        onAddTask({
            title,
            estimatedTime: parseFloat(estimatedTime),
            workerIds,
            status: TaskStatus.Pendiente,
            is_archived: false,
        });
    };

    return (
        <Card title="Añadir Nueva Tarea" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título de la Tarea</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700">Tiempo Estimado (horas)</label>
                        <input type="number" id="estimatedTime" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} required min="0" step="0.5" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        <TimeRangeCalculator onDurationCalculated={(hours) => setEstimatedTime(hours.toFixed(2))} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Asignar a Funcionarios</label>
                        <div className="mt-1 border border-gray-300 rounded-md max-h-32 overflow-y-auto p-2">
                             {workers.map(w => (
                                <label key={w.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                                    <input type="checkbox" checked={workerIds.includes(w.id)} onChange={() => handleWorkerSelect(w.id)} className="rounded" />
                                    <span>{w.name}</span>
                                </label>
                             ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Guardar Tarea</button>
                </div>
            </form>
        </Card>
    );
};


const TasksView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'active' | 'archived'>('active');

    useEffect(() => {
        fetchTasks();
    }, [filter]);
    
    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        let query = supabase.from('tasks').select('*').order('id', { ascending: false });

        if (filter === 'active') {
            query = query.or('is_archived.eq.false,is_archived.is.null');
        } else {
            query = query.eq('is_archived', true);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching tasks:', error);
        } else if (data) {
            setTasks(data as Task[]);
        }
        setLoading(false);
    };

    const fetchWorkers = async () => {
        const { data, error } = await supabase.from('workers').select('*');
        if (error) console.error('Error fetching workers:', error);
        else if (data) setWorkers(data as Worker[]);
    };

    const handleUpdateTask = async (taskId: number, updatePayload: Partial<Task>) => {
        const { error } = await supabase
            .from('tasks')
            .update(updatePayload)
            .eq('id', taskId);
            
        if (error) {
            console.error('Error updating task:', error.message);
            // Optionally revert optimistic UI update here
        } else {
             setEditingTaskId(null);
             // If we archived or unarchived, remove from the current view.
             if (updatePayload.is_archived !== undefined) {
                 setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
             } else {
                 // Otherwise, update in place
                 setTasks(currentTasks => currentTasks.map(t => t.id === taskId ? {...t, ...updatePayload} : t));
             }
        }
    };

    const handleAddTask = async (newTaskData: Omit<Task, 'id'>) => {
        const { data, error } = await supabase.from('tasks').insert([newTaskData]).select();
        
        if (error) {
            console.error('Error adding task:', error);
        } else if (data) {
            setTasks(currentTasks => [data[0] as Task, ...currentTasks]);
            setShowAddForm(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción es irreversible.')) {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error.message);
                alert('No se pudo eliminar la tarea.');
            } else {
                setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestión de Tareas</h2>
                {!showAddForm && filter === 'active' && (
                     <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                        Añadir Nueva Tarea
                    </button>
                )}
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setFilter('active')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${filter === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Tareas Activas
                    </button>
                    <button onClick={() => setFilter('archived')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${filter === 'archived' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Tareas Archivadas
                    </button>
                </nav>
            </div>


            {showAddForm && <AddTaskForm workers={workers} onAddTask={handleAddTask} onCancel={() => setShowAddForm(false)} />}
            
            {loading && <p>Cargando tareas...</p>}

            {!loading && tasks.length > 0 ? (
                tasks.map(task => (
                    <ManagerTaskCard 
                        key={task.id} 
                        task={task} 
                        workers={workers} 
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        isEditing={editingTaskId === task.id}
                        onSetEditing={setEditingTaskId}
                        onCancelEditing={() => setEditingTaskId(null)}
                    />
                ))
            ) : (
                !loading && <Card><p className="text-center text-gray-500 py-4">No hay tareas para gestionar en esta vista.</p></Card>
            )}
        </div>
    );
};

export default TasksView;