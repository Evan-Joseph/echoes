import { readCollection, writeCollection } from '../local-db';
import type { Message, AppCheckIn, AppUser, AppComment, CommentWithAuthor, Report, Activity, MonthlyReport } from '@/lib/types';
import { User } from './auth';

// This is the new local file upload function that will be implemented via an API route
import { uploadPhoto as localUploadPhoto, deletePhoto } from './storage';

// Define the structure of a check-in document when passing data to functions
export interface AppCheckInData {
    userId: string;
    content: string;
    isPublic: boolean;
    photoDataUri?: string;
    photoUrl?: string;
    likedBy?: string[];
    commentsCount?: number;
    activityId?: string;
    activityTitle?: string;
}

const AI_USER_ID = "echo-ai-assistant";


/**
 * Uploads a photo from a data URI using the local API route.
 * @param photoDataUri - The photo encoded as a data URI.
 * @param userId - The user ID, to create a structured path.
 * @param folder - The folder to upload to ('checkIns' or 'avatars' or 'activities').
 * @returns The public download URL of the uploaded photo.
 */
async function uploadPhoto(photoDataUri: string, userId: string, folder: 'checkIns' | 'avatars' | 'activities'): Promise<string> {
    // This function now calls the local upload helper
    return localUploadPhoto(photoDataUri, userId, folder);
}


/**
 * Adds a new check-in document to the 'checkIns.json' file.
 * If a photo data URI is provided, it uploads the photo first.
 * @param checkInData - The data for the new check-in.
 * @returns The ID of the newly created document.
 */
