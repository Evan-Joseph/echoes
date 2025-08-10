import { supabase } from './client';
import type { Message, AppCheckIn, AppUser, AppComment, CommentWithAuthor, Report, Activity, MonthlyReport } from '@/lib/types';
import { decode } from 'base64-arraybuffer';

// Define the structure of a check-in document when passing data to functions
export interface AppCheckInData {
    userId: string;
    content: string;
    isPublic: boolean;
    photoDataUri?: string; // Accept the data URI for upload
    photoUrl?: string; // This will be generated after upload
    likedBy?: string[];
    commentsCount?: number;
    activityId?: string;
    activityTitle?: string;
}

const AI_USER_ID = "echo-ai-assistant";

/**
 * Uploads a photo from a data URI to Supabase Storage.
 * @param photoDataUri - The photo encoded as a data URI.
 * @param userId - The user ID, to create a structured path.
 * @param folder - The folder to upload to ('checkIns' or 'avatars' or 'activities').
 * @returns The public download URL of the uploaded photo.
 */
async function uploadPhoto(photoDataUri: string, userId: string, folder: 'checkIns' | 'avatars' | 'activities'): Promise<string> {
    try {
        const mimeTypeMatch = photoDataUri.match(/data:(.*);base64,/);
        if (!mimeTypeMatch) {
            throw new Error("Invalid data URI: MIME type not found.");
        }
        const mimeType = mimeTypeMatch[1];
        const fileExtension = mimeType.split('/')[1] || 'jpg';
        const base64String = photoDataUri.split(';base64,').pop();
        if (!base64String) {
            throw new Error("Invalid data URI: base64 string not found.");
        }

        const filePath = `${folder}/${userId}/${Date.now()}.${fileExtension}`;

        const { data, error } = await supabase.storage
            .from(folder)
            .upload(filePath, decode(base64String), {
                contentType: mimeType,
                upsert: true,
            });

        if (error) {
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage.from(folder).getPublicUrl(data.path);

        console.log("Photo uploaded successfully. URL:", publicUrl);
        return publicUrl;

    } catch(error) {
        console.error("Error uploading photo to Supabase Storage:", error);
        throw new Error(`Could not upload photo. Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
}


/**
 * Adds a new check-in document to the 'checkIns' table.
 */
export async function addCheckIn(checkInData: AppCheckInData): Promise<string> {
    try {
        const docData: any = {
            userId: checkInData.userId,
            content: checkInData.content,
            isPublic: checkInData.isPublic,
            likedBy: [],
            commentsCount: 0,
        };

        if (checkInData.photoDataUri) {
            docData.photoUrl = await uploadPhoto(checkInData.photoDataUri, checkInData.userId, 'checkIns');
        }

        if (checkInData.activityId) {
            docData.activityId = checkInData.activityId;
            docData.activityTitle = checkInData.activityTitle;
        }

        const { data, error } = await supabase
            .from('checkIns')
            .insert(docData)
            .select('id')
            .single();

        if (error) throw error;
        return String(data.id);
    } catch (e) {
        console.error("Error adding check-in: ", e);
        throw new Error(`Could not add check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Updates an existing check-in document.
 */
export async function updateCheckIn(checkInId: string, userId: string, data: { content: string; photoDataUri?: string; }): Promise<void> {
    try {
        const { data: existingCheckIn, error: fetchError } = await supabase
            .from('checkIns')
            .select('userId, photoUrl')
            .eq('id', checkInId)
            .single();

        if (fetchError || !existingCheckIn || existingCheckIn.userId !== userId) {
            throw new Error("Permission denied or check-in not found.");
        }

        const updateData: any = {
            content: data.content,
            updatedAt: new Date().toISOString(),
        };

        if (data.photoDataUri && data.photoDataUri.startsWith('data:image')) {
            updateData.photoUrl = await uploadPhoto(data.photoDataUri, userId, 'checkIns');
            if (existingCheckIn.photoUrl) {
                const oldPhotoPath = new URL(existingCheckIn.photoUrl).pathname.split('/checkIns/')[1];
                await supabase.storage.from('checkIns').remove([oldPhotoPath]);
            }
        } else if (data.photoDataUri === undefined) {
            updateData.photoUrl = null;
            if (existingCheckIn.photoUrl) {
                const oldPhotoPath = new URL(existingCheckIn.photoUrl).pathname.split('/checkIns/')[1];
                await supabase.storage.from('checkIns').remove([oldPhotoPath]);
            }
        }

        const { error } = await supabase.from('checkIns').update(updateData).eq('id', checkInId);
        if (error) throw error;

    } catch (e) {
        console.error(`Error updating check-in ${checkInId}:`, e);
        throw new Error(`Could not update check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Deletes a check-in document and its associated photo from Storage.
 */
export async function deleteCheckIn(checkInId: string, userId: string): Promise<void> {
    const { data: checkInData, error: fetchError } = await supabase
        .from('checkIns')
        .select('userId, photoUrl')
        .eq('id', checkInId)
        .single();

    if (fetchError || !checkInData) throw new Error("Check-in not found.");
    if (checkInData.userId !== userId) throw new Error("Permission denied.");

    if (checkInData.photoUrl) {
        try {
            const photoPath = new URL(checkInData.photoUrl).pathname.split('/checkIns/')[1];
            await supabase.storage.from('checkIns').remove([photoPath]);
        } catch (storageError) {
            console.error(`Failed to delete photo from storage: ${storageError}`);
        }
    }

    const { error } = await supabase.from('checkIns').delete().eq('id', checkInId);
    if (error) throw error;
}

/**
 * Retrieves the latest public check-ins.
 */
export async function getPublicCheckIns(count = 20): Promise<AppCheckIn[]> {
    const { data, error } = await supabase
        .from('checkIns')
        .select('*')
        .eq('isPublic', true)
        .order('createdAt', { ascending: false })
        .limit(count);

    if (error) throw error;
    return data.map(d => ({ ...d, id: String(d.id), likedBy: d.likedBy || [] })) as AppCheckIn[];
}

/**
 * Retrieves all check-ins for a specific user.
 */
export async function getUserCheckIns(userId: string): Promise<AppCheckIn[]> {
    const { data, error } = await supabase
        .from('checkIns')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

    if (error) throw error;
    return data.map(d => ({ ...d, id: String(d.id), likedBy: d.likedBy || [] })) as AppCheckIn[];
}

/**
 * Likes a check-in. (Non-atomic)
 */
export async function likeCheckIn(checkInId: string, userId: string): Promise<void> {
    const { data, error } = await supabase.from('checkIns').select('likedBy').eq('id', checkInId).single();
    if (error || !data) throw new Error("Check-in not found");

    const likedBy = data.likedBy || [];
    if (!likedBy.includes(userId)) {
        const { error: updateError } = await supabase.from('checkIns').update({ likedBy: [...likedBy, userId] }).eq('id', checkInId);
        if (updateError) throw updateError;
    }
}

/**
 * Unlikes a check-in. (Non-atomic)
 */
export async function unlikeCheckIn(checkInId: string, userId: string): Promise<void> {
    const { data, error } = await supabase.from('checkIns').select('likedBy').eq('id', checkInId).single();
    if (error || !data) throw new Error("Check-in not found");

    const likedBy = data.likedBy || [];
    const updatedLikedBy = likedBy.filter((id: string) => id !== userId);

    const { error: updateError } = await supabase.from('checkIns').update({ likedBy: updatedLikedBy }).eq('id', checkInId);
    if (updateError) throw updateError;
}

/**
 * Updates a check-in to be public or private.
 */
async function setCheckInPublic(checkInId: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase.from('checkIns').update({ isPublic }).eq('id', checkInId);
    if (error) throw new Error(`Could not update check-in privacy. Reason: ${error.message}`);
}
export const makeCheckInPublic = (id: string) => setCheckInPublic(id, true);
export const makeCheckInPrivate = (id: string) => setCheckInPublic(id, false);


/**
 * Saves a chat message to Supabase.
 */
export async function saveMessage(message: Message): Promise<string> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            role: message.role,
            content: message.contentForDb || (typeof message.content === 'string' ? message.content : '[Unsupported Content]'),
            userId: message.userId,
            data: message.data,
            status: message.status,
        })
        .select('id')
        .single();

    if (error) throw error;
    return String(data.id);
}

/**
 * Retrieves all chat messages for a specific user.
 */
export async function getUserMessages(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: true });

    if (error) throw error;
    return data.map(d => ({ ...d, id: String(d.id), timestamp: d.timestamp })) as Message[];
}

/**
 * Deletes all chat messages for a specific user.
 */
export async function deleteUserMessages(userId: string): Promise<void> {
    const { error } = await supabase.from('messages').delete().eq('userId', userId);
    if (error) throw error;
}

// === User Profile Functions ===

/**
 * Gets a user's public profile.
 */
export async function getUserProfile(userId: string): Promise<AppUser> {
    if (userId === AI_USER_ID) {
        return { uid: AI_USER_ID, displayName: 'Echo', photoURL: '/images/logo/logo-no-bg.svg', createdAt: new Date().toISOString() };
    }

    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error || !data) {
      // Supabase trigger should have created this, but as a fallback:
      const { data: user, error: userError } = await supabase.auth.getUser();
      if(userError || !user) throw new Error("User not found and cannot be created.");
      return { uid: user.user.id, displayName: '匿名旅者', photoURL: `https://placehold.co/100x100/A6D1E6/424242.png`, createdAt: new Date().toISOString() };
    }

    return { ...data, uid: data.id } as AppUser;
}

/**
 * Updates a user's public profile.
 */
export async function updateUserProfile(userId: string, data: { displayName?: string; photoURL?: string }): Promise<void> {
    const updateData: { [key: string]: any } = { ...data, updatedAt: new Date().toISOString() };

    if (data.photoURL && data.photoURL.startsWith('data:image')) {
        updateData.photoURL = await uploadPhoto(data.photoURL, userId, 'avatars');
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', userId);
    if (error) throw error;
}

// === Comments Functions ===

/**
 * Adds a new comment to a check-in. (Uses RPC for atomicity)
 */
export async function addComment(checkInId: string, userId: string, content: string): Promise<string> {
    // This requires a stored procedure in Supabase for atomicity.
    // For now, we do it non-atomically.
    const { data, error } = await supabase.from('comments').insert({ checkInId, userId, content }).select('id').single();
    if (error) throw error;

    // Manually increment commentsCount
    await supabase.rpc('increment_comments_count', { checkin_id: checkInId });

    return String(data.id);
}

/**
 * Retrieves all comments for a specific check-in, along with author profiles.
 */
export async function getCommentsForCheckIn(checkInId: string): Promise<CommentWithAuthor[]> {
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*, author:users(*)')
        .eq('checkInId', checkInId)
        .order('createdAt', { ascending: false });

    if (error) throw error;

    return comments.map(c => ({
        ...c,
        id: String(c.id),
        author: { ...c.author, uid: c.author.id }
    })) as CommentWithAuthor[];
}

// === Activity Functions ===

interface CreateActivityData {
    title: string;
    description: string;
    category: Activity['category'];
    coverImageDataUri: string;
    userId: string;
}

export async function createActivity(activityData: CreateActivityData): Promise<string> {
    const coverImageUrl = await uploadPhoto(activityData.coverImageDataUri, activityData.userId, 'activities');
    const { data, error } = await supabase
        .from('activities')
        .insert({ ...activityData, coverImageUrl, userId: activityData.userId })
        .select('id')
        .single();
    if (error) throw error;
    return String(data.id);
}

async function getActivitiesByStatus(status: 'approved' | 'pending'): Promise<Activity[]> {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('status', status)
        .order('createdAt', { ascending: status === 'pending' });

    if (error) throw error;
    return data.map(d => ({ ...d, id: String(d.id) })) as Activity[];
}
export const getApprovedActivities = () => getActivitiesByStatus('approved');
export const getPendingActivities = () => getActivitiesByStatus('pending');


export async function getUserActivities(userId: string): Promise<Activity[]> {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('status', 'approved')
        .contains('participants', [userId])
        .order('createdAt', { ascending: false });

    if (error) throw error;
    return data.map(d => ({...d, id: String(d.id)})) as Activity[];
}

export async function updateActivityStatus(activityId: string, status: 'approved' | 'rejected'): Promise<void> {
    const { error } = await supabase.from('activities').update({ status }).eq('id', activityId);
    if (error) throw error;
}

async function updateActivityParticipants(activityId: string, userId: string, action: 'join' | 'leave'): Promise<void> {
    const { data, error } = await supabase.from('activities').select('participants').eq('id', activityId).single();
    if (error || !data) throw new Error("Activity not found");

    let participants = data.participants || [];
    if (action === 'join' && !participants.includes(userId)) {
        participants = [...participants, userId];
    } else if (action === 'leave') {
        participants = participants.filter((p:string) => p !== userId);
    }

    const { error: updateError } = await supabase.from('activities').update({ participants }).eq('id', activityId);
    if (updateError) throw updateError;
}

export const joinActivity = (activityId: string, userId: string) => updateActivityParticipants(activityId, userId, 'join');
export const leaveActivity = (activityId: string, userId: string) => updateActivityParticipants(activityId, userId, 'leave');


// === Admin / Moderation Functions ===

export async function createReport(checkInId: string, reportedByUserId: string): Promise<string> {
    const { data, error } = await supabase.from('reports').insert({ checkInId, reportedByUserId }).select('id').single();
    if (error) throw error;
    return String(data.id);
}

export async function resolveReport(reportId: string): Promise<void> {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    if (error) throw error;
}

export async function getPendingReports(): Promise<Report[]> {
    const { data, error } = await supabase.from('reports').select('*').eq('status', 'pending').order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(d => ({...d, id: String(d.id)})) as Report[];
}

export async function getAllUsers(): Promise<AppUser[]> {
    const { data, error } = await supabase.from('users').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(d => ({...d, uid: d.id})) as AppUser[];
}

export async function getAllCheckIns(): Promise<AppCheckIn[]> {
    const { data, error } = await supabase.from('checkIns').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(d => ({...d, id: String(d.id), likedBy: d.likedBy || []})) as AppCheckIn[];
}

export async function getCheckInById(checkInId: string): Promise<AppCheckIn | null> {
    const { data, error } = await supabase.from('checkIns').select('*').eq('id', checkInId).single();
    if (error) return null;
    return { ...data, id: String(data.id), likedBy: data.likedBy || [] } as AppCheckIn;
}

export async function getActivityById(activityId: string): Promise<Activity | null> {
    const { data, error } = await supabase.from('activities').select('*').eq('id', activityId).single();
    if (error) return null;
    return { ...data, id: String(data.id) } as Activity;
}

export async function getCheckInsForActivity(activityId: string): Promise<AppCheckIn[]> {
    const { data, error } = await supabase
        .from('checkIns')
        .select('*')
        .eq('activityId', activityId)
        .eq('isPublic', true)
        .order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(d => ({...d, id: String(d.id), likedBy: d.likedBy || []})) as AppCheckIn[];
}

// === Monthly Report Functions ===

export async function saveMonthlyReport(reportData: Omit<MonthlyReport, 'id' | 'createdAt'>): Promise<string> {
    const { data, error } = await supabase.from('monthly_reports').insert(reportData).select('id').single();
    if (error) throw error;
    return String(data.id);
}

export async function getMonthlyReport(userId: string, year: number, month: number): Promise<MonthlyReport | null> {
    const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('userId', userId)
        .eq('year', year)
        .eq('month', month)
        .single();
    if (error) return null;
    return { ...data, id: String(data.id) } as MonthlyReport;
}
