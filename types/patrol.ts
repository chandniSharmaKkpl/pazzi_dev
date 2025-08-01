// Patrol types
export enum PatrolType {
    RADAR = 'radar',
    POLICE = 'police',
    CAMERA = 'camera',
    ACCIDENT = 'accident',
    ROAD_BLOCK = 'road_block',
}

// Patrol status
export type PatrolStatus = 'in_progress' | 'completed' | 'cancelled';

// Location type
export interface Location {
    latitude: number;
    longitude: number;
}

// Patrol report (user submission)
export interface PatrolReport {
    type: PatrolType;
    location: Location;
    comment?: string;
}

export interface PatrolParticipant {
    id: string;
    name: string;
    role: string;
    join_time: Date;
}

// Patrol (stored in system)
export interface PatrolSummary {
    id: string;
    actual_start_time: Date;
    actual_end_time?: Date;
    type?: PatrolType;
    status: PatrolStatus;
    probability: number;
    participant_count: number;
    location: Location;
}

export interface Patrol extends PatrolSummary {
    description?: string;
    reported_by?: PatrolParticipant;
    participant_count: number;
    last_action_by?: PatrolParticipant;
    all_participants?: PatrolParticipant[];
    confirmation_count: number;
    denial_count: number;
    timestamp?: number; // Add timestamp for mock data
}

// Navigation route
export interface Route {
    id: string;
    origin: Location;
    destination: Location;
    waypoints: Location[];
    distance: number; // meters
    duration: number; // seconds
    avoidPatrols: boolean;
}