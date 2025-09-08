import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/views/DashboardView';
import TasksView from './components/views/TasksView';
import InventoryView from './components/views/InventoryView';
import MachinesView from './components/views/MachinesView';
import ReportsView from './components/views/ReportsView';
import WorkersView from './components/views/WorkersView';
import type { View } from './types';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('dashboard');

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
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default App;