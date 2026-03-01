import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Seller, SellerInventory, SellerMovement, InventoryItem } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import SearchableSelect from '../ui/SearchableSelect';
import { PlusIcon, TrashIcon, ArrowRightIcon, ArrowLeftIcon, ShoppingCartIcon, Users as UsersIcon } from 'lucide-react';

// --- Sub-components ---

const SellerList: React.FC<{
    sellers: Seller[];
    onSelect: (seller: Seller) => void;
    onAdd: () => void;
    onDelete: (id: number) => void;
}> = ({ sellers, onSelect, onAdd, onDelete }) => (
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
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border border-gray-200"
                    >
                        <span className="font-medium text-gray-800">{seller.name}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(seller.id); }}
                            className="text-red-400 hover:text-red-600 p-1"
                        >
                            <TrashIcon size={16} />
                        </button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock en Camión</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {inventory.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">El camión está vacío.</td>
                    </tr>
                ) : (
                    inventory.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.inventory_item?.name || 'Desconocido'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.inventory_item?.brand || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.inventory_item?.unit || '-'}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

const MovementForm: React.FC<{
    type: 'Carga' | 'Venta' | 'Devolución';
    seller: Seller;
    inventoryItems: InventoryItem[]; // Central inventory items
    sellerInventory: (SellerInventory & { inventory_item?: InventoryItem })[]; // Items seller has
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}> = ({ type, seller, inventoryItems, sellerInventory, onSubmit, onCancel }) => {
    const [itemId, setItemId] = useState<string>('');
    const [quantityUnits, setQuantityUnits] = useState<string>('');
    const [quantityDozens, setQuantityDozens] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine which list of items to show based on movement type
    // Carga: Show all central inventory items
    // Venta/Devolución: Show only items the seller has in stock (or all, but validation is needed)
    // Actually, for Venta/Devolución, it's better to select from what they have.
    
    const availableItems = useMemo(() => {
        if (type === 'Carga') {
            return inventoryItems;
        } else {
            // For Sale/Return, map seller inventory back to InventoryItem structure for the select
            return sellerInventory
                .filter(si => si.inventory_item)
                .map(si => ({
                    ...si.inventory_item!,
                    // Override quantity with seller's quantity for display purposes in the dropdown
                    quantity: si.quantity 
                }));
        }
    }, [type, inventoryItems, sellerInventory]);

    const selectedItem = useMemo(() => availableItems.find(i => i.id === Number(itemId)), [availableItems, itemId]);

    useEffect(() => {
        setQuantityUnits('');
        setQuantityDozens('');
    }, [selectedItem]);

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
        
        let qty = 0;
        if (selectedItem) {
            const unit = selectedItem.unit.toLowerCase();
            if (unit === 'docenas') {
                qty = parseFloat(quantityDozens);
            } else {
                qty = parseFloat(quantityUnits);
            }
        }

        if (!itemId || isNaN(qty) || qty <= 0) {
            alert('Por favor, seleccione un artículo e ingrese una cantidad válida.');
            return;
        }

        setIsSubmitting(true);
        await onSubmit({ inventory_id: parseInt(itemId), quantity: qty, notes });
        setIsSubmitting(false);
    };

    const itemOptions = useMemo(() => availableItems.map(i => ({
        id: i.id,
        label: i.name,
        subLabel: `${i.brand} - Stock: ${i.quantity} ${i.unit}`
    })), [availableItems]);

    const isStandardUnit = !selectedItem || ['unidades', 'docenas'].includes(selectedItem.unit.toLowerCase());

    return (
        <Card title={`Registrar ${type} - ${seller.name}`} className="mb-6 border-2 border-blue-100">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <SearchableSelect 
                        options={itemOptions}
                        value={itemId}
                        onChange={setItemId}
                        placeholder="Buscar producto..."
                    />
                </div>

                <div>
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
                                placeholder="0" 
                                className="block w-full pr-16 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" 
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">{selectedItem?.unit || 'Unidad'}</span>
                            </div>
                        </div>
                    )}
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

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">
                        {isSubmitting ? 'Procesando...' : 'Confirmar'}
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
    const [centralInventory, setCentralInventory] = useState<InventoryItem[]>([]);
    const [activeAction, setActiveAction] = useState<'Carga' | 'Venta' | 'Devolución' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchSellers();
        fetchCentralInventory();
    }, []);

    useEffect(() => {
        if (selectedSeller) {
            fetchSellerInventory(selectedSeller.id);
            setActiveAction(null);
        }
    }, [selectedSeller]);

    const fetchSellers = async () => {
        const { data, error } = await supabase.from('sellers').select('*').order('name');
        if (error) console.error('Error fetching sellers:', error);
        else setSellers(data || []);
    };

    const fetchCentralInventory = async () => {
        const { data, error } = await supabase.from('inventory').select('*').order('name');
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

    const handleAddSeller = async () => {
        const name = prompt('Nombre del nuevo vendedor:');
        if (name) {
            const { error } = await supabase.from('sellers').insert({ name });
            if (error) alert('Error al crear vendedor: ' + error.message);
            else fetchSellers();
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

    const handleMovement = async (data: { inventory_id: number; quantity: number; notes: string }) => {
        if (!selectedSeller || !activeAction) return;

        const { inventory_id, quantity, notes } = data;
        const sellerId = selectedSeller.id;

        try {
            // 1. Validate Stock
            if (activeAction === 'Carga') {
                // Check central inventory
                const item = centralInventory.find(i => i.id === inventory_id);
                if (!item || item.quantity < quantity) {
                    alert('No hay suficiente stock en el inventario central.');
                    return;
                }
            } else {
                // Check seller inventory for Sale/Return
                const item = sellerInventory.find(i => i.inventory_id === inventory_id);
                if (!item || item.quantity < quantity) {
                    alert('El vendedor no tiene suficiente stock para esta operación.');
                    return;
                }
            }

            // 2. Perform Updates based on Action Type
            
            if (activeAction === 'Carga') {
                // A. Decrease Central Inventory
                const { error: invError } = await supabase.rpc('decrement_inventory', { 
                    row_id: inventory_id, 
                    amount: quantity 
                });
                // Fallback if RPC doesn't exist (using direct update for now as RPC might not be set up)
                // Actually, let's do direct update to be safe with current setup
                const currentCentral = centralInventory.find(i => i.id === inventory_id)!;
                const { error: updateCentralError } = await supabase
                    .from('inventory')
                    .update({ quantity: currentCentral.quantity - quantity })
                    .eq('id', inventory_id);
                
                if (updateCentralError) throw updateCentralError;

                // Log Central Movement
                await supabase.from('inventory_movements').insert({
                    inventory_id,
                    quantity_change: -quantity,
                    type: 'Salida',
                    reason: `Carga a Vendedor: ${selectedSeller.name}`
                });

                // B. Increase Seller Inventory
                // Check if exists
                const existingSellerItem = sellerInventory.find(i => i.inventory_id === inventory_id);
                if (existingSellerItem) {
                    await supabase
                        .from('seller_inventory')
                        .update({ quantity: existingSellerItem.quantity + quantity, last_updated: new Date() })
                        .eq('id', existingSellerItem.id);
                } else {
                    await supabase
                        .from('seller_inventory')
                        .insert({ seller_id: sellerId, inventory_id, quantity });
                }

            } else if (activeAction === 'Venta') {
                // Decrease Seller Inventory
                const item = sellerInventory.find(i => i.inventory_id === inventory_id)!;
                await supabase
                    .from('seller_inventory')
                    .update({ quantity: item.quantity - quantity, last_updated: new Date() })
                    .eq('id', item.id);

            } else if (activeAction === 'Devolución') {
                // A. Decrease Seller Inventory
                const item = sellerInventory.find(i => i.inventory_id === inventory_id)!;
                await supabase
                    .from('seller_inventory')
                    .update({ quantity: item.quantity - quantity, last_updated: new Date() })
                    .eq('id', item.id);

                // B. Increase Central Inventory
                const currentCentral = centralInventory.find(i => i.id === inventory_id)!;
                await supabase
                    .from('inventory')
                    .update({ quantity: currentCentral.quantity + quantity })
                    .eq('id', inventory_id);

                // Log Central Movement
                await supabase.from('inventory_movements').insert({
                    inventory_id,
                    quantity_change: quantity,
                    type: 'Entrada',
                    reason: `Devolución de Vendedor: ${selectedSeller.name}`
                });
            }

            // 3. Log Seller Movement
            await supabase.from('seller_movements').insert({
                seller_id: sellerId,
                inventory_id,
                type: activeAction,
                quantity,
                notes
            });

            alert('Operación registrada con éxito.');
            setActiveAction(null);
            fetchSellerInventory(sellerId);
            fetchCentralInventory(); // Refresh central inventory to keep sync

        } catch (error: any) {
            console.error('Transaction error:', error);
            alert('Error al procesar la operación: ' + error.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="lg:col-span-1">
                <SellerList 
                    sellers={sellers} 
                    onSelect={setSelectedSeller} 
                    onAdd={handleAddSeller}
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
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <UsersIcon size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Seleccione un vendedor para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellersView;
