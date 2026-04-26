
import React, { useState, useEffect } from 'react';
import type { View } from '../types';
import { motion, AnimatePresence } from "framer-motion";
import DashboardIcon from './icons/DashboardIcon';
import TasksIcon from './icons/TasksIcon';
import InventoryIcon from './icons/InventoryIcon';
import MachineIcon from './icons/MachineIcon';
import ReportsIcon from './icons/ReportsIcon';
import UsersIcon from './icons/UsersIcon';
import ProductionIcon from './icons/ProductionIcon';
import SupplierIcon from './icons/SupplierIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import MenuIcon from './icons/MenuIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

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
    isHighlight?: boolean;
    isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, isHighlight, isSubItem }) => {
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`flex items-center px-4 py-3 text-gray-100 hover:bg-slate-500 rounded-lg transition-colors duration-200 ${isActive ? 'bg-slate-500' : ''} ${isHighlight && !isActive ? 'bg-blue-500/10 border border-blue-400/20' : ''} ${isSubItem ? 'pl-9 py-2 text-sm text-gray-300' : ''}`}
        >
            <div className={`${isSubItem ? 'flex-shrink-0 w-5 h-5' : ''}`}>
                {isSubItem ? React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' }) : icon}
            </div>
            <span className={`mx-4 font-medium ${isSubItem ? 'mx-3' : ''}`}>{label}</span>
            {isHighlight && (
                <span className="ml-auto flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
            )}
        </a>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const mainNavItems: { view: View; label: string; icon: React.ReactNode; isHighlight?: boolean }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-6 w-6" /> },
        { view: 'tasks', label: 'Gestión de Tareas', icon: <TasksIcon className="h-6 w-6" /> },
        { view: 'productionOrders', label: 'Órdenes de Producción', icon: <ProductionIcon className="h-6 w-6" /> },
        { view: 'productionLog', label: 'Registro de Producción', icon: <ClipboardListIcon className="h-6 w-6" /> },
        { view: 'sellers', label: 'Vendedores', icon: <UsersIcon className="h-6 w-6" /> },
        { view: 'inventory', label: 'Inventario', icon: <InventoryIcon className="h-6 w-6" /> },
        { view: 'activityLog', label: 'Historial', icon: <ClipboardListIcon className="h-6 w-6" /> },
    ];

    const otrosNavItems: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'machines', label: 'Máquinas', icon: <MachineIcon className="h-6 w-6" /> },
        { view: 'workers', label: 'Funcionarios', icon: <UsersIcon className="h-6 w-6" /> },
        { view: 'reports', label: 'Reportes', icon: <ReportsIcon className="h-6 w-6" /> },
        { view: 'suppliers', label: 'Proveedores', icon: <SupplierIcon className="h-6 w-6" /> },
    ];

    const [isOtrosOpen, setIsOtrosOpen] = useState(() => 
        otrosNavItems.some(item => item.view === activeView)
    );

    useEffect(() => {
        if (otrosNavItems.some(item => item.view === activeView)) {
            setIsOtrosOpen(true);
        }
    }, [activeView]);

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
                    <nav className="px-2 py-4 space-y-1">
                        {mainNavItems.map(item => (
                            <NavLink
                                key={item.view}
                                icon={item.icon}
                                label={item.label}
                                isActive={activeView === item.view}
                                onClick={() => handleNavClick(item.view)}
                                isHighlight={item.isHighlight}
                            />
                        ))}

                        <div className="pt-1">
                            <button
                                onClick={() => setIsOtrosOpen(!isOtrosOpen)}
                                className={`flex items-center w-full px-4 py-3 text-gray-100 hover:bg-slate-500 rounded-lg transition-colors duration-200 ${otrosNavItems.some(i => i.view === activeView) ? 'bg-slate-500/30' : ''}`}
                            >
                                <MenuIcon className="h-6 w-6" />
                                <span className="mx-4 font-medium">Otros</span>
                                <ChevronDownIcon className={`ml-auto h-5 w-5 transition-transform duration-200 ${isOtrosOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {isOtrosOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-1 space-y-1 pr-2">
                                            {otrosNavItems.map(item => (
                                                <NavLink
                                                    key={item.view}
                                                    isSubItem={true}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    isActive={activeView === item.view}
                                                    onClick={() => handleNavClick(item.view)}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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