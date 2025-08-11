import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { photoDataUri, userId, folder } = body;

        if (!photoDataUri || !userId || !folder) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Extract base64 data and mime type
        const match = photoDataUri.match(/^data:(image\/\w+);base64,(.*)$/);
        if (!match) {
            return NextResponse.json({ error: 'Invalid data URI format' }, { status: 400 });
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const fileExtension = mimeType.split('/')[1] || 'png';

        const buffer = Buffer.from(base64Data, 'base64');

        // Define the path to save the file
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder, userId);
        await fs.mkdir(uploadDir, { recursive: true }); // Ensure the user-specific directory exists

        const filename = `${Date.now()}.${fileExtension}`;
        const filePath = path.join(uploadDir, filename);

        // Save the file
        await fs.writeFile(filePath, buffer);

        // Return the public URL
        const publicUrl = `/uploads/${folder}/${userId}/${filename}`;

        return NextResponse.json({ url: publicUrl }, { status: 200 });

    } catch (error) {
        console.error('Error in upload API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
