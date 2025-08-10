
import { db, storage } from './config';
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, writeBatch, deleteDoc, setDoc, getDoc, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Message, AppCheckIn, AppUser, AppComment, CommentWithAuthor, Report, Activity, MonthlyReport } from '@/lib/types';


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
 * Uploads a photo from a data URI to Firebase Storage.
 * @param photoDataUri - The photo encoded as a data URI.
 * @param userId - The user ID, to create a structured path.
 * @param folder - The folder to upload to ('checkIns' or 'avatars' or 'activities').
 * @returns The public download URL of the uploaded photo.
 */
async function uploadPhoto(photoDataUri: string, userId: string, folder: 'checkIns' | 'avatars' | 'activities'): Promise<string> {
    try {
        const mimeType = photoDataUri.match(/data:(.*);base64,/)?.[1];
        if (!mimeType) {
            throw new Error("Invalid data URI: MIME type not found.");
        }
        
        const fileExtension = mimeType.split('/')[1] || 'jpg';
        const storagePath = `${folder}/${userId}/${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);

        // 'data_url' is the format for handling base64 data URIs
        const snapshot = await uploadString(storageRef, photoDataUri, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log("Photo uploaded successfully. URL:", downloadURL);
        return downloadURL;

    } catch(error) {
        console.error("Error uploading photo to Firebase Storage:", error);
        throw new Error(`Could not upload photo. Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
}


/**
 * Adds a new check-in document to the 'checkIns' collection.
 * If a photo data URI is provided, it uploads the photo to Storage first.
 * @param checkInData - The data for the new check-in.
 * @returns The ID of the newly created document.
 */
export async function addCheckIn(checkInData: AppCheckInData): Promise<string> {
    try {
        const docData: any = {
            userId: checkInData.userId,
            content: checkInData.content,
            isPublic: checkInData.isPublic,
            createdAt: serverTimestamp(), // Let Firestore server generate the timestamp
            likedBy: [],
            commentsCount: 0,
        };

        // If there's a photo, upload it and add the URL to the document
        if (checkInData.photoDataUri) {
            const photoUrl = await uploadPhoto(checkInData.photoDataUri, checkInData.userId, 'checkIns');
            docData.photoUrl = photoUrl;
        }

        // Add activity link if provided
        if (checkInData.activityId) {
            docData.activityId = checkInData.activityId;
            docData.activityTitle = checkInData.activityTitle;
        }


        const docRef = await addDoc(collection(db, 'checkIns'), docData);
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error(`Could not add check-in to Firestore. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Updates an existing check-in document.
 * @param checkInId The ID of the check-in to update.
 * @param userId The ID of the user requesting the update for permission check.
 * @param data The data to update (content, photoDataUri).
 */
export async function updateCheckIn(checkInId: string, userId: string, data: { content: string; photoDataUri?: string; }): Promise<void> {
    const checkInRef = doc(db, 'checkIns', checkInId);
    try {
        const docSnap = await getDoc(checkInRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            throw new Error("Permission denied or check-in not found.");
        }

        const updateData: any = {
            content: data.content,
            updatedAt: serverTimestamp(),
        };

        // If a new photo data URI is provided and it's different from the existing one, upload it.
        if (data.photoDataUri && data.photoDataUri.startsWith('data:image')) {
            const newPhotoUrl = await uploadPhoto(data.photoDataUri, userId, 'checkIns');
            updateData.photoUrl = newPhotoUrl;
            // Optionally delete the old photo if it exists
            const oldPhotoUrl = docSnap.data().photoUrl;
            if (oldPhotoUrl) {
                try {
                    await deleteObject(ref(storage, oldPhotoUrl));
                } catch (e) {
                    console.warn("Could not delete old photo, it might not exist.", e);
                }
            }
        } else if (data.photoDataUri === undefined) {
             // If photoDataUri is explicitly undefined, it means remove the photo
            updateData.photoUrl = null;
            const oldPhotoUrl = docSnap.data().photoUrl;
             if (oldPhotoUrl) {
                try {
                    await deleteObject(ref(storage, oldPhotoUrl));
                } catch (e) {
                    console.warn("Could not delete old photo, it might not exist.", e);
                }
            }
        }
        
        await updateDoc(checkInRef, updateData);

    } catch (e) {
        console.error(`Error updating check-in ${checkInId}:`, e);
        throw new Error(`Could not update check-in. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}


/**
 * Deletes a check-in document and its associated photo from Storage.
 * @param checkInId - The ID of the check-in to delete.
 * @param userId - The ID of the user requesting the deletion, for ownership verification.
 */
export async function deleteCheckIn(checkInId: string, userId: string): Promise<void> {
    const checkInRef = doc(db, 'checkIns', checkInId);
    try {
        const docSnap = await getDoc(checkInRef);

        if (!docSnap.exists()) {
            throw new Error("Check-in not found.");
        }

        const checkInData = docSnap.data() as AppCheckIn;

        // Security check: ensure the user owns this check-in or it's an admin action
        // For now, we allow any passed userId to delete, assuming check is done in action/page
        // if (checkInData.userId !== userId) {
        //     throw new Error("Permission denied. You can only delete your own check-ins.");
        // }

        // If there's a photo, delete it from Firebase Storage
        if (checkInData.photoUrl) {
            try {
                const photoRef = ref(storage, checkInData.photoUrl);
                await deleteObject(photoRef);
                console.log(`Successfully deleted photo: ${checkInData.photoUrl}`);
            } catch (storageError: any) {
                // Log storage error but don't block firestore deletion
                // e.g., if file doesn't exist for some reason
                 console.error(`Failed to delete photo from storage, but proceeding with Firestore deletion. Error: ${storageError.message}`);
            }
        }

        // Delete the document from Firestore
        await deleteDoc(checkInRef);
        console.log(`Successfully deleted check-in document ${checkInId}`);
    } catch (e) {
        console.error(`Error deleting check-in ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not delete the check-in. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves the latest public check-ins using Firebase v9 SDK.
 * @param count - The number of check-ins to retrieve.
 * @returns An array of public check-in documents.
 */
export async function getPublicCheckIns(count = 20): Promise<AppCheckIn[]> {
    try {
        const checkInsCollection = collection(db, 'checkIns');
        const q = query(
            checkInsCollection,
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc'),
            limit(count)
        );

        const querySnapshot = await getDocs(q);
        const checkIns = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                likedBy: data.likedBy || [],
                commentsCount: data.commentsCount || 0,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppCheckIn;
        });
        return checkIns;
    } catch (e) {
        console.error("Error getting public check-ins: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve public check-ins. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves all check-ins for a specific user using Firebase v9 SDK.
 * @param userId - The ID of the user.
 * @returns An array of the user's check-in documents.
 */
export async function getUserCheckIns(userId: string): Promise<AppCheckIn[]> {
    try {
        const checkInsCollection = collection(db, 'checkIns');
        const q = query(
            checkInsCollection,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const checkIns = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                likedBy: data.likedBy || [],
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppCheckIn;
        });
        return checkIns;
    } catch (e) {
        console.error("Error getting user check-ins: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve user's check-ins. Reason: ${errorMessage}`);
    }
}

/**
 * Adds a user's ID to the 'likedBy' array of a specific check-in document.
 * @param checkInId - The ID of the check-in document to like.
 * @param userId - The ID of the user liking the document.
 */
export async function likeCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
        const checkInRef = doc(db, 'checkIns', checkInId);
        await updateDoc(checkInRef, {
            likedBy: arrayUnion(userId)
        });
    } catch (e) {
        console.error(`Error liking document ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not update likes on the check-in. Reason: ${errorMessage}`);
    }
}

/**
 * Removes a user's ID from the 'likedBy' array of a specific check-in document.
 * @param checkInId - The ID of the check-in document to unlike.
 * @param userId - The ID of the user unliking the document.
 */
export async function unlikeCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
        const checkInRef = doc(db, 'checkIns', checkInId);
        await updateDoc(checkInRef, {
            likedBy: arrayRemove(userId)
        });
    } catch (e) {
        console.error(`Error unliking document ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not update likes on the check-in. Reason: ${errorMessage}`);
    }
}

