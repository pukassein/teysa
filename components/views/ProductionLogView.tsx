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
                const qtyTotal = initialData.cantidad_total ?? initialData.quantity ?? 0;
                const unit = selectedProduct.unit.toLowerCase();
                if (unit === 'docenas') {
                    setQuantityDozens(qtyTotal.toString());
                    setQuantityUnits((qtyTotal * 12).toString());
                } else {
                    setQuantityUnits(qtyTotal.toString());
                    setQuantityDozens((qtyTotal / 12).toString());
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
                        setQuantityDozens(doz.toFixed(2));
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
                        setQuantityUnits(Math.ceil(units).toString());
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
                    producedQuantity = parseFloat(quantityUnits) / 12;
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
                cantidad_total: producedQuantity,
                cantidad_restante: producedQuantity,
                production_date: productionDate,
                motivo: motivo,
                status: initialData ? initialData.status : 'Para empaquetar' as ProductionLogStatus
            };

            let logError;
            if (initialData) {
                // Keep original amount but logic for editing needs more thought if partial processed. Overriding fully for now.
                const { error } = await supabase.from('production_log').update(payload).eq('id', initialData.id);
                logError = error;
            } else {
                // Buscamos si ya existe un registro activo (Para empaquetar) para este mismo producto
                const { data: existingActiveLog } = await supabase
                    .from('production_log')
                    .select('*')
                    .eq('inventory_id', producedInventoryId)
                    .eq('status', 'Para empaquetar')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingActiveLog) {
                    // Acumulamos las cantidades
                    const prevTotal = existingActiveLog.cantidad_total ?? existingActiveLog.quantity ?? 0;
                    const prevRestante = existingActiveLog.cantidad_restante ?? existingActiveLog.stored_quantity ?? prevTotal;
                    
                    const newTotal = prevTotal + producedQuantity;
                    const newRestante = prevRestante + producedQuantity;
                    
                    const updateFields: any = { 
                        cantidad_total: newTotal,
                        cantidad_restante: newRestante,
                        quantity: newTotal, // fallback
                    };
                    if (motivo) {
                        updateFields.motivo = existingActiveLog.motivo ? `${existingActiveLog.motivo} | ${motivo}` : motivo;
                    }
                    if (new Date(productionDate) > new Date(existingActiveLog.production_date)) {
                        updateFields.production_date = productionDate;
                    }

                    const { error, data } = await supabase
                        .from('production_log')
                        .update(updateFields)
                        .eq('id', existingActiveLog.id)
                        .select()
                        .single();
                    
                    logError = error;
                    if (!error && data) {
                        await supabase.from('activity_logs').insert({
                            action_type: 'Producción Acumulada',
                            details: `Se sumaron ${producedQuantity} ${selectedProduct?.unit || 'unidades'} a un lote activo de ${selectedProduct?.name || 'producto'}. Total a guardar ahora: ${newTotal}.`
                        });
                    }
                } else {
                    // Insertamos uno nuevo con compatibilidad backwards
                    const { error, data } = await supabase.from('production_log').insert({
                        ...payload,
                        quantity: producedQuantity // fall-back
                    }).select().single();
                    logError = error;
                    if (!error && data) {
                        await supabase.from('activity_logs').insert({
                            action_type: 'Producción Registrada',
                            details: `Se registró lote de ${producedQuantity} ${selectedProduct?.unit || 'unidades'} de ${selectedProduct?.name || 'producto'}.`
                        });
                    }
                }
            }

            setIsSubmitting(false);

            if (logError) {
                console.error('Error saving production log:', logError);
                alert('Error al registrar la producción: Asegúrate de haber actualizado la base de datos con las nuevas columnas (cantidad_total, cantidad_restante). ' + logError.message);
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a guardar *</label>
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
        const [activeTab, setActiveTab] = useState<ProductionLogStatus>('Para empaquetar');

        const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
        const [isProcessingBulk, setIsProcessingBulk] = useState(false);

        // State for Partial Process modal
        const [actionLog, setActionLog] = useState<EnrichedProductionLog | null>(null);
        const [actionType, setActionType] = useState<'empaquetar' | 'guardar' | null>(null);
        const [actionQuantityUnits, setActionQuantityUnits] = useState<string>('');
        const [actionQuantityDozens, setActionQuantityDozens] = useState<string>('');
        const [actionIsSubmitting, setActionIsSubmitting] = useState(false);
        
        // State for delete confirmation
        const [deleteLogId, setDeleteLogId] = useState<number | null>(null);

        const fetchData = async () => {
            setLoading(true);
            try {
                const logsPromise = supabase.from('production_log')
                    .select('*, workers(name), inventory(name, unit, quantity)')
                    .order('created_at', { ascending: false })
                    .limit(400);

                const workersPromise = supabase.from('workers').select('*').order('name');
                const productsPromise = supabase.from('inventory').select('*').eq('type', 'Producto Terminado').order('name');
                
                const [logsResult, workersResult, productsResult] = await Promise.all([logsPromise, workersPromise, productsPromise]);

                if (logsResult.error) {
                    console.error("Error fetching production logs:", logsResult.error);
                } else {
                    setLogs(logsResult.data as EnrichedProductionLog[]);
                }
                if (workersResult.data) setWorkers(workersResult.data as Worker[]);
                if (productsResult.data) setProducts(productsResult.data as InventoryItem[]);

            } catch (error: any) {
                console.error("Critical error fetching log data:", error);
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

        const handleDelete = async () => {
            if (!deleteLogId) return;
            const { error } = await supabase.from('production_log').delete().eq('id', deleteLogId);
            if (error) alert("Error al eliminar el registro: " + error.message);
            else fetchData();
            setDeleteLogId(null);
        };

        // The manual bulk "Activar" is deprecated in favor of 'Procesar parte' direct logic 
        // but we can keep it for legacy Guardado support if they still need it. Or just fail gracefully.
        
        const handleRevertStatus = async (log: EnrichedProductionLog) => {
            const { error } = await supabase.from('production_log').update({ status: 'Para empaquetar' }).eq('id', log.id);
            if (error) alert("Error revirtiendo.");
            else fetchData();
        };

        const handleAction = async () => {
            if (!actionLog) return;
            
            let parsedInput = 0;
            if (actionLog.inventory?.unit?.toLowerCase() === 'docenas') {
                parsedInput = parseFloat(actionQuantityDozens || '0');
            } else {
                parsedInput = parseFloat(actionQuantityUnits || '0');
            }
            
            if (isNaN(parsedInput) || parsedInput <= 0) {
                alert('Por favor, ingresa una cantidad válida mayor a 0.');
                return;
            }

            const logRemaining = actionLog.cantidad_restante ?? actionLog.quantity ?? 0;
            const EPSILON = 0.001;
            
            if (parsedInput > logRemaining + EPSILON) {
                alert(`La cantidad procesada (${parsedInput}) no puede ser mayor a la cantidad restante (${logRemaining}).`);
                return;
            }
            
            // Adjust to exact remaining if difference is tiny floating point error
            if (parsedInput > logRemaining) {
                parsedInput = logRemaining;
            }

            setActionIsSubmitting(true);
            try {
                const newRestante = logRemaining - parsedInput;
                const newStatus = newRestante <= 0 ? 'Archivado' : actionLog.status;
                
                if (actionType === 'empaquetar') {
                    // 1. Move to "Para guardar"
                    const { data: existingActiveLog } = await supabase
                        .from('production_log')
                        .select('*')
                        .eq('inventory_id', actionLog.inventory_id)
                        .eq('status', 'Para guardar')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (existingActiveLog) {
                        const prevTotal = existingActiveLog.cantidad_total ?? existingActiveLog.quantity ?? 0;
                        const prevRestante = existingActiveLog.cantidad_restante ?? existingActiveLog.stored_quantity ?? prevTotal;
                        
                        const newTotal = prevTotal + parsedInput;
                        const newPGRestante = prevRestante + parsedInput;
                        
                        const { error } = await supabase.from('production_log').update({ 
                            cantidad_total: newTotal,
                            cantidad_restante: newPGRestante,
                            quantity: newPGRestante, // keep quantity in sync with pending Amount
                            production_date: new Date().toISOString().split('T')[0]
                        }).eq('id', existingActiveLog.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('production_log').insert({
                            worker_id: actionLog.worker_id,
                            inventory_id: actionLog.inventory_id,
                            cantidad_total: parsedInput,
                            cantidad_restante: parsedInput,
                            quantity: parsedInput,
                            production_date: new Date().toISOString().split('T')[0],
                            motivo: 'Empaquetado y pendiente de guardar',
                            status: 'Para guardar'
                        });
                        if (error) throw error;
                    }

                    // Update current Para empaquetar log
                    const updatePayload: any = { 
                        cantidad_restante: newRestante, 
                        status: newStatus 
                    };
                    if (newRestante > 0) updatePayload.quantity = newRestante;

                    const { error: logErr } = await supabase.from('production_log')
                        .update(updatePayload)
                        .eq('id', actionLog.id);
                    if (logErr) throw logErr;

                    await supabase.from('activity_logs').insert({
                        action_type: 'Producción Empaquetada',
                        details: `Se empaquetaron ${parsedInput} ${actionLog.inventory?.unit} del lote de ${actionLog.inventory?.name}. Listos para guardar.`
                    });
                } else if (actionType === 'guardar') {
                    // 1. Update Inventory 
                    const { data: invData, error: invFetchErr } = await supabase.from('inventory').select('quantity').eq('id', actionLog.inventory_id).single();
                    if (invFetchErr) throw invFetchErr;

                    const { error: invErr } = await supabase.from('inventory')
                        .update({ quantity: invData.quantity + parsedInput })
                        .eq('id', actionLog.inventory_id);
                    if (invErr) throw invErr;

                    // Log movement
                    await supabase.from('inventory_movements').insert({
                        inventory_id: actionLog.inventory_id,
                        type: 'Entrada',
                        quantity_change: parsedInput,
                        reference: 'Guardado de Producción',
                        details: `Se empaquetaron y guardaron en inventario finalmente ${parsedInput} ${actionLog.inventory?.unit} del lote de producción.`
                    });

                    // 2. Update current Para guardar log
                    const updatePayload: any = { 
                        cantidad_restante: newRestante, 
                        status: newStatus 
                    };
                    if (newRestante > 0) updatePayload.quantity = newRestante;

                    const { error: logErr } = await supabase.from('production_log')
                        .update(updatePayload)
                        .eq('id', actionLog.id);
                    if (logErr) throw logErr;

                    // 3. Activity Log
                    await supabase.from('activity_logs').insert({
                        action_type: 'Producción Guardada en Inventario',
                        details: `Se sumaron al stock ${parsedInput} ${actionLog.inventory?.unit} del lote de ${actionLog.inventory?.name}.`
                    });
                }

                fetchData();
                setActionLog(null);
                setActionType(null);
                setActionQuantityUnits('');
                setActionQuantityDozens('');
            } catch (err: any) {
                alert("Error al procesar: " + err.message);
            } finally {
                setActionIsSubmitting(false);
            }
        };

        const handleOpenActionModal = (log: EnrichedProductionLog, type: 'empaquetar' | 'guardar') => {
            setActionLog(log);
            setActionType(type);
            
            const remaining = log.cantidad_restante ?? log.quantity ?? 0;
            const unit = log.inventory?.unit?.toLowerCase();
            
            if (unit === 'docenas') {
                setActionQuantityDozens(remaining.toString());
                setActionQuantityUnits(Math.ceil(remaining * 12).toString());
            } else {
                setActionQuantityUnits(remaining.toString());
                setActionQuantityDozens((remaining / 12).toFixed(2));
            }
        };

        // Filter logs properly mapping old legacy values
        const logsParaEmpaquetar = logs.filter(l => (l.status === 'Para empaquetar' || !l.status));
        const logsParaGuardar = logs.filter(l => l.status === 'Para guardar' || l.status === 'Guardado'); // For legacy support if any are stuck here
        const logsArchivado = logs.filter(l => l.status === 'Archivado');

        const currentList = activeTab === 'Para empaquetar' ? logsParaEmpaquetar : activeTab === 'Para guardar' ? logsParaGuardar : logsArchivado;

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
                        onClose={() => setIsFormOpen(false)} 
                        onSave={() => { setIsFormOpen(false); fetchData(); }} 
                        initialData={editingLog} 
                    />
                )}

                {/* Modal de Confirmación de Eliminación */}
                {deleteLogId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
                            <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2 text-gray-800">Eliminar Registro</h3>
                            <p className="text-gray-600 mb-6">
                                ¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteLogId(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium">Cancelar</button>
                                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-sm">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {actionLog && actionType && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">
                                {actionType === 'empaquetar' ? 'Empaquetar Cantidad' : 'Guardar en Inventario'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                {actionType === 'empaquetar' ? 
                                    <span>Ingresa la cantidad que deseas <strong>empaquetar</strong> (se moverá a Para Guardar) para <strong>{actionLog.inventory?.name}</strong>.</span> 
                                    : 
                                    <span>Ingresa la cantidad que deseas <strong>guardar en el inventario final</strong> para <strong>{actionLog.inventory?.name}</strong>.</span>
                                }
                                <br/>
                                <span className="text-gray-500 mt-1 inline-block">
                                    Total del lote aquí: <strong>{Number((actionLog.cantidad_total ?? actionLog.quantity ?? 0).toFixed(2))}</strong> {actionLog.inventory?.unit} <br/>
                                    Restante sin procesar: <strong>{Number((actionLog.cantidad_restante ?? actionLog.quantity ?? 0).toFixed(2))}</strong> {actionLog.inventory?.unit}
                                </span>
                            </p>
                            
                            <div className="mb-6">
                                {['unidades', 'docenas'].includes((actionLog.inventory?.unit || '').toLowerCase()) ? (
                                    <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Unidades</label>
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                value={actionQuantityUnits} 
                                                onChange={e => {
                                                    const val = e.target.value.replace(',', '.');
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        setActionQuantityUnits(val);
                                                        if (val === '') {
                                                            setActionQuantityDozens('');
                                                        } else {
                                                            const num = parseFloat(val);
                                                            if (!isNaN(num)) {
                                                                const doz = num / 12;
                                                                setActionQuantityDozens(doz.toFixed(2));
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Unidades"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Docenas</label>
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                value={actionQuantityDozens} 
                                                onChange={e => {
                                                    const val = e.target.value.replace(',', '.');
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        setActionQuantityDozens(val);
                                                        if (val === '') {
                                                            setActionQuantityUnits('');
                                                        } else {
                                                            const num = parseFloat(val);
                                                            if (!isNaN(num)) {
                                                                const units = num * 12;
                                                                setActionQuantityUnits(Math.ceil(units).toString());
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Docenas"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad a procesar ahora:</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <input 
                                                type="number" 
                                                step="any"
                                                value={actionQuantityUnits} 
                                                onChange={e => setActionQuantityUnits(e.target.value)}
                                                className="w-full pr-16 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                autoFocus
                                                max={actionLog.cantidad_restante ?? actionLog.quantity}
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 text-sm">{actionLog.inventory?.unit || 'Unidad'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button onClick={() => { setActionLog(null); setActionType(null); }} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium">Cancelar</button>
                                <button onClick={handleAction} disabled={actionIsSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50">
                                    {actionIsSubmitting ? 'Procesando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                        <button onClick={() => changeTab('Para empaquetar')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Para empaquetar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Para empaquetar ({logsParaEmpaquetar.length})
                        </button>
                        <button onClick={() => changeTab('Para guardar')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Para guardar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Para guardar ({logsParaGuardar.length})
                        </button>
                        <button onClick={() => changeTab('Archivado')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'Archivado' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Archivado
                        </button>
                    </nav>
                </div>

                <div className="my-6">
                    <Card className="min-h-[400px]">
                        {loading ? (
                            <p className="text-center text-gray-500 py-10">Cargando registros...</p>
                        ) : currentList.length > 0 ? (
                            <div className="space-y-4">
                                {currentList.map(log => {
                                    const total = log.cantidad_total ?? log.quantity ?? 0;
                                    const remaining = log.cantidad_restante ?? log.quantity ?? 0;
                                    const processed = total - remaining;
                                    const percentage = total > 0 ? ((processed / total) * 100).toFixed(0) : 0;

                                    return (
                                    <div key={log.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition gap-4">
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-semibold text-gray-800 text-lg">{log.inventory?.name || 'Producto Desconocido'}</span>
                                                <Badge color={activeTab === 'Para empaquetar' ? 'blue' : activeTab === 'Para guardar' ? 'yellow' : 'gray'}>
                                                    {log.status === 'Guardado' ? 'Para guardar' : log.status}
                                                </Badge>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-3 rounded border my-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">TOTAL LOTE</p>
                                                    <p className="text-lg font-bold text-gray-800">{Number(total.toFixed(2))} <span className="text-sm font-normal text-gray-500">{log.inventory?.unit}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">PROCESADO</p>
                                                    <p className="text-lg font-bold text-green-600">{Number(processed.toFixed(2))} <span className="text-sm font-normal text-gray-500">{log.inventory?.unit}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">RESTANTE</p>
                                                    <p className="text-lg font-bold text-blue-600">{Number(remaining.toFixed(2))} <span className="text-sm font-normal text-gray-500">{log.inventory?.unit}</span></p>
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Progreso</span>
                                                        <span className="font-medium">{percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
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
                                        
                                        <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0 items-center justify-end">
                                            {activeTab === 'Para empaquetar' && (
                                                <>
                                                    {remaining > 0 && (
                                                        <button onClick={() => handleOpenActionModal(log, 'empaquetar')} className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition shadow-sm">
                                                            Empaquetar Parte
                                                        </button>
                                                    )}
                                                        <button onClick={() => setDeleteLogId(log.id)} className="p-2 bg-white border border-gray-300 text-red-600 rounded hover:bg-red-50 transition" title="Eliminar registro">
                                                        <TrashIcon className="w-5 h-5 mx-auto" />
                                                    </button>
                                                </>
                                            )}
                                            {activeTab === 'Para guardar' && (
                                                <div className="flex gap-2">
                                                    {remaining > 0 && (
                                                        <button onClick={() => handleOpenActionModal(log, 'guardar')} className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition shadow-sm">
                                                            Guardar en Inventario
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleRevertStatus(log)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm">
                                                        Revertir a Para empaquetar
                                                    </button>
                                                </div>
                                            )}
                                            {activeTab === 'Archivado' && (
                                                <span className="text-sm italic text-gray-400 px-2 py-1 bg-gray-50 rounded">Proceso Completado</span>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                <p>No hay registros en este estado.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        );
    };

    export default ProductionLogView;
