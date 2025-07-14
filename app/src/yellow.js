const axios = require('axios');
const cheerio = require('cheerio');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

/**
 * Parses a Yellow Pages listing page.
 * @param {string} keyword - The search query.
 * @param {string} place - The place name.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of scraped business details.
 */
async function parseListing(keyword, place) {
    const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(keyword)}&geo_location_terms=${encodeURIComponent(place)}`;

    console.log(`Retrieving ${url}`);

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,ml;q=0.7',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Host': 'www.yellowpages.com',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36'
    };

    const MAX_RETRIES = 3;
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
            // Disable SSL verification for development/testing if necessary, but be cautious in production
            // If you encounter SSL errors, you might need to set process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            // Or configure axios with an HTTPS agent that ignores certs: httpsAgent: new https.Agent({ rejectUnauthorized: false })
            const response = await axios.get(url, {
                headers: headers,
                timeout: 10000, // 10 seconds timeout
                validateStatus: (status) => status >= 200 && status < 300 || status === 404 // Only throw error for non-2xx/404 statuses
            });

            console.log("Parsing page");

            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const scrapedResults = [];

                // Define selectors (equivalent to XPATHs in lxml)
                const SELECTORS = {
                    businessName: '.v-card .business-name',
                    businessPage: '.v-card .business-name', // We'll get href from here
                    telephone: '.v-card .phones.phone.primary',
                    address: '.v-card .info p[itemprop="address"]',
                    street: '.v-card .street-address',
                    locality: '.v-card .locality',
                    region: '.v-card span[itemprop="addressRegion"]',
                    zipCode: '.v-card span[itemprop="postalCode"]',
                    rank: '.v-card .info h2.n',
                    categories: '.v-card .info-section .categories',
                    website: '.v-card .info-section .links a.website',
                    rating: '.v-card .info-section .result-rating span'
                };

                $('.search-results.organic .v-card').each((i, el) => {
                    const businessName = $(el).find(SELECTORS.businessName).text().trim() || null;
                    const businessPage = $(el).find(SELECTORS.businessPage).attr('href') ? `https://www.yellowpages.com${$(el).find(SELECTORS.businessPage).attr('href')}` : null;
                    const telephone = $(el).find(SELECTORS.telephone).text().trim() || null;
                    const rank = $(el).find(SELECTORS.rank).text().replace('.\xA0', '').trim() || null;
                    const category = $(el).find(SELECTORS.categories).text().trim() || null;
                    const website = $(el).find(SELECTORS.website).attr('href') || null;
                    const rating = $(el).find(SELECTORS.rating).text().replace(/[()]/g, '').trim() || null;

                    const street = $(el).find(SELECTORS.street).text().trim() || null;
                    const localityRaw = $(el).find(SELECTORS.locality).text().replace(/,\s*\xA0/g, ', ').trim() || null;

                    let locality = null;
                    let region = $(el).find(SELECTORS.region).text().trim() || null; // Often available directly
                    let zipcode = $(el).find(SELECTORS.zipCode).text().trim() || null; // Often available directly

                    // Fallback for locality, region, zipcode parsing if direct selectors fail or are not granular enough
                    if (localityRaw && (!region || !zipcode)) {
                        const addressText = $(el).find(SELECTORS.address).text().trim();
                        const match = addressText.match(/(.*?), ([A-Z]{2}) (\d{5}(?:-\d{4})?)$/);
                        if (match) {
                            locality = match[1].trim();
                            region = match[2].trim();
                            zipcode = match[3].trim();
                        } else {
                            // If regex fails, try splitting the locality string more robustly
                            const parts = localityRaw.split(',').map(p => p.trim());
                            if (parts.length > 0) locality = parts[0];
                            if (parts.length > 1) {
                                const remainingParts = parts[1].split(' ').map(p => p.trim()).filter(p => p.length > 0);
                                if (remainingParts.length > 0) region = remainingParts[0];
                                if (remainingParts.length > 1) zipcode = remainingParts[1];
                            }
                        }
                    } else if (localityRaw) {
                        // If region and zipcode are found directly, just use localityRaw as is for locality
                        const parts = localityRaw.split(',').map(p => p.trim());
                        if (parts.length > 0) locality = parts[0];
                    }


                    scrapedResults.push({
                        business_name: businessName,
                        telephone: telephone,
                        business_page: businessPage,
                        rank: rank,
                        category: category,
                        website: website,
                        rating: rating,
                        street: street,
                        locality: locality,
                        region: region,
                        zipcode: zipcode,
                        listing_url: response.config.url // Original URL requested
                    });
                });
                return scrapedResults;

            } else if (response.status === 404) {
                console.log(`Could not find a location matching ${place}. No need to retry.`);
                return []; // No data for 404
            }
        } catch (error) {
            if (error.response) {
                console.error(`Request failed with status ${error.response.status} (retry ${retry + 1}/${MAX_RETRIES}): ${error.message}`);
            } else if (error.request) {
                console.error(`No response received (retry ${retry + 1}/${MAX_RETRIES}): ${error.message}`);
            } else {
                console.error(`Error during parsing (retry ${retry + 1}/${MAX_RETRIES}): ${error.message}`);
            }
            // Add a small delay before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    console.error("Failed to retrieve or parse page after multiple retries.");
    return [];
}

/**
 * Writes data to a CSV file.
 * @param {string} filename - The name of the CSV file.
 * @param {Array<Object>} data - The array of data to write.
 */
function writeCsv(filename, data) {
    if (!data || data.length === 0) {
        console.log("No data to write to CSV.");
        return;
    }

    const fieldnames = [
        'rank', 'business_name', 'telephone', 'business_page', 'category', 'website',
        'rating', 'street', 'locality', 'region', 'zipcode', 'listing_url'
    ];
    const header = fieldnames.join(',');
    const rows = data.map(row => fieldnames.map(field => {
        let value = row[field];
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes for CSV
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
    }).join(','));

    const csvContent = `${header}\n${rows.join('\n')}`;

    fs.writeFileSync(filename, csvContent, { encoding: 'utf8' });
    console.log(`Writing scraped data to ${filename}`);
}

// Main execution block
(async () => {
    const argv = yargs
        .scriptName("yellowpages-scraper")
        .usage('$0 <keyword> <place>', 'Scrape Yellow Pages listings.', (yargs) => {
            yargs.positional('keyword', {
                describe: 'Search Keyword (e.g., "restaurants")',
                type: 'string',
                demandOption: true
            })
            .positional('place', {
                describe: 'Place Name (e.g., "New York, NY")',
                type: 'string',
                demandOption: true
            });
        })
        .help()
        .argv;

    const keyword = argv.keyword;
    const place = argv.place;

    const scrapedData = await parseListing(keyword, place);

    if (scrapedData && scrapedData.length > 0) {
        const filename = `${keyword.replace(/\s/g, '-')}-${place.replace(/\s/g, '-')}-yellowpages-scraped-data.csv`;
        writeCsv(filename, scrapedData);
    } else {
        console.log("No data scraped.");
    }
})();
