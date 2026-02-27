import React, { useState, useEffect, useRef } from 'react';
import ChevronDownIcon from '../icons/ChevronDownIcon';

interface Option {
    id: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Seleccionar...", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Find selected option label
    const selectedOption = options.find(o => o.id.toString() === value.toString());

    // Update query when value changes externally
    useEffect(() => {
        if (selectedOption) {
            setQuery(selectedOption.label);
        } else if (!value) {
            setQuery('');
        }
    }, [selectedOption, value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset query to selected option label if closed without selection
                if (selectedOption) {
                    setQuery(selectedOption.label);
                } else {
                    setQuery('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedOption]);

    const filteredOptions = query === ''
        ? options
        : options.filter((option) =>
            option.label.toLowerCase().includes(query.toLowerCase())
        );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setIsOpen(true);
        if (e.target.value === '') {
            onChange('');
        }
    };

    const handleSelect = (option: Option) => {
        onChange(option.id.toString());
        setQuery(option.label);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <ChevronDownIcon className="w-5 h-5" />
                </div>
            </div>

            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none">
                    {filteredOptions.length === 0 ? (
                        <li className="px-4 py-2 text-gray-500 text-sm">No se encontraron resultados</li>
                    ) : (
                        filteredOptions.map((option) => (
                            <li
                                key={option.id}
                                className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${option.id.toString() === value.toString() ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`}
                                onClick={() => handleSelect(option)}
                            >
                                <div className="font-medium">{option.label}</div>
                                {option.subLabel && <div className="text-xs text-gray-500">{option.subLabel}</div>}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
