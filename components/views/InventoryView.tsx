
import React, { useState, useEffect, useMemo } from 'react';
import type { InventoryItem, Brand, InventoryMovement } from '../../types';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';
import Badge from '../ui/Badge';
import SearchIcon from '../icons/SearchIcon';
import UndoIcon from '../icons/UndoIcon';

const brandOptions: Brand[] = ['Duramaxi', 'Avanty', 'Diletta', 'Generica'];

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

const StockMovementForm: React.FC<{
    items: InventoryItem[];
    onSave: () => void;
    onCancel: () => void;
}> = ({ items, onSave, onCancel }) => {
    const [itemId, setItemId] = useState<string>('');
    const [movementType, setMovementType] = useState<'Salida' | 'Entrada'>('Salida');
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(',', '.');
        if (sanitizedValue === '' || /^\d*\.?\d*$/.test(sanitizedValue)) {
            setQuantity(sanitizedValue);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemId || !quantity || Number(quantity) <= 0) {
            alert('Por favor, seleccione un artículo e ingrese una cantidad válida.');
            return;
        }
        setIsSubmitting(true);

        const selectedItem = items.find(i => i.id === Number(itemId));
        if (!selectedItem) {
            alert('Artículo no encontrado.');
            setIsSubmitting(false);
            return;
        }

        const quantityChange = Number(quantity);
        const newQuantity = movementType === 'Salida'
            ? selectedItem.quantity - quantityChange
            : selectedItem.quantity + quantityChange;

        if (movementType === 'Salida' && newQuantity < 0) {
            alert('No hay suficiente stock para esta salida.');
            setIsSubmitting(false);
            return;
        }

        // 1. Log the movement
        const { data: movementData, error: movementError } = await supabase
            .from('inventory_movements')
            .insert({
                inventory_id: selectedItem.id,
                quantity_change: movementType === 'Salida' ? -quantityChange : quantityChange,
                type: movementType,
                reason: reason,
            })
            .select()
            .single();

        if (movementError) {
            alert('Error al registrar el movimiento: ' + movementError.message);
            setIsSubmitting(false);
            return;
        }

        // 2. Update the stock
        const { error: updateError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', itemId);

        if (updateError) {
            alert('El movimiento fue registrado, pero el stock no pudo ser actualizado. Error: ' + updateError.message);
            // Attempt to roll back the movement log for consistency
            if (movementData) {
                await supabase.from('inventory_movements').delete().eq('id', movementData.id);
                alert('Se ha revertido el registro del movimiento. Por favor, intente de nuevo.');
            }
        } else {
            alert('¡Stock y movimiento registrados con éxito!');
            onSave();
            onCancel();
        }
        setIsSubmitting(false);
    };

    return (
        <Card title="Registrar Movimiento de Stock" className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Artículo</label>
                        <select value={itemId} onChange={e => setItemId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="" disabled>Seleccionar...</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Movimiento</label>
                        <select value={movementType} onChange={e => setMovementType(e.target.value as any)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="Salida">Salida (Venta, Desperdicio, etc.)</option>
                            <option value="Entrada">Entrada / Ajuste</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                        <input type="text" inputMode="decimal" value={quantity} onChange={handleQuantityChange} required placeholder="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Razón / Nota (Opcional)</label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Venta a cliente X, ajuste de conteo" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">{isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}</button>
                </div>
            </form>
        </Card>
    );
};

const getBrandColor = (brand: Brand): 'blue' | 'green' | 'yellow' | 'gray' => {
    switch(brand) {
        case 'Duramaxi': return 'blue';
        case 'Avanty': return 'green';
        case 'Diletta': return 'yellow';
        case 'Generica': return 'gray';
        default: return 'gray';
    }
}

const InventoryRow: React.FC<{ item: InventoryItem; onEdit: (item: InventoryItem) => void; onDelete: (id: number) => void; }> = ({ item, onEdit, onDelete }) => {
    const isLowStock = item.quantity < item.low_stock_threshold;
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
                    {item.quantity}
                </span>
                <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
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
                                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
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

    useEffect(() => {
        fetchInventory();
    }, []);

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
                alert(`Error al eliminar artículo: ${error.message}`);
            } else {
                setItems(currentItems => currentItems.filter(item => item.id !== id));
            }
        }
    };

    const filteredItems = useMemo(() => {
        let results = items;

        if (brandFilter !== 'all') {
            results = results.filter(i => i.brand === brandFilter);
        }
        
        if (searchTerm.trim() !== '') {
            results = results.filter(i => 
                i.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return results;
    }, [items, brandFilter, searchTerm]);


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
                     <div className="flex space-x-2">
                        <button onClick={() => setShowStockMovementForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex-shrink-0">
                            Registrar Movimiento
                        </button>
                        <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex-shrink-0">
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

            {showAddForm && <InventoryItemForm onSave={handleAddItem} onCancel={() => setShowAddForm(false)} />}
            {editingItem && <InventoryItemForm item={editingItem} onSave={handleUpdateItem} onCancel={() => setEditingItem(null)} isEdit />}
            {showStockMovementForm && <StockMovementForm items={items} onSave={fetchInventory} onCancel={() => setShowStockMovementForm(false)} />}


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