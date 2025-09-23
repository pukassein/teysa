
import React from 'react';
import Card from '../ui/Card';
import { QUALITY_ISSUES, TASKS, WORKERS } from '../../constants';

const QualityView: React.FC = () => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Control de Calidad</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Registrar Nuevo Problema">
                    <form className="space-y-4">
                        <div>
                            <label htmlFor="task" className="block text-sm font-medium text-gray-700">Tarea Afectada</label>
                            <select id="task" name="task" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {TASKS.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción del Problema</label>
                            <textarea id="description" name="description" rows={3} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"></textarea>
                        </div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Registrar
                        </button>
                    </form>
                </Card>

                <Card title="Problemas Reportados">
                   <div className="space-y-4 max-h-96 overflow-y-auto">
                        {QUALITY_ISSUES.map(issue => {
                            const task = TASKS.find(t => t.id === issue.taskId);
                            const reporter = WORKERS.find(w => w.id === issue.reportedBy);
                            return (
                                <div key={issue.id} className={`p-3 rounded-lg ${issue.resolved ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{task?.title || 'Tarea desconocida'}</p>
                                            <p className="text-sm text-gray-600">{issue.description}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${issue.resolved ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {issue.resolved ? 'Resuelto' : 'Abierto'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Reportado por {reporter?.name} el {issue.timestamp.toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            );
                        })}
                   </div>
                </Card>
            </div>
        </div>
    );
};

export default QualityView;