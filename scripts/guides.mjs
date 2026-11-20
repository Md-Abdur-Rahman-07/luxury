import { readFileSync } from 'node:fs';

// Keep the original destination catalogue, including user edits, as the source.
const catalogue = JSON.parse(readFileSync(new URL('../data/venues.json', import.meta.url), 'utf8'));
const venueById = new Map(catalogue.map(venue => [venue.id, venue]));

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const plainText = (value = '') => String(value).replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Brief, evergreen introductions; schedules, menus and prices stay with venues.
const summaries = {
  1: 'A vineyard estate in Fredericksburg, with a tasting room overlooking the vines.',
  2: 'Tuscan-inspired surroundings and a courtyard setting for a Hill Country tasting.',
  3: 'A family-owned vineyard for a more intimate stop along the wine trail.',
  4: 'A Fredericksburg vineyard with a historic stone barn and lavender gardens.',
  5: 'A tasting-room stop exploring wines from the Texas High Plains.',
  6: 'A winery and resort in Johnson City for a longer Hill Country escape.',
  7: 'Courtyards, vineyards and an Italian-inspired setting outside Fredericksburg.',
  8: 'An introduction to sparkling wine in a contemporary tasting-room setting.',
  9: 'A collaborative tasting room bringing several Texas wine producers together.',
  10: 'A wine-country stop to consider for your Fredericksburg itinerary.',
  11: 'A South Austin barbecue destination with a creative approach to smoked meats.',
  12: 'Biscuit sandwiches and a relaxed stop for breakfast or lunch.',
  13: 'Mexican street-food flavors on Austin’s East Side.',
  14: 'Smoked meats and Southern-style sides from an Austin barbecue spot.',
  15: 'A cottage setting for a meal in the Clarksville neighborhood.',
  16: 'Northern Mexican discada, prepared on a traditional large disc grill.',
  17: 'A Manor Road smokehouse and delicatessen with a focus on Texas ingredients.',
  18: 'Breakfast tacos and Mexican comfort food on East Cesar Chavez Street.',
  19: 'A coffee-roasting destination for a slower start on East Cesar Chavez Street.',
  20: 'A restaurant in a restored historic building on East 11th Street.',
  21: 'Japanese ramen and richly flavored bowls in North Austin.',
  22: 'A North Austin brewery close to the Q2 Stadium area.',
  23: 'A Del Valle brewery with a focus on German-style beers.',
  24: 'A South Austin brewing destination with space to gather outdoors.',
  25: 'A neighborhood brewery on Manor Road with a relaxed, retro setting.',
  26: 'Pizza and craft beer for a casual stop on Burnet Road.',
  27: 'A Hill Country brewery stop on Hamilton Pool Road in Dripping Springs.',
  28: 'An established North Austin brewery on Industrial Terrace.',
  29: 'A Spicewood brewery to consider for a day outside the city.',
  30: 'A brewery in the St. Elmo district, with a patio setting.',
  31: 'A spacious brewery stop in Southeast Austin.',
  32: 'A Driftwood destination for a slower-paced Hill Country afternoon.',
  33: 'A farmhouse brewery set in the countryside west of Austin.',
  39: 'An East Side neighborhood bar with cocktails and a relaxed atmosphere.',
  40: 'A downtown cocktail bar with an intimate, industrial-inspired setting.',
  41: 'A retro neighborhood bar in the South Shore area.',
  42: 'A South Austin gathering place with a spacious outdoor setting.',
  43: 'A tucked-away downtown cocktail destination on Brazos Street.',
  44: 'An East Side music and dance destination on Comal Street.',
  45: 'A tucked-away downtown cocktail bar on East 7th Street.',
  46: 'An East Austin cocktail bar on East 6th Street.',
  47: 'A casual Austin pub to add to an unhurried evening.',
  48: 'A Red River District venue with indoor and outdoor stages.',
  49: 'An Australian-inspired restaurant on South Congress Avenue.',
};

