
import React from 'react';
import MenuIcon from './icons/MenuIcon';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    return (
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <div className="flex items-center">
                <button 
                    onClick={onMenuClick} 
                    className="text-gray-500 hover:text-gray-800 focus:outline-none md:hidden mr-2"
                    aria-label="Abrir menú"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Panel de Control - Teysa</h1>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-gray-700">Modo Administrador</p>
                    <p className="text-sm text-gray-500">Acceso Total</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                </div>
            </div>
        </header>
    );
};

export default Header;