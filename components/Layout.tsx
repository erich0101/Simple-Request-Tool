
import React, { useRef, useCallback, useEffect } from 'react';

interface LayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, sidebarWidth, setSidebarWidth, isSidebarOpen, setIsSidebarOpen }) => {
    const isResizing = useRef(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing.current) {
            // Apply constraints for min/max width
            const newWidth = Math.max(240, Math.min(e.clientX, 600));
            setSidebarWidth(newWidth);
        }
    }, [setSidebarWidth]);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        // Clean up listeners
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';

    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        // Add listeners to window to capture mouse moves outside the resizer div
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };
    
    // Cleanup listeners on component unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div className="flex h-screen bg-gray-900 text-gray-200 font-sans select-none">
             {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <div 
                className={`fixed top-0 left-0 h-full bg-gray-800 border-r border-gray-700 overflow-y-auto z-40 transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0 md:flex-shrink-0`}
                style={{ width: `${sidebarWidth}px` }}
            >
                {sidebar}
            </div>
           
            {/* Resizer Handle (desktop only) */}
            <div
                onMouseDown={handleMouseDown}
                className="w-2 flex-shrink-0 cursor-col-resize bg-gray-800 hover:bg-gray-700 transition-colors duration-200 hidden md:flex"
                title="Drag to resize"
            ></div>

            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
};

export default Layout;
