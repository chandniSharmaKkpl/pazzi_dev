import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { Region } from 'react-native-maps';

// Base URL for OpenStreetMap tiles
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Directory for caching map tiles
const TILE_CACHE_DIRECTORY = `${FileSystem.cacheDirectory}map_tiles/`;

// Ensure the cache directory exists
export const ensureCacheDirectory = async (): Promise<void> => {
    const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIRECTORY);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(TILE_CACHE_DIRECTORY, { intermediates: true });
    }
};

// Get a map tile, either from cache or network
export const getMapTile = async (z: number, x: number, y: number): Promise<string> => {
    await ensureCacheDirectory();
    // Define the cache key for this tile
    const tileKey = `${z}_${x}_${y}.png`;
    const tileCachePath = `${TILE_CACHE_DIRECTORY}${tileKey}`;

    // Check if the tile is already cached
    const tileInfo = await FileSystem.getInfoAsync(tileCachePath);

    // If tile exists in cache and isn't too old, use it
    if (tileInfo.exists) {
        try {
            const stats: any = await FileSystem.getInfoAsync(tileCachePath, {md5: false});

            // Get the file's creation or modification time
            // In newer Expo versions, use modificationTime; in older versions, use creationTime
            const fileTimestamp = stats.modificationTime || stats.lastModifiedTime || stats.modification || stats.mtime || Date.now();
            const tileAgeInHours = (Date.now() - fileTimestamp) / (1000 * 60 * 60);


            // Use cached tile if it's less than 7 days old
            if (tileAgeInHours < 168) {
                return `file://${tileCachePath}`;
            }
        } catch (error) {
            // If we can't get file stats, just use the cached tile anyway
            console.warn('Could not get file stats, using cached tile:', error);
            return `file://${tileCachePath}`;

        }
    }

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
        // If the tile exists but is old, still use it if offline
        if (tileInfo.exists) {
            return `file://${tileCachePath}`;
        }
        throw new Error('No network connection and tile not in cache');
    }

    // Download the tile
    const tileUrl = OSM_TILE_URL
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());

    try {
        await FileSystem.downloadAsync(tileUrl, tileCachePath, {
            headers: {
                'User-Agent': 'Patrol Navigation App (github.com/yourusername/patrol-nav-app)'
            }
        });
        return `file://${tileCachePath}`;
    } catch (error) {
        console.error('Error downloading map tile:', error);
        // If the tile exists but couldn't be updated, still use it
        if (tileInfo.exists) {
            return `file://${tileCachePath}`;
        }
        throw error;
    }
};

// Convert lat/lon to tile coordinates
export const latLonToTile = (lat: number, lon: number, zoom: number) => {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x, y };
};

// Get all tiles needed for a region
export const getTilesForRegion = (region: Region, minZoom: number, maxZoom: number) => {
    const tiles = [];

    for (let z = minZoom; z <= maxZoom; z++) {
        // Calculate NorthWest tile
        const nwTile = latLonToTile(
            region.latitude + region.latitudeDelta / 2,
            region.longitude - region.longitudeDelta / 2,
            z
        );

        // Calculate SouthEast tile
        const seTile = latLonToTile(
            region.latitude - region.latitudeDelta / 2,
            region.longitude + region.longitudeDelta / 2,
            z
        );

        // Add all tiles in this area to the list
        for (let x = nwTile.x; x <= seTile.x; x++) {
            for (let y = nwTile.y; y <= seTile.y; y++) {
                tiles.push({ z, x, y });
            }
        }
    }

    return tiles;
};

// Prefetch tiles for offline use
export const prefetchTilesForRegion = async (region: Region, minZoom: number, maxZoom: number) => {
    const tiles = getTilesForRegion(region, minZoom, maxZoom);

    // Limit the number of tiles to prevent excessive downloads
    const MAX_TILES = 200;
    if (tiles.length > MAX_TILES) {
        console.warn(`Too many tiles to download (${tiles.length}), limiting to ${MAX_TILES}`);
        tiles.length = MAX_TILES;
    }

    // Download tiles in batches to prevent too many simultaneous connections
    const BATCH_SIZE = 10;
    for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
        const batch = tiles.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map(tile => getMapTile(tile.z, tile.x, tile.y).catch(err => {
                console.warn(`Failed to download tile z=${tile.z}, x=${tile.x}, y=${tile.y}:`, err);
            }))
        );
    }

    return tiles.length;
};

// Clear the tile cache
export const clearTileCache = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIRECTORY);
        if (dirInfo.exists) {
            await FileSystem.deleteAsync(TILE_CACHE_DIRECTORY, { idempotent: true });
            await ensureCacheDirectory();
        }
        return true;
    } catch (error) {
        console.error('Error clearing tile cache:', error);
        return false;
    }
};