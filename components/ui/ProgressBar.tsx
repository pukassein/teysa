

import React from 'react';

interface ProgressBarProps {
    value: number;
    max: number;
    color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = 'bg-blue-600' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    let bgColor = color;
    if (percentage < 33) {
        bgColor = 'bg-red-500';
    } else if (percentage < 66) {
        bgColor = 'bg-yellow-500';
    } else {
        bgColor = 'bg-green-500';
    }

    return (
        <div className="w-full bg-gray-200 rounded-full h-4">
            <div
                className={`h-4 rounded-full transition-all duration-500 ${bgColor}`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;