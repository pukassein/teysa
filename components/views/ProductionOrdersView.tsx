
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import type { InventoryItem, Product, ProductRecipe, ProductionOrder } from '../../types';
import Card from '../ui/Card';
import TrashIcon from '../icons/TrashIcon';
import PlusIcon from '../icons/PlusIcon';
import ChevronDownIcon from '../icons/ChevronDownIcon';

type Tab = 'orders' | 'recipes';

// --- Components ---

const OrderModal: React.FC<{
    products: (Product & { inventory_name: string })[];
    inventory: InventoryItem[];
    recipes: ProductRecipe[];
    onClose: () => void;
    onOrderCreated: () => void;
}> = ({ products, inventory, recipes, onClose, onOrderCreated }) => {
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
    const [quantity, setQuantity] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(',', '.');
        if (sanitizedValue === '' || /^\d*\.?\d*$/.test(sanitizedValue)) {
            setQuantity(sanitizedValue);
        }
    };

    const { requiredMaterials, sufficientStock, hasRecipe } = useMemo(() => {
        if (!selectedProductId) return { requiredMaterials: [], sufficientStock: true, hasRecipe: false };
        
        const productRecipes = recipes.filter(r => r.product_id === selectedProductId);
        if (productRecipes.length === 0) {
            return { requiredMaterials: [], sufficientStock: true, hasRecipe: false };
        }

        let allStockSufficient = true;
        const currentQuantity = Number(quantity) || 0;

        const materials = productRecipes.map(recipe => {
            const materialInfo = inventory.find(i => i.id === recipe.raw_material_inventory_id);
            const required = recipe.quantity_required * currentQuantity;
            const available = materialInfo?.quantity || 0;
            const hasEnough = available >= required;
            
            if (!hasEnough) allStockSufficient = false;

            return {
                name: materialInfo?.name || 'Desconocido',
                unit: materialInfo?.unit || '',
                required,
                available,
                hasEnough,
            };
        });
        
        return { requiredMaterials: materials, sufficientStock: allStockSufficient, hasRecipe: true };
    }, [selectedProductId, quantity, recipes, inventory]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericQuantity = Number(quantity);
        if (!selectedProductId || numericQuantity <= 0 || !sufficientStock || !hasRecipe) return;
        
        setIsSubmitting(true);
        const { error } = await supabase.from('production_orders').insert({
            product_id: selectedProductId,
            quantity_to_produce: numericQuantity,
            status: 'Pendiente',
        });
        setIsSubmitting(false);

        if (error) {
            console.error("Error creating order:", error);
            alert("Error al crear la orden: " + error.message);
        } else {
            onOrderCreated();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-200">Crear Nueva Orden de Producción</h3>
                <form onSubmit={handleSubmit}>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="product" className="block text-sm font-medium text-gray-700">Producto a Fabricar</label>
                                <select id="product" value={selectedProductId} onChange={e => setSelectedProductId(Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>
                                    <option value="" disabled>Seleccione un producto...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad a Producir</label>
                                <input type="text" inputMode="decimal" id="quantity" value={quantity} onChange={handleQuantityChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required/>
                            </div>
                        </div>
                        {selectedProductId && (
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Materiales Requeridos:</h4>
                                {hasRecipe ? (
                                    <ul className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                                        {requiredMaterials.map(mat => (
                                            <li key={mat.name} className={`flex justify-between items-center text-sm p-1 rounded ${!mat.hasEnough ? 'bg-red-100' : 'bg-gray-50'}`}>
                                                <span>{mat.name}</span>
                                                <span className={`font-mono ${!mat.hasEnough ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                    {mat.required.toFixed(2)} / {mat.available.toFixed(2)} {mat.unit}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-yellow-700 bg-yellow-50 font-medium rounded-md py-3">Este producto no tiene una receta definida.</p>
                                )}
                                {!sufficientStock && <p className="text-red-600 text-sm mt-2 font-semibold">¡Atención! No hay suficiente stock de uno o más materiales.</p>}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSubmitting || !selectedProductId || !sufficientStock || !hasRecipe} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">Crear Orden</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddIngredientForm: React.FC<{
    productId: number;
    rawMaterials: InventoryItem[];
    onRecipeUpdate: () => void;
}> = ({ productId, rawMaterials, onRecipeUpdate }) => {
    const [materialId, setMaterialId] = useState<number | ''>('');
    const [quantity, setQuantity] = useState('');

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(',', '.');
        if (sanitizedValue === '' || /^\d*\.?\d*$/.test(sanitizedValue)) {
            setQuantity(sanitizedValue);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!materialId || Number(quantity) <= 0) return;

        const { error } = await supabase.from('product_recipes').insert({
            product_id: productId,
            raw_material_inventory_id: materialId,
            quantity_required: Number(quantity)
        });

        if (error) {
            alert('Error al añadir material: ' + error.message);
        } else {
            setMaterialId('');
            setQuantity('');
            onRecipeUpdate();
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end mt-4 pt-4 border-t border-gray-200">
            <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-600">Materia Prima</label>
                 <select value={materialId} onChange={e => setMaterialId(Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm" required>
                    <option value="" disabled>Seleccionar...</option>
                    {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                 </select>
            </div>
            <div className="sm:col-span-2">
                 <label className="block text-xs font-medium text-gray-600">Cantidad Req.</label>
                <input type="text" inputMode="decimal" value={quantity} onChange={handleQuantityChange} placeholder="0.0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm" required />
            </div>
            <button type="submit" className="sm:col-span-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm flex items-center justify-center space-x-2 h-10">
                <PlusIcon className="w-4 h-4" />
                <span>Añadir</span>
            </button>
        </form>
    );
};

const RecipeManager: React.FC<{
    products: (Product & { inventory_name: string })[];
    recipes: ProductRecipe[];
    rawMaterials: InventoryItem[];
    finishedGoods: InventoryItem[];
    onDataUpdate: () => void,
}> = ({ products, recipes, rawMaterials, finishedGoods, onDataUpdate }) => {
    const [newProductId, setNewProductId] = useState<number | ''>('');
    const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());

    const toggleProductExpansion = (productId: number) => {
        const newSet = new Set(expandedProductIds);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setExpandedProductIds(newSet);
    };

    const availableFinishedGoods = useMemo(() => {
        const productInventoryIds = products.map(p => p.finished_product_inventory_id);
        return finishedGoods.filter(fg => !productInventoryIds.includes(fg.id));
    }, [products, finishedGoods]);

    const handleCreateProduct = async () => {
        if (!newProductId) return;
        const inventoryItem = finishedGoods.find(i => i.id === newProductId);
        if (!inventoryItem) return;

        const { data, error } = await supabase.from('products').insert({
            name: inventoryItem.name,
            finished_product_inventory_id: newProductId
        }).select();

        if (error) {
            alert('Error al crear el producto: ' + error.message);
        } else if (data) {
            setNewProductId('');
            onDataUpdate();
            // Automatically expand the newly created product
            toggleProductExpansion(data[0].id);
        }
    };

    const handleDeleteRecipeItem = async (recipeId: number) => {
        if (!window.confirm('¿Eliminar este material de la receta?')) return;
        const { error } = await supabase.from('product_recipes').delete().eq('id', recipeId);
        if (error) alert('Error al eliminar: ' + error.message);
        else onDataUpdate();
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!window.confirm('¿Eliminar este producto y su receta? Esta acción no se puede deshacer.')) return;
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) alert('Error al eliminar producto: ' + error.message);
        else onDataUpdate();
    }

    return (
        <Card title="Gestión de Recetas de Productos">
            <div className="p-4 space-y-6">
                <div>
                    <h3 className="text-md font-semibold text-gray-700">1. Crear Producto Fabricable</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-3">Selecciona un artículo de tu inventario para asignarle una receta.</p>
                    <div className="flex items-end space-x-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-grow">
                            <label htmlFor="new-product" className="block text-sm font-medium text-gray-700 sr-only">Producto Terminado</label>
                            <select id="new-product" value={newProductId} onChange={e => setNewProductId(Number(e.target.value))} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="" disabled>Seleccionar un artículo del inventario...</option>
                                {availableFinishedGoods.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreateProduct} disabled={!newProductId} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition h-10 flex items-center space-x-2">
                            <PlusIcon className="w-5 h-5" /> 
                            <span>Crear</span>
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-gray-700">2. Asignar Materiales</h3>
                     <p className="text-sm text-gray-500 mt-1 mb-3">Haz clic en un producto para ver/editar su receta.</p>
                    {products.length > 0 ? (
                        <div className="space-y-2">
                            {products.map(product => {
                                const productRecipes = recipes.filter(r => r.product_id === product.id);
                                const isExpanded = expandedProductIds.has(product.id);
                                return (
                                    <div key={product.id} className="border rounded-lg bg-white">
                                        <button 
                                            onClick={() => toggleProductExpansion(product.id)}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 rounded-lg"
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="flex items-center">
                                                <h4 className="text-lg font-bold text-gray-800">{product.name}</h4>
                                                <span className="ml-3 text-sm bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{productRecipes.length} ingrediente(s)</span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-gray-400 hover:text-red-500 z-10 relative p-1 rounded-full hover:bg-red-50">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                                <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`} />
                                            </div>
                                        </button>
                                         <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-screen' : 'max-h-0'}`}>
                                            <div className="p-4 border-t">
                                                <ul className="mb-3 space-y-1 text-sm">
                                                    {productRecipes.map(recipe => {
                                                        const material = rawMaterials.find(m => m.id === recipe.raw_material_inventory_id);
                                                        return (
                                                            <li key={recipe.id} className="flex justify-between items-center p-2 bg-gray-50 rounded group">
                                                                <span>{material?.name || 'Material no encontrado'}</span>
                                                                <div className="flex items-center space-x-3">
                                                                <span className="font-mono text-gray-700">{recipe.quantity_required} {material?.unit}</span>
                                                                <button onClick={() => handleDeleteRecipeItem(recipe.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                    {productRecipes.length === 0 && <li className="text-center text-gray-500 py-2 text-sm">Esta receta está vacía. Añade un material para empezar.</li>}
                                                </ul>
                                                <AddIngredientForm productId={product.id} rawMaterials={rawMaterials} onRecipeUpdate={onDataUpdate} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-6">No hay productos fabricables. Créalos en el paso anterior.</p>
                    )}
                </div>
            </div>
        </Card>
    );
};

const ProductionOrdersView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [products, setProducts] = useState<(Product & { inventory_name: string })[]>([]);
    const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
    const [orders, setOrders] = useState<(ProductionOrder & { product_name: string })[]>([]);
    const [showOrderModal, setShowOrderModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const inventoryPromise = supabase.from('inventory').select('*');
            const productsPromise = supabase.from('products').select('*, inventory(name)').order('name');;
            const recipesPromise = supabase.from('product_recipes').select('*');
            const ordersPromise = supabase.from('production_orders').select('*, products(name)').order('created_at', { ascending: false });

            const [
                { data: inventoryData, error: inventoryError },
                { data: productsData, error: productsError },
                { data: recipesData, error: recipesError },
                { data: ordersData, error: ordersError },
            ] = await Promise.all([inventoryPromise, productsPromise, recipesPromise, ordersPromise]);

            if (inventoryError) throw inventoryError;
            if (productsError) throw productsError;
            if (recipesError) throw recipesError;
            if (ordersError) throw ordersError;
            
            setInventory(inventoryData as InventoryItem[]);
            const formattedProducts = productsData?.map(p => ({ ...p, inventory_name: (p.inventory as any)?.name || 'N/A', name: p.name })) || [];
            setProducts(formattedProducts as (Product & { inventory_name: string })[]);
            setRecipes(recipesData as ProductRecipe[]);
            const formattedOrders = ordersData?.map(o => ({ ...o, product_name: (o.products as any)?.name || 'N/A' })) || [];
            setOrders(formattedOrders as (ProductionOrder & { product_name: string })[]);

        } catch (error: any) {
            console.error('Error fetching production data:', error);
            const errorMessage = error?.message ? error.message : "Ocurrió un error inesperado. Revisa la consola para más detalles.";
            alert("Error al cargar los datos: " + errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const finishedGoods = useMemo(() => inventory.filter(i => i.type === 'Producto Terminado'), [inventory]);
    const rawMaterials = useMemo(() => inventory.filter(i => i.type === 'Materia Prima'), [inventory]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Órdenes de Producción</h2>
            
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('orders')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Órdenes Activas
                    </button>
                    <button onClick={() => setActiveTab('recipes')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'recipes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Recetas de Productos
                    </button>
                </nav>
            </div>
            
            {loading && <p>Cargando datos...</p>}

            {!loading && activeTab === 'orders' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowOrderModal(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                            Crear Nueva Orden
                        </button>
                    </div>
                     <Card title="Listado de Órdenes de Producción">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="p-4">Producto</th>
                                        <th scope="col" className="p-4 text-center">Cantidad</th>
                                        <th scope="col" className="p-4 text-center">Estado</th>
                                        <th scope="col" className="p-4">Fecha de Creación</th>
                                        <th scope="col" className="p-4">Fecha de Finalización</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50 border-b">
                                            <td className="p-4 font-semibold">{order.product_name}</td>
                                            <td className="p-4 text-center font-mono">{order.quantity_to_produce}</td>
                                            <td className="p-4 text-center">{order.status}</td>
                                            <td className="p-4">{new Date(order.created_at).toLocaleDateString('es-ES')}</td>
                                            <td className="p-4">{order.completed_at ? new Date(order.completed_at).toLocaleDateString('es-ES') : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {orders.length === 0 && <p className="text-center text-gray-500 py-6">No hay órdenes de producción creadas.</p>}
                        </div>
                    </Card>
                </div>
            )}
            
            {!loading && activeTab === 'recipes' && (
                 <RecipeManager 
                    products={products}
                    recipes={recipes}
                    rawMaterials={rawMaterials}
                    finishedGoods={finishedGoods}
                    onDataUpdate={fetchData}
                 />
            )}

            {showOrderModal && (
                <OrderModal 
                    products={products}
                    inventory={inventory}
                    recipes={recipes}
                    onClose={() => setShowOrderModal(false)}
                    onOrderCreated={fetchData}
                />
            )}
        </div>
    );
};

export default ProductionOrdersView;