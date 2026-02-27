import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import type { ProductionLog, Worker, InventoryItem } from '../../types';
import Card from '../ui/Card';
import TrashIcon from '../icons/TrashIcon';

type EnrichedProductionLog = ProductionLog & {
    workers: { name: string } | null;
    inventory: { name: string, unit: string } | null;
};

import SearchableSelect from '../ui/SearchableSelect';

const ProductionLogForm: React.FC<{
    workers: Worker[];
    products: InventoryItem[];
    onLogAdded: () => void;
}> = ({ workers, products, onLogAdded }) => {
    const getTodayString = () => new Date().toISOString().split('T')[0];

    const [workerId, setWorkerId] = useState<string>('');
    const [inventoryId, setInventoryId] = useState<string>('');
    const [quantityUnits, setQuantityUnits] = useState<string>('');
    const [quantityDozens, setQuantityDozens] = useState<string>('');
    const [productionDate, setProductionDate] = useState<string>(getTodayString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedProduct = useMemo(() => products.find(p => p.id === Number(inventoryId)), [products, inventoryId]);

    // Reset inputs when product changes
    useEffect(() => {
        setQuantityUnits('');
        setQuantityDozens('');
    }, [selectedProduct]);

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

        if (!workerId || !inventoryId || !productionDate || isNaN(producedQuantity) || producedQuantity <= 0) {
            alert('Por favor, complete todos los campos con valores válidos.');
            return;
        }

        setIsSubmitting(true);
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

            // Log movement for finished product
            await supabase.from('inventory_movements').insert({
                inventory_id: producedInventoryId,
                quantity_change: producedQuantity,
                type: 'Entrada',
                reason: 'Producción registrada'
            });

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

                if (Array.isArray(recipeItems)) {
                    // Create a transaction of updates for raw materials
                    const updatePromises = recipeItems.map(async (item) => {
                        const requiredQty = item.quantity_required * producedQuantity;
                        const { data: material, error: materialError } = await supabase
                            .from('inventory')
                            .select('quantity')
                            .eq('id', item.raw_material_inventory_id)
                            .single();
                        
                        if (materialError) throw materialError;

                        if (!material) {
                            throw new Error(`Material with id ${item.raw_material_inventory_id} not found in inventory.`);
                        }

                        const { error: updateError } = await supabase
                            .from('inventory')
                            .update({ quantity: material.quantity - requiredQty })
                            .eq('id', item.raw_material_inventory_id);

                        if (updateError) throw updateError;

                        // Log movement for raw material
                        await supabase.from('inventory_movements').insert({
                            inventory_id: item.raw_material_inventory_id,
                            quantity_change: -requiredQty,
                            type: 'Salida',
                            reason: 'Consumo producción'
                        });
                    });

                    await Promise.all(updatePromises);
                }
            }
            alert("¡Producción registrada y stock actualizado con éxito!");
        } catch(inventoryError: any) {
            console.error("Error updating inventory:", inventoryError);
            alert("Producción registrada, pero hubo un error al actualizar el stock: " + inventoryError.message);
        }

        // 3. Reset form and refresh data
        setWorkerId('');
        setInventoryId('');
        setQuantityUnits('');
        setQuantityDozens('');
        onLogAdded();
        setIsSubmitting(false);
    };

    const productOptions = useMemo(() => products.map(p => ({
        id: p.id,
        label: p.name,
        subLabel: `${p.brand} - ${p.unit}`
    })), [products]);
    
    // Always show dual inputs unless it's a unit that doesn't make sense (like kg/m), 
    // but for now we default to showing them to meet the request "make it always show".
    const isStandardUnit = !selectedProduct || ['unidades', 'docenas'].includes(selectedProduct.unit.toLowerCase());

    return (
        <Card title="Registrar Producción Diaria" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="production_date" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input type="date" id="production_date" value={productionDate} onChange={e => setProductionDate(e.target.value)} required className="block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="worker" className="block text-sm font-medium text-gray-700 mb-1">Funcionario</label>
                        <select id="worker" value={workerId} onChange={e => setWorkerId(e.target.value)} required className="block w-full p-2 border border-gray-300 rounded-md">
                            <option value="" disabled>Seleccionar...</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                        <SearchableSelect 
                            options={productOptions}
                            value={inventoryId}
                            onChange={setInventoryId}
                            placeholder="Buscar producto..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex-1 col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                            {isStandardUnit ? (
                                <div className="flex space-x-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">Unidades</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <input 
                                                type="text" 
                                                inputMode="decimal" 
                                                value={quantityUnits} 
                                                onChange={handleUnitsChange} 
                                                placeholder="0" 
                                                className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">Docenas</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <input 
                                                type="text" 
                                                inputMode="decimal" 
                                                value={quantityDozens} 
                                                onChange={handleDozensChange} 
                                                placeholder="0" 
                                                className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative rounded-md shadow-sm">
                                    <input 
                                        type="text" 
                                        inputMode="decimal" 
                                        value={quantityUnits} 
                                        onChange={handleUnitsChange} 
                                        required 
                                        placeholder="Ej: 60" 
                                        className="block w-full pr-16 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">{selectedProduct?.unit || 'Unidad'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">
                        {isSubmitting ? 'Registrando...' : 'Registrar'}
                    </button>
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
        if (!window.confirm("¿Estás seguro de que quieres eliminar este registro? Esta acción revertirá los cambios de stock (restará el producto terminado y devolverá la materia prima).")) return;

        try {
            // 1. Get the log details before deleting
            const { data: logData, error: logFetchError } = await supabase
                .from('production_log')
                .select('*')
                .eq('id', logId)
                .single();

            if (logFetchError) throw logFetchError;
            if (!logData) throw new Error("Registro no encontrado.");

            const producedInventoryId = logData.inventory_id;
            const producedQuantity = logData.quantity;

            // 2. Revert inventory (decrease finished product)
            const { data: currentProductStock, error: productStockError } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('id', producedInventoryId)
                .single();

            if (productStockError) throw productStockError;

            await supabase
                .from('inventory')
                .update({ quantity: currentProductStock.quantity - producedQuantity })
                .eq('id', producedInventoryId);

            // Log movement for finished product
            await supabase.from('inventory_movements').insert({
                inventory_id: producedInventoryId,
                quantity_change: -producedQuantity,
                type: 'Salida',
                reason: `Eliminación producción #${logId}`
            });

            // 3. Revert raw materials (increase)
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('finished_product_inventory_id', producedInventoryId)
                .single();

            if (productError) {
                console.warn(`No recipe found for inventory item ${producedInventoryId}. Only product stock was reverted.`);
            } else if (productData) {
                const { data: recipeItems, error: recipeError } = await supabase
                    .from('product_recipes')
                    .select('*')
                    .eq('product_id', productData.id);
                
                if (recipeError) throw recipeError;

                if (Array.isArray(recipeItems)) {
                    const updatePromises = recipeItems.map(async (item) => {
                        const requiredQty = item.quantity_required * producedQuantity;
                        const { data: material, error: materialError } = await supabase
                            .from('inventory')
                            .select('quantity')
                            .eq('id', item.raw_material_inventory_id)
                            .single();
                        
                        if (materialError) throw materialError;
                        if (!material) throw new Error(`Material ${item.raw_material_inventory_id} not found.`);

                        const { error: updateError } = await supabase
                            .from('inventory')
                            .update({ quantity: material.quantity + requiredQty })
                            .eq('id', item.raw_material_inventory_id);

                        if (updateError) throw updateError;

                        // Log movement for raw material
                        await supabase.from('inventory_movements').insert({
                            inventory_id: item.raw_material_inventory_id,
                            quantity_change: requiredQty,
                            type: 'Entrada',
                            reason: `Devolución materia prima (Prod #${logId})`
                        });
                    });

                    await Promise.all(updatePromises);
                }
            }

            // 4. Delete the log
            const { error: deleteError } = await supabase
                .from('production_log')
                .delete()
                .eq('id', logId);

            if (deleteError) throw deleteError;

            // 5. Update UI
            setLogs(currentLogs => currentLogs.filter(log => log.id !== logId));
            alert("Registro eliminado y stock revertido correctamente.");

        } catch (error: any) {
            console.error("Error deleting log and reverting stock:", error);
            alert("Error al eliminar el registro o revertir el stock: " + error.message);
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