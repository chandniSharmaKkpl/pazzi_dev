import { Patrol, PatrolType } from '../types/patrol';

// Generate random patrol data for testing
export const generateMockPatrols = (count: number, centerLat: number, centerLng: number): Patrol[] => {
    const patrols: Patrol[] = [];

    for (let i = 0; i < count; i++) {
        // Generate random coordinates near the center
        const lat = centerLat + (Math.random() - 0.5) * 0.1;
        const lng = centerLng + (Math.random() - 0.5) * 0.1;

        // Random patrol type
        const patrolTypes = Object.values(PatrolType);
        const randomType = patrolTypes[Math.floor(Math.random() * patrolTypes.length)];

        // Random probability
        const probability = Math.round(Math.random() * 100) / 100;

        // Random status based on probability
        let status: 'reported' | 'confirmed' | 'denied';
        if (probability > 0.7) {
            status = 'confirmed';
        } else if (probability < 0.3) {
            status = 'denied';
        } else {
            status = 'reported';
        }

        // Random timestamp within the last 24 hours
        const timestamp = Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000);

        // Generate patrol object
        const patrol: Patrol = {
            id: `patrol-${i}-${Date.now()}`,
            type: randomType,
            location: {
                latitude: lat,
                longitude: lng,
            },
            timestamp,
            probability,
            status,
            comment: Math.random() > 0.7 ? `This is a mock patrol report #${i}` : '',
            confirmations: Math.floor(Math.random() * 10),
            denials: Math.floor(Math.random() * 5),
            reporterId: `user-${Math.floor(Math.random() * 1000)}`,
        };

        patrols.push(patrol);
    }

    return patrols;
};