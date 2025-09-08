import React, { useState, useEffect } from 'react';
import type { InventoryItem } from '../../types';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';

const InventoryItemForm: React.FC<{
    item?: InventoryItem;
    onSave: (item: Omit<InventoryItem, 'id'> | InventoryItem) => void;
    onCancel: () => void;
    isEdit?: boolean;
}> = ({ item, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        type: item?.type || 'Materia Prima',
        quantity: item?.quantity || 0,
        low_stock_threshold: item?.low_stock_threshold || 0,
        unit: item?.unit || 'unidades',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'quantity' || name === 'low_stock_threshold' ? parseInt(value, 10) || 0 : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.unit.trim()) {
            alert('El nombre y la unidad son obligatorios.');
            return;
        }
        onSave(isEdit ? { ...item, ...formData } : formData);
    };

    return (
        <Card title={isEdit ? `Editando: ${item?.name}` : 'Añadir Nuevo Artículo'} className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
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
                        <input type="number" name="quantity" id="quantity" value={formData.quantity} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700">Umbral Stock Bajo</label>
                        <input type="number" name="low_stock_threshold" id="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                        <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} required placeholder="kg, metros, unidades..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
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

const InventoryRow: React.FC<{ item: InventoryItem; onEdit: (item: InventoryItem) => void; onDelete: (id: number) => void; }> = ({ item, onEdit, onDelete }) => {
    const isLowStock = item.quantity < item.low_stock_threshold;
    return (
        <tr className={`border-b ${isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
            <td className="p-4">
                <p className="font-semibold text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">{item.type}</p>
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


const InventoryView: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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
        const { data, error } = await supabase.from('inventory').insert(newItemData).select();
        if (error) {
            console.error('Error adding item:', error.message);
            alert(`Error al añadir artículo: ${error.message}`);
        } else if (data) {
            setItems(currentItems => [...currentItems, data[0] as InventoryItem].sort((a,b) => a.name.localeCompare(b.name)));
            setShowAddForm(false);
        }
    };

    const handleUpdateItem = async (updatedItem: InventoryItem) => {
        const { data, error } = await supabase.from('inventory').update(updatedItem).eq('id', updatedItem.id).select();
         if (error) {
            console.error('Error updating item:', error.message);
            alert(`Error al actualizar artículo: ${error.message}`);
        } else if (data) {
            setItems(currentItems => currentItems.map(item => item.id === updatedItem.id ? data[0] as InventoryItem : item));
            setEditingItem(null);
        }
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

    const rawMaterials = items.filter(i => i.type === 'Materia Prima');
    const finishedProducts = items.filter(i => i.type === 'Producto Terminado');

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
                    <p className="text-center text-gray-500 py-4">No hay artículos en esta categoría.</p>
                 )}
            </div>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Control de Inventario</h2>
                {!showAddForm && !editingItem && (
                     <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                        Añadir Artículo
                    </button>
                )}
            </div>

            {showAddForm && <InventoryItemForm onSave={handleAddItem} onCancel={() => setShowAddForm(false)} />}
            {editingItem && <InventoryItemForm item={editingItem} onSave={handleUpdateItem} onCancel={() => setEditingItem(null)} isEdit />}

            {loading ? (
                <p className="text-center text-gray-500">Cargando inventario...</p>
            ) : (
                <>
                    <InventoryTable title="Materias Primas" items={rawMaterials} />
                    <InventoryTable title="Productos Terminados" items={finishedProducts} />
                </>
            )}
        </div>
    );
};

export default InventoryView;