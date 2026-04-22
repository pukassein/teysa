import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../supabaseClient';
import type { ActivityLog } from '../../types';

const ActivityLogView: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        // Clean old logs older than 30 days first (optional auto-clean, but usually better as a pg_cron. We do it client-side just to be safe if no cron exists)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        try {
            // Best effort cleanup
            await supabase.from('activity_logs').delete().lt('created_at', thirtyDaysAgo.toISOString());
            
            // Fetch recent ones
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) {
                console.error("Error fetching logs", error);
            } else {
                setLogs(data as ActivityLog[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getColorForAction = (action: string) => {
        if (action.includes('Ajuste')) return 'orange';
        if (action.includes('Activada')) return 'green';
        if (action.includes('Guardado')) return 'blue';
        if (action.includes('Registrada')) return 'gray';
        return 'purple';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Historial de Actividad (Últimos 30 días)</h2>
                <button onClick={fetchLogs} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition shadow-sm text-sm font-medium">
                    Actualizar
                </button>
            </div>

            <Card className="min-h-[400px]">
                {loading ? (
                    <p className="text-center text-gray-500 py-10">Cargando historial...</p>
                ) : logs.length > 0 ? (
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={getColorForAction(log.action_type) as any}>
                                            {log.action_type}
                                        </Badge>
                                        <span className="text-sm text-gray-500 font-medium">
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 text-base">
                                        {log.details}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p>No hay actividad reciente registrada.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ActivityLogView;
