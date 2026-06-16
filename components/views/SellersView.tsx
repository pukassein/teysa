import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Seller, SellerInventory, SellerMovement, InventoryItem } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import SearchableSelect from '../ui/SearchableSelect';
import { PlusIcon, TrashIcon, ArrowRightIcon, ArrowLeftIcon, ShoppingCartIcon, Users as UsersIcon, UndoIcon, XIcon, EditIcon } from 'lucide-react';

// --- Sub-components ---

const SellerList: React.FC<{
    sellers: Seller[];
    onSelect: (seller: Seller) => void;
    onAdd: () => void;
    onEdit: (seller: Seller) => void;
    onDelete: (id: number) => void;
}> = ({ sellers, onSelect, onAdd, onEdit, onDelete }) => (
    <Card title="Vendedores" className="h-full">
        <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Seleccione un vendedor para ver detalles</p>
            <button onClick={onAdd} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
                <PlusIcon size={20} />
            </button>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {sellers.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No hay vendedores registrados.</p>
            ) : (
                sellers.map(seller => (
                    <div 
                        key={seller.id} 
                        onClick={() => onSelect(seller)}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border border-gray-200 group"
                    >
                        <span className="font-medium text-gray-800">{seller.name}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(seller); }}
                                className="text-blue-400 hover:text-blue-600 p-1"
                                title="Editar nombre"
                            >
                                <EditIcon size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(seller.id); }}
                                className="text-red-400 hover:text-red-600 p-1"
                                title="Eliminar vendedor"
                            >
                                <TrashIcon size={16} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </Card>
);

