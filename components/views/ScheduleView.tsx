import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { SHIFTS } from '../../constants';
import type { Worker } from '../../types';
import { supabase } from '../../supabaseClient';

const ShiftCard: React.FC<{ shift: 'Mañana' | 'Tarde' | 'Noche'; workers: Worker[] }> = ({ shift, workers }) => {
    let bgColor = 'bg-blue-100';
    if (shift === 'Tarde') bgColor = 'bg-yellow-100';
    if (shift === 'Noche') bgColor = 'bg-gray-200';

    return (
        <div className={`${bgColor} rounded-lg p-4`}>
            <h4 className="font-bold text-gray-800 mb-3">{shift} ({(shift === 'Mañana' ? '06:00 - 14:00' : shift === 'Tarde' ? '14:00 - 22:00' : '22:00 - 06:00')})</h4>
            <div className="flex -space-x-2 overflow-hidden">
                {workers.map(worker => (
                    <div key={worker.id}
                        className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-300 flex items-center justify-center text-gray-500"
                        title={worker.name}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScheduleView: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkers = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('workers').select('*');
            if (error) {
                console.error('Error fetching workers:', error);
            } else if (data) {
                setWorkers(data as Worker[]);
            }
            setLoading(false);
        };
        fetchWorkers();
    }, []);

    const daysOfWeek: ('Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes')[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    
    const hourlyWorkers = workers.filter(w => w.shift === 'Por hora');

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Horario de Turnos Semanal</h2>
            
            {loading ? (
                 <p>Cargando horarios...</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {daysOfWeek.map(day => {
                            // This logic is simplified; a real app would use the SHIFTS constant to find workers for a specific day.
                            // For this UI, we will filter by worker's primary shift property.
                            const morningWorkers = workers.filter(w => w.shift === 'Mañana' || w.shift === 'Todo el día');
                            const afternoonWorkers = workers.filter(w => w.shift === 'Tarde' || w.shift === 'Todo el día');
                            const nightWorkers = workers.filter(w => w.shift === 'Noche' || w.shift === 'Todo el día');

                            return (
                                <Card key={day} title={day} className="!p-0">
                                    <div className="p-4 space-y-3">
                                        <ShiftCard shift="Mañana" workers={morningWorkers} />
                                        <ShiftCard shift="Tarde" workers={afternoonWorkers} />
                                        <ShiftCard shift="Noche" workers={nightWorkers} />
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {hourlyWorkers.length > 0 && (
                        <Card title="Funcionarios con Horario Flexible (Por hora)" className="mt-8">
                            <div className="flex flex-wrap gap-4">
                                {hourlyWorkers.map(worker => (
                                    <div key={worker.id} className="flex items-center space-x-3 bg-gray-100 p-2 rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <span className="font-medium text-gray-700">{worker.name}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default ScheduleView;