import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import type { ProductionLog, Worker, InventoryItem, ProductionLogStatus } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import TrashIcon from '../icons/TrashIcon';
import SearchableSelect from '../ui/SearchableSelect';

type EnrichedProductionLog = ProductionLog & {
    workers: { name: string } | null;
    inventory: { name: string, unit: string } | null;
};

const LogFormModal: React.FC<{
    workers: Worker[];
    products: InventoryItem[];
    onClose: () => void;
    onSave: () => void;
    initialData?: EnrichedProductionLog;
}> = ({ workers, products, onClose, onSave, initialData }) => {
    const getTodayString = () => new Date().toISOString().split('T')[0];

    // worker_id might be null or undefined now, but we default to '' for the select
    const [workerId, setWorkerId] = useState<string>(initialData?.worker_id?.toString() || '');
    const [inventoryId, setInventoryId] = useState<string>(initialData?.inventory_id?.toString() || '');
    const [quantityUnits, setQuantityUnits] = useState<string>('');
    const [quantityDozens, setQuantityDozens] = useState<string>('');
    const [productionDate, setProductionDate] = useState<string>(initialData?.production_date || getTodayString());
    const [motivo, setMotivo] = useState<string>(initialData?.motivo || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedProduct = useMemo(() => products.find(p => p.id === Number(inventoryId)), [products, inventoryId]);

    useEffect(() => {
        if (initialData && selectedProduct) {
             const unit = selectedProduct.unit.toLowerCase();
             if (unit === 'docenas') {
                 setQuantityDozens(initialData.quantity.toString());
                 setQuantityUnits((initialData.quantity * 12).toString());
             } else {
                 setQuantityUnits(initialData.quantity.toString());
                 setQuantityDozens((initialData.quantity / 12).toString());
             }
        }
    }, [initialData, selectedProduct]);

    const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.');
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setQuantityUnits(val);
            if (val === '') {
                setQuantityDozens('');
            } else {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    const doz = num / 12;
                    setQuantityDozens(Number.isInteger(doz) ? doz.toString() : doz.toFixed(2));
                }
            }
        }
    };

    const handleDozensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.');
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setQuantityDozens(val);
            if (val === '') {
                setQuantityUnits('');
            } else {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    const units = num * 12;
                    setQuantityUnits(Number.isInteger(units) ? units.toString() : units.toFixed(2));
                }
            }
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let producedQuantity = 0;
        if (selectedProduct) {
            const productUnit = selectedProduct.unit.toLowerCase();
            if (productUnit === 'docenas') {
                producedQuantity = parseFloat(quantityDozens);
            } else {
                producedQuantity = parseFloat(quantityUnits);
            }
        }

        if (!inventoryId || !productionDate || isNaN(producedQuantity) || producedQuantity <= 0) {
            alert('Por favor, complete al menos el producto, la fecha y una cantidad válida.');
            return;
        }

        setIsSubmitting(true);
        const producedInventoryId = parseInt(inventoryId);

        const payload = {
            worker_id: workerId ? parseInt(workerId) : null,
            inventory_id: producedInventoryId,
            quantity: producedQuantity,
            production_date: productionDate,
            motivo: motivo,
            status: initialData ? initialData.status : 'Para guardar' as ProductionLogStatus
        };

        let logError;
        if (initialData) {
            const { error } = await supabase.from('production_log').update(payload).eq('id', initialData.id);
            logError = error;
        } else {
            const { error, data } = await supabase.from('production_log').insert(payload).select().single();
            logError = error;
            if (!error && data) {
                await supabase.from('activity_logs').insert({
                    action_type: 'Producción Registrada',
                    details: `Se registró lote de ${producedQuantity} ${selectedProduct?.unit || 'unidades'} de ${selectedProduct?.name || 'producto'}.`
                });
            }
        }

        setIsSubmitting(false);

        if (logError) {
            console.error('Error saving production log:', logError);
            alert('Error al registrar la producción: Asegúrate de haber actualizado la base de datos con las nuevas columnas (status, motivo). ' + logError.message);
            return;
        }

        onSave();
    };

    const productOptions = useMemo(() => products.map(p => ({
        id: p.id,
        label: p.name,
        subLabel: `${p.brand} - ${p.unit}`
    })), [products]);
    
    const isStandardUnit = !selectedProduct || ['unidades', 'docenas'].includes(selectedProduct.unit.toLowerCase());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">{initialData ? 'Editar Registro' : 'Nuevo Registro de Producción'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                                <SearchableSelect 
                                    options={productOptions}
                                    value={inventoryId}
                                    onChange={setInventoryId}
                                    placeholder="Buscar producto..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                                {isStandardUnit ? (
                                    <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <input type="text" inputMode="decimal" value={quantityUnits} onChange={handleUnitsChange} placeholder="Unidades" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <input type="text" inputMode="decimal" value={quantityDozens} onChange={handleDozensChange} placeholder="Docenas" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative rounded-md shadow-sm">
                                        <input type="text" inputMode="decimal" value={quantityUnits} onChange={handleUnitsChange} required placeholder="Ej: 60" className="w-full pr-16 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-sm">{selectedProduct?.unit || 'Unidad'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Funcionario (Opcional)</label>
                                <select value={workerId} onChange={e => setWorkerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="">Seleccionar...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                                <textarea 
                                    rows={2} 
                                    value={motivo} 
                                    onChange={e => setMotivo(e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded-md" 
                                    placeholder="Ej: Producción extra, reposición..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 space-x-3 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const ProductionLogView: React.FC = () => {
    const [logs, setLogs] = useState<EnrichedProductionLog[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<EnrichedProductionLog | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<ProductionLogStatus>('Para guardar');

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const logsPromise = supabase.from('production_log')
                .select('*, workers(name), inventory(name, unit)')
                .order('created_at', { ascending: false })
                .limit(400); // Fetch enough to filter

            const workersPromise = supabase.from('workers').select('*').order('name');
            const productsPromise = supabase.from('inventory').select('*').eq('type', 'Producto Terminado').order('name');
            
            const [logsResult, workersResult, productsResult] = await Promise.all([logsPromise, workersPromise, productsPromise]);

            if (logsResult.error) {
                console.error("Error fetching production logs:", logsResult.error);
            } else {
                setLogs(logsResult.data as EnrichedProductionLog[]);
            }
            
            if (workersResult.error) { console.error("Error fetching workers:", workersResult.error); setWorkers([]); } 
            else { setWorkers(workersResult.data as Worker[]); }

            if (productsResult.error) { console.error("Error fetching products:", productsResult.error); setProducts([]); } 
            else { setProducts(productsResult.data as InventoryItem[]); }

        } catch (error: any) {
            console.error("A critical error occurred while fetching log data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const changeTab = (tab: ProductionLogStatus) => {
        setActiveTab(tab);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleDelete = async (logId: number) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este registro?")) return;
        const { error } = await supabase.from('production_log').delete().eq('id', logId);
        if (error) alert("Error al eliminar el registro.");
        else {
            setLogs(currentLogs => currentLogs.filter(log => log.id !== logId));
            if (selectedIds.has(logId)) {
                const newSet = new Set(selectedIds);
                newSet.delete(logId);
                setSelectedIds(newSet);
            }
        }
    };

    const handleUpdateStatus = async (log: EnrichedProductionLog, newStatus: ProductionLogStatus) => {
        if (newStatus === 'Activar' as any) {
             if (!window.confirm(`¿Confirmas que deseas Activar esta producción? Se sumarán ${log.quantity} ${log.inventory?.unit} al inventario.`)) return;

             try {
                // Call atomic transaction to guarantee no double counting
                const { error: rpcError } = await supabase.rpc('activate_production_logs', {
                    log_ids: [log.id]
                });

                if (rpcError) {
                    throw new Error("Si ves esto, asegúrate de correr el código SQL en Supabase primero. Detalle: " + rpcError.message);
                }

                alert("¡Producción activada e inventario actualizado con éxito!");
                fetchData();
             } catch (err: any) {
                 console.error(err);
                 alert("Error al activar la producción: " + err.message);
             }
        } else {
             const { error } = await supabase.from('production_log').update({ status: newStatus }).eq('id', log.id);
             if (error) alert("Error cambiando estado.");
             else {
                 // Insert activity log
                 if (newStatus === 'Guardado') {
                     await supabase.from('activity_logs').insert({
                         action_type: 'Estado a Guardado',
                         details: `Lote de ${log.quantity} ${log.inventory?.unit || 'unid.'} de ${log.inventory?.name || 'producto'} marcado como Guardado.`
                     });
                 }

                 setLogs(current => current.map(l => l.id === log.id ? { ...l, status: newStatus } : l));
                 if (selectedIds.has(log.id)) {
                     const newSet = new Set(selectedIds);
                     newSet.delete(log.id);
                     setSelectedIds(newSet);
                 }
             }
        }
    };

    const handleBulkUpdateStatus = async (newStatus: ProductionLogStatus) => {
        if (!selectedIds.size) return;
        setIsProcessingBulk(true);
        const { error } = await supabase.from('production_log').update({ status: newStatus }).in('id', Array.from(selectedIds));
        if (error) {
            alert('Error: ' + error.message);
        } else {
            if (newStatus === 'Guardado') {
                await supabase.from('activity_logs').insert({
                    action_type: 'Estado a Guardado',
                    details: `Lote de ${selectedIds.size} registros marcados como Guardados en lote.`
                });
            }
            setSelectedIds(new Set());
            fetchData();
        }
        setIsProcessingBulk(false);
    };

    const handleBulkActivar = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`¿Confirmas que deseas Activar ${selectedIds.size} producciones? Se sumarán al inventario.`)) return;

        setIsProcessingBulk(true);
        try {
            const { error: rpcError } = await supabase.rpc('activate_production_logs', {
                log_ids: Array.from(selectedIds)
            });

            if (rpcError) {
                throw new Error("Asegúrate de correr el código SQL en Supabase primero. Detalle: " + rpcError.message);
            }

            alert("¡Producciones activadas e inventario actualizado con éxito!");
            setSelectedIds(new Set());
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert("Error al activar producciones: " + err.message);
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.size} registros?`)) return;
        setIsProcessingBulk(true);
        const { error } = await supabase.from('production_log').delete().in('id', Array.from(selectedIds));
        if (error) {
            alert('Error eliminando: ' + error.message);
        } else {
            setSelectedIds(new Set());
            fetchData();
        }
        setIsProcessingBulk(false);
    };

    const handleOpenEdit = (log: EnrichedProductionLog) => {
        setEditingLog(log);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingLog(undefined);
    };

    const handleSaveForm = () => {
        handleCloseForm();
        fetchData();
    };

    // Filter logs with defaults in case 'status' is null (from old data)
    const logsParaGuardar = logs.filter(l => (l.status || 'Para guardar') === 'Para guardar');
    const logsGuardado = logs.filter(l => l.status === 'Guardado');
    const logsArchivado = logs.filter(l => l.status === 'Archivado');

    const currentList = activeTab === 'Para guardar' ? logsParaGuardar : activeTab === 'Guardado' ? logsGuardado : logsArchivado;

    const toggleSelectAll = () => {
        if (selectedIds.size === currentList.length && currentList.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentList.map(l => l.id)));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Registro de Producción</h2>
                <button onClick={() => setIsFormOpen(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm transition">
                    + Nuevo Registro
                </button>
            </div>

            {isFormOpen && (
                <LogFormModal 
                    workers={workers} 
                    products={products} 
                    onClose={handleCloseForm} 
                    onSave={handleSaveForm} 
                    initialData={editingLog} 
                />
            )}
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => changeTab('Para guardar')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Para guardar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Para guardar ({logsParaGuardar.length})
                    </button>
                    <button onClick={() => changeTab('Guardado')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Guardado' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Guardado ({logsGuardado.length})
                    </button>
                    <button onClick={() => changeTab('Archivado')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Archivado' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Archivado
                    </button>
                </nav>
            </div>
            
            <div className="my-4">
                {activeTab !== 'Archivado' && currentList.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" 
                                checked={selectedIds.size > 0 && selectedIds.size === currentList.length}
                                onChange={toggleSelectAll}
                            />
                            <span className="font-medium text-gray-700 select-none">Seleccionar todos</span>
                        </label>
                        {selectedIds.size > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600 self-center hidden sm:block mr-2">{selectedIds.size} seleccionados</span>
                                {activeTab === 'Para guardar' && (
                                    <>
                                        <button disabled={isProcessingBulk} onClick={handleBulkDelete} className="px-3 py-1.5 text-red-600 bg-white border border-gray-300 hover:bg-red-50 rounded text-sm transition font-medium">Eliminar</button>
                                        <button disabled={isProcessingBulk} onClick={() => handleBulkUpdateStatus('Guardado')} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm text-sm transition font-medium">Pasar a Guardado</button>
                                    </>
                                )}
                                {activeTab === 'Guardado' && (
                                    <>
                                        <button disabled={isProcessingBulk} onClick={() => handleBulkUpdateStatus('Para guardar')} className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded text-sm transition font-medium">Revertir</button>
                                        <button disabled={isProcessingBulk} onClick={handleBulkActivar} className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition shadow-sm font-medium">Activar {selectedIds.size} Registros</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Card className="min-h-[400px]">
                 {loading ? (
                    <p className="text-center text-gray-500 py-10">Cargando registros...</p>
                 ) : currentList.length > 0 ? (
                    <div className="space-y-4">
                        {currentList.map(log => (
                            <div key={log.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition gap-4">
                                <div className="flex items-start gap-3 flex-1 w-full">
                                    {activeTab !== 'Archivado' && (
                                        <input type="checkbox" className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer"
                                            checked={selectedIds.has(log.id)}
                                            onChange={() => toggleSelection(log.id)}
                                        />
                                    )}
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-800 text-lg">{log.inventory?.name || 'Producto Desconocido'}</span>
                                            <Badge color={activeTab === 'Para guardar' ? 'blue' : activeTab === 'Guardado' ? 'green' : 'gray'}>
                                                {log.status || 'Para guardar'}
                                            </Badge>
                                        </div>
                                        <p className="text-gray-600">
                                            Cantidad: <span className="font-bold">{log.quantity}</span> {log.inventory?.unit}
                                        </p>
                                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span>📅 {new Date(log.production_date + 'T00:00:00').toLocaleDateString()}</span>
                                            {log.workers?.name && <span>👤 {log.workers.name}</span>}
                                            <span title={new Date(log.created_at).toLocaleString()}>⏱ {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        {log.motivo && (
                                            <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border inline-block">
                                                <span className="font-medium text-gray-800">Motivo:</span> {log.motivo}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0 items-center">
                                    {activeTab === 'Para guardar' && (
                                        <>
                                            <button onClick={() => handleOpenEdit(log)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition flex-1 md:flex-none text-center">
                                                Editar
                                            </button>
                                            <button onClick={() => handleUpdateStatus(log, 'Guardado')} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-1 md:flex-none text-center shadow-sm">
                                                A Guardado
                                            </button>
                                            <button onClick={() => handleDelete(log.id)} className="p-1.5 bg-white border border-gray-300 text-red-600 rounded hover:bg-red-50 transition" title="Eliminar registro">
                                                <TrashIcon className="w-5 h-5 mx-auto" />
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'Guardado' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(log, 'Para guardar')} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm flex-1 md:flex-none text-center">
                                                Revertir
                                            </button>
                                            <button onClick={() => handleUpdateStatus(log, 'Activar' as any)} className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition shadow-sm flex-1 md:flex-none text-center">
                                                Activar
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'Archivado' && (
                                         <span className="text-sm italic text-gray-400 px-2 py-1 bg-gray-50 rounded">Lectura</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-16 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <p>No hay registros en este estado.</p>
                    </div>
                 )}
            </Card>
        </div>
    );
};

export default ProductionLogView;