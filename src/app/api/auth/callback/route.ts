import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { code, nickName, avatarUrl } = await request.json();

    if (!code || !nickName) {
      return NextResponse.json(
        { error: 'code, nickName are required' },
        { status: 400 }
      );
    }

    const { WECHAT_APPID, WECHAT_APPSECRET } = process.env;

    if (!WECHAT_APPID || !WECHAT_APPSECRET) {
      console.error('Missing required environment variables for WeChat auth');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    // 1. Exchange code for openid with WeChat server
    const wechatResponse = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}&js_code=${code}&grant_type=authorization_code`
    );
    const wechatData = await wechatResponse.json();

    if (wechatData.errcode) {
      console.error('WeChat API Error:', wechatData);
      return NextResponse.json(
        { error: `WeChat login error: ${wechatData.errmsg}` },
        { status: 401 }
      );
    }

    const { openid, unionid, session_key } = wechatData;

    let user;
    let profile;

    // 2. Find or create user in Supabase
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('openid', openid)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Error querying profile: ${profileError.message}`);
    }

    const dummyEmail = `${openid}@wechat.user`;

    if (existingProfile) {
      // User exists, update their profile info
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          displayName: nickName,
          photoURL: avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      profile = updatedProfile;
      // We need the full user object from auth.users for JWT signing
      const { data: authUser, error: authUserError } =
        await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (authUserError) throw authUserError;
      user = authUser.user;
    } else {
      // User does not exist, create a new one
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: dummyEmail,
          email_confirm: true,
          user_metadata: {
            name: nickName,
            avatar_url: avatarUrl,
          },
        });

      if (createError) {
        if (createError.message.includes('already exists')) {
          // Race condition: another request created the user.
          // Ask client to retry. The next attempt will find the user in the 'profiles' table.
          return NextResponse.json(
            { error: 'Login conflict. Please try again.' },
            { status: 409 }
          );
        }
        // For other creation errors, throw.
        throw new Error(`Error creating user: ${createError.message}`);
      }

      // If creation was successful
      user = newUser.user;

      // The handle_new_user trigger creates the profile. Update it with WeChat info.
      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          openid: openid,
          displayName: nickName,
          photoURL: avatarUrl,
          user_email: dummyEmail,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (newProfileError) {
        throw new Error(
          `Failed to update new profile: ${newProfileError.message}`
        );
      }
      profile = newProfile;
    }

    // 3. Generate a magic link for the user
    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: dummyEmail,
        options: {
          redirectTo: '/', // The page to redirect to after successful login
        },
      });

    if (magicLinkError) {
      throw new Error(`Error generating magic link: ${magicLinkError.message}`);
    }

    const { properties, ...rest } = magicLinkData;
    const token = properties?.action_link.split('token=')[1].split('&')[0];

    if (!token) {
      throw new Error('Could not extract token from magic link.');
    }

    // 4. Return the token and user profile to the client
    return NextResponse.json({
      token: token,
      email: dummyEmail,
      user: profile,
    });
  } catch (error: any) {
    console.error('Auth Callback Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
