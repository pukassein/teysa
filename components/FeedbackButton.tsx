import React, { useState, useEffect, useRef } from 'react';
import LightbulbIcon from './icons/LightbulbIcon';

const FeedbackButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const togglePopover = () => {
        setIsOpen(!isOpen);
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const sheetUrl = "https://docs.google.com/spreadsheets/d/1GuVV0VBt8_lTOSH6j4-7m42OdA6BvbxDS-ddg7mcgm8/edit?usp=sharing";

    return (
        <div ref={popoverRef} className="fixed bottom-6 right-6 z-40">
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-72 bg-white rounded-lg shadow-2xl p-4 transition-all duration-200 ease-in-out origin-bottom-right" style={{ transform: isOpen ? 'scale(1)' : 'scale(0.95)', opacity: isOpen ? 1 : 0 }}>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        aria-label="Cerrar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <p className="text-gray-700 font-medium mb-3 pr-4">
                        ¿Qué ajuste te gustaría sugerir o recomendar?
                    </p>
                    <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                    >
                        Abrir hoja de sugerencias
                    </a>
                </div>
            )}
            <button
                onClick={togglePopover}
                className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-110"
                aria-label="Sugerir un cambio"
            >
                <LightbulbIcon className="w-7 h-7" />
            </button>
        </div>
    );
};

export default FeedbackButton;