export async function addCheckIn(checkInData: AppCheckInData): Promise<string> {
    try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        const newId = `checkin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const docData: AppCheckIn = {
            id: newId,
            userId: checkInData.userId,
            content: checkInData.content,
            isPublic: checkInData.isPublic,
            createdAt: new Date().toISOString(),
            likedBy: [],
            commentsCount: 0,
        };

        if (checkInData.photoDataUri) {
            const photoUrl = await uploadPhoto(checkInData.photoDataUri, checkInData.userId, 'checkIns');
            docData.photoUrl = photoUrl;
        }

        if (checkInData.activityId) {
            docData.activityId = checkInData.activityId;
            docData.activityTitle = checkInData.activityTitle;
        }

        checkIns.push(docData);
        await writeCollection('checkIns', checkIns);

        console.log("Document written with ID: ", newId);
        return newId;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error(`Could not add check-in to local DB. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Updates an existing check-in document in 'checkIns.json'.
 */
export async function updateCheckIn(checkInId: string, userId: string, data: { content: string; photoDataUri?: string; }): Promise<void> {
    try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        const checkInIndex = checkIns.findIndex(c => c.id === checkInId);

        if (checkInIndex === -1 || checkIns[checkInIndex].userId !== userId) {
            throw new Error("Permission denied or check-in not found.");
        }

        const existingCheckIn = checkIns[checkInIndex];
        existingCheckIn.content = data.content;
        existingCheckIn.updatedAt = new Date().toISOString();

        if (data.photoDataUri && data.photoDataUri.startsWith('data:image')) {
            // If there was an old photo, delete it.
            if (existingCheckIn.photoUrl) {
                await deletePhoto(existingCheckIn.photoUrl);
            }
            const newPhotoUrl = await uploadPhoto(data.photoDataUri, userId, 'checkIns');
            existingCheckIn.photoUrl = newPhotoUrl;
        } else if (data.photoDataUri === undefined) {
             // If there was an old photo, delete it.
            if (existingCheckIn.photoUrl) {
                await deletePhoto(existingCheckIn.photoUrl);
            }
            existingCheckIn.photoUrl = undefined;
        }
        
        checkIns[checkInIndex] = existingCheckIn;
        await writeCollection('checkIns', checkIns);

    } catch (e) {
        console.error(`Error updating check-in ${checkInId}:`, e);
        throw new Error(`Could not update check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}


/**
 * Deletes a check-in document and all its related data (comments, reports).
 */
export async function deleteCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
        // For this local implementation, we perform the operations sequentially.
        // A real DB would use a transaction for this.

        // 1. Read all necessary collections
        let [checkIns, comments, reports] = await Promise.all([
            readCollection<AppCheckIn>('checkIns'),
            readCollection<AppComment>('comments'),
            readCollection<Report>('reports')
        ]);

        const checkInToDelete = checkIns.find(c => c.id === checkInId);
        if (!checkInToDelete) {
            console.warn(`Check-in with id ${checkInId} not found for deletion.`);
            return; // Exit if there's nothing to delete
        }

        // If the check-in has a photo, delete it from storage.
        if (checkInToDelete.photoUrl) {
            await deletePhoto(checkInToDelete.photoUrl);
        }

        // 2. Filter out the check-in and its related data
        const newCheckIns = checkIns.filter(c => c.id !== checkInId);
        const newComments = comments.filter(c => c.checkInId !== checkInId);
        const newReports = reports.filter(r => r.checkInId !== checkInId);

        // 3. Write all collections back to the "database"
        await Promise.all([
            writeCollection('checkIns', newCheckIns),
            writeCollection('comments', newComments),
            writeCollection('reports', newReports)
        ]);

        console.log(`Successfully deleted check-in ${checkInId} and its related data.`);
    } catch (e) {
        console.error(`Error deleting check-in ${checkInId}:`, e);
        throw new Error(`Could not delete the check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Retrieves the latest public check-ins from 'checkIns.json'.
 */
export async function getPublicCheckIns(count = 20): Promise<AppCheckIn[]> {
    try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        return checkIns
            .filter(c => c.isPublic)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, count);
    } catch (e) {
        console.error("Error getting public check-ins: ", e);
        throw new Error(`Could not retrieve public check-ins. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Retrieves all check-ins for a specific user from 'checkIns.json'.
 */
export async function getUserCheckIns(userId: string): Promise<AppCheckIn[]> {
     try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        return checkIns
            .filter(c => c.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.error("Error getting user check-ins: ", e);
        throw new Error(`Could not retrieve user's check-ins. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Adds a user's ID to the 'likedBy' array of a specific check-in.
 */
export async function likeCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        const checkIn = checkIns.find(c => c.id === checkInId);
        if (checkIn) {
            if (!checkIn.likedBy) {
                checkIn.likedBy = [];
            }
            if (!checkIn.likedBy.includes(userId)) {
                checkIn.likedBy.push(userId);
            }
            await writeCollection('checkIns', checkIns);
        }
    } catch (e) {
        console.error(`Error liking document ${checkInId}:`, e);
        throw new Error(`Could not update likes on the check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Removes a user's ID from the 'likedBy' array.
 */
export async function unlikeCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        const checkIn = checkIns.find(c => c.id === checkInId);
        if (checkIn && checkIn.likedBy) {
            checkIn.likedBy = checkIn.likedBy.filter(id => id !== userId);
            await writeCollection('checkIns', checkIns);
        }
    } catch (e) {
        console.error(`Error unliking document ${checkInId}:`, e);
        throw new Error(`Could not update likes on the check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

// ... (makePublic, makePrivate, etc. follow the same pattern of read, modify, write)
export async function makeCheckInPublic(checkInId: string): Promise<void> {
    const checkIns = await readCollection<AppCheckIn>('checkIns');
    const checkIn = checkIns.find(c => c.id === checkInId);
    if (checkIn) {
        checkIn.isPublic = true;
        await writeCollection('checkIns', checkIns);
    }
}

export async function makeCheckInPrivate(checkInId: string): Promise<void> {
    const checkIns = await readCollection<AppCheckIn>('checkIns');
    const checkIn = checkIns.find(c => c.id === checkInId);
    if (checkIn) {
        checkIn.isPublic = false;
        await writeCollection('checkIns', checkIns);
    }
}

/**
 * Saves a chat message to 'messages.json'.
 */
export async function saveMessage(message: Message): Promise<string> {
  try {
    const messages = await readCollection<Message>('messages');
    const newId = `msg_${Date.now()}`;
    const docData: Message = {
        ...message,
        id: newId,
        timestamp: new Date().toISOString(),
    };
    messages.push(docData);
    await writeCollection('messages', messages);
    return newId;
  } catch (e) {
    console.error("Error adding message document: ", e);
    throw new Error(`Could not save message. Reason: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Retrieves all chat messages for a specific user.
 */
export async function getUserMessages(userId: string): Promise<Message[]> {
  try {
    const messages = await readCollection<Message>('messages');
    return messages
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (e) {
    console.error("Error getting user messages: ", e);
    throw new Error(`Could not retrieve user's messages. Reason: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Deletes all chat messages for a specific user.
 */
export async function deleteUserMessages(userId: string): Promise<void> {
    try {
        let messages = await readCollection<Message>('messages');
        messages = messages.filter(m => m.userId !== userId);
        await writeCollection('messages', messages);
    } catch (e) {
        console.error("Error deleting user messages: ", e);
        throw new Error(`Could not delete user messages. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

// === User Profile Functions ===

/**
 * Gets a user's public profile from 'users.json'. If it doesn't exist, creates one.
 */
export async function getUserProfile(userId: string): Promise<AppUser> {
    if (userId === AI_USER_ID) {
        return { uid: AI_USER_ID, displayName: 'Echo', photoURL: '/images/logo/logo-no-bg.svg', createdAt: new Date().toISOString() };
    }

    const users = await readCollection<AppUser>('users');
    let user = users.find(u => u.uid === userId);

    if (user) {
        return user;
    } else {
        const defaultProfile: AppUser = {
            uid: userId,
            displayName: '匿名旅者',
            photoURL: `https://placehold.co/100x100/A6D1E6/424242.png`,
            createdAt: new Date().toISOString(),
        };
        users.push(defaultProfile);
        await writeCollection('users', users);
        return defaultProfile;
    }
}

/**
 * Updates a user's public profile in 'users.json'.
 */
export async function updateUserProfile(userId: string, data: { displayName?: string; photoURL?: string }): Promise<void> {
    const users = await readCollection<AppUser>('users');
    const userIndex = users.findIndex(u => u.uid === userId);

    if (userIndex !== -1) {
        const user = users[userIndex];
        const updateData: { displayName?: string, photoURL?: string, updatedAt?: string } = { ...data, updatedAt: new Date().toISOString() };

        if (data.photoURL && data.photoURL.startsWith('data:image')) {
            updateData.photoURL = await uploadPhoto(data.photoURL, userId, 'avatars');
        }

        users[userIndex] = { ...user, ...updateData };
        await writeCollection('users', users);
    }
}

// === Comments Functions ===

/**
 * Adds a new comment to 'comments.json' and updates the count in 'checkIns.json'.
 */
export async function addComment(checkInId: string, userId: string, content: string): Promise<string> {
    try {
        // 1. Add the new comment
        const comments = await readCollection<AppComment>('comments');
        const newCommentId = `comment_${Date.now()}`;
        const newComment: AppComment = {
            id: newCommentId,
            checkInId,
            userId,
            content,
            createdAt: new Date().toISOString(),
        };
        comments.push(newComment);
        await writeCollection('comments', comments);

        // 2. Increment the commentsCount on the check-in
        const checkIns = await readCollection<AppCheckIn>('checkIns');
        const checkIn = checkIns.find(c => c.id === checkInId);
        if (checkIn) {
            checkIn.commentsCount = (checkIn.commentsCount || 0) + 1;
            await writeCollection('checkIns', checkIns);
        }

        return newCommentId;
    } catch (e) {
        console.error(`Error adding comment to ${checkInId}:`, e);
        throw new Error(`Could not add comment. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Retrieves all comments for a specific check-in, along with author profiles.
 */
export async function getCommentsForCheckIn(checkInId: string): Promise<CommentWithAuthor[]> {
    try {
        const comments = await readCollection<AppComment>('comments');
        const checkInComments = comments
            .filter(c => c.checkInId === checkInId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const commentsWithAuthors = await Promise.all(
            checkInComments.map(async (comment) => {
                const author = await getUserProfile(comment.userId);
                return { ...comment, author };
            })
        );
        return commentsWithAuthors;
    } catch (e) {
        console.error(`Error getting comments for ${checkInId}:`, e);
        throw new Error(`Could not retrieve comments. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}


// === Activity Functions ===
// All activity functions will follow the same pattern: read, modify, write.

interface CreateActivityData {
    title: string;
    description: string;
    category: Activity['category'];
    coverImageDataUri: string;
    userId: string;
}

export async function createActivity(activityData: CreateActivityData): Promise<string> {
    const activities = await readCollection<Activity>('activities');
    const coverImageUrl = await uploadPhoto(activityData.coverImageDataUri, activityData.userId, 'activities');
    const newActivity: Activity = {
        id: `activity_${Date.now()}`,
        title: activityData.title,
        description: activityData.description,
        category: activityData.category,
        userId: activityData.userId,
        coverImageUrl: coverImageUrl,
        status: 'pending',
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    activities.push(newActivity);
    await writeCollection('activities', activities);
    return newActivity.id;
}

// ... other activity functions would be implemented similarly ...
// For brevity, only a few key ones are fully implemented here.

export async function getApprovedActivities(): Promise<Activity[]> {
    const activities = await readCollection<Activity>('activities');
    return activities.filter(a => a.status === 'approved').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateActivityStatus(activityId: string, status: 'approved' | 'rejected'): Promise<void> {
    const activities = await readCollection<Activity>('activities');
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
        activity.status = status;
        activity.updatedAt = new Date().toISOString();
        await writeCollection('activities', activities);
    }
}

export async function joinActivity(activityId: string, userId: string): Promise<void> {
    const activities = await readCollection<Activity>('activities');
    const activity = activities.find(a => a.id === activityId);
    if (activity && !activity.participants.includes(userId)) {
        activity.participants.push(userId);
        await writeCollection('activities', activities);
    }
}

// === Admin / Moderation, Getters, etc. ===
// These functions are also rewritten to use the local JSON files.

export async function getCheckInById(checkInId: string): Promise<AppCheckIn | null> {
    const checkIns = await readCollection<AppCheckIn>('checkIns');
    return checkIns.find(c => c.id === checkInId) || null;
}

export async function getActivityById(activityId: string): Promise<Activity | null> {
    const activities = await readCollection<Activity>('activities');
    return activities.find(a => a.id === activityId) || null;
}

// Many other functions from the original file are omitted here for brevity,
// but they would all follow the same pattern of:
// 1. `readCollection`
// 2. `Array.prototype.find/filter/map`
// 3. `writeCollection`
// The logic for all of them (getPendingReports, getAllUsers, etc.) is straightforward
// to convert from Firestore queries to JavaScript array manipulations.

// === Admin / Moderation Functions ===

export async function getAllUsers(): Promise<AppUser[]> {
    return readCollection<AppUser>('users');
}

export async function getAllCheckIns(): Promise<AppCheckIn[]> {
    return readCollection<AppCheckIn>('checkIns');
}

export async function createReport(checkInId: string, reportedByUserId: string): Promise<string> {
    const reports = await readCollection<Report>('reports');
    // Prevent duplicate reports
    const existing = reports.find(r => r.checkInId === checkInId && r.reportedByUserId === reportedByUserId);
    if (existing) {
        throw new Error("你已经举报过这条内容，无需重复操作。");
    }
    const newReport: Report = {
        id: `report_${Date.now()}`,
        checkInId,
        reportedByUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    reports.push(newReport);
    await writeCollection('reports', reports);
    return newReport.id;
}

export async function getPendingReports(): Promise<Report[]> {
    const reports = await readCollection<Report>('reports');
    return reports.filter(r => r.status === 'pending').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function resolveReport(reportId: string): Promise<void> {
    const reports = await readCollection<Report>('reports');
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.status = 'resolved';
        await writeCollection('reports', reports);
    }
}

export async function getPendingActivities(): Promise<Activity[]> {
    const activities = await readCollection<Activity>('activities');
    return activities.filter(a => a.status === 'pending').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getUserActivities(userId: string): Promise<Activity[]> {
    const activities = await readCollection<Activity>('activities');
    return activities.filter(a => a.participants.includes(userId) && a.status === 'approved').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCheckInsForActivity(activityId: string): Promise<AppCheckIn[]> {
    const checkIns = await readCollection<AppCheckIn>('checkIns');
    return checkIns.filter(c => c.activityId === activityId && c.isPublic).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function leaveActivity(activityId: string, userId: string): Promise<void> {
    const activities = await readCollection<Activity>('activities');
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
        activity.participants = activity.participants.filter(pId => pId !== userId);
        await writeCollection('activities', activities);
    }
}

// === Monthly Report Functions ===

export async function saveMonthlyReport(reportData: Omit<MonthlyReport, 'id' | 'createdAt'>): Promise<string> {
    const reports = await readCollection<MonthlyReport>('monthly_reports');
    const newReport: MonthlyReport = {
        id: `monthly_${reportData.userId}_${reportData.year}_${reportData.month}`,
        ...reportData,
        createdAt: new Date().toISOString(),
    };
    reports.push(newReport);
    await writeCollection('monthly_reports', reports);
    return newReport.id;
}

export async function getMonthlyReport(userId: string, year: number, month: number): Promise<MonthlyReport | null> {
    const reports = await readCollection<MonthlyReport>('monthly_reports');
    return reports.find(r => r.userId === userId && r.year === year && r.month === month) || null;
}


// A placeholder for the storage object, as it's no longer a Firebase instance
export const storage = {};
// A placeholder for the db object
export const db = {};
