
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Supplier } from '../../types';
import Card from '../ui/Card';
import SearchIcon from '../icons/SearchIcon';

const SupplierForm: React.FC<{
    supplier?: Supplier;
    onSave: (supplierData: Omit<Supplier, 'id' | 'created_at'>) => void;
    onCancel: () => void;
    isEdit?: boolean;
}> = ({ supplier, onSave, onCancel, isEdit = false }) => {
    const [formData, setFormData] = useState({
        company_name: supplier?.company_name || '',
        location: supplier?.location || '',
        phone_number: supplier?.phone_number || '',
        contact_person: supplier?.contact_person || '',
        supplies_details: supplier?.supplies_details || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company_name.trim()) {
            alert('El nombre de la empresa es obligatorio.');
            return;
        }
        onSave(formData);
    };

    return (
        <Card title={isEdit ? 'Editar Proveedor' : 'Añadir Nuevo Proveedor'} className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">Empresa</label>
                        <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">Contacto</label>
                        <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Número de Teléfono</label>
                        <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Ubicación</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="supplies_details" className="block text-sm font-medium text-gray-700">¿Qué suministra?</label>
                        <textarea name="supplies_details" value={formData.supplies_details} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Ej: Materias primas plásticas, tornillería, cajas de cartón..."></textarea>
                    </div>
                </div>
                 <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">{isEdit ? 'Guardar Cambios' : 'Añadir Proveedor'}</button>
                </div>
            </form>
        </Card>
    );
};


const SupplierCard: React.FC<{ supplier: Supplier; onEdit: (supplier: Supplier) => void; onDelete: (id: number) => void; }> = ({ supplier, onEdit, onDelete }) => (
    <Card>
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-800">{supplier.company_name}</h3>
            <div className="flex space-x-2 flex-shrink-0">
                <button onClick={() => onEdit(supplier)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition">Editar</button>
                <button onClick={() => onDelete(supplier.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition">Eliminar</button>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
            {supplier.contact_person && <p><span className="font-semibold">Contacto:</span> {supplier.contact_person}</p>}
            {supplier.phone_number && <p><span className="font-semibold">Teléfono:</span> {supplier.phone_number}</p>}
            {supplier.location && <p className="sm:col-span-2"><span className="font-semibold">Ubicación:</span> {supplier.location}</p>}
        </div>
        {supplier.supplies_details && (
            <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-gray-700 text-sm">Suministros:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{supplier.supplies_details}</p>
            </div>
        )}
    </Card>
);

const SuppliersView: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSuppliers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('suppliers').select('*').order('company_name');
        if (error) {
            console.error("Error fetching suppliers:", error);
            alert("Error al cargar proveedores: " + error.message);
        } else {
            setSuppliers(data as Supplier[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);
    
    const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at'>) => {
        const { data, error } = await supabase.from('suppliers').insert(supplierData).select();
        if (error) {
            alert("Error al añadir proveedor: " + error.message);
        } else if (data) {
            setSuppliers(current => [...current, data[0] as Supplier].sort((a,b) => a.company_name.localeCompare(b.company_name)));
            setShowAddForm(false);
        }
    };

    const handleUpdateSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at'>) => {
        if (!editingSupplier) return;
        const { data, error } = await supabase.from('suppliers').update(supplierData).eq('id', editingSupplier.id).select();
        if (error) {
            alert("Error al actualizar proveedor: " + error.message);
        } else if (data) {
            setSuppliers(current => current.map(s => s.id === editingSupplier.id ? data[0] as Supplier : s));
            setEditingSupplier(null);
        }
    };

    const handleDeleteSupplier = async (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) {
                alert("Error al eliminar proveedor: " + error.message);
            } else {
                setSuppliers(current => current.filter(s => s.id !== id));
            }
        }
    };

    const handleCancel = () => {
        setShowAddForm(false);
        setEditingSupplier(null);
    }
    
    const isFormOpen = showAddForm || !!editingSupplier;

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.supplies_details && supplier.supplies_details.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 self-start md:self-center">Gestión de Proveedores</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar proveedor..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                    {!isFormOpen && (
                        <button 
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition w-full md:w-auto"
                        >
                            Añadir Proveedor
                        </button>
                    )}
                </div>
            </div>
            
            {showAddForm && <SupplierForm onSave={handleAddSupplier} onCancel={handleCancel} />}
            {editingSupplier && <SupplierForm supplier={editingSupplier} onSave={handleUpdateSupplier} onCancel={handleCancel} isEdit />}

            {loading ? (
                <p>Cargando proveedores...</p>
            ) : (
                <div className="space-y-4">
                    {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map(supplier => (
                            <SupplierCard 
                                key={supplier.id} 
                                supplier={supplier} 
                                onEdit={setEditingSupplier} 
                                onDelete={handleDeleteSupplier}
                            />
                        ))
                    ) : (
                         !isFormOpen && <Card><p className="text-center text-gray-500 py-4">No se encontraron proveedores {searchTerm ? `con el término "${searchTerm}"` : 'registrados. ¡Añade el primero!'}</p></Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default SuppliersView;