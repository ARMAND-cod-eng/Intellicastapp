/**
 * Simple test script to fetch and display news
 */

import fetch from 'node-fetch';

async function testFetch() {
  try {
    console.log('Testing network connectivity...');

    const response = await fetch('https://httpbin.org/get', { timeout: 5000 });
    console.log('✅ Network is working');

    console.log('Testing RSS feed...');
    const rssResponse = await fetch('https://feeds.bbci.co.uk/news/rss.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (rssResponse.ok) {
      const xml = await rssResponse.text();
      console.log('✅ RSS feed fetch successful');
      console.log(`📊 RSS content length: ${xml.length} characters`);

      // Count items
      const itemCount = (xml.match(/<item>/g) || []).length;
      console.log(`📰 Found ${itemCount} articles in RSS feed`);
    } else {
      console.log(`❌ RSS fetch failed: ${rssResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFetch();