/**
 * @fileOverview A client-side helper to handle file uploads to the local server.
 */

/**
 * Uploads a photo from a data URI to the local server via an API route.
 * @param photoDataUri - The photo encoded as a data URI.
 * @param userId - The user ID (for potential sub-folder structuring).
 * @param folder - The folder to upload to ('checkIns', 'avatars', 'activities').
 * @returns The public URL of the uploaded photo.
 */
export async function uploadPhoto(photoDataUri: string, userId: string, folder: string): Promise<string> {
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                photoDataUri,
                userId,
                folder,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'File upload failed');
        }

        const { url } = await response.json();
        return url;

    } catch (error) {
        console.error("Error uploading photo to local server:", error);
        throw new Error(`Could not upload photo locally. Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes a photo from the local server via an API route.
 * @param fileUrl - The public URL of the file to delete (e.g., /uploads/checkIns/...).
 */
export async function deletePhoto(fileUrl: string): Promise<void> {
    try {
        const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'File deletion failed');
        }
        console.log(`Successfully requested deletion for file: ${fileUrl}`);

    } catch (error) {
        console.error("Error deleting photo from local server:", error);
        // We don't re-throw here because failing to delete a photo is often a non-critical error.
        // The main operation (like deleting a check-in) should still succeed.
    }
}
