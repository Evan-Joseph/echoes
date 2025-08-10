
'use server';

import { generateWordCloudData } from '@/ai/flows/generate-word-cloud';
import { generateAiComment } from '@/ai/flows/get-related-suggestions';
import { generateSuggestions } from '@/ai/flows/generate-suggestions';
import { generateMonthlyReport } from '@/ai/flows/generate-monthly-report';
import { getPublicCheckIns, getUserCheckIns, likeCheckIn, unlikeCheckIn, deleteUserMessages, getUserProfile, updateUserProfile, makeCheckInPublic, makeCheckInPrivate, deleteCheckIn, addComment, getCommentsForCheckIn, getAllUsers, getAllCheckIns, getUserMessages, createReport, getPendingReports, getCheckInById, resolveReport, getApprovedActivities, createActivity, joinActivity, getPendingActivities, updateActivityStatus, getUserActivities, getActivityById, getCheckInsForActivity, updateCheckIn, leaveActivity, saveMonthlyReport, getMonthlyReport, AppCheckInData } from '@/lib/supabase/db';
import type { AppCheckIn, AppUser, CommentWithAuthor, Message, Report, Activity, ActivityWithAuthor, MonthlyReport } from '@/lib/types';


// Action to get public check-ins for the community page
export async function getPublicCheckInsAction(): Promise<{ checkIn: AppCheckIn, author: AppUser, authorCheckIns: AppCheckIn[] }[]> {
    const checkIns = await getPublicCheckIns();
    
    // Fetch author profile and all their check-ins for each public check-in
    const checkInsWithAuthors = await Promise.all(
        checkIns.map(async (checkIn) => {
            const [author, authorCheckIns] = await Promise.all([
                getUserProfile(checkIn.userId),
                getUserCheckIns(checkIn.userId) // Fetch all check-ins for the author to determine their title
            ]);
            return { checkIn, author, authorCheckIns };
        })
    );

    return checkInsWithAuthors;
}


// Action to get a user's check-ins for their profile page
export async function getUserCheckInsAction(userId: string): Promise<AppCheckIn[]> {
    return await getUserCheckIns(userId);
}

// Action to like a check-in
export async function likeCheckInAction(checkInId: string, userId: string): Promise<{ success: boolean }> {
    try {
        await likeCheckIn(checkInId, userId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to like check-in ${checkInId}:`, error);
        return { success: false };
    }
}

// Action to unlike a check-in
export async function unlikeCheckInAction(checkInId: string, userId: string): Promise<{ success: boolean }> {
    try {
        await unlikeCheckIn(checkInId, userId);
        return { success: false };
    } catch (error) {
        console.error(`Failed to unlike check-in ${checkInId}:`, error);
        return { success: false };
    }
}

// Action to make a check-in public
export async function makeCheckInPublicAction(checkInId: string): Promise<{ success: boolean }> {
    try {
        await makeCheckInPublic(checkInId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to make check-in public ${checkInId}:`, error);
        return { success: false };
    }
}

// Action to make a check-in private
export async function makeCheckInPrivateAction(checkInId: string): Promise<{ success: boolean }> {
    try {
        await makeCheckInPrivate(checkInId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to make check-in private ${checkInId}:`, error);
        return { success: false };
    }
}


// Action to delete a check-in
export async function deleteCheckInAction(checkInId: string, userId: string): Promise<{ success: boolean }> {
    try {
        await deleteCheckIn(checkInId, userId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete check-in ${checkInId}:`, error);
        return { success: false };
    }
}

// Action for the word cloud generation flow
export async function generateWordCloudDataAction(input: { checkInContents: string[] }) {
    return await generateWordCloudData(input);
}

// Action for getting an AI comment
export async function generateAiCommentAction(input: { checkInContent: string; }) {
    return await generateAiComment(input);
}

// Action for getting AI-powered suggestions
export async function generateSuggestionsAction() {
    return await generateSuggestions();
}

// Action for getting the monthly report
export async function generateMonthlyReportAction(input: { checkInContents: string[]; previousReportSummary?: string; }) {
    return await generateMonthlyReport(input);
}


