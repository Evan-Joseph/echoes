
'use client';

import type { ReactNode } from 'react';
import type { User } from '@/lib/firebase/auth';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: ReactNode;
  contentForDb?: string; // Optional: plain text version of content for DB
  timestamp: string; // ISO String for serialization
  status?: 'pending' | 'failed';
  data?: any; // To store data for retry logic, or tool call data
  userId: string; 
}

export interface Activity {
    id: string;
    title: string;
    description: string;
    category: '个人成长' | '技能提升' | '身心健康' | '其他';
    status: 'pending' | 'approved' | 'rejected';
    userId: string; // Creator's ID
    coverImageUrl: string;
    participants: string[]; // Array of user IDs who joined
    createdAt: string; // ISO String for serialization
    updatedAt?: string; // ISO String for serialization
}

export interface ActivityWithAuthor extends Activity {
    author: AppUser;
}


export interface AppCheckIn {
    id: string;
    userId: string;
    content: string;
    isPublic: boolean;
    photoUrl?: string;
    likedBy: string[];
    commentsCount: number; // Ensure this is always a number
    createdAt: string; // Changed to string for serialization
    updatedAt?: string; // ISO String for serialization
    activityId?: string; // NEW: Link to an activity
    activityTitle?: string; // NEW: Denormalized for easier display
}

export interface AppComment {
    id: string;
    checkInId: string;
    userId: string;
    content: string;
    createdAt: string; // ISO string
}

export interface CommentWithAuthor extends AppComment {
    author: AppUser;
}

// This is the public-facing user profile, stored in /users/{uid}
export interface AppUser {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string; // ISO String for serialization
    updatedAt?: string; // ISO String for serialization
}

// This is the user object from our local auth, which is mostly private
export type AuthUser = User;

// Type for a report document
export interface Report {
    id: string;
    checkInId: string;
    reportedByUserId: string;
    status: 'pending' | 'resolved';
    createdAt: string;
}

// Type for a monthly AI-generated report document
export interface MonthlyReport {
    id: string;
    userId: string;
    year: number;
    month: number; // 1-12
    summary: string;
    highlights: string[];
    suggestions: string[];
    createdAt: string; // ISO String
}
