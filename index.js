const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://parkent.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Telegram Bot with POLLING (no webhook needed)
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
  polling: {
    interval: 10000, // 10 sekundda bir
    autoStart: false // Avtomatik boshlamaslik
  }
});

// Faqat internet bo'lganda pollingni boshlash
const startPolling = () => {
  telegramBot.startPolling().catch(err => {
    console.log('⚠️ Polling failed, will retry in 30 seconds:', err.message);
    setTimeout(startPolling, 30000);
  });
};

// 5 soniyadan keyin pollingni boshlash
setTimeout(startPolling, 5000);

// Handle /start command
telegramBot.onText(/\/start/, async (msg) => {
  try {
    const telegramId = msg.from.id;
    const chatId = msg.chat.id;
    const username = msg.from.username || '';
    const firstName = msg.from.first_name || '';

    console.log(`Processing /start for Telegram user ${telegramId} (${username || firstName})`);

    // Clean up old expired codes
    try {
      await supabase
        .from('telegram_auth_codes')
        .delete()
        .eq('telegram_id', telegramId)
        .lt('expires_at', new Date().toISOString());
    } catch (cleanupErr) {
      console.log('Cleanup error (ignored):', cleanupErr);
    }

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log(`Generating new code ${code} for user ${telegramId}`);

    // Save code to database
    const { error: insertError } = await supabase
      .from('telegram_auth_codes')
      .insert({
        telegram_id: telegramId,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error saving auth code:', JSON.stringify(insertError));
      
      await telegramBot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      return;
    }
    
    console.log(`Auth code ${code} saved to database for user ${telegramId}`);

    // Send message with code
    const displayName = username ? `@${username}` : (firstName || '');
    const message = [
      "� <b>Parkent Market ga xush kelibsiz!</b>",
      "",
      "Sizning kirish kodingiz:",
      `<code>${code}</code>`,
      "",
      "⏰ <i>Kod 5 daqiqa ichida amal qiladi.</i>",
      "📱 <i>Ushbu kodni nusxalab, saytga kiriting.</i>",
      "",
      displayName ? `👤 Foydalanuvchi: <b>${displayName}</b>` : "",
      "──────────────",
      "🌐 <a href=\"https://t.me/parkent_markent\">t.me/parkent_markent</a>"
    ].filter(Boolean).join("\n");

    await telegramBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log(`Auth code ${code} sent to Telegram user ${telegramId}`);
  } catch (error) {
    console.error('Bot error:', error);
  }
});

// Log polling errors
telegramBot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Telegram Auth verification endpoint
app.post('/api/telegram/auth', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    console.log(`Verifying auth code: ${code}`);
    console.log(`Current time: ${new Date().toISOString()}`);

    // Find valid auth code
    const { data: authCode, error: findError } = await supabase
      .from('telegram_auth_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Database query result:', { authCode, findError });

    if (findError) {
      console.error('Error finding auth code:', findError);
      throw findError;
    }

    if (!authCode) {
      console.log(`Code ${code} not found or expired`);
      return res.status(400).json({ error: 'Kod noto\'g\'ri yoki muddati o\'tgan' });
    }

    // Mark code as used
    await supabase
      .from('telegram_auth_codes')
      .update({ used: true })
      .eq('id', authCode.id);

    const telegramId = authCode.telegram_id;
    const email = `telegram_${telegramId}@parkent.market`;

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId;
    let accessToken;
    let refreshToken;

    if (existingUser) {
      // User exists, generate new session
      userId = existingUser.id;
      
      // Generate magic link token for existing user
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (signInError) throw signInError;

      // Sign in with the token
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: signInData.properties.hashed_token,
        type: 'magiclink',
      });

      if (sessionError) throw sessionError;

      accessToken = sessionData.session?.access_token || '';
      refreshToken = sessionData.session?.refresh_token || '';

      console.log(`Existing user logged in: ${userId}`);
    } else {
      // Create new user
      const password = require('crypto').randomUUID();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
        },
      });

      if (createError) throw createError;

      userId = newUser.user.id;

      // Create profile
      console.log(`Creating profile for user ${userId} with telegram_id ${telegramId}`);
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          telegram_id: telegramId,
        }, {
          // Use service role to bypass RLS
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log(`Profile created successfully for user ${userId}`);
      }

      // Create user role
      console.log(`Creating user role for user ${userId}`);
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'user',
        }, {
          // Use service role to bypass RLS
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        });

      if (roleError) {
        console.error('Error creating user role:', roleError);
      } else {
        console.log(`User role created successfully for user ${userId}`);
      }

      // Generate session for new user
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (signInError) throw signInError;

      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: signInData.properties.hashed_token,
        type: 'magiclink',
      });

      if (sessionError) throw sessionError;

      accessToken = sessionData.session?.access_token || '';
      refreshToken = sessionData.session?.refresh_token || '';

      console.log(`New user created: ${userId}`);
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: profile,
      is_new_user: !existingUser,
    });
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error.message || 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// Admin API endpoint
app.post('/api/admin', async (req, res) => {
  try {
    const { action, ...params } = req.body;
    
    // Admin tekshiruvi
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = req.headers.authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Admin rolini tekshirish
    console.log(`Checking admin role for user: ${user.id}`);
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    console.log('Role query result:', { roleData, roleError });
    
    if (roleError || roleData?.role !== 'admin') {
      console.log(`Access denied. User role: ${roleData?.role}, Error: ${roleError?.message}`);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('Admin access granted');
    console.log(`Admin API action: ${action}`, params);
    
    let result;
    
    switch (action) {
      case 'get_stats':
        const { count: listingsCount } = await supabase.from('listings').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: activeCount } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: premiumUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
        const { count: blockedUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_blocked', true);
        
        result = {
          total_listings: listingsCount || 0,
          total_users: usersCount || 0,
          pending_listings: pendingCount || 0,
          active_listings: activeCount || 0,
          premium_users: premiumUsersCount || 0,
          blocked_users: blockedUsersCount || 0,
        };
        console.log('Stats result:', result);
        break;
        
      case 'get_all_listings':
        const { data: listings } = await supabase
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Har bir listing uchun profile ma'lumotlarini alohida olish
        const listingsWithProfiles = await Promise.all(
          (listings || []).map(async (listing) => {
            console.log(`Processing listing ${listing.id}, user_id: ${listing.user_id}`);
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('display_name, telegram_id')
              .eq('user_id', listing.user_id)
              .single();
            
            console.log(`Profile for listing ${listing.id}:`, { profile, profileError });
            
            return {
              ...listing,
              profiles: profile
            };
          })
        );
        
        result = listingsWithProfiles;
        console.log(`All listings result: ${result.length} listings found`);
        break;
        
      case 'get_all_users':
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log(`Found ${users?.length || 0} profiles in database`);
        
        // Har bir user uchun qo'shimcha ma'lumotlarni olish
        const usersWithDetails = await Promise.all(
          (users || []).map(async (user) => {
            const { data: role } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.user_id)
              .single();
            
            return {
              ...user,
              user_roles: role ? [role] : null
            };
          })
        );
        
        result = usersWithDetails;
        console.log(`All users result: ${result.length} users found`);
        break;
        
      case 'get_categories':
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        result = categories || [];
        break;
        
      case 'get_partners':
        const { data: partners } = await supabase
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false });
        result = partners || [];
        break;
        
      case 'create_partner':
        const { data: newPartner, error: createPartnerError } = await supabase
          .from('partners')
          .insert({
            name: params.name,
            logo_url: params.logo_url || null,
            website_url: params.website_url || null,
            telegram_url: params.telegram_url || null,
            instagram_url: params.instagram_url || null,
            facebook_url: params.facebook_url || null,
            is_active: true,
            sort_order: 0
          })
          .select()
          .single();
        
        if (createPartnerError) throw createPartnerError;
        result = newPartner;
        break;
        
      case 'update_partner':
        const { data: updatedPartner, error: updatePartnerError } = await supabase
          .from('partners')
          .update({
            name: params.name,
            logo_url: params.logo_url || null,
            website_url: params.website_url || null,
            telegram_url: params.telegram_url || null,
            instagram_url: params.instagram_url || null,
            facebook_url: params.facebook_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.partner_id)
          .select()
          .single();
        
        if (updatePartnerError) throw updatePartnerError;
        result = updatedPartner;
        break;
        
      case 'delete_partner':
        await supabase
          .from('partners')
          .delete()
          .eq('id', params.partner_id);
        result = { success: true };
        break;
        
      case 'get_banners':
        const { data: banners } = await supabase
          .from('banners')
          .select('*')
          .order('created_at', { ascending: false });
        result = banners || [];
        break;
        
      case 'approve_listing':
        await supabase
          .from('listings')
          .update({ 
            status: 'active',
            expires_at: new Date(Date.now() + (params.days || 5) * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', params.listing_id);
        result = { success: true };
        break;
        
      case 'reject_listing':
        await supabase
          .from('listings')
          .update({ 
            status: 'rejected',
            rejection_reason: params.reason 
          })
          .eq('id', params.listing_id);
        result = { success: true };
        break;
        
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup expired listings endpoint
app.post('/api/cleanup-expired', async (req, res) => {
  try {
    // Admin tekshiruvi (agar kerak bo'lsa)
    // Bu endpoint har kuni ishga tushishi uchun ochiq qoldiramiz
    
    const { cleanupExpiredListings } = require('./cleanup-expired');
    const result = await cleanupExpiredListings();
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Self-ping mechanism for Render (keeps the server awake)
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  setInterval(() => {
    https.get(`${RENDER_EXTERNAL_URL}/api/health`, (res) => {
      console.log(`Self-ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Self-ping error:', err.message);
    });
  }, 10 * 60 * 1000); // Har 10 daqiqada
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Telegram Bot ready with POLLING`);
  console.log(`🔗 API endpoint: ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${PORT}/api/telegram/auth`);
  console.log(`✅ No webhook needed - works with localhost!`);
});