// Action to clear a user's chat history
export async function clearChatHistoryAction(userId: string): Promise<{ success: boolean }> {
    try {
        await deleteUserMessages(userId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to clear chat history for user ${userId}:`, error);
        return { success: false };
    }
}

// Action to get user profile
export async function getUserProfileAction(userId: string): Promise<AppUser> {
    return await getUserProfile(userId);
}

// Action to update user profile
export async function updateUserProfileAction(userId: string, data: { displayName?: string, photoURL?: string }): Promise<{ success: boolean }> {
    try {
        await updateUserProfile(userId, data);
        return { success: true };
    } catch (error) {
        console.error(`Failed to update profile for user ${userId}:`, error);
        return { success: false };
    }
}

// === Comment Actions ===

// Action to add a new comment
export async function addCommentAction(checkInId: string, userId: string, content: string): Promise<{ success: boolean, newComment?: CommentWithAuthor }> {
    try {
        const newCommentId = await addComment(checkInId, userId, content);
        const author = await getUserProfile(userId);
        // This is a bit of a workaround to get the server-generated timestamp.
        // In a real app, you might listen to the document snapshot instead.
        const newComment: CommentWithAuthor = {
            id: newCommentId,
            checkInId,
            userId,
            content,
            createdAt: new Date().toISOString(), // Use client time for optimistic update
            author,
        };
        return { success: true, newComment };
    } catch (error) {
        console.error(`Failed to add comment to check-in ${checkInId}:`, error);
        return { success: false };
    }
}

// Action to get comments for a check-in
export async function getCommentsAction(checkInId: string): Promise<CommentWithAuthor[]> {
    return await getCommentsForCheckIn(checkInId);
}


// === Admin / Moderation Actions ===

export async function createReportAction(checkInId: string, reportedByUserId: string): Promise<{ success: boolean, message?: string }> {
    try {
        await createReport(checkInId, reportedByUserId);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to create report for check-in ${checkInId}:`, error);
        // Pass the specific error message to the client
        return { success: false, message: error.message };
    }
}

export async function resolveReportAction(reportId: string): Promise<{ success: boolean }> {
     try {
        await resolveReport(reportId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to resolve report ${reportId}:`, error);
        return { success: false };
    }
}

export async function getPendingReportsAction(): Promise<{ report: Report, checkIn: AppCheckIn, reporter: AppUser, author: AppUser }[]> {
    const reports = await getPendingReports();
    const populatedReports = await Promise.all(
        reports.map(async (report) => {
            const [checkIn, reporter, author] = await Promise.all([
                getCheckInById(report.checkInId),
                getUserProfile(report.reportedByUserId),
                // We need to get the author of the check-in as well
                report.checkInId ? getCheckInById(report.checkInId).then(c => c ? getUserProfile(c.userId) : null) : null
            ]);

            // If checkIn or author is null, we might have a data consistency issue, but we'll filter it out.
            if (!checkIn || !author) return null;

            return { report, checkIn, reporter, author };
        })
    );
    // Filter out any null results from inconsistencies
    return populatedReports.filter(Boolean) as { report: Report, checkIn: AppCheckIn, reporter: AppUser, author: AppUser }[];
}


export async function getAllUsersAction(): Promise<AppUser[]> {
    return await getAllUsers();
}

export async function getAllCheckInsAction(): Promise<AppCheckIn[]> {
    return await getAllCheckIns();
}

export async function getUserMessagesAction(userId: string): Promise<Message[]> {
    return await getUserMessages(userId);
}

// === Activity Actions ===

export async function getActivitiesAction(): Promise<(Activity & { checkInsCount: number })[]> {
    const activities = await getApprovedActivities();
    
    // For each activity, get the count of associated check-ins
    const activitiesWithCounts = await Promise.all(
        activities.map(async (activity) => {
            const checkIns = await getCheckInsForActivity(activity.id);
            return {
                ...activity,
                checkInsCount: checkIns.length,
            };
        })
    );
    
    return activitiesWithCounts;
}

// New action to get activities a user has joined
export async function getUserActivitiesAction(userId: string): Promise<Activity[]> {
    return await getUserActivities(userId);
}

export async function createActivityAction(data: {
    title: string;
    description: string;
    category: Activity['category'];
    coverImageDataUri: string;
    userId: string;
}): Promise<{ success: boolean, activityId?: string }> {
    try {
        const activityId = await createActivity(data);
        return { success: true, activityId };
    } catch (error: any) {
        console.error(`Failed to create activity:`, error);
        return { success: false };
    }
}

export async function joinActivityAction(activityId: string, userId: string): Promise<{ success: boolean }> {
    try {
        await joinActivity(activityId, userId);
        return { success: true };
    } catch (error) {
        console.error(`Failed to join activity ${activityId}:`, error);
        return { success: false };
    }
}

export async function leaveActivityAction(activityId: string, userId: string): Promise<{ success: boolean }> {
    try {
        await leaveActivity(activityId, userId);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to leave activity ${activityId}:`, error);
        return { success: false };
    }
}