const configurations = [
  {
    file: 'winery.html', label: 'Wine country', title: 'Hill Country Winery Guide & Private Tours | Luxury',
    description: 'Discover Fredericksburg wineries and Texas Hill Country vineyards. Explore the Luxury destination guide and plan a private wine-country journey.',
    heading: 'A taste of the<br><em>Hill Country.</em>', kicker: 'The destination edit · Wine country',
    intro: 'Vineyard views. Unhurried tastings. A road that takes the scenic route. Explore our wine-country edit, then make the day your own.',
    heroVenueId: 1, ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], noun: 'wineries',
    planningHeading: 'Leave room to linger.',
    planningIntro: 'A memorable wine-country day needs a little space between stops. Begin with the places that interest you most, then build a route around your pace.',
    tips: [
      ['Choose your tastings', 'Contact each vineyard about reservations, group sizes and the experience you have in mind.'],
      ['Consider the distance', 'Hill Country destinations are spread out. Share your preferred stops so travel time can be part of the plan.'],
      ['Plan the return', 'Arrange your pickup and return journey in advance, so the last tasting feels as relaxed as the first.'],
    ],
  },
  {
    file: 'food.html', label: 'Dining', title: 'Austin Dining Guide & Private Transportation | Luxury',
    description: 'Explore Austin restaurants, barbecue and neighborhood dining with the Luxury destination guide. Build your own dining itinerary with private transportation.',
    heading: 'Good taste.<br><em>Great company.</em>', kicker: 'The destination edit · Dining',
    intro: 'From slow-smoked barbecue to a table worth lingering over, Austin tells its story through food. Find a place that fits your appetite and your occasion.',
    heroVenueId: 11, ids: [11, 14, 17, 12, 13, 49, 15, 16, 18, 19, 20, 21], noun: 'dining spots',
    planningHeading: 'Make an occasion of it.',
    planningIntro: 'A favorite neighborhood, a long lunch or a special dinner. Start with the table, then let the rest of your day fall into place.',
    tips: [
      ['Reserve your table', 'Confirm dining availability, menus and any dietary requirements directly with the restaurant.'],
      ['Set the pace', 'Allow time to arrive, settle in and enjoy your meal before moving to the next part of the day.'],
      ['Connect the evening', 'Pair dinner with an evening out and coordinate your pickup around your final plans.'],
    ],
  },
  {
    file: 'brewery.html', label: 'Craft breweries', title: 'Austin Craft Brewery Guide & Private Tours | Luxury',
    description: 'Explore Austin craft breweries and Hill Country taprooms with the Luxury destination guide. Plan a relaxed brewery itinerary and private group transportation.',
    heading: 'Crafted locally.<br><em>Enjoyed slowly.</em>', kicker: 'The destination edit · Craft breweries',
    intro: 'Neighborhood taprooms, countryside patios and a character all their own. Discover a different side of Austin, one thoughtfully chosen stop at a time.',
    heroVenueId: 23, ids: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33], noun: 'breweries',
    planningHeading: 'Your afternoon, on tap.',
    planningIntro: 'Keep the route relaxed and the group together. A few well-chosen stops can make more of an afternoon than a packed itinerary.',
    tips: [
      ['Find your setting', 'Choose a neighborhood taproom or head into the Hill Country. Check each venue’s current offerings before visiting.'],
      ['Plan for the group', 'Ask the brewery about group arrangements, food options and any access requirements in advance.'],
      ['Travel together', 'Share your preferred pickup, stops and return time so the journey feels part of the day.'],
    ],
  },
  {
    file: 'night-life.html', label: 'After dark', title: 'Austin Nightlife Guide & Evening Transportation | Luxury',
    description: 'Discover Austin cocktail bars, neighborhood favorites and music venues in the Luxury nightlife guide. Plan your evening with private transportation.',
    heading: 'The city,<br><em>after hours.</em>', kicker: 'The destination edit · After dark',
    intro: 'A beautifully made cocktail. A familiar song. One more place you have been meaning to discover. Let the evening unfold at your own pace.',
    heroVenueId: 40, ids: [39, 40, 41, 42, 43, 44, 45, 46, 47, 48], noun: 'evening destinations',
    planningHeading: 'A considered night out.',
    planningIntro: 'From a quiet first drink to the final song, a little planning keeps the focus on the evening ahead.',
    tips: [
      ['Check before you go', 'Confirm opening times, reservations, admission requirements and live-music schedules with each venue.'],
      ['Keep plans connected', 'Choose stops that work together and allow time for the journey between neighborhoods.'],
      ['Arrange the way home', 'Decide your final pickup location and return journey before the evening begins.'],
    ],
  },
];

