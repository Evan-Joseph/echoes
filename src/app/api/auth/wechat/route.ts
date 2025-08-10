import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// This is the admin client, using the service role key
// It will be used for all admin-level operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This is the regular client, using the anon key
// It will be used for signing in, as the admin client cannot create sessions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { openId, nickName, avatarUrl } = await request.json();

    if (!openId || !nickName) {
      return NextResponse.json(
        { error: 'openId and nickName are required' },
        { status: 400 }
      );
    }

    // NOTE: The database schema has a table named `users`. It will be renamed to `profiles`.
    // This code assumes the table is already named `profiles`.
    // I will also add an `openid` column to it in a later step.

    let userId: string;
    let userEmail: string;

    // 1. Check if user with openId already exists in our public profiles table
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles') // Assuming table is renamed to 'profiles'
      .select('id, user_email')
      .eq('openid', openId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // 'PGRST116' means no rows found
      throw new Error(`Error querying profile: ${profileError.message}`);
    }

    if (existingProfile) {
      // 2a. User exists, get their ID and update profile
      userId = existingProfile.id;
      userEmail = existingProfile.user_email;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          displayName: nickName,
          photoURL: avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Error updating profile: ${updateError.message}`);
      }
    } else {
      // 2b. User does not exist, create a new one in auth.users
      userEmail = `${openId}@wechat.user`; // Create a dummy email

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true, // Auto-confirm email
        });

      if (createError) {
        // If we are here, it means the user might exist in auth.users but not in our profiles table with an openid.
        // This indicates a data inconsistency. For now, we will throw an error.
        // A more robust solution might involve trying to link the accounts, but that's out of scope.
        throw new Error(
          `Error creating user: ${createError.message}. It's possible this user already exists.`
        );
      }

      userId = newUser.user.id;

      // The `handle_new_user` trigger should have created a profile row.
      // Now, update it with the WeChat-specific info.
      const { error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          openid: openId,
          displayName: nickName,
          photoURL: avatarUrl,
          user_email: userEmail, // Add email to profile for future lookups
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (newProfileError) {
        throw new Error(
          `Failed to update new profile with openid: ${newProfileError.message}`
        );
      }
    }

    // 3. Create a session for the user by using a temporary password
    const tempPassword = uuidv4();
    const { error: updateUserError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });

    if (updateUserError) {
      throw new Error(
        `Failed to set temporary password: ${updateUserError.message}`
      );
    }

    const { data: sessionData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: userEmail,
        password: tempPassword,
      });

    if (signInError) {
      throw new Error(`Sign-in failed: ${signInError.message}`);
    }

    if (!sessionData.session) {
      throw new Error('Sign-in did not return a session.');
    }

    return NextResponse.json({ session: sessionData.session });
  } catch (error: any) {
    console.error('WeChat Auth Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
