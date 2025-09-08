import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`bg-white rounded-xl shadow-md ${className}`}>
            {title && <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-200">{title}</h3>}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

export default Card;