/**
 * Updates a check-in document to be public.
 * @param checkInId - The ID of the check-in document to make public.
 */
export async function makeCheckInPublic(checkInId: string): Promise<void> {
    try {
        const checkInRef = doc(db, 'checkIns', checkInId);
        await updateDoc(checkInRef, {
            isPublic: true
        });
    } catch (e) {
        console.error(`Error making document public ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not make the check-in public. Reason: ${errorMessage}`);
    }
}

/**
 * Updates a check-in document to be private.
 * @param checkInId - The ID of the check-in document to make private.
 */
export async function makeCheckInPrivate(checkInId: string): Promise<void> {
    try {
        const checkInRef = doc(db, 'checkIns', checkInId);
        await updateDoc(checkInRef, {
            isPublic: false
        });
    } catch (e) {
        console.error(`Error making document private ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not make the check-in private. Reason: ${errorMessage}`);
    }
}


/**
 * Saves a chat message to Firestore.
 * @param message - The message object to save. The 'content' must be a string for storage.
 * @returns The ID of the newly created document.
 */
export async function saveMessage(message: Message): Promise<string> {
  try {
    const docData: { [key: string]: any } = {
        role: message.role,
        content: message.contentForDb || (typeof message.content === 'string' ? message.content : '[Unsupported Content]'),
        timestamp: serverTimestamp(),
        userId: message.userId,
    };

    if (message.data) {
      docData.data = message.data;
    }
    // Only include status if it's explicitly defined
    if (message.status !== undefined) {
      docData.status = message.status;
    }

    const docRef = await addDoc(collection(db, 'messages'), docData);
    return docRef.id;
  } catch (e) {
    console.error("Error adding message document: ", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not save message. Reason: ${errorMessage}`);
  }
}


/**
 * Retrieves all chat messages for a specific user.
 * @param userId - The ID of the user.
 * @returns An array of the user's message documents.
 */
export async function getUserMessages(userId: string): Promise<Message[]> {
  try {
    const messagesCollection = collection(db, 'messages');
    const q = query(
      messagesCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        userId: data.userId,
        timestamp,
        data: data.data, // Also retrieve the data field
      } as Message;
    });
    return messages;
  } catch (e) {
    console.error("Error getting user messages: ", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not retrieve user's messages. Reason: ${errorMessage}`);
  }
}


