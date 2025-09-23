import React, { useState } from 'react';
import type { View } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import TasksIcon from './icons/TasksIcon';
import InventoryIcon from './icons/InventoryIcon';
import MachineIcon from './icons/MachineIcon';
import ReportsIcon from './icons/ReportsIcon';
import UsersIcon from './icons/UsersIcon';
import ProductionIcon from './icons/ProductionIcon';
import SupplierIcon from './icons/SupplierIcon';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`flex items-center px-4 py-3 text-gray-100 hover:bg-slate-500 rounded-lg transition-colors duration-200 ${isActive ? 'bg-slate-500' : ''}`}
        >
            {icon}
            <span className="mx-4 font-medium">{label}</span>
        </a>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-6 w-6" /> },
        { view: 'tasks', label: 'Gestión de Tareas', icon: <TasksIcon className="h-6 w-6" /> },
        { view: 'productionOrders', label: 'Órdenes de Producción', icon: <ProductionIcon className="h-6 w-6" /> },
        { view: 'workers', label: 'Funcionarios', icon: <UsersIcon className="h-6 w-6" /> },
        { view: 'inventory', label: 'Inventario', icon: <InventoryIcon className="h-6 w-6" /> },
        { view: 'suppliers', label: 'Proveedores', icon: <SupplierIcon className="h-6 w-6" /> },
        { view: 'machines', label: 'Máquinas', icon: <MachineIcon className="h-6 w-6" /> },
        { view: 'reports', label: 'Reportes', icon: <ReportsIcon className="h-6 w-6" /> },
    ];

    const [date] = useState(new Date());

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["L", "M", "M", "J", "V", "S", "D"];

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = date.getDate();

    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // 0 for Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const handleNavClick = (view: View) => {
        setActiveView(view);
        setIsOpen(false);
    };

    const sidebarClasses = `
        fixed md:static inset-y-0 left-0 z-30
        flex flex-col w-64 bg-slate-600
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
    `;

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <div className={sidebarClasses}>
                <div className="flex items-center justify-center h-20 border-b border-slate-500 px-4">
                    <img src="/LOGO-teysa.png" alt="Logo Teysa" className="h-12 w-auto" />
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <nav className="px-2 py-4">
                        {navItems.map(item => (
                            <NavLink
                                key={item.view}
                                icon={item.icon}
                                label={item.label}
                                isActive={activeView === item.view}
                                onClick={() => handleNavClick(item.view)}
                            />
                        ))}
                    </nav>

                    <div className="px-4 py-4 mt-auto border-t border-slate-500">
                        <div className="text-center mb-3">
                            <p className="font-semibold text-white">{monthNames[month]} {year}</p>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-300 mb-2">
                            {dayNames.map((day, index) => <div key={index}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-y-1 text-center text-sm text-slate-200">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                            {Array.from({ length: daysInMonth }).map((_, day) => {
                                const dayNumber = day + 1;
                                const isToday = dayNumber === today && new Date().getMonth() === month && new Date().getFullYear() === year;
                                return (
                                    <div key={dayNumber} className={`flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-200 ${isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-slate-500'}`}>
                                        {dayNumber}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default Sidebar;