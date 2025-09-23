import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/views/DashboardView';
import TasksView from './components/views/TasksView';
import InventoryView from './components/views/InventoryView';
import MachinesView from './components/views/MachinesView';
import ReportsView from './components/views/ReportsView';
import WorkersView from './components/views/WorkersView';
import LoginView from './components/views/LoginView';
import ProductionOrdersView from './components/views/ProductionOrdersView';
import SuppliersView from './components/views/SuppliersView';
import type { View } from './types';
import FeedbackButton from './components/FeedbackButton';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardView />;
            case 'tasks':
                return <TasksView />;
            case 'inventory':
                return <InventoryView />;
            case 'machines':
                return <MachinesView />;
            case 'reports':
                return <ReportsView />;
            case 'workers':
                return <WorkersView />;
            case 'productionOrders':
                return <ProductionOrdersView />;
            case 'suppliers':
                return <SuppliersView />;
            default:
                return <DashboardView />;
        }
    };

    if (!isAuthenticated) {
        return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar 
                activeView={activeView} 
                setActiveView={setActiveView} 
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                    {renderView()}
                </main>
            </div>
            <FeedbackButton />
        </div>
    );
};

export default App;