/**
 * Deletes all chat messages for a specific user.
 * @param userId - The ID of the user.
 */
export async function deleteUserMessages(userId: string): Promise<void> {
    try {
        const messagesCollection = collection(db, 'messages');
        const q = query(messagesCollection, where('userId', '==', userId));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log("No messages to delete for this user.");
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Successfully deleted ${querySnapshot.size} messages for user ${userId}`);

    } catch (e) {
        console.error("Error deleting user messages: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not delete user messages. Reason: ${errorMessage}`);
    }
}

// === User Profile Functions ===

/**
 * Gets a user's public profile. If it doesn't exist, creates one with default values.
 * @param userId - The user's unique ID.
 * @returns The user's profile object.
 */
export async function getUserProfile(userId: string): Promise<AppUser> {
    // Special case for our AI assistant
    if (userId === AI_USER_ID) {
        return {
            uid: AI_USER_ID,
            displayName: 'Echo',
            photoURL: '/images/logo/logo-no-bg.svg',
            createdAt: new Date().toISOString(),
        };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: userId, // ensure uid is present
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
        } as AppUser;
    } else {
        // Profile doesn't exist, create a default one
        const defaultProfile: Omit<AppUser, 'createdAt'> & { createdAt: any } = {
            uid: userId,
            displayName: '匿名旅者',
            photoURL: `https://placehold.co/100x100/A6D1E6/424242.png`,
            createdAt: serverTimestamp(),
        };
        await setDoc(userRef, defaultProfile);
        // We return a client-side version of the profile since serverTimestamp is not a Date
        return {
            ...defaultProfile,
            createdAt: new Date().toISOString(), 
        };
    }
}

