
import React, { createContext, useContext, useState, useEffect } from 'react';

interface DegenContextType {
    degenMode: boolean;
    toggleDegenMode: () => void;
}

const DegenContext = createContext<DegenContextType | undefined>(undefined);

export const DegenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [degenMode, setDegenMode] = useState(false);

    const toggleDegenMode = () => {
        setDegenMode((prev) => {
            const next = !prev;
            // Side effects for the body
            if (next) {
                document.body.classList.add('degen-mode');
                document.body.style.backgroundColor = '#7C3AED';
                setTimeout(() => { document.body.style.backgroundColor = ''; }, 200);
            } else {
                document.body.classList.remove('degen-mode');
            }
            return next;
        });
    };

    return (
        <DegenContext.Provider value={{ degenMode, toggleDegenMode }}>
            {children}
        </DegenContext.Provider>
    );
};

export const useDegenMode = () => {
    const context = useContext(DegenContext);
    if (context === undefined) {
        throw new Error('useDegenMode must be used within a DegenProvider');
    }
    return context;
};
