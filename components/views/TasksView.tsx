
import React, { useState, useEffect, useRef } from 'react';
import type { Task, Worker } from '../../types';
import { TaskStatus } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ClockIcon from '../icons/ClockIcon';
import { supabase } from '../../supabaseClient';
import { calculateWorkingHours } from '../../constants';
import SearchIcon from '../icons/SearchIcon';
import TaskCommentsModal from './TaskCommentsModal';

const getStatusColor = (status: TaskStatus): 'gray' | 'blue' | 'green' | 'red' => {
    switch (status) {
        case TaskStatus.Pendiente: return 'gray';
        case TaskStatus.EnProceso: return 'blue';
        case TaskStatus.Terminado: return 'green';
        case TaskStatus.Bloqueado: return 'red';
    }
};

const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
};

const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'No definido';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No definido';
    return date.toLocaleString();
};

interface ManagerTaskCardProps {
    task: Task;
    workers: Worker[];
    onUpdateTask: (taskId: number, updatedTask: Partial<Task>) => void;
    onDeleteTask: (taskId: number) => void;
    isEditing: boolean;
    onSetEditing: (taskId: number) => void;
    onCancelEditing: () => void;
    onOpenComments: (task: Task) => void;
}

const ManagerTaskCard: React.FC<ManagerTaskCardProps> = ({ task, workers, onUpdateTask, onDeleteTask, isEditing, onSetEditing, onCancelEditing, onOpenComments }) => {
    const assignedWorkers = workers.filter(w => task.workerIds?.includes(w.id));
    const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const [editedFields, setEditedFields] = useState({
        title: task.title,
        startTime: formatDateForInput(task.startTime),
        endTime: formatDateForInput(task.endTime),
    });

    useEffect(() => {
        setEditedFields({
            title: task.title,
            startTime: formatDateForInput(task.startTime),
            endTime: formatDateForInput(task.endTime),
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
        setEditedFields(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdateTask(task.id, {
            title: editedFields.title,
            startTime: editedFields.startTime ? new Date(editedFields.startTime).toISOString() : undefined,
            endTime: editedFields.endTime ? new Date(editedFields.endTime).toISOString() : undefined,
        });
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
            update.startTime = new Date().toISOString();
        }
        if (newStatus === TaskStatus.Terminado) {
            update.endTime = new Date().toISOString();
            if (!task.startTime) {
                 update.startTime = new Date().toISOString();
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="text-xs font-medium text-gray-500">Título de la Tarea</label>
                                <input name="title" value={editedFields.title} onChange={handleFieldChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                             <div>
                                <label className="text-xs font-medium text-gray-500">Inicio Programado</label>
                                <input type="datetime-local" name="startTime" value={editedFields.startTime} onChange={handleFieldChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                             <div>
                                <label className="text-xs font-medium text-gray-500">Finalizado</label>
                                <input type="datetime-local" name="endTime" value={editedFields.endTime} onChange={handleFieldChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h4 className="text-xl font-bold text-gray-800">{task.title}</h4>
                        <div className="text-sm text-gray-500 mt-1 space-y-1">
                            <p>Inicio Programado: {formatDisplayDate(task.startTime)}</p>
                            {task.endTime && <p>Finalizado: {formatDisplayDate(task.endTime)}</p>}
                        </div>
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
                            <button onClick={() => onOpenComments(task)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 text-sm font-medium transition">Comentarios</button>
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
    const [startTime, setStartTime] = useState(formatDateForInput(new Date().toISOString()));
    const [endTime, setEndTime] = useState('');
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
        if (!title.trim()) return;
        
        onAddTask({
            title,
            startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
            endTime: endTime ? new Date(endTime).toISOString() : undefined,
            workerIds,
            status: TaskStatus.Pendiente,
            is_archived: false,
        });
    };

    return (
        <Card title="Añadir Nueva Tarea" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título de la Tarea</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Inicio Programado</label>
                        <input type="datetime-local" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">Finalizado</label>
                        <input type="datetime-local" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);

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

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="border-b border-gray-200 w-full md:w-auto">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => { setFilter('active'); setSearchTerm(''); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${filter === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Tareas Activas
                        </button>
                        <button onClick={() => { setFilter('archived'); setSearchTerm(''); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${filter === 'archived' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Tareas Archivadas
                        </button>
                    </nav>
                </div>
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Buscar por título..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>


            {showAddForm && <AddTaskForm workers={workers} onAddTask={handleAddTask} onCancel={() => setShowAddForm(false)} />}
            
            {loading && <p>Cargando tareas...</p>}

            {!loading && filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                    <ManagerTaskCard 
                        key={task.id} 
                        task={task} 
                        workers={workers} 
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        isEditing={editingTaskId === task.id}
                        onSetEditing={setEditingTaskId}
                        onCancelEditing={() => setEditingTaskId(null)}
                        onOpenComments={setSelectedTaskForComments}
                    />
                ))
            ) : (
                !loading && <Card><p className="text-center text-gray-500 py-4">No hay tareas para gestionar en esta vista {searchTerm && `que coincidan con "${searchTerm}"`}.</p></Card>
            )}

            {selectedTaskForComments && (
                <TaskCommentsModal
                    task={selectedTaskForComments}
                    workers={workers}
                    onClose={() => setSelectedTaskForComments(null)}
                    onDataChanged={() => {}}
                />
            )}
        </div>
    );
};

export default TasksView;