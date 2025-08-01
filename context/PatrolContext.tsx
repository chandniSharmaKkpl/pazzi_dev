import React, { createContext, useContext } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useLocation } from './LocationContext';
import { Patrol, PatrolReport } from '../types/patrol';

interface PatrolContextType {
    patrols: Patrol[];
    reportPatrol: (report: PatrolReport) => Promise<void>;
    confirmPatrol: (patrolId: string) => Promise<void>;
    denyPatrol: (patrolId: string) => Promise<void>;
    getPatrol: (patrolId: string) => Patrol | null;
    getNearbyPatrols: (radius: number) => Patrol[];
}

const PatrolContext = createContext<PatrolContextType>({
    patrols: [],
    reportPatrol: async () => {},
    confirmPatrol: async () => {},
    denyPatrol: async () => {},
    getPatrol: () => null,
    getNearbyPatrols: () => [],
});

export const usePatrols = () => useContext(PatrolContext);

export const PatrolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { patrols } = useWebSocket();
    const { location } = useLocation();

    // Keep your report/confirm/deny logic here (API or WebSocket)
    const reportPatrol = async (report: PatrolReport) => { /* implement as needed */ };
    const confirmPatrol = async (patrolId: string) => { /* implement as needed */ };
    const denyPatrol = async (patrolId: string) => { /* implement as needed */ };

    const getPatrol = (patrolId: string) => patrols.find(p => p.id === patrolId) || null;

    const getNearbyPatrols = (radius: number) => {
        if (!location) return [];
        // Haversine formula
        const R = 6371e3; // meters
        const { latitude: lat1, longitude: lon1 } = location.coords;
        return patrols.filter(patrol => {
            const lat2 = patrol.location.latitude;
            const lon2 = patrol.location.longitude;
            const φ1 = (lat1 * Math.PI) / 180;
            const φ2 = (lat2 * Math.PI) / 180;
            const Δφ = ((lat2 - lat1) * Math.PI) / 180;
            const Δλ = ((lon2 - lon1) * Math.PI) / 180;
            const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            return d <= radius;
        });
    };

    return (
        <PatrolContext.Provider value={{
            patrols,
            reportPatrol,
            confirmPatrol,
            denyPatrol,
            getPatrol,
            getNearbyPatrols,
        }}>
            {children}
        </PatrolContext.Provider>
    );
};