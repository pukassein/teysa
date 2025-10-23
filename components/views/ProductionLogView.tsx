import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import type { ProductionLog, Worker, InventoryItem } from '../../types';
import Card from '../ui/Card';
import TrashIcon from '../icons/TrashIcon';

type EnrichedProductionLog = ProductionLog & {
    workers: { name: string } | null;
    inventory: { name: string, unit: string } | null;
};

const ProductionLogForm: React.FC<{
    workers: Worker[];
    products: InventoryItem[];
    onLogAdded: () => void;
}> = ({ workers, products, onLogAdded }) => {
    const getTodayString = () => new Date().toISOString().split('T')[0];

    const [workerId, setWorkerId] = useState<string>('');
    const [inventoryId, setInventoryId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [productionDate, setProductionDate] = useState<string>(getTodayString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workerId || !inventoryId || !quantity || !productionDate) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        setIsSubmitting(true);
        const producedQuantity = parseInt(quantity);
        const producedInventoryId = parseInt(inventoryId);

        // 1. Log the production
        const { error: logError } = await supabase.from('production_log').insert({
            worker_id: parseInt(workerId),
            inventory_id: producedInventoryId,
            quantity: producedQuantity,
            production_date: productionDate,
        });

        if (logError) {
            console.error('Error logging production:', logError);
            alert('Error al registrar la producción: ' + logError.message);
            setIsSubmitting(false);
            return;
        }

        // 2. Update inventory (increase finished product, decrease raw materials)
        try {
            // A. Increase stock of the finished product
            const { data: currentProductStock, error: productStockError } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('id', producedInventoryId)
                .single();

            if (productStockError) throw productStockError;

            await supabase
                .from('inventory')
                .update({ quantity: currentProductStock.quantity + producedQuantity })
                .eq('id', producedInventoryId);

            // B. Find the product recipe and decrease raw materials
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('finished_product_inventory_id', producedInventoryId)
                .single();

            if (productError) {
                console.warn(`No recipe found for inventory item ${producedInventoryId}. Only product stock was updated.`);
            } else if (productData) {
                const { data: recipeItems, error: recipeError } = await supabase
                    .from('product_recipes')
                    .select('*')
                    .eq('product_id', productData.id);
                
                if (recipeError) throw recipeError;

                // Create a transaction of updates for raw materials
                const updatePromises = recipeItems.map(async (item) => {
                    const requiredQty = item.quantity_required * producedQuantity;
                    const { data: material, error: materialError } = await supabase
                        .from('inventory')
                        .select('quantity')
                        .eq('id', item.raw_material_inventory_id)
                        .single();
                    
                    if (materialError) throw materialError;

                    return supabase
                        .from('inventory')
                        .update({ quantity: material.quantity - requiredQty })
                        .eq('id', item.raw_material_inventory_id);
                });

                await Promise.all(updatePromises);
            }
            alert("¡Producción registrada y stock actualizado con éxito!");
        } catch(inventoryError: any) {
            console.error("Error updating inventory:", inventoryError);
            alert("Producción registrada, pero hubo un error al actualizar el stock: " + inventoryError.message);
        }

        // 3. Reset form and refresh data
        setWorkerId('');
        setInventoryId('');
        setQuantity('');
        onLogAdded();
        setIsSubmitting(false);
    };
    
    return (
        <Card title="Registrar Producción Diaria" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="production_date" className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" id="production_date" value={productionDate} onChange={e => setProductionDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="worker" className="block text-sm font-medium text-gray-700">Funcionario</label>
                        <select id="worker" value={workerId} onChange={e => setWorkerId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="" disabled>Seleccionar...</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product" className="block text-sm font-medium text-gray-700">Producto</label>
                        <select id="product" value={inventoryId} onChange={e => setInventoryId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                             <option value="" disabled>Seleccionar...</option>
                             {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex-1">
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
                            <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" placeholder="Ej: 60" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                         <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 self-end">
                            {isSubmitting ? 'Registrando...' : 'Registrar'}
                        </button>
                    </div>
                </div>
            </form>
        </Card>
    )
}

const ProductionLogView: React.FC = () => {
    const [logs, setLogs] = useState<EnrichedProductionLog[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const logsPromise = supabase.from('production_log')
                .select('*, workers(name), inventory(name, unit)')
                .order('production_date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(100);

            const workersPromise = supabase.from('workers').select('*').order('name');
            const productsPromise = supabase.from('inventory').select('*').order('name');
            
            const [
                logsResult,
                workersResult,
                productsResult
            ] = await Promise.all([logsPromise, workersPromise, productsPromise]);

            if (logsResult.error) {
                console.error("Error fetching production logs:", logsResult.error);
            } else {
                setLogs(logsResult.data as EnrichedProductionLog[]);
            }
            
            if (workersResult.error) {
                console.error("Error fetching workers:", workersResult.error);
                alert(`Error al cargar la lista de funcionarios: ${workersResult.error.message}`);
                setWorkers([]);
            } else {
                setWorkers(workersResult.data as Worker[]);
            }

            if (productsResult.error) {
                console.error("Error fetching products:", productsResult.error);
                alert(`Error al cargar la lista de productos: ${productsResult.error.message}`);
                setProducts([]);
            } else {
                setProducts(productsResult.data as InventoryItem[]);
            }

        } catch (error: any) {
            console.error("A critical error occurred while fetching production log data:", error);
            alert("Ocurrió un error inesperado al cargar los datos. Por favor, revise la consola.");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (logId: number) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este registro? Esta acción NO revierte los cambios de stock.")) return;

        const { error } = await supabase.from('production_log').delete().eq('id', logId);
        
        if (error) {
            console.error("Error deleting log:", error);
            alert("Error al eliminar el registro: " + error.message);
        } else {
            setLogs(currentLogs => currentLogs.filter(log => log.id !== logId));
        }
    };

    const groupedLogs = useMemo(() => {
        return logs.reduce((acc, log) => {
            const date = log.production_date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(log);
            return acc;
        }, {} as Record<string, EnrichedProductionLog[]>);
    }, [logs]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Registro de Producción</h2>

            <ProductionLogForm workers={workers} products={products} onLogAdded={fetchData} />
            
            <Card title="Registros Recientes">
                 {loading ? (
                    <p className="text-center text-gray-500 py-4">Cargando registros...</p>
                 ) : Object.keys(groupedLogs).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedLogs).map(([date, logsForDate]) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold text-gray-700 pb-2 mb-3 border-b">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <div className="space-y-2">
                                    {logsForDate.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg group">
                                            <div>
                                                <p className="font-semibold text-gray-800">{log.workers?.name || 'Funcionario no encontrado'}</p>
                                                <p className="text-sm text-gray-600">
                                                    Produjo <span className="font-bold text-gray-800">{log.quantity}</span> {log.inventory?.unit || ''} de <span className="font-semibold text-gray-800">{log.inventory?.name || 'Producto no encontrado'}</span>
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(log.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Eliminar registro"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-center text-gray-500 py-4">No hay registros de producción. ¡Añade el primero!</p>
                 )}
            </Card>
        </div>
    );
};

export default ProductionLogView;