function venueCard(item) {
  const summary = summaries[item.id] || 'Explore this destination and make it part of your next Austin experience.';
  const name = plainText(item.name);
  const id = `venue-${item.id}`;
  const website = /^https?:\/\//i.test(item.website || '') ? item.website : '';
  const phone = String(item.phone || '').replace(/[^\d+]/g, '');
  const notes = plainText(item.description);
  const venueImage = item.image;
  return `<article class="venue-card" data-search="${escapeHtml(`${name} ${item.address || ''} ${summary}`.toLowerCase())}" aria-labelledby="${id}-title">
    <div class="venue-image"><img src="${escapeHtml(venueImage)}" alt="${escapeHtml(name)} destination in Texas" width="720" height="500" loading="lazy" decoding="async"></div>
    <div class="venue-body">
      <h3 id="${id}-title">${escapeHtml(name)}</h3>
      <p class="venue-summary">${escapeHtml(summary)}</p>
      <p class="venue-address">${escapeHtml(item.address)}</p>
      <div class="venue-actions">
        <button class="text-link" type="button" data-venue-open="${id}" aria-haspopup="dialog" hidden>View details</button>
        ${website ? `<a class="text-link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(name)} website (opens in a new tab)">Visit website</a>` : ''}
      </div>
    </div>
    <template id="${id}">
      <div class="venue-dialog-image"><img src="${escapeHtml(venueImage)}" alt="${escapeHtml(name)}" width="900" height="600" loading="lazy" decoding="async"></div>
      <div class="venue-dialog-content">
        <p class="eyebrow">The destination edit</p>
        <h2 id="venue-dialog-title">${escapeHtml(name)}</h2>
        <p class="venue-address">${escapeHtml(item.address)}</p>
        <p class="venue-detail">${escapeHtml(notes)}</p>
        <p class="venue-meta">These venue notes are a starting point for planning. Confirm current details, opening times and reservations directly with the venue before you travel.</p>
        <div class="venue-actions">
          ${website ? `<a class="button button-dark" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Visit website</a>` : ''}
          ${phone ? `<a class="text-link" href="tel:${escapeHtml(phone)}">Call venue</a>` : ''}
          <a class="text-link" href="contact.html?service=private-tour#inquiry">Plan my journey</a>
        </div>
      </div>
    </template>
  </article>`;
}

export const guidePages = configurations.map(configuration => {
  const venues = configuration.ids.map(id => venueById.get(id));
  if (venues.some(item => !item)) throw new Error(`Missing destination in ${configuration.file}`);
  return {
    file: configuration.file,
    title: configuration.title,
    description: configuration.description,
    active: 'experiences',
    guide: true,
    heroImage: venueById.get(configuration.heroVenueId).image,
    body: `
      <section class="guide-hero section">
        <div class="container">
          <p class="eyebrow">${escapeHtml(configuration.kicker)}</p>
          <h1>${configuration.heading}</h1>
          <p class="guide-intro">${escapeHtml(configuration.intro)}</p>
        </div>
      </section>
      <div class="container">
        <nav class="guide-tabs" aria-label="Destination guides">
          ${configurations.map(guide => `<a href="${guide.file}"${guide.file === configuration.file ? ' aria-current="page"' : ''}>${guide.label}</a>`).join('\n          ')}
        </nav>
      </div>
      <section class="section guide-list" aria-labelledby="destinations-heading">
        <div class="container">
          <div class="guide-toolbar">
            <div><p class="eyebrow">Places to know</p><h2 class="section-heading" id="destinations-heading">The ${escapeHtml(configuration.label.toLowerCase())} edit.</h2></div>
            <div class="guide-search" hidden>
              <label for="venue-search">Find a destination</label>
              <input class="search-input" id="venue-search" type="search" placeholder="Search by name or location" autocomplete="off" aria-controls="destination-grid">
            </div>
          </div>
          <p class="filter-status" role="status" aria-live="polite" aria-atomic="true" data-noun="${configuration.noun}">${venues.length} ${configuration.noun} to explore</p>
          <div class="guide-grid" id="destination-grid">${venues.map(venueCard).join('\n')}</div>
          <div class="guide-no-results" hidden><h3>No destinations found.</h3><p>Try a different name or location, or clear your search to explore the full edit.</p><button class="text-link" type="button" data-clear-search>Clear search</button></div>
          <p class="guide-disclaimer">An independent destination guide. Venue information may change; please confirm details and availability directly before visiting. Venue reservations and admission are arranged separately from transportation.</p>
        </div>
      </section>
      <section class="section guide-planning" aria-labelledby="planning-heading">
        <div class="container">
          <div class="guide-planning-intro"><p class="eyebrow">A little foresight. A better experience.</p><h2 class="section-heading" id="planning-heading">${configuration.planningHeading}</h2><p>${escapeHtml(configuration.planningIntro)}</p></div>
          <div class="guide-planning-grid">${configuration.tips.map(([heading, text]) => `<div><h3>${heading}</h3><p>${escapeHtml(text)}</p></div>`).join('')}</div>
        </div>
      </section>
      <section class="section guide-cta">
        <div class="container"><p class="eyebrow">Your plans. Thoughtfully connected.</p><h2 class="section-heading">Make the journey<br><em>part of the experience.</em></h2><p>Tell us where you would like to go, who is coming along and what a perfect day looks like to you.</p><a class="button button-dark" href="contact.html?service=private-tour#inquiry">Plan a private journey</a></div>
      </section>
      <dialog class="venue-dialog" aria-labelledby="venue-dialog-title">
        <button class="dialog-close" type="button" aria-label="Close venue details" autofocus><span aria-hidden="true">×</span></button>
        <div data-venue-content></div>
      </dialog>`,
  };
});
