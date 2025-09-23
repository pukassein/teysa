import React, { useState, useEffect } from 'react';
import { PRODUCTION_GOALS } from '../../constants';
import { TaskStatus, type Task, type ProductionGoal, type Worker, type TaskComment } from '../../types';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
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
    <div className="bg-gray-100 rounded-lg p-3 flex-1 min-h-[200px]">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700 text-center flex-1">{title} ({tasks.length})</h3>
        </div>
        <div>
            {tasks.map(task => {
                const taskCommentsCount = comments.filter(c => c.task_id === task.id).length;
                return <TaskCard key={task.id} task={task} workers={workers} commentCount={taskCommentsCount} onOpenComments={() => onTaskSelect(task)} onArchive={onArchiveTask} />;
            })}
        </div>
    </div>
);


const GoalCard: React.FC<{ goal: ProductionGoal; onUpdate: (id: number, newGoal: ProductionGoal) => void }> = ({ goal, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formValues, setFormValues] = useState({ current: goal.current, target: goal.target });

    const handleSave = () => {
        onUpdate(goal.id, { ...goal, ...formValues });
        setIsEditing(false);
    };
    
    return (
         <Card title={`Objetivo: ${goal.productName}`}>
            {isEditing ? (
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Progreso Actual</label>
                        <input type="number" value={formValues.current} onChange={e => setFormValues({...formValues, current: parseInt(e.target.value) || 0})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Meta de Producción</label>
                        <input type="number" value={formValues.target} onChange={e => setFormValues({...formValues, target: parseInt(e.target.value) || 0})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                    </div>
                 </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-bold text-gray-800">{goal.current} / {goal.target}</span>
                        <span className="text-sm font-medium text-gray-500">{goal.deadline}</span>
                    </div>
                    <ProgressBar value={goal.current} max={goal.target} />
                    {goal.current / goal.target < 0.7 && <p className="text-red-500 text-sm mt-2">Atención: Producción por debajo del 70% del objetivo.</p>}
                    <div className="text-right mt-4">
                        <button onClick={() => { setFormValues({ current: goal.current, target: goal.target }); setIsEditing(true);}} className="text-sm font-medium text-blue-600 hover:text-blue-800">Editar</button>
                    </div>
                </>
            )}
        </Card>
    );
};


const DashboardView: React.FC = () => {
    const [goals, setGoals] = useState<ProductionGoal[]>(PRODUCTION_GOALS);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);


    const fetchDashboardData = async () => {
        const tasksPromise = supabase.from('tasks').select('*').or('is_archived.eq.false,is_archived.is.null');
        const workersPromise = supabase.from('workers').select('*');
        const commentsPromise = supabase.from('task_comments').select('*');

        const [tasksResponse, workersResponse, commentsResponse] = await Promise.all([tasksPromise, workersPromise, commentsPromise]);

        if (tasksResponse.error) console.error('Error fetching tasks:', tasksResponse.error);
        else if (tasksResponse.data) setTasks(tasksResponse.data as Task[]);

        if (workersResponse.error) console.error('Error fetching workers:', workersResponse.error);
        else if (workersResponse.data) setWorkers(workersResponse.data as Worker[]);

        if (commentsResponse.error) console.error('Error fetching comments:', commentsResponse.error);
        else if (commentsResponse.data) setComments(commentsResponse.data as TaskComment[]);
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

    const handleUpdateGoal = (id: number, updatedGoal: ProductionGoal) => {
        setGoals(currentGoals => currentGoals.map(g => g.id === id ? updatedGoal : g));
    };
    
    const handleArchiveTask = async (taskId: number) => {
        if (!window.confirm(`¿Estás seguro de que quieres archivar esta tarea?`)) return;

        // Optimistic UI update
        const originalTasks = [...tasks];
        setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));

        const { error } = await supabase
            .from('tasks')
            .update({ is_archived: true })
            .eq('id', taskId);

        if (error) {
            console.error('Error archiving task:', error);
            alert('No se pudo archivar la tarea.');
            setTasks(originalTasks); // Revert on error
        }
    };


    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {goals.map(goal => (
                     <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdateGoal} />
                ))}
            </div>

            <Card title="Visibilidad de la Línea de Producción" className="!p-0">
                 {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando datos de producción...</div>
                ) : (
                    <div className="p-4 flex flex-col md:flex-row gap-4">
                       <KanbanColumn title="Pendiente" tasks={tasksPendiente} workers={workers} comments={comments} onTaskSelect={setSelectedTask} />
                       <KanbanColumn title="En Proceso" tasks={tasksEnProceso} workers={workers} comments={comments} onTaskSelect={setSelectedTask} />
                       <KanbanColumn title="Terminado" tasks={tasksTerminado} workers={workers} comments={comments} onTaskSelect={setSelectedTask} onArchiveTask={handleArchiveTask} />
                    </div>
                )}
            </Card>

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