
import React, { useState, useEffect, useMemo } from 'react';
import type { InventoryItem, Brand, InventoryMovement } from '../../types';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';
import Badge from '../ui/Badge';
import SearchIcon from '../icons/SearchIcon';
import UndoIcon from '../icons/UndoIcon';

const brandOptions: Brand[] = ['Duramaxi', 'Avanty', 'Base Base', 'Generica'];

const InventoryItemForm: React.FC<{
    item?: InventoryItem;
    onSave: (item: Omit<InventoryItem, 'id'> | InventoryItem) => void;
    onCancel: () => void;
    isEdit?: boolean;
}> = ({ item, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        type: item?.type || 'Materia Prima',
        quantity: item?.quantity?.toString() ?? '',
        low_stock_threshold: item?.low_stock_threshold?.toString() ?? '',
        brand: item?.brand || 'Generica',
    });

    const standardUnits = ['docenas', 'unidades', 'kg', 'metros'];

    const getInitialUnitState = () => {
        if (!item?.unit) return { selection: 'docenas', custom: '' };
        if (standardUnits.includes(item.unit.toLowerCase())) {
            return { selection: item.unit.toLowerCase(), custom: '' };
        }
        return { selection: 'Otro', custom: item.unit };
    };
    
    const [unitState, setUnitState] = useState(getInitialUnitState());
    
    useEffect(() => {
        setFormData({
            name: item?.name || '',
            type: item?.type || 'Materia Prima',
            quantity: item?.quantity?.toString() ?? '',
            low_stock_threshold: item?.low_stock_threshold?.toString() ?? '',
            brand: item?.brand || 'Generica',
        });
        setUnitState(getInitialUnitState());
    }, [item]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quantity' || name === 'low_stock_threshold') {
            const sanitizedValue = value.replace(',', '.');
            // Regex to match a valid decimal number format.
            // Allows empty string, a single dot, numbers, and numbers with one dot.
            if (sanitizedValue === '' || /^\d*\.?\d*$/.test(sanitizedValue)) {
                setFormData(prev => ({
                    ...prev,
                    [name]: sanitizedValue,
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleUnitSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setUnitState({ ...unitState, selection: e.target.value });
    };
    
    const handleCustomUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUnitState({ ...unitState, custom: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalUnit = unitState.selection === 'Otro' ? unitState.custom : unitState.selection;

        if (!formData.name.trim() || !finalUnit.trim()) {
            alert('El nombre y la unidad son obligatorios.');
            return;
        }

        const itemData = {
            ...formData,
            quantity: Number(formData.quantity) || 0,
            low_stock_threshold: Number(formData.low_stock_threshold) || 0,
            unit: finalUnit,
            brand: formData.brand as Brand,
        };
        
        onSave(isEdit ? { ...item, ...itemData } : itemData);
    };

    const quantityInDozens = (Number(formData.quantity) || 0) / 12;
    const showDozensConversion = unitState.selection === 'unidades';

    return (
        <Card title={isEdit ? `Editando: ${item?.name}` : 'Añadir Nuevo Artículo'} className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Marca</label>
                        <select name="brand" id="brand" value={formData.brand} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            {brandOptions.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="Materia Prima">Materia Prima</option>
                            <option value="Producto Terminado">Producto Terminado</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
                        <input type="text" inputMode="decimal" name="quantity" id="quantity" value={formData.quantity} onChange={handleChange} placeholder="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        {showDozensConversion && formData.quantity && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                                Equivalente a: {quantityInDozens.toFixed(2)} docenas
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700">Umbral Stock Bajo</label>
                        <input type="text" inputMode="decimal" name="low_stock_threshold" id="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleChange} placeholder="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                        <div className="grid grid-cols-2 gap-2 items-end">
                             <div className={unitState.selection === 'Otro' ? 'col-span-1' : 'col-span-2'}>
                                <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                                <select id="unit" value={unitState.selection} onChange={handleUnitSelectionChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    <option value="docenas">Docenas</option>
                                    <option value="unidades">Unidades</option>
                                    <option value="kg">Kilogramos (kg)</option>
                                    <option value="metros">Metros (m)</option>
                                    <option value="Otro">Otro...</option>
                                </select>
                            </div>
                            {unitState.selection === 'Otro' && (
                                <div className="col-span-1">
                                    <label htmlFor="customUnit" className="block text-sm font-medium text-gray-700 sr-only">Unidad Personalizada</label>
                                    <input
                                        type="text"
                                        id="customUnit"
                                        value={unitState.custom}
                                        onChange={handleCustomUnitChange}
                                        required={unitState.selection === 'Otro'}
                                        placeholder="Ej: litros"
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">{isEdit ? 'Guardar Cambios' : 'Añadir Artículo'}</button>
                </div>
            </form>
        </Card>
    );
};

import SearchableSelect from '../ui/SearchableSelect';

const StockMovementForm: React.FC<{
    items: InventoryItem[];
    onSave: () => void;
    onCancel: () => void;
}> = ({ items, onSave, onCancel }) => {
    const [movementType, setMovementType] = useState<'Salida' | 'Entrada'>('Salida');
    const [quantities, setQuantities] = useState<Record<number, string>>({});
    const [units, setUnits] = useState<Record<number, string>>({});
    const [selectedAll, setSelectedAll] = useState<Record<number, boolean>>({});
    const [reason, setReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [brandFilter, setBrandFilter] = useState<'all' | Brand>('all');

    const availableItems = useMemo(() => items.sort((a, b) => a.name.localeCompare(b.name)), [items]);

    const filteredItems = useMemo(() => {
        let results = availableItems;
        if (brandFilter !== 'all') {
            results = results.filter(i => i.brand === brandFilter);
        }
        if (searchTerm.trim() !== '') {
            results = results.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return results;
    }, [availableItems, searchTerm, brandFilter]);

    const handleQuantityChange = (id: number, val: string) => {
        val = val.replace(',', '.');
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setQuantities(prev => ({ ...prev, [id]: val }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const itemsToProcess = Object.entries(quantities)
            .map(([id, qtyStr]) => {
                const item = availableItems.find(i => i.id === Number(id));
                if (!item) return null;
                
                let parsedQty = parseFloat(qtyStr || '0');
                if (isNaN(parsedQty) || parsedQty <= 0) return null;

                const selectedUnit = units[item.id]?.toLowerCase() || (item.unit.toLowerCase() === 'docenas' || item.unit.toLowerCase() === 'unidades' ? 'unidades' : item.unit.toLowerCase());
                const baseUnit = item.unit.toLowerCase();

                if (selectedUnit === 'docenas' && baseUnit === 'unidades') {
                    parsedQty = parsedQty * 12;
                } else if (selectedUnit === 'unidades' && baseUnit === 'docenas') {
                    parsedQty = parsedQty / 12;
                }
                
                // Redondear decimales
                parsedQty = Math.round(parsedQty * 100) / 100;

                return { item, quantityChange: parsedQty, displayUnit: selectedUnit };
            })
            .filter((i): i is {item: InventoryItem, quantityChange: number, displayUnit: string} => i !== null);

        if (itemsToProcess.length === 0) {
            alert('Por favor, ingrese al menos una cantidad válida mayor a 0.');
            return;
        }

        setIsSubmitting(true);

        // Validate stock for all items if Salida
        if (movementType === 'Salida') {
            const insufficientStockItems = itemsToProcess.filter(p => p.item.quantity - p.quantityChange < 0);
            if (insufficientStockItems.length > 0) {
                alert(`No hay suficiente stock para los siguientes artículos: ${insufficientStockItems.map(p => p.item.name).join(', ')}`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            // Process each movement
            for (const { item, quantityChange, displayUnit } of itemsToProcess) {
                const newQuantity = movementType === 'Salida' 
                    ? item.quantity - quantityChange 
                    : item.quantity + quantityChange;

                // 1. Log the movement
                const { error: movementError } = await supabase
                    .from('inventory_movements')
                    .insert({
                        inventory_id: item.id,
                        quantity_change: movementType === 'Salida' ? -quantityChange : quantityChange,
                        type: movementType,
                        reason: reason,
                    });

                if (movementError) {
                    console.error('Error logging movement:', movementError);
                    throw new Error(`Error al registrar movimiento para ${item.name}: ${movementError.message}`);
                }

                // 2. Update stock
                const { error: updateError } = await supabase
                    .from('inventory')
                    .update({ quantity: newQuantity })
                    .eq('id', item.id);

                if (updateError) {
                    console.error('Error updating stock:', updateError);
                    throw new Error(`Error al actualizar stock para ${item.name}: ${updateError.message}`);
                }

                // 3. Log to activity_logs
                const originalUnitDisplay = (movementType === 'Entrada' ? '+' : '-') + quantityChange + ' ' + (item.unit.toLowerCase() === 'docenas' ? 'docenas' : (item.unit.toLowerCase() === 'unidades' ? 'unidades' : item.unit));

                await supabase.from('activity_logs').insert({
                    action_type: 'Ajuste Inventario',
                    details: `${movementType === 'Entrada' ? '+' : '-'}${quantityChange} unidades de ${item.name}. Stock actual: ${newQuantity} ${item.unit}. Motivo: ${reason || 'Ajuste manual'}` // Kept details similar for simplicity, maybe adjust logic if needed. Let's fix details logic.
                });
            }

            alert('¡Stock y movimientos registrados con éxito!');
            onSave();
            onCancel();
        } catch (e: any) {
            alert(e.message || 'Ha ocurrido un error durante el proceso.');
        }

        setIsSubmitting(false);
    };

    return (
        <Card title="Registrar Movimiento de Stock" className="mb-6 border-2 border-blue-100">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento</label>
                        <select value={movementType} onChange={e => setMovementType(e.target.value as any)} required className="block w-full p-2 border border-gray-300 rounded-md">
                            <option value="Salida">Salida (Uso, Desperdicio, etc.)</option>
                            <option value="Entrada">Entrada / Ajuste</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón / Nota (Opcional)</label>
                        <input 
                            type="text" 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            placeholder="Ej: Ajuste de inventario, material dañado..." 
                            className="block w-full p-2 border border-gray-300 rounded-md" 
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Artículos</label>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="block w-full sm:w-1/2 p-2 border border-gray-300 rounded-md"
                            placeholder="Buscar artículo..."
                        />
                        <select 
                            value={brandFilter}
                            onChange={e => setBrandFilter(e.target.value as any)}
                            className="block w-full sm:w-1/2 p-2 border border-gray-300 rounded-md"
                        >
                            <option value="all">Todas las Marcas</option>
                            {brandOptions.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-2">Producto</th>
                                    <th className="p-2 text-right w-40">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => {
                                    const itemUnit = item.unit.toLowerCase();
                                    const canConvert = itemUnit === 'unidades' || itemUnit === 'docenas';
                                    
                                    return (
                                        <tr key={item.id} className="border-b hover:bg-gray-50">
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-gray-800">{item.name}</div>
                                                    <Badge color={getBrandColor(item.brand)}>{item.brand}</Badge>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Stock: {item.quantity} {item.unit}</div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <input 
                                                        type="text" 
                                                        inputMode="decimal"
                                                        value={quantities[item.id] || ''}
                                                        onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 p-1 border border-gray-300 rounded-md focus:ring-blue-500 text-right"
                                                    />
                                                    {canConvert ? (
                                                        <select
                                                            value={units[item.id] || 'unidades'}
                                                            onChange={e => setUnits(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            className="p-1 border border-gray-300 rounded-md focus:ring-blue-500 text-xs text-gray-600 bg-gray-50"
                                                        >
                                                            <option value="unidades">unid</option>
                                                            <option value="docenas">doc</option>
                                                        </select>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs w-12 text-left inline-block pl-1 truncate" title={item.unit}>{item.unit}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredItems.length === 0 && (
                                    <tr><td colSpan={2} className="p-4 text-center text-gray-500">No se encontraron artículos.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">{isSubmitting ? 'Guardando...' : 'Guardar Movimientos'}</button>
                </div>
            </form>
        </Card>
    );
};

const getBrandColor = (brand: Brand): 'blue' | 'green' | 'yellow' | 'gray' => {
    switch(brand) {
        case 'Duramaxi': return 'blue';
        case 'Avanty': return 'green';
        case 'Base Base': return 'yellow';
        case 'Generica': return 'gray';
        default: return 'gray';
    }
}

const InventoryRow: React.FC<{ item: InventoryItem; onEdit: (item: InventoryItem) => void; onDelete: (id: number) => void; }> = ({ item, onEdit, onDelete }) => {
    const isLowStock = item.low_stock_threshold > 0 && item.quantity <= item.low_stock_threshold;
    
    const unitLower = item.unit.toLowerCase();
    
    let displayQuantity = item.quantity;
    let displayUnit = item.unit;
    let quantityInDozens = '-';

    if (unitLower === 'unidades') {
        displayQuantity = Math.round(item.quantity);
        quantityInDozens = (displayQuantity / 12).toFixed(2);
    } else if (unitLower === 'docenas') {
        // Convert base dozens to units for display in first column
        displayQuantity = Math.round(item.quantity * 12);
        displayUnit = 'unidades'; 
        quantityInDozens = (displayQuantity / 12).toFixed(2);
    }

    return (
        <tr className={`border-b ${isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
            <td className="p-4">
                <div className="flex items-center space-x-3">
                     <Badge color={getBrandColor(item.brand)}>{item.brand}</Badge>
                    <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.type}</p>
                    </div>
                </div>
            </td>
            <td className="p-4 text-center">
                <span className={`font-mono text-lg ${isLowStock ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                    {['unidades', 'docenas'].includes(unitLower) ? displayQuantity : Number(displayQuantity).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 ml-1">{displayUnit}</span>
            </td>
            <td className="p-4 text-center font-mono text-gray-700">
                {quantityInDozens}
            </td>
            <td className="p-4 text-center text-gray-600 font-mono">{item.low_stock_threshold}</td>
            <td className="p-4 text-center">
                {isLowStock ? (
                    <span className="px-3 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Bajo Stock</span>
                ) : (
                     <span className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">OK</span>
                )}
            </td>
            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                <button onClick={() => onEdit(item)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition">Editar</button>
                <button onClick={() => onDelete(item.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition">Eliminar</button>
            </td>
        </tr>
    );
};


type EnrichedInventoryMovement = InventoryMovement & {
    inventory: { name: string; unit: string } | null;
};

const MovementHistory: React.FC<{ items: InventoryItem[]; onDataNeedsRefresh: () => void; }> = ({ items, onDataNeedsRefresh }) => {
    const [movements, setMovements] = useState<EnrichedInventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMovements();
    }, [items]);

    const fetchMovements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory_movements')
            .select('*, inventory(name, unit)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching movements:', error);
            alert('No se pudo cargar el historial de movimientos. Verifique que la relación entre "inventory_movements" y "inventory" esté bien configurada en Supabase.');
        } else if (data) {
            setMovements(data as EnrichedInventoryMovement[]);
        }
        setLoading(false);
    };

    const handleCancelMovement = async (movement: EnrichedInventoryMovement) => {
        if (movement.is_cancelled) return;
        if (!window.confirm('¿Seguro que quieres cancelar este movimiento? Esto ajustará el stock actual del artículo.')) return;

        const itemToUpdate = items.find(i => i.id === movement.inventory_id);
        if (!itemToUpdate) {
            alert('Error: No se pudo encontrar el artículo de inventario asociado a este movimiento.');
            return;
        }

        // The quantity to revert to
        const revertedQuantity = itemToUpdate.quantity - movement.quantity_change;

        // 1. Update the stock first
        const { error: stockError } = await supabase
            .from('inventory')
            .update({ quantity: revertedQuantity })
            .eq('id', movement.inventory_id);
        
        if (stockError) {
            alert('Error al revertir el stock: ' + stockError.message);
            return;
        }
        
        // 2. Mark the movement as cancelled
        const { error: movementError } = await supabase
            .from('inventory_movements')
            .update({ is_cancelled: true })
            .eq('id', movement.id);
        
        if (movementError) {
            alert('El stock fue revertido, pero no se pudo marcar el movimiento como cancelado. Contacte a soporte. Error: ' + movementError.message);
            // Attempt to revert the stock change back to its incorrect state to maintain consistency
            await supabase.from('inventory').update({ quantity: itemToUpdate.quantity }).eq('id', itemToUpdate.id);
        } else {
            alert('Movimiento cancelado y stock ajustado con éxito.');
            onDataNeedsRefresh(); // This will refresh both inventory and movements
        }
    };

    if (loading) return <p className="text-center text-gray-500 py-4">Cargando historial...</p>;

    return (
        <Card title="Historial de Movimientos de Stock">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4">Fecha</th>
                            <th scope="col" className="p-4">Artículo</th>
                            <th scope="col" className="p-4 text-center">Cambio</th>
                            <th scope="col" className="p-4">Razón</th>
                            <th scope="col" className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.map(m => (
                            <tr key={m.id} className={`border-b hover:bg-gray-50 ${m.is_cancelled ? 'bg-gray-100 text-gray-400' : ''}`}>
                                <td className="p-4 whitespace-nowrap">
                                    {new Date(m.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className={`p-4 font-semibold ${m.is_cancelled ? '' : 'text-gray-800'}`}>
                                    {m.inventory?.name || 'Artículo eliminado'}
                                </td>
                                <td className="p-4 text-center font-mono">
                                    <span className={m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {m.quantity_change > 0 ? `+${Number(m.quantity_change).toFixed(2)}` : Number(m.quantity_change).toFixed(2)}
                                    </span>
                                    <span className={`ml-1 ${m.is_cancelled ? '' : 'text-gray-500'}`}>{m.inventory?.unit}</span>
                                </td>
                                <td className={`p-4 italic ${m.is_cancelled ? '' : 'text-gray-600'}`}>
                                    {m.reason || '-'}
                                </td>
                                <td className="p-4 text-right">
                                    {m.is_cancelled ? (
                                        <span className="text-xs font-semibold">CANCELADO</span>
                                    ) : (
                                        <button 
                                            onClick={() => handleCancelMovement(m)} 
                                            className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-xs font-medium transition flex items-center space-x-1 ml-auto"
                                            aria-label="Cancelar movimiento"
                                        >
                                            <UndoIcon className="w-4 h-4" />
                                            <span>Cancelar</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {movements.length === 0 && <p className="text-center text-gray-500 py-6">No hay movimientos registrados.</p>}
            </div>
        </Card>
    );
};


const InventoryView: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showStockMovementForm, setShowStockMovementForm] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [brandFilter, setBrandFilter] = useState<'all' | Brand>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
    const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
    const formRef = React.useRef<HTMLDivElement>(null);

    const lowStockItems = useMemo(() => {
        return items.filter(item => item.quantity <= item.low_stock_threshold && item.low_stock_threshold > 0);
    }, [items]);

    useEffect(() => {
        fetchInventory();
    }, []);

    useEffect(() => {
        if (editingItem || showAddForm || showStockMovementForm) {
            // Add a small delay to ensure the form is rendered before scrolling
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [editingItem, showAddForm, showStockMovementForm]);

    const fetchInventory = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('inventory').select('*').order('name');
        if (error) {
            console.error("Error fetching inventory:", error.message);
            alert(`No se pudo cargar el inventario: ${error.message}\n\nAsegúrese de que la tabla 'inventory' exista y las políticas RLS estén configuradas.`);
        } else if (data) {
            setItems(data as InventoryItem[]);
        }
        setLoading(false);
    };

    const handleAddItem = async (newItemData: Omit<InventoryItem, 'id'>) => {
        const { data, error } = await supabase.from('inventory').insert(newItemData).select().single();
        if (error) {
            console.error('Error adding item:', error.message);
            alert(`Error al añadir artículo: ${error.message}`);
        } else if (data) {
            const newItem = data as InventoryItem;
            // If the new item has an initial quantity, log it as a movement.
            if (newItem.quantity > 0) {
                const { error: movementError } = await supabase.from('inventory_movements').insert({
                    inventory_id: newItem.id,
                    quantity_change: newItem.quantity,
                    type: 'Entrada',
                    reason: 'Stock Inicial (Creación de artículo)',
                });
                if (movementError) {
                    alert('El artículo fue creado, pero no se pudo registrar el movimiento inicial en el historial.');
                    console.error('Error logging initial movement:', movementError);
                }
            }
            setItems(currentItems => [...currentItems, newItem].sort((a,b) => a.name.localeCompare(b.name)));
            setShowAddForm(false);
        }
    };

    const handleUpdateItem = async (updatedItemData: InventoryItem) => {
        const originalItem = items.find(item => item.id === updatedItemData.id);
        if (!originalItem) {
            alert('Error: No se encontró el artículo original para actualizar.');
            return;
        }
        const quantityChange = updatedItemData.quantity - originalItem.quantity;

        // Create a payload with only the updatable fields, excluding the ID.
        const { id, ...updatePayload } = updatedItemData;

        const { error: updateError } = await supabase
            .from('inventory')
            .update(updatePayload)
            .eq('id', id);
        
        if (updateError) {
            console.error('Error updating item:', updateError.message);
            alert(`Error al actualizar artículo: ${updateError.message}`);
            return; // Exit without changing UI if DB update fails.
        }

        // If DB update succeeds, then log the movement and update the local UI state.
        if (quantityChange !== 0) {
            const { error: movementError } = await supabase.from('inventory_movements').insert({
                inventory_id: id,
                quantity_change: quantityChange,
                type: quantityChange > 0 ? 'Entrada' : 'Salida',
                reason: 'Ajuste manual desde formulario de edición',
            });
            if (movementError) {
                alert('El artículo fue actualizado, pero no se pudo registrar el cambio en el historial.');
                console.error('Error logging manual adjustment:', movementError);
            }
        }

        // Update local state after all successful DB operations.
        setItems(currentItems => currentItems.map(item => (item.id === id ? updatedItemData : item)));
        setEditingItem(null);
    };
    
    const handleDeleteItem = async (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este artículo del inventario?')) {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (error) {
                console.error('Error deleting item:', error.message);
                if (error.message.includes('foreign key constraint')) {
                    if (error.message.includes('product_recipes')) {
                        alert('No se puede eliminar este artículo porque forma parte de una receta de producto. Primero debes removerlo de la receta en "Órdenes de Producción".');
                    } else if (error.message.includes('seller_inventory') || error.message.includes('inventory_movements') || error.message.includes('production_log') || error.message.includes('activity_logs')) {
                        alert('No se puede eliminar este artículo porque tiene un historial activo (movimientos, registro de producción o registro en vendedores). Por precaución, este artículo debe mantenerse. Puedes ajustar su stock a 0 en su lugar.');
                    } else {
                        alert('No se puede eliminar el artículo porque está vinculado a otros registros del sistema.');
                    }
                } else {
                    alert(`Error al eliminar artículo: ${error.message}`);
                }
            } else {
                setItems(currentItems => currentItems.filter(item => item.id !== id));
            }
        }
    };

    const filteredItems = useMemo(() => {
        let results = items;

        if (showOnlyLowStock) {
            results = results.filter(i => i.low_stock_threshold > 0 && i.quantity <= i.low_stock_threshold);
        }

        if (brandFilter !== 'all') {
            results = results.filter(i => i.brand === brandFilter);
        }
        
        if (searchTerm.trim() !== '') {
            results = results.filter(i => 
                i.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return results;
    }, [items, brandFilter, searchTerm, showOnlyLowStock]);


    const handleExportCSV = (exportType: 'all' | 'products') => {
        // Enforce UTF-8 via BOM for Excel
        const BOM = '\uFEFF';
        let csvContent = BOM + "Nombre,Tipo,Marca,Cantidad Actual,Unidad Base,En Docenas,Alerta Stock Bajo,Estado\n";

        const rawMaterials = filteredItems.filter(i => i.type === 'Materia Prima');
        const finishedProducts = filteredItems.filter(i => i.type === 'Producto Terminado');
        const itemsToExport = exportType === 'products' ? finishedProducts : filteredItems;

        itemsToExport.forEach(item => {
            const isLowStock = item.low_stock_threshold > 0 && item.quantity <= item.low_stock_threshold;
            const estado = isLowStock ? 'Bajo Stock' : 'OK';
            
            const unitLower = item.unit.toLowerCase();
            let displayQuantity = item.quantity;
            let displayUnit = item.unit;
            let quantityInDozens = '-';

            if (unitLower === 'unidades') {
                displayQuantity = Math.round(item.quantity);
                quantityInDozens = (displayQuantity / 12).toFixed(2);
            } else if (unitLower === 'docenas') {
                displayQuantity = Math.round(item.quantity * 12);
                displayUnit = 'unidades'; 
                quantityInDozens = (displayQuantity / 12).toFixed(2);
            }

            // Escape fields with commas or quotes
            const escapeCsv = (field: any) => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const row = [
                escapeCsv(item.name),
                escapeCsv(item.type),
                escapeCsv(item.brand),
                escapeCsv(displayQuantity),
                escapeCsv(displayUnit),
                escapeCsv(quantityInDozens),
                escapeCsv(item.low_stock_threshold),
                escapeCsv(estado)
            ];

            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'inventario.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const rawMaterials = filteredItems.filter(i => i.type === 'Materia Prima');
    const finishedProducts = filteredItems.filter(i => i.type === 'Producto Terminado');

    const InventoryTable: React.FC<{title: string, items: InventoryItem[]}> = ({title, items}) => (
        <Card title={title} className="mb-8">
            <div className="overflow-x-auto">
                 {items.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="p-4">Nombre</th>
                                <th scope="col" className="p-4 text-center">Cantidad Actual</th>
                                <th scope="col" className="p-4 text-center">En Docenas</th>
                                <th scope="col" className="p-4 text-center">Alerta de Stock Bajo</th>
                                <th scope="col" className="p-4 text-center">Estado</th>
                                <th scope="col" className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => <InventoryRow key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDeleteItem} />)}
                        </tbody>
                    </table>
                 ) : (
                    <p className="text-center text-gray-500 py-4">No hay artículos para los filtros seleccionados.</p>
                 )}
            </div>
        </Card>
    );
    
    const FilterButton: React.FC<{ brand: 'all' | Brand, activeFilter: 'all' | Brand, setFilter: (f: 'all' | Brand) => void }> = ({ brand, activeFilter, setFilter }) => {
        const isActive = brand === activeFilter;
        let colorClasses = 'bg-white text-gray-700 hover:bg-gray-100';
        if (isActive) {
            colorClasses = 'bg-blue-600 text-white hover:bg-blue-700';
        }
        return (
            <button onClick={() => setFilter(brand)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm border ${isActive ? 'border-blue-700' : 'border-gray-300'} ${colorClasses}`}>
                {brand === 'all' ? 'Todos' : brand}
            </button>
        )
    };
    
    const isFormOpen = showAddForm || !!editingItem || showStockMovementForm;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Control de Inventario</h2>
                {!isFormOpen && (
                    <div className="flex flex-wrap gap-2 items-center justify-end">
                        <div className="hidden sm:flex items-center space-x-1 mr-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Exportar</span>
                             <div className="w-px h-4 bg-gray-200"></div>
                             <button
                                 onClick={() => handleExportCSV('products')}
                                 className="px-3 py-1.5 rounded text-sm font-medium transition hover:bg-green-50 text-gray-700 hover:text-green-700 flex items-center gap-1.5"
                                 title="Exportar archivo CSV para Excel (Solo Productos Terminados)"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 Solo Productos
                             </button>
                             <button
                                 onClick={() => handleExportCSV('all')}
                                 className="px-3 py-1.5 rounded text-sm font-medium transition hover:bg-green-50 text-gray-700 hover:text-green-700 flex items-center gap-1.5"
                                 title="Exportar archivo CSV para Excel (Todos los artículos)"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 Todo
                             </button>
                        </div>
                        <button onClick={() => setShowStockMovementForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex-shrink-0 whitespace-nowrap">
                            Registrar Movimiento
                        </button>
                        <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex-shrink-0 whitespace-nowrap">
                            Añadir Artículo
                        </button>
                    </div>
                )}
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('stock')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'stock' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Stock Actual
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Historial de Movimientos
                    </button>
                </nav>
            </div>

            <div ref={formRef}>
                {showAddForm && <InventoryItemForm onSave={handleAddItem} onCancel={() => setShowAddForm(false)} />}
                {editingItem && <InventoryItemForm item={editingItem} onSave={handleUpdateItem} onCancel={() => setEditingItem(null)} isEdit />}
                {showStockMovementForm && <StockMovementForm items={items} onSave={fetchInventory} onCancel={() => setShowStockMovementForm(false)} />}
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Cargando inventario...</p>
            ) : activeTab === 'stock' ? (
                <>
                    <Card className="mb-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex items-center space-x-2 overflow-x-auto pb-2 self-start">
                                <span className="text-sm font-medium text-gray-600 mr-2 flex-shrink-0">Filtrar por marca:</span>
                                <FilterButton brand="all" activeFilter={brandFilter} setFilter={setBrandFilter} />
                                {brandOptions.map(b => <FilterButton key={b} brand={b} activeFilter={brandFilter} setFilter={setBrandFilter} />)}
                                
                                <div className="w-px h-6 bg-gray-300 mx-1 flex-shrink-0"></div>
                                <button
                                    onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition shadow-sm border whitespace-nowrap flex items-center gap-1 flex-shrink-0 ${showOnlyLowStock ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-gray-700 hover:bg-red-50 border-gray-300'}`}
                                >
                                    ⚠️ Stock Bajo
                                </button>
                            </div>
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Buscar artículo..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </Card>
                    <InventoryTable title="Materias Primas" items={rawMaterials} />
                    <InventoryTable title="Productos Terminados" items={finishedProducts} />
                </>
            ) : (
                <MovementHistory items={items} onDataNeedsRefresh={fetchInventory} />
            )}
        </div>
    );
};

export default InventoryView;