

import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
};

const Badge: React.FC<BadgeProps> = ({ children, color }) => {
    return (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[color]}`}>
            {children}
        </span>
    );
};

export default Badge;