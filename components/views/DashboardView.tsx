
import React, { useState, useEffect } from 'react';
import { TaskStatus, type Task, type Worker, type TaskComment, type InventoryItem } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../supabaseClient';
import ChatBubbleIcon from '../icons/ChatBubbleIcon';
import TaskCommentsModal from './TaskCommentsModal';
import ArchiveIcon from '../icons/ArchiveIcon';

const getStatusColor = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.Pendiente: return 'gray';
        case TaskStatus.EnProceso: return 'blue';
        case TaskStatus.Terminado: return 'green';
        case TaskStatus.Bloqueado: return 'red';
        default: return 'gray';
    }
};

interface TaskCardProps {
    task: Task;
    workers: Worker[];
    commentCount: number;
    onOpenComments: () => void;
    onArchive?: (taskId: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, workers, commentCount, onOpenComments, onArchive }) => {
    const assignedWorkers = workers.filter(w => task.workerIds?.includes(w.id));
    return (
        <div className="bg-white p-3 rounded-lg shadow mb-3 border-l-4 border-blue-500">
            <p className="font-semibold text-gray-800">{task.title}</p>
            <div className="flex items-center justify-between mt-2">
                <Badge color={getStatusColor(task.status)}>{task.status}</Badge>
                <div className="flex items-center space-x-3">
                    <button onClick={onOpenComments} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors" aria-label={`Ver comentarios de la tarea ${task.title}`}>
                        <ChatBubbleIcon className="w-4 h-4" />
                        <span>{commentCount}</span>
                    </button>
                    {onArchive && (
                         <button onClick={() => onArchive(task.id)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Archivar tarea">
                            <ArchiveIcon className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex -space-x-2 overflow-hidden">
                        {assignedWorkers.map(worker => (
                             <div key={worker.id} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 ring-2 ring-white" title={worker.name}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{ 
    title: string; 
    tasks: Task[]; 
    workers: Worker[]; 
    comments: TaskComment[]; 
    onTaskSelect: (task: Task) => void;
    onArchiveTask?: (taskId: number) => void;
}> = ({ title, tasks, workers, comments, onTaskSelect, onArchiveTask }) => (
    <div className="bg-gray-100 rounded-lg p-3 flex-1 min-h-[400px]">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700 text-center flex-1">{title} ({tasks.length})</h3>
        </div>
        <div className="h-full">
            {tasks.map(task => {
                const taskCommentsCount = comments.filter(c => c.task_id === task.id).length;
                return <TaskCard key={task.id} task={task} workers={workers} commentCount={taskCommentsCount} onOpenComments={() => onTaskSelect(task)} onArchive={onArchiveTask} />;
            })}
            {tasks.length === 0 && (
                <div className="text-center text-gray-400 mt-10 text-sm">No hay tareas</div>
            )}
        </div>
    </div>
);

const InventorySummary: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
    const lowStockItems = items.filter(item => item.quantity <= item.low_stock_threshold).slice(0, 5);
    const hasLowStock = lowStockItems.length > 0;

    return (
        <Card title="Resumen de Inventario" className="h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-3xl font-bold text-gray-800">{items.length}</p>
                    <p className="text-sm font-medium text-gray-500">Productos Totales</p>
                </div>
                {hasLowStock && (
                    <div className="text-right">
                        <p className="text-xl font-bold text-orange-500">{lowStockItems.length}</p>
                        <p className="text-sm font-medium text-gray-500">Alertas de Stock</p>
                    </div>
                )}
            </div>
            
            {hasLowStock ? (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Stock Bajo o Crítico</h4>
                    <ul className="space-y-2">
                        {lowStockItems.map(item => {
                            let displayQuantity = item.quantity;
                            let displayUnit = item.unit;
                            if (item.unit.toLowerCase() === 'docenas') {
                                displayQuantity = Math.ceil(item.quantity * 12);
                                displayUnit = 'unidades';
                            } else if (item.unit.toLowerCase() === 'unidades') {
                                displayQuantity = Math.ceil(item.quantity);
                            }

                            return (
                                <li key={item.id} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-800 font-medium truncate pr-2">{item.name}</span>
                                    <span className={`flex-shrink-0 font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                                        {['unidades', 'docenas'].includes(item.unit.toLowerCase()) ? displayQuantity : Number(displayQuantity).toFixed(2)} {displayUnit}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : (
                <div className="mt-6 text-center text-green-600">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">Todo el inventario en niveles óptimos.</p>
                </div>
            )}
        </Card>
    );
};

const DashboardView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const fetchDashboardData = async () => {
        const tasksPromise = supabase.from('tasks').select('*').or('is_archived.eq.false,is_archived.is.null');
        const workersPromise = supabase.from('workers').select('*');
        const commentsPromise = supabase.from('task_comments').select('*');
        const inventoryPromise = supabase.from('inventory').select('*');

        const [tasksResponse, workersResponse, commentsResponse, inventoryResponse] = await Promise.all([tasksPromise, workersPromise, commentsPromise, inventoryPromise]);

        if (tasksResponse.error) console.error('Error fetching tasks:', tasksResponse.error);
        else if (tasksResponse.data) setTasks(tasksResponse.data as Task[]);

        if (workersResponse.error) console.error('Error fetching workers:', workersResponse.error);
        else if (workersResponse.data) setWorkers(workersResponse.data as Worker[]);

        if (commentsResponse.error) console.error('Error fetching comments:', commentsResponse.error);
        else if (commentsResponse.data) setComments(commentsResponse.data as TaskComment[]);

        if (inventoryResponse.error) console.error('Error fetching inventory:', inventoryResponse.error);
        else if (inventoryResponse.data) setInventoryItems(inventoryResponse.data as InventoryItem[]);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await fetchDashboardData();
            setLoading(false);
        };
        fetchData();
    }, []);

    const refreshComments = async () => {
        const { data, error } = await supabase.from('task_comments').select('*');
        if (error) console.error('Error fetching comments:', error);
        else if (data) setComments(data as TaskComment[]);
    };

    const tasksPendiente = tasks.filter(t => t.status === TaskStatus.Pendiente);
    const tasksEnProceso = tasks.filter(t => t.status === TaskStatus.EnProceso);
    const tasksTerminado = tasks.filter(t => t.status === TaskStatus.Terminado);

    const handleArchiveTask = async (taskId: number) => {
        if (!window.confirm(`¿Estás seguro de que quieres archivar esta tarea?`)) return;

        const originalTasks = [...tasks];
        setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));

        const { error } = await supabase
            .from('tasks')
            .update({ is_archived: true })
            .eq('id', taskId);

        if (error) {
            console.error('Error archiving task:', error);
            alert('No se pudo archivar la tarea.');
            setTasks(originalTasks);
        }
    };

    return (
        <div className="flex flex-col space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <Card title="Visibilidad de la Línea de Producción" className="!p-0 h-full">
                         {loading ? (
                            <div className="p-8 text-center text-gray-500">Cargando datos de producción...</div>
                        ) : (
                            <div className="p-4 flex flex-col md:flex-row gap-4 h-full">
                               <KanbanColumn title="Pendiente" tasks={tasksPendiente} workers={workers} comments={comments} onTaskSelect={setSelectedTask} />
                               <KanbanColumn title="En Proceso" tasks={tasksEnProceso} workers={workers} comments={comments} onTaskSelect={setSelectedTask} />
                               <KanbanColumn title="Terminado" tasks={tasksTerminado} workers={workers} comments={comments} onTaskSelect={setSelectedTask} onArchiveTask={handleArchiveTask} />
                            </div>
                        )}
                    </Card>
                </div>
                
                <div className="lg:col-span-1">
                    {loading ? (
                         <Card title="Resumen de Inventario" className="h-full">
                             <div className="p-8 text-center text-gray-500 text-sm">Cargando inventario...</div>
                         </Card>
                    ) : (
                        <InventorySummary items={inventoryItems} />
                    )}
                </div>
            </div>

            {selectedTask && (
                <TaskCommentsModal 
                    task={selectedTask}
                    workers={workers}
                    onClose={() => setSelectedTask(null)}
                    onDataChanged={refreshComments}
                />
            )}
        </div>
    );
};

export default DashboardView;