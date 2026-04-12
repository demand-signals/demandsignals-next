# Research Data Directory

Agent research results are stored here as JSON files. Each file enriches one or more
prospects with validated data from web research.

## File Format

Each JSON file is either a single object or an array of objects with this structure:

```json
{
  "business_name": "Exact Name",
  "city": "City Name",
  "research_data": {
    "website": {
      "url": "https://...",
      "platform": "wordpress|wix|squarespace|godaddy|custom|none",
      "ssl_valid": true,
      "mobile_friendly": false,
      "issues": ["no_ssl", "dated_design"]
    },
    "social": {
      "facebook": "https://facebook.com/...",
      "instagram": "https://instagram.com/...",
      "google_business": true,
      "yelp": "https://yelp.com/biz/...",
      "nextdoor": false
    },
    "reviews": {
      "google": { "rating": 4.8, "count": 156 },
      "yelp": { "rating": 4.5, "count": 200 },
      "other": [{ "platform": "Carwise", "rating": 4.9, "count": 1206 }]
    },
    "opportunities": ["website_redesign", "local_seo", "social_media"],
    "deal_estimate": "$5K-$15K",
    "pitch_angle": "Your broken contact form is losing patients"
  },
  "google_rating": 4.8,
  "google_review_count": 156,
  "website_url": "https://..."
}
```

## How to Use

1. Run agents that write research JSON files here
2. Run `node data/build-prospects.mjs` to merge into prospects-import.json
3. Import via /admin/import

Files persist across sessions. Agent research is never lost.
