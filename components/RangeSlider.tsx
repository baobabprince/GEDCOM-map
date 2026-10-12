
import React, { useCallback, useRef, useEffect } from 'react';

interface RangeSliderProps {
    min: number;
    max: number;
    value: { start: number; end: number };
    onChange: (value: { start: number; end: number }) => void;
    step?: number;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, value, onChange, step = 1 }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);

    // Keep refs updated with the latest props to avoid stale closures in event handlers
    useEffect(() => { valueRef.current = value; }, [value]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const getPercent = useCallback((val) => {
        if (max === min) return 0;
        return ((val - min) / (max - min)) * 100;
    }, [min, max]);

    const handleMouseDown = (e: React.MouseEvent, thumb: 'start' | 'end') => {
        e.preventDefault();
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!trackRef.current) return;
            
            const rect = trackRef.current.getBoundingClientRect();
            const percent = Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0), 1);
            const clickValue = Math.round((min + percent * (max - min)) / step) * step;
            
            const currentValue = valueRef.current;
            if (thumb === 'start') {
                const newStart = Math.min(clickValue, currentValue.end);
                // Only call onChange if value actually changes to prevent re-render loops
                if (newStart !== currentValue.start) {
                    onChangeRef.current({ start: newStart, end: currentValue.end });
                }
            } else { // 'end'
                const newEnd = Math.max(clickValue, currentValue.start);
                if (newEnd !== currentValue.end) {
                    onChangeRef.current({ start: currentValue.start, end: newEnd });
                }
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const leftPercent = getPercent(value.start);
    const rightPercent = getPercent(value.end);

    return (
        <div className="relative h-12 flex items-center" aria-label="Date range filter">
            <div ref={trackRef} className="relative w-full h-1 bg-gray-600 rounded-full">
                <div
                    className="absolute h-1 bg-indigo-500 rounded-full"
                    style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
                />
                <div
                    className="absolute w-4 h-4 -top-1.5 bg-white rounded-full shadow cursor-pointer border-2 border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    style={{ left: `calc(${leftPercent}% - 8px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value.start}
                    aria-label={`Start year: ${value.start}`}
                />
                <div
                    className="absolute w-4 h-4 -top-1.5 bg-white rounded-full shadow cursor-pointer border-2 border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    style={{ left: `calc(${rightPercent}% - 8px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value.end}
                    aria-label={`End year: ${value.end}`}
                />
            </div>
        </div>
    );
};

export default RangeSlider;
