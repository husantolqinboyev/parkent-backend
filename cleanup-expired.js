// Cleanup expired listings - Supabase Functions o'rniga
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cleanupExpiredListings = async () => {
  try {
    console.log('🧹 Starting cleanup of expired listings...');

    // Expired bo'lgan listinglarni topish
    const { data: expiredListings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching expired listings:', error);
      throw error;
    }

    if (!expiredListings || expiredListings.length === 0) {
      console.log('✅ No expired listings found');
      return { cleaned: 0 };
    }

    // Expired listinglarni update qilish
    const { error: updateError } = await supabase
      .from('listings')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredListings.map(l => l.id));

    if (updateError) {
      console.error('Error updating expired listings:', updateError);
      throw updateError;
    }

    console.log(`✅ Cleaned up ${expiredListings.length} expired listings`);
    return { cleaned: expiredListings.length };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
};

// Agar bu fayl to'g'ridan-to'g'ri chaqirilsa
if (require.main === module) {
  cleanupExpiredListings()
    .then(result => {
      console.log('Cleanup completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredListings };
