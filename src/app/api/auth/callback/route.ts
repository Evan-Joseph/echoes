import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { code, nickName, avatarUrl } = await request.json();

    if (!code || !nickName) {
      return NextResponse.json(
        { error: 'code, nickName are required' },
        { status: 400 }
      );
    }

    const { WECHAT_APPID, WECHAT_APPSECRET, SUPABASE_JWT_SECRET } = process.env;

    if (!WECHAT_APPID || !WECHAT_APPSECRET || !SUPABASE_JWT_SECRET) {
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
      const dummyEmail = `${openid}@wechat.user`;
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
        // Handle potential race condition or existing email
        if (createError.message.includes('already exists')) {
          return NextResponse.json(
            { error: 'User with this email already exists.' },
            { status: 409 }
          );
        }
        throw new Error(`Error creating user: ${createError.message}`);
      }

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

    // 3. Create a custom JWT
    const payload = {
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      session_id: user.id, // A simple session id
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
    };

    const accessToken = jwt.sign(payload, SUPABASE_JWT_SECRET);

    // 4. Return the session and user data
    return NextResponse.json({
      session: {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
      },
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