export async function getPendingActivitiesAction(): Promise<ActivityWithAuthor[]> {
    const activities = await getPendingActivities();
    const activitiesWithAuthors = await Promise.all(
        activities.map(async (activity) => {
            const author = await getUserProfile(activity.userId);
            return { ...activity, author };
        })
    );
    return activitiesWithAuthors;
}

export async function approveActivityAction(activityId: string): Promise<{ success: boolean }> {
    try {
        await updateActivityStatus(activityId, 'approved');
        return { success: true };
    } catch (error) {
        console.error(`Failed to approve activity ${activityId}:`, error);
        return { success: false };
    }
}

export async function rejectActivityAction(activityId: string): Promise<{ success: boolean }> {
    try {
        await updateActivityStatus(activityId, 'rejected');
        return { success: true };
    } catch (error) {
        console.error(`Failed to reject activity ${activityId}:`, error);
        return { success: false };
    }
}

export async function getActivityByIdAction(activityId: string): Promise<(Activity & { author: AppUser }) | null> {
    const activity = await getActivityById(activityId);
    if (!activity) return null;
    const author = await getUserProfile(activity.userId);
    return { ...activity, author };
}

export async function getCheckInsForActivityAction(activityId: string): Promise<{ checkIn: AppCheckIn, author: AppUser }[]> {
    const checkIns = await getCheckInsForActivity(activityId);

    const checkInsWithAuthors = await Promise.all(
        checkIns.map(async (checkIn) => {
            const author = await getUserProfile(checkIn.userId);
            return { checkIn, author };
        })
    );

    return checkInsWithAuthors;
}

import { addCheckIn } from '@/lib/supabase/db';

// === Check-in Actions ===
export async function addCheckInAction(checkInData: AppCheckInData): Promise<{ success: boolean, checkInId?: string, message?: string }> {
    try {
        const checkInId = await addCheckIn(checkInData);
        return { success: true, checkInId };
    } catch (error: any) {
        console.error(`Failed to add check-in:`, error);
        return { success: false, message: error.message };
    }
}

export async function updateCheckInAction(
    checkInId: string, 
    userId: string, 
    data: { content: string; photoDataUri?: string; }
): Promise<{ success: boolean }> {
    try {
        await updateCheckIn(checkInId, userId, data);
        return { success: true };
    } catch (error) {
        console.error(`Failed to update check-in ${checkInId}:`, error);
        return { success: false };
    }
}

// === Monthly Report Actions ===
export async function saveMonthlyReportAction(reportData: Omit<MonthlyReport, 'id' | 'createdAt'>): Promise<{ success: boolean, reportId?: string }> {
    try {
        const reportId = await saveMonthlyReport(reportData);
        return { success: true, reportId };
    } catch (error) {
        console.error('Failed to save monthly report via action:', error);
        return { success: false };
    }
}

export async function getMonthlyReportAction(userId: string, year: number, month: number): Promise<MonthlyReport | null> {
    return await getMonthlyReport(userId, year, month);
}
