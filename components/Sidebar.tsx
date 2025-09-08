import React from 'react';
import type { View } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import TasksIcon from './icons/TasksIcon';
import InventoryIcon from './icons/InventoryIcon';
import MachineIcon from './icons/MachineIcon';
import ReportsIcon from './icons/ReportsIcon';
import UsersIcon from './icons/UsersIcon';


interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
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
            className={`flex items-center px-4 py-3 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors duration-200 ${isActive ? 'bg-gray-700' : ''}`}
        >
            {icon}
            <span className="mx-4 font-medium">{label}</span>
        </a>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-6 w-6" /> },
        { view: 'tasks', label: 'Gestión de Tareas', icon: <TasksIcon className="h-6 w-6" /> },
        { view: 'workers', label: 'Funcionarios', icon: <UsersIcon className="h-6 w-6" /> },
        { view: 'inventory', label: 'Inventario', icon: <InventoryIcon className="h-6 w-6" /> },
        { view: 'machines', label: 'Máquinas', icon: <MachineIcon className="h-6 w-6" /> },
        { view: 'reports', label: 'Reportes', icon: <ReportsIcon className="h-6 w-6" /> },
    ];

    return (
        <div className="hidden md:flex flex-col w-64 bg-gray-800">
            <div className="flex items-center justify-center h-20 border-b border-gray-700">
                <h1 className="text-2xl font-bold text-white">Teysa</h1>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <nav className="flex-1 px-2 py-4">
                    {navItems.map(item => (
                        <NavLink
                            key={item.view}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeView === item.view}
                            onClick={() => setActiveView(item.view)}
                        />
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;