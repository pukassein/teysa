
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';
import { TaskStatus, type Task, type Worker } from '../../types';
import { supabase } from '../../supabaseClient';
import { calculateWorkingHours } from '../../constants';

interface WorkerStats {
    worker: Worker;
    completedTasks: number;
    totalHours: number;
    efficiency: number | null;
}

const WorkerReportCard: React.FC<{ stats: WorkerStats }> = ({ stats }) => {
    return (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800">{stats.worker.name}</h4>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <p><strong>Tareas Completadas:</strong> {stats.completedTasks}</p>
                    <p><strong>Horas Útiles Trabajadas:</strong> {stats.totalHours.toFixed(2)}</p>
                    <p><strong>Eficiencia Promedio:</strong> 
                        {stats.efficiency !== null ? (
                             <span className={`font-bold ${stats.efficiency >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                {stats.efficiency.toFixed(1)}%
                             </span>
                        ) : ' N/A'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const ReportsView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const tasksPromise = supabase.from('tasks').select('*');
            const workersPromise = supabase.from('workers').select('*');

            const [tasksResponse, workersResponse] = await Promise.all([tasksPromise, workersPromise]);

            if (tasksResponse.data) setTasks(tasksResponse.data as Task[]);
            if (workersResponse.data) setWorkers(workersResponse.data as Worker[]);
            
            setLoading(false);
        };
        fetchData();
    }, []);

    const productionData = [
        { name: 'Lunes', producidos: 40, objetivo: 50 },
        { name: 'Martes', producidos: 60, objetivo: 50 },
        { name: 'Miércoles', producidos: 55, objetivo: 50 },
        { name: 'Jueves', producidos: 48, objetivo: 50 },
        { name: 'Viernes', producidos: 70, objetivo: 50 },
    ];

    const efficiencyData = tasks
        .filter(task => task.status === TaskStatus.Terminado && task.startTime && task.endTime)
        .map(task => {
            const actualTime = calculateWorkingHours(new Date(task.startTime!), new Date(task.endTime!));
            return {
                name: `Tarea ${task.id}`,
                'Tiempo Estimado': task.estimatedTime,
                'Tiempo Real (útil)': parseFloat(actualTime.toFixed(2)),
            };
        });

    const workerStats: WorkerStats[] = workers.map(worker => {
        const completedWorkerTasks = tasks.filter(task => 
            task.workerIds?.includes(worker.id) && 
            task.status === TaskStatus.Terminado &&
            task.startTime &&
            task.endTime
        );

        let totalHours = 0;
        let totalEstimated = 0;

        completedWorkerTasks.forEach(task => {
            const actualTime = calculateWorkingHours(new Date(task.startTime!), new Date(task.endTime!));
            totalHours += actualTime;
            totalEstimated += task.estimatedTime;
        });

        const efficiency = totalHours > 0 ? (totalEstimated / totalHours) * 100 : null;

        return {
            worker,
            completedTasks: completedWorkerTasks.length,
            totalHours,
            efficiency,
        };
    }).sort((a,b) => b.completedTasks - a.completedTasks);

    if (loading) {
        return <p>Cargando reportes...</p>
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Reportes de Producción y Productividad</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title="Producción Semanal (Ejemplo)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="producidos" fill="#3b82f6" name="Unidades Producidas" />
                            <Bar dataKey="objetivo" fill="#a78bfa" name="Objetivo Diario" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="Eficiencia de Tareas (Horas)">
                     {efficiencyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={efficiencyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Tiempo Estimado" fill="#8884d8" />
                                <Bar dataKey="Tiempo Real (útil)" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No hay suficientes datos de tareas completadas para mostrar.
                        </div>
                    )}
                </Card>
            </div>

             <Card title="Productividad por Funcionario">
                {workerStats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {workerStats.map(stats => (
                            <WorkerReportCard key={stats.worker.id} stats={stats} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No hay datos de funcionarios para mostrar.</p>
                )}
            </Card>
        </div>
    );
};

export default ReportsView;