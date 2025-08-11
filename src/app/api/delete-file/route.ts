import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileUrl } = body;

        if (!fileUrl || typeof fileUrl !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid fileUrl' }, { status: 400 });
        }

        // Basic security: ensure the path is relative and doesn't try to escape the public directory.
        // It should start with '/uploads/'.
        if (!fileUrl.startsWith('/uploads/')) {
             return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }

        // Construct the full path to the file.
        // path.join will resolve '..' and other relative paths, so we need the check above.
        const filePath = path.join(process.cwd(), 'public', fileUrl);

        // Check if file exists before attempting to delete
        try {
            await fs.access(filePath);
        } catch (e) {
            // If file doesn't exist, we can consider it a success.
            console.warn(`Attempted to delete non-existent file: ${filePath}`);
            return NextResponse.json({ message: 'File not found, but operation considered successful.' }, { status: 200 });
        }

        // Delete the file
        await fs.unlink(filePath);

        return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error in delete-file API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