/**
 * Updates a user's public profile. Handles data URI for photoURL by uploading to Storage.
 * @param userId - The user's unique ID.
 * @param data - The profile data to update. Can include displayName and photoURL.
 */
export async function updateUserProfile(userId: string, data: { displayName?: string; photoURL?: string }): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const updateData: { [key: string]: any } = { ...data, updatedAt: serverTimestamp() };

    // Check if photoURL is a data URI, if so, upload it to Storage.
    if (data.photoURL && data.photoURL.startsWith('data:image')) {
        try {
            const newPhotoUrl = await uploadPhoto(data.photoURL, userId, 'avatars');
            updateData.photoURL = newPhotoUrl;
        } catch (error) {
            console.error("Failed to upload custom avatar, aborting profile update for photo.", error);
            // We can choose to either fail the whole update or just update the name
            // For now, let's just remove the photoURL from the update if it fails
            delete updateData.photoURL;
            // Optionally re-throw or handle this more gracefully
            throw new Error("Custom avatar upload failed.");
        }
    }

    await updateDoc(userRef, updateData);
}


// === Comments Functions ===

/**
 * Adds a new comment to a check-in.
 * @param checkInId - The ID of the check-in being commented on.
 * @param userId - The ID of the user making the comment.
 * @param content - The text of the comment.
 * @returns The ID of the newly created comment document.
 */
export async function addComment(checkInId: string, userId: string, content: string): Promise<string> {
    const batch = writeBatch(db);

    // 1. Add the new comment document
    const commentsCollection = collection(db, 'comments');
    const newCommentRef = doc(commentsCollection); // Create a ref with a new ID
    batch.set(newCommentRef, {
        checkInId,
        userId,
        content,
        createdAt: serverTimestamp(),
    });

    // 2. Increment the commentsCount on the check-in document
    const checkInRef = doc(db, 'checkIns', checkInId);
    batch.update(checkInRef, { commentsCount: increment(1) });
    
    try {
        await batch.commit();
        return newCommentRef.id;
    } catch (e) {
        console.error(`Error adding comment to ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not add comment. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves all comments for a specific check-in, along with author profiles.
 * @param checkInId - The ID of the check-in.
 * @returns An array of comment documents with their author's profile.
 */
export async function getCommentsForCheckIn(checkInId: string): Promise<CommentWithAuthor[]> {
    try {
        const commentsCollection = collection(db, 'comments');
        const q = query(
            commentsCollection,
            where('checkInId', '==', checkInId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const comments = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            return {
                id: doc.id,
                ...data,
                createdAt,
            } as AppComment;
        });

        // Fetch author profile for each comment
        const commentsWithAuthors = await Promise.all(
            comments.map(async (comment) => {
                const author = await getUserProfile(comment.userId);
                return { ...comment, author };
            })
        );

        return commentsWithAuthors;

    } catch (e) {
        console.error(`Error getting comments for ${checkInId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve comments. Reason: ${errorMessage}`);
    }
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
    try {
        const coverImageUrl = await uploadPhoto(activityData.coverImageDataUri, activityData.userId, 'activities');

        const docData = {
            title: activityData.title,
            description: activityData.description,
            category: activityData.category,
            userId: activityData.userId,
            coverImageUrl: coverImageUrl,
            status: 'pending' as const,
            participants: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'activities'), docData);
        return docRef.id;
    } catch (e) {
        console.error("Error creating activity: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not create activity. Reason: ${errorMessage}`);
    }
}

export async function getApprovedActivities(): Promise<Activity[]> {
    try {
        const activitiesCollection = collection(db, 'activities');
        const q = query(
            activitiesCollection,
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                participants: data.participants || [],
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as Activity;
        });
    } catch (e) {
        console.error("Error getting approved activities: ", e);
        throw new Error(`Could not retrieve activities. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function getUserActivities(userId: string): Promise<Activity[]> {
     try {
        const activitiesCollection = collection(db, 'activities');
        const q = query(
            activitiesCollection,
            where('participants', 'array-contains', userId),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as Activity;
        });
    } catch (e) {
        console.error("Error getting user activities: ", e);
        throw new Error(`Could not retrieve user activities. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}


export async function getPendingActivities(): Promise<Activity[]> {
    try {
        const activitiesCollection = collection(db, 'activities');
        const q = query(
            activitiesCollection,
            where('status', '==', 'pending'),
            orderBy('createdAt', 'asc') // Show oldest pending first
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as Activity;
        });
    } catch (e) {
        console.error("Error getting pending activities: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve pending activities. Reason: ${errorMessage}`);
    }
}

export async function updateActivityStatus(activityId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
        const activityRef = doc(db, 'activities', activityId);
        await updateDoc(activityRef, {
            status,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error(`Error updating activity ${activityId} status: `, e);
        throw new Error(`Could not update activity status. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function joinActivity(activityId: string, userId: string): Promise<void> {
    try {
        const activityRef = doc(db, 'activities', activityId);
        await updateDoc(activityRef, {
            participants: arrayUnion(userId)
        });
    } catch (e) {
        console.error(`Error joining activity ${activityId}:`, e);
        throw new Error(`Could not join activity. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function leaveActivity(activityId: string, userId: string): Promise<void> {
    try {
        const activityRef = doc(db, 'activities', activityId);
        await updateDoc(activityRef, {
            participants: arrayRemove(userId)
        });
    } catch (e) {
        console.error(`Error leaving activity ${activityId}:`, e);
        throw new Error(`Could not leave activity. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}


// === Admin / Moderation Functions ===

/**
 * Creates a new report for a piece of content, preventing duplicates.
 * @param checkInId - The ID of the content being reported.
 * @param reportedByUserId - The ID of the user making the report.
 */
export async function createReport(checkInId: string, reportedByUserId: string): Promise<string> {
    try {
        // Check for existing reports by the same user for the same post
        const reportsCollection = collection(db, 'reports');
        const q = query(
            reportsCollection,
            where('checkInId', '==', checkInId),
            where('reportedByUserId', '==', reportedByUserId),
            limit(1)
        );

        const existingReportSnap = await getDocs(q);
        if (!existingReportSnap.empty) {
            throw new Error("你已经举报过这条内容，无需重复操作。");
        }

        const docRef = await addDoc(collection(db, 'reports'), {
            checkInId,
            reportedByUserId,
            status: 'pending', // 'pending', 'resolved'
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch(e: any) {
        console.error(`Error creating report for check-in ${checkInId}:`, e);
        const errorMessage = e.message || String(e);
        throw new Error(errorMessage);
    }
}

/**
 * Marks a report as resolved.
 * @param reportId - The ID of the report to resolve.
 */
export async function resolveReport(reportId: string): Promise<void> {
    try {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
            status: 'resolved'
        });
    } catch(e) {
        console.error(`Error resolving report ${reportId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not resolve report. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves all pending reports.
 * @returns An array of pending report documents.
 */
export async function getPendingReports(): Promise<Report[]> {
    try {
        const reportsCollection = collection(db, 'reports');
        const q = query(
            reportsCollection,
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            return {
                id: doc.id,
                ...data,
                createdAt,
            } as Report;
        });
    } catch (e) {
        console.error("Error getting pending reports: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve pending reports. Reason: ${errorMessage}`);
    }
}


/**
 * [Admin] Retrieves all users from the 'users' collection.
 * @returns An array of all user profiles.
 */
export async function getAllUsers(): Promise<AppUser[]> {
    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id, 
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppUser
        });
    } catch (e) {
        console.error("Error getting all users: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve all users. Reason: ${errorMessage}`);
    }
}

/**
 * [Admin] Retrieves all check-ins from the 'checkIns' collection.
 * @returns An array of all check-in documents.
 */
export async function getAllCheckIns(): Promise<AppCheckIn[]> {
    try {
        const checkInsCollection = collection(db, 'checkIns');
        const q = query(checkInsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                likedBy: data.likedBy || [],
                commentsCount: data.commentsCount || 0,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppCheckIn;
        });
    } catch (e) {
        console.error("Error getting all check-ins: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve all check-ins. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves a single check-in by its ID.
 * @param checkInId The ID of the check-in to retrieve.
 * @returns The check-in object or null if not found.
 */
export async function getCheckInById(checkInId: string): Promise<AppCheckIn | null> {
    try {
        const checkInRef = doc(db, 'checkIns', checkInId);
        const docSnap = await getDoc(checkInRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                likedBy: data.likedBy || [],
                commentsCount: data.commentsCount || 0,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppCheckIn;
        }
        return null;
    } catch (e) {
        console.error(`Error getting check-in by ID ${checkInId}:`, e);
        throw e;
    }
}


export async function getActivityById(activityId: string): Promise<Activity | null> {
    try {
        const activityRef = doc(db, 'activities', activityId);
        const docSnap = await getDoc(activityRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                participants: data.participants || [],
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as Activity;
        }
        return null;
    } catch (e) {
        console.error(`Error getting activity by ID ${activityId}:`, e);
        throw e;
    }
}

export async function getCheckInsForActivity(activityId: string): Promise<AppCheckIn[]> {
    try {
        const checkInsCollection = collection(db, 'checkIns');
        const q = query(
            checkInsCollection,
            where('activityId', '==', activityId),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                likedBy: data.likedBy || [],
                commentsCount: data.commentsCount || 0,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as AppCheckIn;
        });
    } catch (e) {
        console.error(`Error getting check-ins for activity ${activityId}:`, e);
        throw new Error(`Could not retrieve check-ins for activity. Reason: ${e instanceof Error ? e.message : String(e)}`);
    }
}

// === Monthly Report Functions ===

/**
 * Saves a generated monthly report to the database.
 * @param reportData - The report data to save.
 * @returns The ID of the newly created report document.
 */
export async function saveMonthlyReport(reportData: Omit<MonthlyReport, 'id' | 'createdAt'>): Promise<string> {
    try {
        const docData = {
            ...reportData,
            createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'monthly_reports'), docData);
        return docRef.id;
    } catch (e) {
        console.error(`Error saving monthly report for user ${reportData.userId}:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not save monthly report. Reason: ${errorMessage}`);
    }
}

/**
 * Retrieves a specific monthly report for a user.
 * @param userId - The user's ID.
 * @param year - The year of the report.
 * @param month - The month of the report (1-12).
 * @returns The report object or null if not found.
 */
export async function getMonthlyReport(userId: string, year: number, month: number): Promise<MonthlyReport | null> {
    try {
        const reportsCollection = collection(db, 'monthly_reports');
        const q = query(
            reportsCollection,
            where('userId', '==', userId),
            where('year', '==', year),
            where('month', '==', month),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        } as MonthlyReport;
    } catch (e) {
        console.error(`Error getting monthly report for user ${userId} [${year}-${month}]:`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not retrieve monthly report. Reason: ${errorMessage}`);
    }
}
