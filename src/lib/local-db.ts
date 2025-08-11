import { promises as fs } from 'fs';
import path from 'path';

// The path to the local database directory
const dbPath = path.join(process.cwd(), 'local_db');

/**
 * Ensures that the local_db directory exists.
 */
async function ensureDbDirectory(): Promise<void> {
    try {
        await fs.mkdir(dbPath, { recursive: true });
    } catch (error) {
        console.error("Error creating local_db directory:", error);
        throw new Error("Could not create local database directory.");
    }
}

/**
 * Reads data from a JSON file in the local_db directory.
 * @param collectionName The name of the collection (e.g., 'users', 'checkIns').
 * @returns The parsed JSON data (usually an array).
 */
export async function readCollection<T>(collectionName: string): Promise<T[]> {
    await ensureDbDirectory();
    const filePath = path.join(dbPath, `${collectionName}.json`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as T[];
    } catch (error: any) {
        // If the file doesn't exist, it's not an error; it just means the collection is empty.
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error(`Error reading collection ${collectionName}:`, error);
        throw new Error(`Could not read data from ${collectionName}.json.`);
    }
}

/**
 * Writes data to a JSON file in the local_db directory.
 * @param collectionName The name of the collection.
 * @param data The data to write to the file.
 */
export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
    await ensureDbDirectory();
    const filePath = path.join(dbPath, `${collectionName}.json`);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing to collection ${collectionName}:`, error);
        throw new Error(`Could not write data to ${collectionName}.json.`);
    }
}
