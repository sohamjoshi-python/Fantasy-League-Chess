import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugMarketplace() {
  try {
    console.log('🔍 Debugging marketplace table...\n');

    // Check total marketplace records (including sold ones)
    const { data: allMarketplace, error: allError } = await supabase
      .from('player_marketplace')
      .select('*');

    if (allError) {
      throw new Error(`Failed to fetch all marketplace: ${allError.message}`);
    }

    console.log(`📊 Total marketplace records: ${allMarketplace.length}`);

    // Check active listings (not sold)
    const { data: activeListings, error: activeError } = await supabase
      .from('player_marketplace')
      .select('*')
      .is('sold_at', null);

    if (activeError) {
      throw new Error(`Failed to fetch active listings: ${activeError.message}`);
    }

    console.log(`🛒 Active listings (sold_at IS NULL): ${activeListings.length}`);

    // Check sold listings
    const { data: soldListings, error: soldError } = await supabase
      .from('player_marketplace')
      .select('*')
      .not('sold_at', 'is', null);

    if (soldError) {
      throw new Error(`Failed to fetch sold listings: ${soldError.message}`);
    }

    console.log(`💰 Sold listings (sold_at IS NOT NULL): ${soldListings.length}`);

    // Show some sample records
    if (allMarketplace.length > 0) {
      console.log('\n📋 Sample marketplace records:');
      allMarketplace.slice(0, 5).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.player_username} (ELO: ${record.player_elo}) - ${record.price} coins`);
        console.log(`     Sold: ${record.sold_at ? 'Yes' : 'No'}`);
        console.log(`     Created: ${record.created_at}`);
        console.log(`     ID: ${record.id}`);
        console.log('');
      });
    }

    // Check if there are any records with null player_username
    const { data: nullUsernames, error: nullError } = await supabase
      .from('player_marketplace')
      .select('*')
      .is('player_username', null);

    if (nullError) {
      console.error('Error checking null usernames:', nullError);
    } else {
      console.log(`⚠️ Records with null username: ${nullUsernames.length}`);
    }

    // Check for duplicate usernames
    const usernames = allMarketplace.map(r => r.player_username).filter(Boolean);
    const uniqueUsernames = new Set(usernames);
    console.log(`🔄 Unique usernames: ${uniqueUsernames.size} out of ${usernames.length} total`);

  } catch (error) {
    console.error('Error debugging marketplace:', error);
    process.exit(1);
  }
}

// Run the debug
debugMarketplace(); 