const SellerInventoryTable: React.FC<{
    inventory: (SellerInventory & { inventory_item?: InventoryItem })[];
}> = ({ inventory }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock (Unidades)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock (Docenas)</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {inventory.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">El camión está vacío.</td>
                    </tr>
                ) : (
                    inventory.map(item => {
                        const unitLower = item.inventory_item?.unit?.toLowerCase() || '';
                        let displayQuantity = Number(item.quantity);
                        let quantityInDozens: string | number = '-';

                        if (unitLower === 'unidades') {
                            displayQuantity = Math.ceil(Number(item.quantity));
                            quantityInDozens = (displayQuantity / 12).toFixed(2);
                        } else if (unitLower === 'docenas') {
                            displayQuantity = Math.ceil(Number(item.quantity) * 12);
                            quantityInDozens = (displayQuantity / 12).toFixed(2);
                        }

                        return (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.inventory_item?.name || 'Desconocido'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.inventory_item?.brand || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                    {unitLower === 'unidades' || unitLower === 'docenas' 
                                        ? displayQuantity
                                        : `${displayQuantity.toFixed(2)} ${item.inventory_item?.unit || ''}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {quantityInDozens}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    </div>
);

const MovementHistoryTable: React.FC<{
    movements: (SellerMovement & { inventory_item?: InventoryItem })[];
    onUndo: (movement: SellerMovement & { inventory_item?: InventoryItem }) => void;
}> = ({ movements, onUndo }) => {
    
    // Helper to get week number
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
        return weekNo;
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {movements.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay movimientos registrados.</td>
                        </tr>
                    ) : (
                        movements.map(mov => {
                            // Ensure we have a valid date string before parsing
                            let dateObj: Date;
                            if (mov.date) {
                                // If it's just a date string like '2023-10-27', append time to avoid timezone issues
                                dateObj = new Date(mov.date.includes('T') ? mov.date : mov.date + 'T00:00:00');
                            } else if (mov.created_at) {
                                dateObj = new Date(mov.created_at);
                            } else {
                                dateObj = new Date(); // Fallback to now
                            }
                            
                            // Check if dateObj is valid
                            if (isNaN(dateObj.getTime())) {
                                dateObj = new Date(); // Fallback if parsing failed
                            }

                            const weekNum = getWeekNumber(dateObj);
                            return (
                                <tr key={mov.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                            <span className="text-xs text-gray-400">Semana {weekNum}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Badge 
                                            color={mov.type === 'Carga' ? 'blue' : mov.type === 'Venta' ? 'green' : 'yellow'} 
                                        >
                                            {mov.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {mov.inventory_item?.name || 'Desconocido'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        {Number(mov.quantity).toFixed(2)} {mov.inventory_item?.unit || ''}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                        {mov.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => onUndo(mov)}
                                            className="text-red-500 hover:text-red-700 flex items-center justify-end w-full"
                                            title="Deshacer movimiento"
                                        >
                                            <UndoIcon size={16} className="mr-1" /> Deshacer
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

const MovementForm: React.FC<{
    type: 'Carga' | 'Venta' | 'Devolución';
    seller: Seller;
    inventoryItems: InventoryItem[];
    sellerInventory: (SellerInventory & { inventory_item?: InventoryItem })[];
    onSubmit: (data: { items: { inventory_id: number; quantity: number }[]; notes: string; date: string }) => Promise<void>;
    onCancel: () => void;
}> = ({ type, seller, inventoryItems, sellerInventory, onSubmit, onCancel }) => {
    const [quantities, setQuantities] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const availableItems = useMemo(() => {
        if (type === 'Carga') {
            return inventoryItems;
        } else {
            return sellerInventory
                .filter(si => si.inventory_item)
                .map(si => ({
                    ...si.inventory_item!,
                    quantity: si.quantity 
                }));
        }
    }, [type, inventoryItems, sellerInventory]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return availableItems;
        return availableItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [availableItems, searchTerm]);

    const handleQuantityChange = (id: number, val: string, unit: string) => {
        val = val.replace(',', '.');
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setQuantities(prev => ({ ...prev, [id]: val }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const itemsToSubmit = Object.entries(quantities)
            .map(([id, qtyStr]) => {
                const item = availableItems.find(i => i.id === Number(id));
                let parsedQty = parseFloat(qtyStr || '0');
                if (item?.unit.toLowerCase() === 'docenas') {
                    // For display we just take units and convert them to dozens. Wait, it's better to let them type what the selected unit is.
                    // If the unit is docenas, they type docenas. So we just submit parsedQty.
                }
                return { inventory_id: Number(id), quantity: parsedQty };
            })
            .filter(item => item.quantity > 0);

        if (itemsToSubmit.length === 0 || !date) {
            alert('Por favor, ingrese al menos una cantidad válida y una fecha.');
            return;
        }

        setIsSubmitting(true);
        await onSubmit({ items: itemsToSubmit, notes, date });
        setIsSubmitting(false);
    };

    return (
        <Card title={`Registrar ${type} - ${seller.name}`} className="mb-6 border-2 border-blue-100">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            required 
                            className="block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                        <input 
                            type="text" 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            className="block w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Buscar Producto</label>
                        <button 
                            type="button" 
                            onClick={() => {
                                const newQuantities = { ...quantities };
                                filteredItems.forEach(item => {
                                    newQuantities[item.id] = String(item.quantity);
                                });
                                setQuantities(newQuantities);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Seleccionar todo el stock
                        </button>
                    </div>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="block w-full p-2 border border-gray-300 rounded-md mb-2"
                        placeholder="Escriba para filtrar..."
                    />
                    
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-2">Producto</th>
                                    <th className="p-2 text-right w-36">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2">
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                            <div className="text-xs text-gray-500">Stock: {item.quantity} {item.unit} | {item.brand}</div>
                                        </td>
                                        <td className="p-2 text-right">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    value={quantities[item.id] || ''}
                                                    onChange={e => handleQuantityChange(item.id, e.target.value, item.unit)}
                                                    placeholder="0"
                                                    className="w-full p-1 border border-gray-300 rounded-md focus:ring-blue-500 pr-14 text-right"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                                    <span className="text-gray-400 text-xs">{item.unit === 'docenas' ? 'doc' : 'unid'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr><td colSpan={2} className="p-4 text-center text-gray-500">No hay productos que coincidan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">
                        {isSubmitting ? 'Procesando...' : 'Confirmar Todo'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

// --- Main Component ---

const SellersView: React.FC = () => {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [sellerInventory, setSellerInventory] = useState<(SellerInventory & { inventory_item?: InventoryItem })[]>([]);
    const [sellerMovements, setSellerMovements] = useState<(SellerMovement & { inventory_item?: InventoryItem })[]>([]);
    const [centralInventory, setCentralInventory] = useState<InventoryItem[]>([]);
    const [activeAction, setActiveAction] = useState<'Carga' | 'Venta' | 'Devolución' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(() => {
        return sessionStorage.getItem('vendedores_whats_new_dismissed') !== 'true';
    });

    useEffect(() => {
        fetchSellers();
        fetchCentralInventory();
    }, []);

    useEffect(() => {
        if (selectedSeller) {
            fetchSellerInventory(selectedSeller.id);
            fetchSellerMovements(selectedSeller.id);
            setActiveAction(null);
        }
    }, [selectedSeller]);

    const fetchSellers = async () => {
        const { data, error } = await supabase.from('sellers').select('*').order('name');
        if (error) console.error('Error fetching sellers:', error);
        else setSellers(data || []);
    };

    const fetchCentralInventory = async () => {
        const { data, error } = await supabase.from('inventory').select('*').eq('type', 'Producto Terminado').order('name');
        if (error) console.error('Error fetching inventory:', error);
        else setCentralInventory(data || []);
    };

    const fetchSellerInventory = async (sellerId: number) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('seller_inventory')
            .select('*, inventory_item:inventory(*)')
            .eq('seller_id', sellerId);
        
        if (error) console.error('Error fetching seller inventory:', error);
        else setSellerInventory(data || []);
        setIsLoading(false);
    };

    const fetchSellerMovements = async (sellerId: number) => {
        const { data, error } = await supabase
            .from('seller_movements')
            .select('*, inventory_item:inventory(*)')
            .eq('seller_id', sellerId)
            .order('date', { ascending: false })
            .order('id', { ascending: false });
        
        if (error) console.error('Error fetching seller movements:', error);
        else setSellerMovements(data || []);
    };

    const handleAddSeller = async () => {
        const name = prompt('Nombre del nuevo vendedor:');
        if (name) {
            const { error } = await supabase.from('sellers').insert({ name });
            if (error) alert('Error al crear vendedor: ' + error.message);
            else fetchSellers();
        }
    };

    const handleEditSeller = async (seller: Seller) => {
        const newName = prompt('Editar nombre del vendedor:', seller.name);
        if (newName && newName.trim() !== '' && newName !== seller.name) {
            const { error } = await supabase
                .from('sellers')
                .update({ name: newName.trim() })
                .eq('id', seller.id);
            
            if (error) {
                alert('Error al actualizar vendedor: ' + error.message);
            } else {
                fetchSellers();
                if (selectedSeller?.id === seller.id) {
                    setSelectedSeller({ ...selectedSeller, name: newName.trim() });
                }
            }
        }
    };

    const handleDeleteSeller = async (id: number) => {
        if (confirm('¿Está seguro de eliminar este vendedor? Se borrará todo su historial e inventario.')) {
            const { error } = await supabase.from('sellers').delete().eq('id', id);
            if (error) alert('Error al eliminar: ' + error.message);
            else {
                fetchSellers();
                if (selectedSeller?.id === id) setSelectedSeller(null);
            }
        }
    };

    const handleMovement = async (data: { items: { inventory_id: number; quantity: number }[]; notes: string; date: string }) => {
        if (!selectedSeller || !activeAction || data.items.length === 0) return;

        const { items, notes, date } = data;
        const sellerId = selectedSeller.id;

        try {
            // 1. Validate Stock
            for (const movementItem of items) {
                if (activeAction === 'Carga') {
                    const item = centralInventory.find(i => i.id === movementItem.inventory_id);
                    if (!item || item.quantity < movementItem.quantity) {
                        alert(`No hay suficiente stock en el inventario central para ${item?.name || 'un artículo'}.`);
                        return;
                    }
                } else {
                    const item = sellerInventory.find(i => i.inventory_id === movementItem.inventory_id);
                    if (!item || item.quantity < movementItem.quantity) {
                        alert(`El vendedor no tiene suficiente stock para ${item?.inventory_item?.name || 'un artículo'}.`);
                        return;
                    }
                }
            }

            // 2. Perform Updates
            for (const movementItem of items) {
                const { inventory_id, quantity } = movementItem;
                
                if (activeAction === 'Carga') {
                    const currentCentral = centralInventory.find(i => i.id === inventory_id)!;
                    await supabase.from('inventory').update({ quantity: currentCentral.quantity - quantity }).eq('id', inventory_id);
                    await supabase.from('inventory_movements').insert({
                        inventory_id, quantity_change: -quantity, type: 'Salida', reason: `Carga a Vendedor: ${selectedSeller.name}`
                    });

                    const existingSellerItem = sellerInventory.find(i => i.inventory_id === inventory_id);
                    if (existingSellerItem) {
                        await supabase.from('seller_inventory').update({ quantity: existingSellerItem.quantity + quantity, last_updated: new Date() }).eq('id', existingSellerItem.id);
                    } else {
                        await supabase.from('seller_inventory').insert({ seller_id: sellerId, inventory_id, quantity });
                    }
                } else if (activeAction === 'Venta') {
                    const item = sellerInventory.find(i => i.inventory_id === inventory_id)!;
                    await supabase.from('seller_inventory').update({ quantity: item.quantity - quantity, last_updated: new Date() }).eq('id', item.id);
                } else if (activeAction === 'Devolución') {
                    const item = sellerInventory.find(i => i.inventory_id === inventory_id)!;
                    await supabase.from('seller_inventory').update({ quantity: item.quantity - quantity, last_updated: new Date() }).eq('id', item.id);

                    const currentCentral = centralInventory.find(i => i.id === inventory_id)!;
                    await supabase.from('inventory').update({ quantity: currentCentral.quantity + quantity }).eq('id', inventory_id);
                    await supabase.from('inventory_movements').insert({
                        inventory_id, quantity_change: quantity, type: 'Entrada', reason: `Devolución de Vendedor: ${selectedSeller.name}`
                    });
                }

                await supabase.from('seller_movements').insert({
                    seller_id: sellerId, inventory_id, type: activeAction, quantity, date, notes
                });
            }

            alert('Operaciones registradas con éxito.');
            setActiveAction(null);
            fetchSellerInventory(sellerId);
            fetchCentralInventory();
            fetchSellerMovements(sellerId);

        } catch (error: any) {
            console.error('Transaction error:', error);
            alert('Error al procesar la operación: ' + error.message);
        }
    };

    const handleUndoMovement = async (movement: SellerMovement & { inventory_item?: InventoryItem }) => {
        if (!window.confirm('¿Estás seguro de deshacer este movimiento? Se revertirán los cambios de stock.')) return;

        try {
            // 1. Validate Stock
            if (movement.type === 'Carga') {
                const item = sellerInventory.find(i => i.inventory_id === movement.inventory_id);
                if (!item || item.quantity < movement.quantity) {
                    alert('El vendedor ya no tiene suficiente stock para deshacer esta carga.');
                    return;
                }
            } else if (movement.type === 'Devolución') {
                const item = centralInventory.find(i => i.id === movement.inventory_id);
                if (!item || item.quantity < movement.quantity) {
                    alert('No hay suficiente stock en el inventario central para deshacer esta devolución.');
                    return;
                }
            }

            // 2. Perform Revert Updates
            if (movement.type === 'Carga') {
                // Decrease Seller
                const sellerItem = sellerInventory.find(i => i.inventory_id === movement.inventory_id)!;
                await supabase.from('seller_inventory').update({ quantity: sellerItem.quantity - movement.quantity }).eq('id', sellerItem.id);
                
                // Increase Central
                const centralItem = centralInventory.find(i => i.id === movement.inventory_id)!;
                await supabase.from('inventory').update({ quantity: centralItem.quantity + movement.quantity }).eq('id', centralItem.id);
                
                // Log Central Movement
                await supabase.from('inventory_movements').insert({
                    inventory_id: movement.inventory_id,
                    quantity_change: movement.quantity,
                    type: 'Entrada',
                    reason: `Deshacer Carga a Vendedor: ${selectedSeller?.name}`
                });
            } else if (movement.type === 'Venta') {
                // Increase Seller
                const sellerItem = sellerInventory.find(i => i.inventory_id === movement.inventory_id);
                if (sellerItem) {
                    await supabase.from('seller_inventory').update({ quantity: sellerItem.quantity + movement.quantity }).eq('id', sellerItem.id);
                } else {
                    await supabase.from('seller_inventory').insert({ seller_id: movement.seller_id, inventory_id: movement.inventory_id, quantity: movement.quantity });
                }
            } else if (movement.type === 'Devolución') {
                // Decrease Central
                const centralItem = centralInventory.find(i => i.id === movement.inventory_id)!;
                await supabase.from('inventory').update({ quantity: centralItem.quantity - movement.quantity }).eq('id', centralItem.id);
                
                // Increase Seller
                const sellerItem = sellerInventory.find(i => i.inventory_id === movement.inventory_id);
                if (sellerItem) {
                    await supabase.from('seller_inventory').update({ quantity: sellerItem.quantity + movement.quantity }).eq('id', sellerItem.id);
                } else {
                    await supabase.from('seller_inventory').insert({ seller_id: movement.seller_id, inventory_id: movement.inventory_id, quantity: movement.quantity });
                }
                
                // Log Central Movement
                await supabase.from('inventory_movements').insert({
                    inventory_id: movement.inventory_id,
                    quantity_change: -movement.quantity,
                    type: 'Salida',
                    reason: `Deshacer Devolución de Vendedor: ${selectedSeller?.name}`
                });
            }

            // 3. Delete Movement Record
            await supabase.from('seller_movements').delete().eq('id', movement.id);

            alert('Movimiento deshecho con éxito.');
            fetchSellerInventory(movement.seller_id);
            fetchCentralInventory();
            fetchSellerMovements(movement.seller_id);

        } catch (error: any) {
            console.error('Undo error:', error);
            alert('Error al deshacer la operación: ' + error.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="lg:col-span-1">
                <SellerList 
                    sellers={sellers} 
                    onSelect={setSelectedSeller} 
                    onAdd={handleAddSeller}
                    onEdit={handleEditSeller}
                    onDelete={handleDeleteSeller}
                />
            </div>
            <div className="lg:col-span-3">
                {selectedSeller ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{selectedSeller.name}</h2>
                                <p className="text-sm text-gray-500">Gestión de inventario y ventas</p>
                            </div>
                            <div className="flex space-x-2 mt-4 md:mt-0">
                                <button 
                                    onClick={() => setActiveAction('Carga')}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                                >
                                    <ArrowRightIcon size={18} className="mr-2" />
                                    Cargar Camión
                                </button>
                                <button 
                                    onClick={() => setActiveAction('Venta')}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                                >
                                    <ShoppingCartIcon size={18} className="mr-2" />
                                    Registrar Venta
                                </button>
                                <button 
                                    onClick={() => setActiveAction('Devolución')}
                                    className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition shadow-sm"
                                >
                                    <ArrowLeftIcon size={18} className="mr-2" />
                                    Devolución
                                </button>
                            </div>
                        </div>

                        {activeAction && (
                            <MovementForm 
                                type={activeAction} 
                                seller={selectedSeller}
                                inventoryItems={centralInventory}
                                sellerInventory={sellerInventory}
                                onSubmit={handleMovement}
                                onCancel={() => setActiveAction(null)}
                            />
                        )}

                        <Card title="Inventario del Vendedor">
                            {isLoading ? (
                                <p className="text-center py-8 text-gray-500">Cargando inventario...</p>
                            ) : (
                                <SellerInventoryTable inventory={sellerInventory} />
                            )}
                        </Card>

                        <Card title="Historial de Movimientos">
                            <MovementHistoryTable movements={sellerMovements} onUndo={handleUndoMovement} />
                        </Card>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <UsersIcon size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Seleccione un vendedor para comenzar</p>
                    </div>
                )}
            </div>

            {/* What's New Pop-up */}
            {showWhatsNew && (
                <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden z-50 transition-all duration-500 ease-in-out transform translate-y-0 opacity-100">
                    <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
                        <h3 className="text-white font-semibold text-sm">Novedades en Vendedores</h3>
                        <button 
                            onClick={() => {
                                setShowWhatsNew(false);
                                sessionStorage.setItem('vendedores_whats_new_dismissed', 'true');
                            }}
                            className="text-blue-100 hover:text-white transition"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>
                    <div className="p-4 bg-blue-50/50">
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span><strong>Fechas y Semanas:</strong> Ahora puedes ver y registrar la fecha exacta y la semana de cada movimiento.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span><strong>Deshacer Movimientos:</strong> ¿Te equivocaste? Usa el botón deshacer en el historial.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span><strong>Stock Claro:</strong> Visualiza el stock en unidades y docenas simultáneamente.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span><strong>Filtro Inteligente:</strong> La materia prima ya no satura esta vista.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellersView;
