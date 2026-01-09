
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    offset?: number;
    className?: string;
    disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    side = 'right',
    offset = 10,
    className = '',
    disabled = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;

        // Calculate simple positioning
        if (side === 'right') {
            top = triggerRect.top + triggerRect.height / 2;
            left = triggerRect.right + offset;
        } else if (side === 'top') {
            top = triggerRect.top - offset;
            left = triggerRect.left + triggerRect.width / 2;
        } else if (side === 'bottom') {
            top = triggerRect.bottom + offset;
            left = triggerRect.left + triggerRect.width / 2;
        } else if (side === 'left') {
            top = triggerRect.top + triggerRect.height / 2;
            left = triggerRect.left - offset;
        }

        setPosition({ top, left });
    };

    const handleMouseEnter = () => {
        if (disabled) return;
        calculatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    // Recalculate position on scroll/resize just in case
    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);
            return () => {
                window.removeEventListener('scroll', calculatePosition, true);
                window.removeEventListener('resize', calculatePosition);
            };
        }
    }, [isVisible]);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="contents"
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    ref={tooltipRef}
                    className={`fixed z-[100] px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-800 rounded-md shadow-lg pointer-events-none transition-opacity duration-200 animate-in fade-in zoom-in-95 ${className}`}
                    style={{
                        top: position.top,
                        left: position.left,
                        transform: side === 'right' ? 'translateY(-50%)' :
                            side === 'left' ? 'translate(-100%, -50%)' :
                                side === 'top' ? 'translate(-50%, -100%)' :
                                    'translate(-50%, 0)'
                    }}
                >
                    {content}
                    <div
                        className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"
                        style={{
                            left: side === 'right' ? '-4px' : side === 'left' ? 'auto' : '50%',
                            right: side === 'left' ? '-4px' : 'auto',
                            top: side === 'bottom' ? '-4px' : (side === 'right' || side === 'left') ? '50%' : 'auto',
                            bottom: side === 'top' ? '-4px' : 'auto',
                            marginTop: (side === 'right' || side === 'left') ? '-4px' : '0',
                            marginLeft: (side === 'top' || side === 'bottom') ? '-4px' : '0',
                        }}
                    />
                </div>,
                document.body
            )}
        </>
    );
};
