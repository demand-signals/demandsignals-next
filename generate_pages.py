#!/usr/bin/env python3
"""Generate all remaining service pages from data definitions."""
import os, json, textwrap

BASE = "/home/claude/demandsignals-next/src/app"

# Each page definition: (path, metadata, page_props)
PAGES = [
  # ─── DEMAND GENERATION ──────────────────────────────────
  {
    "path": "demand-generation/geo-targeting",
    "meta_title": "Geo-Targeting — Hyper-Local Demand Generation | Demand Signals",
    "meta_desc": "Hyper-local targeting across counties, cities, and neighborhoods. Programmatic location pages that rank for every service × city combination in your territory.",
    "meta_path": "/demand-generation/geo-targeting",
    "keywords": ["geo-targeting", "hyper-local marketing", "location-based SEO", "programmatic local pages", "city service pages"],
    "eyebrow": "Geo-Targeting",
    "title_orange": "Geo-Targeting",
    "title_teal": "Own Every Zip Code.",
    "subtitle": "Programmatic location pages that rank for every service × city combination in your territory. AI builds them, AI maintains them, AI optimizes them.",
    "cta_label": "Target My Territory →",
    "callout": "We built 93 geo-targeted pages for SB Construction — they now rank #1 for 40+ local search terms across El Dorado County.",
    "breadcrumb_parent": "Demand Generation",
    "breadcrumb_parent_path": "/demand-generation",
    "schema_name": "Geo-Targeting Services",
    "schema_desc": "Hyper-local geo-targeting with programmatic city × service pages for local market domination.",
    "features_heading": "How Geo-Targeting Works",
    "features": [
      {"icon": "🗺️", "title": "County × City × Service Pages", "desc": "Programmatic pages for every combination — a plumber serving 10 cities with 5 services gets 50+ unique, optimized pages automatically."},
      {"icon": "📍", "title": "Service Area Targeting", "desc": "Define your exact service territory — down to neighborhoods. Every page includes location-specific content, landmarks, and local references."},
      {"icon": "📊", "title": "Local Intent Matching", "desc": "AI identifies which city × service combinations have real search demand, so we build pages where buyers are actually looking."},
      {"icon": "🔗", "title": "Internal Link Architecture", "desc": "County pages link to cities. City pages link to services. Service pages link to longtails. A structured hierarchy that search engines and AI understand."},
      {"icon": "📝", "title": "Unique Content Per Page", "desc": "Every location page has unique content — not templates with city names swapped. AI generates location-specific FAQs, descriptions, and service details."},
      {"icon": "📈", "title": "Compound Growth", "desc": "Each new page strengthens the domain's topical authority. 50 pages today become 100 next quarter — all building on each other."},
    ],
    "ai_callout_heading": "93 pages. 40+ #1 rankings. One AI system.",
    "ai_callout_text": "SB Construction went from a 5-page website to 93 geo-targeted pages covering every city and service combination in El Dorado County. The result: #1 rankings for over 40 local search terms and a consistent flow of qualified leads from organic search. Our AI built and maintains every page.",
    "faqs": [
      {"q": "How many location pages do I need?", "a": "It depends on your service area and service mix. A business serving 10 cities with 5 services needs approximately 50 longtail pages plus county and city index pages. We analyze search demand to prioritize which combinations to build first."},
      {"q": "Won't Google penalize thin or duplicate content across location pages?", "a": "Not when done correctly. Our AI generates unique content for every page — location-specific FAQs, service descriptions with local references, and genuine value for the searcher. Google penalizes template pages with swapped city names. We don't do that."},
      {"q": "How do location pages work with AI search engines?", "a": "Location pages with proper schema markup and FAQ content are excellent for AI citation. When someone asks ChatGPT 'who is the best plumber in Folsom?' — a well-structured location page with specific, citable content is exactly what the AI looks for."},
    ],
    "cta_heading": "Ready to Own Your Territory?",
    "cta_text": "We'll map your service area, identify the highest-value city × service combinations, and tell you exactly how many pages you need.",
    "cta_primary": "Map My Territory →",
    "cta_primary_href": "/contact",
  },
  {
    "path": "demand-generation/gbp-admin",
    "meta_title": "Google Business Profile Admin — AI-Managed GBP | Demand Signals",
    "meta_desc": "Full Google Business Profile management — posts, photos, Q&A, reviews, and attribute optimization. AI keeps your GBP active and competitive 24/7.",
    "meta_path": "/demand-generation/gbp-admin",
    "keywords": ["Google Business Profile", "GBP management", "Google My Business", "Map Pack optimization", "GMB admin"],
    "eyebrow": "Google Business Admin",
    "title_orange": "Google Business Profile",
    "title_teal": "Always Active. Always Optimized.",
    "subtitle": "AI manages your Google Business Profile — weekly posts, photo updates, Q&A responses, review management, and attribute optimization. Your GBP never goes stale.",
    "cta_label": "Optimize My GBP →",
    "callout": "Businesses with active GBP profiles receive 7x more clicks than those with incomplete listings. Our AI keeps your profile 100% optimized, 100% of the time.",
    "breadcrumb_parent": "Demand Generation",
    "breadcrumb_parent_path": "/demand-generation",
    "schema_name": "Google Business Profile Management",
    "schema_desc": "AI-managed Google Business Profile optimization including posts, reviews, Q&A, and Map Pack visibility.",
    "features_heading": "GBP Management, Automated",
    "features": [
      {"icon": "📌", "title": "Weekly GBP Posts", "desc": "AI generates and publishes Google Business posts weekly — updates, offers, events, and tips that keep your profile active and engaging."},
      {"icon": "⭐", "title": "Review Monitoring & Response", "desc": "Every review detected within hours. AI drafts professional responses — positive reviews acknowledged, negative reviews handled diplomatically."},
      {"icon": "❓", "title": "Q&A Management", "desc": "AI monitors and responds to Google Q&A questions about your business. Proactively seeds common questions with authoritative answers."},
      {"icon": "📸", "title": "Photo Optimization", "desc": "Regular photo updates that showcase your work, team, and location. Geotagged, properly categorized, and optimized for local discovery."},
      {"icon": "📊", "title": "Attribute Optimization", "desc": "Business attributes, categories, service areas, hours, and descriptions kept accurate and fully populated. Every field that helps you rank — filled and maintained."},
      {"icon": "🗺️", "title": "Map Pack Strategy", "desc": "Proximity, relevance, and prominence signals optimized to push your business into the Google Maps 3-pack for your target searches."},
    ],
    "ai_callout_heading": "Your GBP never sleeps. Neither does our AI.",
    "ai_callout_text": "Most businesses post to their Google Business Profile once, then forget about it. Ours posts weekly, responds to every review, answers every question, and keeps every attribute updated. The result: a profile that Google rewards with better Map Pack positioning.",
    "faqs": [
      {"q": "How important is Google Business Profile for local businesses?", "a": "Critical. GBP drives Map Pack visibility — the local 3-pack that appears at the top of location-based searches. Businesses with active, optimized GBP profiles receive significantly more calls, direction requests, and website visits than those with bare or inactive profiles."},
      {"q": "Can I still manage my own GBP while you handle the rest?", "a": "Absolutely. We handle the ongoing optimization — posts, review responses, Q&A, attributes — but you retain full access to your profile. You can post, respond, and update anything at any time. We just ensure nothing falls through the cracks."},
      {"q": "How do you handle negative reviews?", "a": "AI drafts a professional, empathetic response that acknowledges the concern without being defensive. You can review and approve the response before it publishes, or enable auto-publish for responses the AI is highly confident about. The goal is always to demonstrate professionalism to future readers."},
    ],
    "cta_heading": "Ready for a GBP That Works for You?",
    "cta_text": "We'll audit your current Google Business Profile and show you exactly what's missing and what's costing you visibility.",
    "cta_primary": "Audit My GBP →",
    "cta_primary_href": "/tools/demand-audit",
  },
  {
    "path": "demand-generation/systems",
    "meta_title": "Demand Gen Systems — Automated Lead Pipelines | Demand Signals",
    "meta_desc": "Full-stack demand generation pipelines that run 24/7. AI monitors search performance, identifies opportunities, generates content, and routes qualified leads.",
    "meta_path": "/demand-generation/systems",
    "keywords": ["demand generation systems", "automated lead generation", "marketing automation", "AI marketing pipeline", "lead routing"],
    "eyebrow": "Demand Gen Systems",
    "title_orange": "Demand Gen Systems",
    "title_teal": "Pipelines That Run 24/7.",
    "subtitle": "Full-stack demand generation pipelines — AI monitors performance, identifies opportunities, creates content, optimizes pages, and routes leads. All automated. All always on.",
    "cta_label": "Build My Pipeline →",
    "callout": "Our domain loop architecture means your demand generation never stops — search monitoring, content creation, and optimization run continuously without human intervention.",
    "breadcrumb_parent": "Demand Generation",
    "breadcrumb_parent_path": "/demand-generation",
    "schema_name": "Demand Generation Systems",
    "schema_desc": "Automated demand generation pipelines with AI monitoring, content creation, and lead routing.",
    "features_heading": "The Domain Loop Architecture",
    "features": [
      {"icon": "🔄", "title": "Website Intelligence Loop", "desc": "AI monitors every page daily — GSC data, rankings, AI citations. Pages that underperform get rewritten. New opportunities get new pages built. Continuously."},
      {"icon": "✍️", "title": "Content & Social Loop", "desc": "AI generates blog posts, social media, GBP posts, and review responses on schedule. Content calendar planned monthly, executed daily."},
      {"icon": "⭐", "title": "Reputation Loop", "desc": "Reviews monitored across platforms, responses drafted, sentiment tracked, and alerts sent for critical reviews. Every review handled, every time."},
      {"icon": "📊", "title": "Performance Dashboard", "desc": "Real-time visibility into rankings, traffic, AI citations, content published, and leads generated. One portal, everything you need to know."},
      {"icon": "🔀", "title": "Lead Routing", "desc": "Qualified leads from forms, calls, and chat automatically routed to the right person on your team with full context on how they found you."},
      {"icon": "📈", "title": "Compound Growth", "desc": "Each loop feeds the others. Better content → better rankings → more authority → better AI citations → more traffic → more data → better content. The flywheel spins faster every month."},
    ],
    "ai_callout_heading": "Three loops. Zero employees. Always on.",
    "ai_callout_text": "Traditional agencies have teams of people doing these tasks manually. We replaced those teams with three AI domain loops that coordinate through a shared database. They run 24/7, they never take vacation, and they get better over time. That's why our clients get better results at a fraction of the cost.",
    "faqs": [
      {"q": "What is a domain loop?", "a": "A domain loop is a self-reinforcing AI system that monitors a specific business function, reasons about what to do, takes action, and measures results — continuously. We run three: Website Intelligence (search optimization), Content & Social (content generation), and Reputation (review management). They coordinate through a shared database."},
      {"q": "How is this different from marketing automation tools like HubSpot?", "a": "Marketing automation tools require you to set up workflows, write content, and monitor results. Our domain loops do all of that autonomously. The AI writes the content, identifies the opportunities, creates the pages, and monitors the results. You approve — AI does the rest."},
      {"q": "What does my involvement look like week to week?", "a": "About 10 minutes. Log into your portal, approve upcoming content, review performance metrics, and flag anything that needs attention. The AI handles everything else — research, writing, publishing, optimization, and monitoring."},
    ],
    "cta_heading": "Ready for Demand Gen on Autopilot?",
    "cta_text": "We'll audit your current marketing operations and show you exactly which functions AI can handle — and how much you'll save.",
    "cta_primary": "Get My Free Audit →",
    "cta_primary_href": "/tools/demand-audit",
  },

  # ─── CONTENT & SOCIAL ───────────────────────────────────
  {
    "path": "content-social/ai-content-generation",
    "meta_title": "AI Content Generation — GEO-First Content | Demand Signals",
    "meta_desc": "AI-generated content built to rank in search and get cited by ChatGPT. Blog posts, service pages, FAQs — written by AI, structured for discovery, reviewed by humans.",
    "meta_path": "/content-social/ai-content-generation",
    "keywords": ["AI content generation", "GEO content", "AI writing", "SEO content", "content marketing AI"],
    "eyebrow": "AI Content Generation",
    "title_orange": "AI Content",
    "title_teal": "That Ranks and Gets Cited.",
    "subtitle": "GEO-first content built to rank in Google AND get cited by ChatGPT, Perplexity, and Gemini. Written by AI, structured for discovery, reviewed by humans.",
    "cta_label": "Start My Content Engine →",
    "callout": "Every piece of content includes direct-answer structure, question-format headers, FAQ schema, and citable data — the signals both Google and AI search engines prioritize.",
    "breadcrumb_parent": "Content & Social",
    "breadcrumb_parent_path": "/content-social",
    "schema_name": "AI Content Generation",
    "schema_desc": "AI-powered content generation optimized for search engines and AI citation.",
    "features_heading": "Content That Works Harder",
    "features": [
      {"icon": "✍️", "title": "GEO-Structured Writing", "desc": "Every piece structured with direct answers first, question-format headers, and extractable content blocks — the format AI engines prioritize for citation."},
      {"icon": "🎯", "title": "Keyword-Driven Topics", "desc": "AI analyzes your GSC data and competitor content to identify the topics that will drive the most business — not vanity traffic."},
      {"icon": "🏷️", "title": "Schema Markup Included", "desc": "Article, FAQ, HowTo, and Service schema generated automatically for every piece. The structured data search engines and AI need."},
      {"icon": "🗣️", "title": "Brand Voice Matching", "desc": "Trained on your existing content and brand guidelines. The AI writes in your voice, not generic AI-speak."},
      {"icon": "✅", "title": "Human Review Workflow", "desc": "Every piece goes through your approval portal before publishing. You spend 10 minutes reviewing — AI handles everything else."},
      {"icon": "📈", "title": "Performance Tracking", "desc": "Every piece tracked for rankings, traffic, and AI citations. Underperformers get rewritten automatically."},
    ],
    "ai_callout_heading": "Content that compounds while you sleep.",
    "ai_callout_text": "Traditional content marketing requires hiring writers, managing editorial calendars, and hoping the content ranks. Our AI identifies what to write, writes it in your voice, optimizes it for both Google and AI search, publishes it on schedule, and monitors performance — then rewrites what isn't working. Continuously.",
    "faqs": [
      {"q": "How does AI content compare to human-written content?", "a": "When properly structured and reviewed, AI-generated content performs as well or better than human-written content in search. The key is structure — direct answers, question headers, citable data, and schema markup. AI is excellent at producing this consistently. Human review ensures accuracy, brand alignment, and quality control."},
      {"q": "How much content do you produce per month?", "a": "Standard packages include 4-8 blog posts, ongoing service page optimization, and FAQ content per month. Volume scales based on your needs and competitive landscape. Every piece is optimized for both traditional SEO and GEO."},
      {"q": "Will Google penalize AI-generated content?", "a": "No. Google has explicitly stated they evaluate content quality, not how it was produced. Their guidelines focus on helpfulness, accuracy, and expertise — not whether a human or AI wrote it. Our content meets all of Google's E-E-A-T standards because it's structured, factual, and reviewed by domain experts."},
    ],
    "cta_heading": "Ready for Content That Generates Demand?",
    "cta_text": "We'll analyze your current content, identify gaps, and show you what AI-powered content can do for your traffic and leads.",
    "cta_primary": "Start My Content Engine →",
    "cta_primary_href": "/contact",
  },
  {
    "path": "content-social/ai-social-media-management",
    "meta_title": "AI Social Media Management — Automated Posting | Demand Signals",
    "meta_desc": "AI generates and schedules social media posts across all platforms. 5-7 posts per week, brand voice matched, engagement tracked. Replace your social media manager.",
    "meta_path": "/content-social/ai-social-media-management",
    "keywords": ["AI social media management", "automated social media", "social media automation", "AI social posting"],
    "eyebrow": "AI Social Media",
    "title_orange": "AI Social Media",
    "title_teal": "5-7 Posts Per Week. Zero Employees.",
    "subtitle": "AI generates posts across every platform, tailored to your brand voice. Scheduled, published, and tracked automatically. You approve in 10 minutes a week.",
    "cta_label": "Automate My Social →",
    "callout": "A social media manager costs $3,000+/month for 3-4 posts per week. Our AI produces 5-7 posts across multiple platforms for a fraction of the cost.",
    "breadcrumb_parent": "Content & Social",
    "breadcrumb_parent_path": "/content-social",
    "schema_name": "AI Social Media Management",
    "schema_desc": "Automated AI social media management with brand voice matching and multi-platform posting.",
    "features_heading": "Social Media, Automated",
    "features": [
      {"icon": "📣", "title": "Multi-Platform Posting", "desc": "LinkedIn, Facebook, Instagram, X, and Google Business — all managed from one system. Content adapted for each platform's format and audience."},
      {"icon": "🗓️", "title": "Content Calendar AI", "desc": "Monthly calendar planned automatically based on your industry, seasonal trends, and content strategy. No gaps, no 'we'll get to it next week.'"},
      {"icon": "🗣️", "title": "Brand Voice Engine", "desc": "AI trained on your existing content and brand personality. Posts sound like you, not like a robot. Tone adjusts per platform — professional on LinkedIn, casual on Instagram."},
      {"icon": "📊", "title": "Engagement Tracking", "desc": "Likes, shares, comments, reach, and follower growth tracked automatically. Monthly reports show what's resonating and what to do more of."},
      {"icon": "🖼️", "title": "Visual Content", "desc": "AI generates accompanying images, carousels, and graphics for posts. No need for a separate design tool or graphic designer."},
      {"icon": "✅", "title": "Approval Workflow", "desc": "Review upcoming posts in your portal. Approve, edit, or reject with one click. Auto-publish for high-confidence content if you prefer hands-off."},
    ],
    "ai_callout_heading": "Replace your $3,000/month social media manager.",
    "ai_callout_text": "A full-time social media manager costs $3,000-4,000/month in salary alone — and produces 3-4 posts per week, sometimes. Our AI produces 5-7 posts per week across multiple platforms, maintains consistent brand voice, tracks engagement, and costs a fraction of a human hire. Better output. Lower cost. Zero sick days.",
    "faqs": [
      {"q": "Which social media platforms do you manage?", "a": "LinkedIn, Facebook, Instagram, X (Twitter), and Google Business Profile. We can add other platforms based on your audience. Content is adapted for each platform's format and best practices."},
      {"q": "How does AI match my brand voice?", "a": "During onboarding, we analyze your existing content, brand guidelines, and communication style. The AI is trained on these inputs and produces content that matches your voice. Over time, it learns from your feedback — approvals, edits, and rejections all improve the voice model."},
      {"q": "Can I still post my own content alongside the AI content?", "a": "Absolutely. The AI handles the baseline — consistent, scheduled content that keeps your profiles active. You can post additional content anytime. Many clients post personal updates and behind-the-scenes content while the AI handles educational and promotional content."},
    ],
    "cta_heading": "Ready to Automate Your Social Media?",
    "cta_text": "We'll audit your current social presence and show you what consistent AI-powered posting can do for your engagement and reach.",
    "cta_primary": "Automate My Social →",
    "cta_primary_href": "/contact",
  },
  {
    "path": "content-social/ai-review-auto-responders",
    "meta_title": "AI Review Auto Responders — Every Review Handled | Demand Signals",
    "meta_desc": "AI monitors and responds to every Google review within hours. Positive reviews acknowledged, negative reviews handled professionally. Every review. Every time.",
    "meta_path": "/content-social/ai-review-auto-responders",
    "keywords": ["AI review responses", "review management", "Google review automation", "reputation management AI"],
    "eyebrow": "AI Review Responders",
    "title_orange": "Every Review Handled.",
    "title_teal": "Within Hours, Not Days.",
    "subtitle": "AI monitors every Google review, drafts professional responses, and publishes them — positive reviews acknowledged, negative reviews handled diplomatically. Every review. Every time.",
    "cta_label": "Handle My Reviews →",
    "callout": "Businesses that respond to reviews within 24 hours see 33% higher customer satisfaction scores. Our AI responds within hours.",
    "breadcrumb_parent": "Content & Social",
    "breadcrumb_parent_path": "/content-social",
    "schema_name": "AI Review Auto Responders",
    "schema_desc": "Automated AI review monitoring and response system for Google reviews.",
    "features_heading": "Review Management, Automated",
    "features": [
      {"icon": "🔔", "title": "Instant Detection", "desc": "New reviews detected within hours across Google, Yelp, and industry-specific platforms. No review goes unnoticed."},
      {"icon": "🧠", "title": "Sentiment Analysis", "desc": "AI classifies each review by sentiment and urgency. Positive reviews get acknowledged. Negative reviews get flagged for careful handling."},
      {"icon": "✍️", "title": "Professional Responses", "desc": "AI drafts thoughtful, personalized responses — not generic templates. Each response addresses the specific feedback in the review."},
      {"icon": "🚨", "title": "Critical Review Alerts", "desc": "Reviews with serious concerns or potential PR issues get escalated to you immediately with a suggested response and recommended action."},
      {"icon": "✅", "title": "Auto-Publish Option", "desc": "Enable auto-publish for positive review responses where AI confidence is high. Approve manually only when needed."},
      {"icon": "📊", "title": "Rating Trend Tracking", "desc": "Track your average rating, review volume, sentiment trends, and response time over time. See how reputation management impacts your business."},
    ],
    "ai_callout_heading": "Reputation management that never takes a day off.",
    "ai_callout_text": "Most businesses either ignore reviews or respond days later with generic copy-paste replies. Neither helps. Our AI responds within hours with thoughtful, specific responses that show future customers you care. Every review. Every time. No exceptions.",
    "faqs": [
      {"q": "Can AI really write good review responses?", "a": "Yes — and often better than rushed human responses. AI has unlimited time to craft thoughtful, professional, non-defensive replies. It addresses specific feedback, thanks reviewers by context, and handles criticism diplomatically. Every response is reviewable before publishing if you prefer manual approval."},
      {"q": "What about negative or fake reviews?", "a": "Negative reviews get flagged with higher urgency. AI drafts a professional response that acknowledges the concern without being defensive, and alerts you immediately. For suspected fake reviews, we help you file removal requests through Google's proper channels."},
      {"q": "Which review platforms do you monitor?", "a": "Google Business Profile reviews are the primary focus since they directly impact local rankings. We also monitor Yelp, Facebook, and industry-specific platforms based on your business type."},
    ],
    "cta_heading": "Ready for Every Review Handled Professionally?",
    "cta_text": "We'll audit your current review response rate and show you how AI can handle them all — faster and more consistently.",
    "cta_primary": "Handle My Reviews →",
    "cta_primary_href": "/contact",
  },
  {
    "path": "content-social/ai-auto-blogging",
    "meta_title": "AI Auto Blogging — Weekly Blog Content on Autopilot | Demand Signals",
    "meta_desc": "AI researches topics, writes SEO-structured blog posts, and publishes weekly — building your authority and driving organic traffic on autopilot.",
    "meta_path": "/content-social/ai-auto-blogging",
    "keywords": ["AI blogging", "automated blog content", "AI blog writing", "SEO blogging", "content automation"],
    "eyebrow": "AI Auto Blogging",
    "title_orange": "Blog Content",
    "title_teal": "On Autopilot.",
    "subtitle": "AI researches topics, writes SEO-structured articles, and publishes them weekly — building your authority and driving organic traffic without you writing a word.",
    "cta_label": "Start My Blog Engine →",
    "callout": "Consistent blogging is the #1 long-term traffic driver for local businesses. Our AI publishes weekly, targeting the search terms that drive actual business.",
    "breadcrumb_parent": "Content & Social",
    "breadcrumb_parent_path": "/content-social",
    "schema_name": "AI Auto Blogging",
    "schema_desc": "Automated AI blog content generation with SEO and GEO optimization.",
    "features_heading": "Blogging Without the Writing",
    "features": [
      {"icon": "🔍", "title": "AI Topic Research", "desc": "AI analyzes your GSC data, competitor blogs, and industry trends to identify the topics that will drive the most qualified traffic."},
      {"icon": "✍️", "title": "SEO-Structured Writing", "desc": "Every post includes proper heading hierarchy, internal links, meta descriptions, and keyword placement. Structured for both Google and AI search."},
      {"icon": "🏷️", "title": "Schema & FAQ Included", "desc": "Article schema, FAQ sections, and structured data generated automatically. Every post optimized for featured snippets and AI citation."},
      {"icon": "📅", "title": "Scheduled Publishing", "desc": "Posts publish on a consistent weekly schedule. No gaps, no 'we'll get to it next week.' Consistency is what Google rewards."},
      {"icon": "📊", "title": "Performance Monitoring", "desc": "Every post tracked for rankings, traffic, and conversions. Underperformers get updated with fresh data and better structure."},
      {"icon": "🔗", "title": "Internal Linking", "desc": "AI maintains an internal linking strategy that connects blog content to service pages, location pages, and other posts — distributing authority across your site."},
    ],
    "ai_callout_heading": "Consistency wins. AI never misses a week.",
    "ai_callout_text": "The businesses that win in organic search are the ones that publish consistently. Most businesses blog for a month, then stop. Our AI publishes every week, every month, without fail. After 6 months, you have 25+ pieces of optimized content compounding authority. After a year, 50+.",
    "faqs": [
      {"q": "What types of blog posts does the AI write?", "a": "Primarily buyer-intent content — posts targeting search terms that indicate someone is ready to buy your service. Examples: 'How much does [service] cost in [city]?', 'Best [service] near [location]', '[Service] vs [alternative] — which is better?' These drive qualified traffic, not vanity visits."},
      {"q": "How often does the AI publish?", "a": "Standard packages include 1-2 posts per week. Each post is 1,000-2,000 words, fully optimized with headings, internal links, FAQ sections, and schema markup. Volume can be increased based on your competitive landscape."},
      {"q": "Do I need to provide topic ideas?", "a": "No. The AI researches topics automatically based on your industry, target keywords, competitor content, and search trends. However, you can always suggest specific topics through your portal and the AI will prioritize them."},
    ],
    "cta_heading": "Ready for a Blog That Drives Business?",
    "cta_text": "We'll analyze your industry's content landscape and show you the topics that will drive the most qualified traffic.",
    "cta_primary": "Start My Blog →",
    "cta_primary_href": "/contact",
  },
  {
    "path": "content-social/ai-content-repurposing",
    "meta_title": "AI Content Republishing — One Piece, Ten Channels | Demand Signals",
    "meta_desc": "AI repurposes blog posts into social media, newsletters, LinkedIn articles, GMB posts, and more. Maximize every piece of content across every channel.",
    "meta_path": "/content-social/ai-content-repurposing",
    "keywords": ["content repurposing", "content republishing", "multi-channel content", "content distribution AI"],
    "eyebrow": "AI Content Republishing",
    "title_orange": "One Piece of Content.",
    "title_teal": "Ten Channels. Zero Extra Work.",
    "subtitle": "AI repurposes your blog posts into social media, email newsletters, LinkedIn articles, GMB posts, and more — maximizing every piece of content you produce.",
    "cta_label": "Maximize My Content →",
    "callout": "Most businesses create content once and publish it in one place. We turn every piece into 5-10 format-optimized versions across every channel.",
    "breadcrumb_parent": "Content & Social",
    "breadcrumb_parent_path": "/content-social",
    "schema_name": "AI Content Republishing",
    "schema_desc": "Automated content repurposing across social media, email, and web channels.",
    "features_heading": "One Input, Ten Outputs",
    "features": [
      {"icon": "📝", "title": "Blog → Social Media", "desc": "Every blog post generates 3-5 social media posts — key takeaways, quotes, statistics, and questions extracted and formatted for each platform."},
      {"icon": "📧", "title": "Blog → Email Newsletter", "desc": "Blog content condensed into email-friendly format with compelling subject lines, preview text, and CTAs. Ready to send to your list."},
      {"icon": "💼", "title": "Blog → LinkedIn Article", "desc": "Long-form content adapted for LinkedIn's algorithm — professional tone, thought leadership positioning, and engagement-optimized formatting."},
      {"icon": "📌", "title": "Blog → GBP Post", "desc": "Key insights extracted and formatted as Google Business Profile posts — keeping your GBP active while reinforcing your expertise."},
      {"icon": "🎬", "title": "Blog → Video Scripts", "desc": "Content structured as video talking points, scripts, and carousel slides for TikTok, Reels, and YouTube Shorts."},
      {"icon": "📊", "title": "Performance Tracking", "desc": "Track which formats and channels drive the most engagement and traffic. AI learns and optimizes the repurposing strategy over time."},
    ],
    "ai_callout_heading": "Stop creating content for one channel.",
    "ai_callout_text": "The highest-performing businesses maximize every piece of content across every channel. A single blog post should become LinkedIn posts, social media content, email newsletters, GBP posts, and video scripts. Our AI does this automatically — turning your content investment into 5-10x the output.",
    "faqs": [
      {"q": "Does repurposed content hurt my SEO?", "a": "No. Each repurposed version is adapted for its specific platform and format — it's not duplicate content. A social media post extracted from a blog post is a different format, different length, and different context. Search engines understand the difference."},
      {"q": "How much content do I need to start?", "a": "Any amount. If you have existing blog posts, we can start repurposing immediately. If you're starting from scratch, we'll combine this with our AI Auto Blogging service — AI writes the original content and repurposes it simultaneously."},
      {"q": "Can I choose which channels to prioritize?", "a": "Yes. During setup, we identify which channels are most relevant for your audience and business type. A B2B company might prioritize LinkedIn and email. A restaurant might prioritize Instagram and GBP. The AI adapts accordingly."},
    ],
    "cta_heading": "Ready to Maximize Your Content?",
    "cta_text": "We'll audit your existing content and show you how much more value AI can extract from what you've already created.",
    "cta_primary": "Maximize My Content →",
    "cta_primary_href": "/contact",
  },

  # ─── AI & AGENT SERVICES ────────────────────────────────
  {
    "path": "ai-services/ai-automation-strategies",
    "meta_title": "AI Adoption Strategies — Custom AI Roadmaps | Demand Signals",
    "meta_desc": "Custom roadmaps to integrate AI across your business. We audit operations, identify highest-ROI automation opportunities, and build phased implementation plans.",
    "meta_path": "/ai-services/ai-automation-strategies",
    "keywords": ["AI adoption strategy", "AI business roadmap", "AI consulting", "business AI integration"],
    "eyebrow": "AI Adoption Strategies", "title_orange": "AI Adoption Strategies", "title_teal": "Know Where to Start.",
    "subtitle": "Custom roadmaps to integrate AI across your business. We audit your operations, identify the highest-ROI opportunities, and build a phased plan.",
    "cta_label": "Get My AI Roadmap →",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Adoption Strategies", "schema_desc": "Custom AI integration roadmaps for businesses.",
    "features_heading": "From Audit to Implementation",
    "features": [
      {"icon": "🔍", "title": "Operations Audit", "desc": "We map every manual process in your business — who does what, how long it takes, what it costs. Then we identify which processes AI can handle."},
      {"icon": "📊", "title": "ROI Analysis", "desc": "Dollar-for-dollar comparison: current cost of manual work vs. cost of AI replacement. Clear numbers, not speculation."},
      {"icon": "🗺️", "title": "Phased Roadmap", "desc": "A step-by-step implementation plan prioritized by ROI. Start with quick wins, build to full automation. No big-bang rollouts."},
      {"icon": "🔄", "title": "Change Management", "desc": "Practical guidance for your team — training, workflows, and communication plans that make the transition smooth."},
      {"icon": "🏗️", "title": "Tool Selection", "desc": "We recommend the right AI tools for each function — not the ones with the biggest marketing budgets, the ones that actually work."},
      {"icon": "📈", "title": "Success Metrics", "desc": "Clear KPIs for each phase — time saved, cost reduced, output increased. You'll know exactly what's working and what needs adjustment."},
    ],
    "ai_callout_heading": "Most businesses don't need more AI tools. They need a plan.",
    "ai_callout_text": "The gap isn't technology — it's knowing where to apply it. We've deployed AI systems across 14 businesses in every industry. We know which processes automate well and which don't. Our roadmap gives you a clear path from where you are to where AI can take you.",
    "faqs": [
      {"q": "How long does an AI strategy engagement take?", "a": "The initial audit and roadmap typically takes 1-2 weeks. Implementation follows the phased plan — quick wins in weeks 1-4, core systems in months 1-3, full automation in months 3-6. The pace depends on your business complexity."},
      {"q": "Do I need technical staff to implement AI?", "a": "No. We handle the technical implementation. Your team needs to participate in the audit (telling us how things work today) and the change management (adopting new workflows). The technology is fully managed by us."},
      {"q": "What if AI isn't the right solution for my business?", "a": "We'll tell you. Not every process benefits from AI automation. Our audit identifies which functions have clear ROI and which are better left as-is. We'd rather give honest advice than sell you something that won't deliver results."},
    ],
    "cta_heading": "Ready to See What AI Can Do for Your Business?",
    "cta_text": "Start with a free AI readiness audit. We'll identify your top 3 automation opportunities and the expected ROI for each.",
    "cta_primary": "Get My AI Readiness Audit →", "cta_primary_href": "/tools/demand-audit",
  },
  {
    "path": "ai-services/ai-workforce-automation",
    "meta_title": "AI Workforce Automation — Replace Roles, Not People | Demand Signals",
    "meta_desc": "Replace specific, expensive, inconsistent business roles with AI systems that cost less and perform better. Content, social, reviews, SEO — all automatable.",
    "meta_path": "/ai-services/ai-workforce-automation",
    "keywords": ["AI workforce automation", "AI role replacement", "business automation AI", "reduce labor costs AI"],
    "eyebrow": "AI Workforce Automation", "title_orange": "Replace the Role.", "title_teal": "Not the Person.",
    "subtitle": "AI systems that handle specific business functions — content creation, social media, review management, SEO, data entry — at a fraction of the cost of human labor.",
    "cta_label": "Automate My Workforce →",
    "callout": "The pitch is simple: replace the people and agencies doing manual marketing work with AI systems that cost less and perform better. Here are 14 businesses we've already done it for.",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Workforce Automation", "schema_desc": "AI systems replacing specific business roles and functions.",
    "features_heading": "What AI Replaces Today",
    "features": [
      {"icon": "📣", "title": "Social Media Manager", "desc": "$3,000+/month salary → AI posts 5-7 times per week across all platforms. Better consistency, more volume, fraction of the cost."},
      {"icon": "✍️", "title": "Content Writer", "desc": "$1,500-3,000/month → AI researches, writes, and publishes SEO-structured content weekly. GEO-optimized, schema-marked, human-reviewed."},
      {"icon": "⭐", "title": "Reputation Manager", "desc": "$300-500/month service → AI responds to every review within hours. Professional, personalized, never misses one."},
      {"icon": "🔍", "title": "SEO Consultant", "desc": "$1,000-3,000/month → AI monitors rankings daily, identifies opportunities, and rewrites underperforming pages automatically."},
      {"icon": "📋", "title": "Marketing Coordinator", "desc": "$3,500+/month salary → AI plans content calendars, generates assets, schedules posts, and reports performance. No PTO, no turnover."},
      {"icon": "📧", "title": "Outreach Specialist", "desc": "$2,000-4,000/month → AI researches prospects, personalizes messages, manages sequences, and routes qualified leads."},
    ],
    "ai_callout_heading": "The math is simple.",
    "ai_callout_text": "A social media manager + content writer + reputation service + SEO consultant = $8,000-10,000/month in human labor. Our AI systems handle all four functions for $1,400-3,500/month. Same or better output. 60-85% cost reduction. Zero sick days, zero turnover, zero management overhead.",
    "faqs": [
      {"q": "Which roles can AI realistically replace in 2026?", "a": "Marketing and content roles are the highest-ROI targets: social media management, content writing, review response, SEO monitoring, email marketing, and basic customer service. We've successfully automated all of these across our 14+ client deployments."},
      {"q": "What about quality? Can AI really match human performance?", "a": "For structured, repeatable tasks — yes, and often better. AI produces content more consistently, responds to reviews faster, monitors data more thoroughly, and never has an off day. The key is human oversight for quality control, which requires about 10-15 minutes per week."},
      {"q": "Will this eliminate jobs at my company?", "a": "That's your decision. Some clients use AI to replace roles they were paying agencies for. Others use it to augment existing staff — freeing humans for high-value work while AI handles the repetitive tasks. We help you make the right call based on your specific situation."},
    ],
    "cta_heading": "Ready to See What AI Can Replace?",
    "cta_text": "We'll audit your current marketing spend and show you exactly which roles AI can handle — and the monthly savings.",
    "cta_primary": "Get My Workforce Audit →", "cta_primary_href": "/tools/demand-audit",
  },
  {
    "path": "ai-services/ai-agent-infrastructure",
    "meta_title": "AI Agent Infrastructure — The Systems Behind Automation | Demand Signals",
    "meta_desc": "Database design, API integrations, pipeline orchestration, monitoring, and alerting — the infrastructure that makes AI agents work reliably at scale.",
    "meta_path": "/ai-services/ai-agent-infrastructure",
    "keywords": ["AI infrastructure", "agent infrastructure", "AI pipeline orchestration", "Supabase AI", "AI systems architecture"],
    "eyebrow": "AI Infrastructure", "title_orange": "AI Infrastructure", "title_teal": "The Plumbing That Makes AI Work.",
    "subtitle": "Database design, API integrations, pipeline orchestration, monitoring, and alerting — the systems architecture that makes AI agents reliable and scalable.",
    "cta_label": "Build My AI Infrastructure →",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Agent Infrastructure", "schema_desc": "Systems architecture for reliable AI agent operations.",
    "features_heading": "Enterprise-Grade AI Systems",
    "features": [
      {"icon": "🗄️", "title": "Database Architecture", "desc": "Supabase PostgreSQL with row-level security, structured tables for content, pages, pipeline runs, and client data. The foundation everything else runs on."},
      {"icon": "🔌", "title": "API Integrations", "desc": "Claude API, Google APIs (GSC, GBP, Analytics), social platform APIs, Stripe, Resend — all wired together with proper authentication and error handling."},
      {"icon": "🔄", "title": "Pipeline Orchestration", "desc": "Domain loops that run on schedule — monitoring, reasoning, acting, and logging results. Each loop handles a specific business function autonomously."},
      {"icon": "📊", "title": "Monitoring & Alerts", "desc": "Pipeline run tracking, error detection, and Telegram alerts for failures. You know when something needs attention before it impacts results."},
      {"icon": "🔒", "title": "Security & Isolation", "desc": "Client data isolated with row-level security. API keys managed in Supabase Vault. No client can see another client's data. Ever."},
      {"icon": "📈", "title": "Scalability", "desc": "Infrastructure designed to serve 10, 50, or 100 clients from the same base. Each new client adds marginal cost only in API usage."},
    ],
    "ai_callout_heading": "AI without infrastructure is just a chatbot.",
    "ai_callout_text": "The difference between 'we use AI' and 'we have AI systems' is infrastructure. Chatbots answer questions. Systems monitor, reason, act, log, and improve continuously. Our infrastructure turns AI from a toy into a business tool that generates measurable results.",
    "faqs": [
      {"q": "What technology stack do you use?", "a": "Next.js for frontend, Supabase (PostgreSQL) for database and auth, Claude API for intelligence, Vercel for hosting, Cloudflare for DNS/CDN, Stripe for payments, and Resend for email. Total base infrastructure cost: approximately $95-265/month covering all clients."},
      {"q": "Can you integrate with my existing systems?", "a": "Yes. We integrate with most business tools via APIs — CRMs (HubSpot, Salesforce), marketing platforms, booking systems, POS systems, and custom databases. If it has an API, we can connect it."},
      {"q": "How reliable are AI agent systems?", "a": "Very — with proper infrastructure. Our pipeline monitoring tracks every run, catches failures immediately, and alerts us via Telegram. Most issues are resolved before they impact client-facing results. The systems are designed for graceful degradation — if one component fails, others continue running."},
    ],
    "cta_heading": "Ready for AI Infrastructure That Scales?",
    "cta_text": "We'll scope the infrastructure you need based on your business requirements and growth plans.",
    "cta_primary": "Scope My Infrastructure →", "cta_primary_href": "/contact",
  },
  {
    "path": "ai-services/ai-automated-outreach",
    "meta_title": "AI Powered Outreach — Automated Prospecting | Demand Signals",
    "meta_desc": "AI researches prospects, crafts personalized messages, manages sequences, and routes qualified leads. Personalized outreach at scale.",
    "meta_path": "/ai-services/ai-automated-outreach",
    "keywords": ["AI outreach", "automated prospecting", "AI lead generation", "personalized outreach AI"],
    "eyebrow": "AI Powered Outreach", "title_orange": "AI Outreach", "title_teal": "Personalized at Scale.",
    "subtitle": "AI researches prospects, crafts personalized messages, manages multi-step sequences, and routes qualified leads to your sales process. Outreach that feels human, runs like a machine.",
    "cta_label": "Automate My Outreach →",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Powered Outreach", "schema_desc": "Automated AI prospecting with personalized messaging and lead routing.",
    "features_heading": "Outreach That Scales",
    "features": [
      {"icon": "🔍", "title": "AI Prospect Research", "desc": "AI identifies and researches target businesses — website analysis, social presence, tech stack, growth signals, and pain point indicators."},
      {"icon": "✍️", "title": "Personalized Messaging", "desc": "Not templates with names swapped. AI crafts genuinely personalized messages based on each prospect's specific business, challenges, and opportunities."},
      {"icon": "📧", "title": "Multi-Channel Sequences", "desc": "Email, LinkedIn, and follow-up sequences managed automatically. Timing, frequency, and channel optimized based on response patterns."},
      {"icon": "📊", "title": "Lead Scoring", "desc": "AI scores prospects based on engagement signals — opens, clicks, replies, website visits. Qualified leads get routed to your sales process automatically."},
      {"icon": "🎯", "title": "A/B Testing", "desc": "Subject lines, message angles, CTAs, and timing tested continuously. The system learns what works for your market and optimizes accordingly."},
      {"icon": "📋", "title": "CRM Integration", "desc": "Leads, activities, and pipeline data synced with your CRM automatically. No manual data entry, no missed follow-ups."},
    ],
    "ai_callout_heading": "50 personalized touches per week. Zero manual work.",
    "ai_callout_text": "Traditional outreach requires a person spending hours researching prospects and writing individual emails. Our AI does the same work — but better, faster, and at 10x the volume. Every message is researched and personalized. Every follow-up is timed perfectly. Every qualified lead is routed automatically.",
    "faqs": [
      {"q": "Isn't AI outreach just spam?", "a": "Not the way we do it. Our AI researches each prospect individually and crafts genuinely personalized messages based on their specific business. It's the difference between 'Dear Business Owner' and 'I noticed your website doesn't appear in ChatGPT results for [their service] in [their city] — here's what that's costing you.' Quality, not quantity."},
      {"q": "What response rates do you see?", "a": "Typical open rates: 45-65%. Reply rates: 8-15%. These are significantly higher than industry averages because every message is researched and personalized. The AI also optimizes timing and channel selection based on your market's response patterns."},
      {"q": "Can I review messages before they send?", "a": "Yes. You can review and approve every message, or set confidence thresholds for auto-send. Most clients review the first 2-3 weeks of messages, then enable auto-send for messages the AI is highly confident about."},
    ],
    "cta_heading": "Ready for Outreach That Actually Gets Replies?",
    "cta_text": "We'll build a custom outreach strategy for your market — target audience, messaging angles, and sequence design.",
    "cta_primary": "Design My Outreach →", "cta_primary_href": "/contact",
  },
  {
    "path": "ai-services/ai-agent-swarms",
    "meta_title": "AI Agent Swarms — Autonomous Agent Networks | Demand Signals",
    "meta_desc": "Networks of specialized AI agents handling marketing operations 24/7. Each agent handles a function. They coordinate through shared data. Always on.",
    "meta_path": "/ai-services/ai-agent-swarms",
    "keywords": ["AI agent swarms", "multi-agent systems", "autonomous AI agents", "AI agent networks"],
    "eyebrow": "AI Agent Swarms", "title_orange": "AI Agent Swarms", "title_teal": "A Team That Never Sleeps.",
    "subtitle": "Networks of autonomous AI agents handling marketing operations 24/7. Each agent specializes in a function — content, SEO, reviews, outreach. They coordinate through shared data.",
    "cta_label": "Deploy My Agent Swarm →",
    "callout": "We run 19 AI agents ourselves — monitoring search, generating content, responding to reviews, and managing outreach across every client. Now we deploy them for your business.",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Agent Swarms", "schema_desc": "Autonomous networks of specialized AI agents for business operations.",
    "features_heading": "Specialized Agents, Unified Results",
    "features": [
      {"icon": "🔍", "title": "Search Intelligence Agent", "desc": "Monitors GSC data daily, scores every page, identifies ranking opportunities, and triggers content updates when pages underperform."},
      {"icon": "✍️", "title": "Content Generation Agent", "desc": "Writes blog posts, service pages, FAQs, and social content. Produces GEO-optimized content structured for both search engines and AI citation."},
      {"icon": "⭐", "title": "Reputation Agent", "desc": "Monitors reviews across platforms, classifies sentiment, drafts responses, and escalates critical reviews. Every review handled within hours."},
      {"icon": "📣", "title": "Social Media Agent", "desc": "Generates platform-specific posts, schedules content, and tracks engagement. Maintains your brand voice across every channel."},
      {"icon": "📧", "title": "Outreach Agent", "desc": "Researches prospects, crafts personalized messages, manages sequences, and routes qualified leads to your sales process."},
      {"icon": "📊", "title": "Analytics Agent", "desc": "Aggregates performance data from all other agents, generates reports, identifies trends, and recommends strategy adjustments."},
    ],
    "ai_callout_heading": "Not 6 tools. 6 agents working together.",
    "ai_callout_text": "Tools wait for you to use them. Agents act autonomously. Our agent swarms monitor, reason, act, and report — continuously. They coordinate through a shared database, so the content agent knows what the search agent found, the reputation agent informs the social agent, and the analytics agent tracks everything. It's a team. It just never sleeps.",
    "faqs": [
      {"q": "What is an AI agent swarm?", "a": "An AI agent swarm is a network of specialized AI agents that handle different business functions, coordinated through a shared database. Each agent has a specific role — one monitors search, another generates content, another handles reviews. They run 24/7 and report results to your portal."},
      {"q": "How do agents coordinate with each other?", "a": "Through a shared Supabase database. When the search intelligence agent finds a keyword opportunity, it creates a record that the content agent picks up and writes a page for. When the reputation agent detects a negative review trend, it informs the content agent to create positive content around that topic. The database is the coordination layer."},
      {"q": "How many agents do I need?", "a": "It depends on which functions you want automated. Most clients start with 2-3 agents (content + search + reputation) and add more as they see results. The beauty of the architecture is that agents are modular — add or remove them based on your needs."},
    ],
    "cta_heading": "Ready for AI Agents Working for Your Business 24/7?",
    "cta_text": "We'll identify which agents would deliver the highest ROI for your business and deploy them within weeks.",
    "cta_primary": "Deploy My Agents →", "cta_primary_href": "/contact",
  },
  {
    "path": "ai-services/private-llms",
    "meta_title": "Private LLMs — Self-Hosted AI for Sensitive Data | Demand Signals",
    "meta_desc": "Self-hosted language models for businesses with sensitive data. Keep proprietary information off third-party servers while leveraging AI capabilities.",
    "meta_path": "/ai-services/private-llms",
    "keywords": ["private LLM", "self-hosted AI", "on-premise LLM", "enterprise AI", "data sovereignty AI"],
    "eyebrow": "Private LLMs", "title_orange": "Private LLMs", "title_teal": "Your Data Stays Yours.",
    "subtitle": "Self-hosted language models for businesses with sensitive data. Full AI capabilities without sending proprietary information to third-party servers.",
    "cta_label": "Explore Private LLMs →",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "Private LLM Deployment", "schema_desc": "Self-hosted language model deployment for data-sensitive businesses.",
    "features_heading": "AI Without the Data Risk",
    "features": [
      {"icon": "🔒", "title": "Data Sovereignty", "desc": "Your data never leaves your infrastructure. No third-party API calls for sensitive operations. Complete control over where your information lives."},
      {"icon": "🏗️", "title": "On-Premise Deployment", "desc": "Self-hosted models running on your infrastructure or private cloud. We handle setup, configuration, and optimization."},
      {"icon": "🧠", "title": "Custom Fine-Tuning", "desc": "Models fine-tuned on your business data — terminology, processes, products, and domain knowledge. Better results than generic models."},
      {"icon": "⚡", "title": "Low-Latency Inference", "desc": "On-premise models respond faster than API calls to external services. Critical for real-time applications and high-volume processing."},
      {"icon": "🔄", "title": "Hybrid Architecture", "desc": "Use private LLMs for sensitive data and public APIs for non-sensitive tasks. The best of both worlds — security where it matters, capability everywhere else."},
      {"icon": "📊", "title": "Usage Monitoring", "desc": "Full visibility into model usage, performance, costs, and accuracy. No surprise API bills. Predictable, fixed infrastructure costs."},
    ],
    "ai_callout_heading": "The businesses that need this already know they need it.",
    "ai_callout_text": "If you're in legal, healthcare, finance, or government — or if you handle proprietary client data — you probably can't send that data to ChatGPT or Claude's API. Private LLMs give you the same AI capabilities without the data risk. We deploy, configure, and maintain the infrastructure.",
    "faqs": [
      {"q": "Which models can you deploy privately?", "a": "We deploy open-source models like Llama, Mistral, and Phi on your infrastructure. Model selection depends on your use case, hardware, and performance requirements. We recommend the right model during the consultation."},
      {"q": "What hardware do I need?", "a": "It depends on the model size and throughput requirements. Small models run on a single GPU server. Larger models may need multi-GPU setups. We can also deploy on private cloud infrastructure (AWS, GCP, Azure) with dedicated instances."},
      {"q": "How do private LLMs compare to ChatGPT or Claude?", "a": "For general knowledge tasks, frontier models like Claude and GPT-4 are more capable. For domain-specific tasks with fine-tuning, private models can match or exceed frontier model performance on your specific use case — while keeping data completely private."},
    ],
    "cta_heading": "Need AI That Keeps Your Data Private?",
    "cta_text": "We'll assess your data sensitivity requirements and recommend the right private LLM architecture.",
    "cta_primary": "Assess My Requirements →", "cta_primary_href": "/contact",
  },
  {
    "path": "ai-services/clawbot-setup",
    "meta_title": "AI Clawbot Setup — Intelligent Web Crawlers | Demand Signals",
    "meta_desc": "Intelligent web crawlers for competitive intelligence, pricing monitoring, citation tracking, and automated research. Data gathering at scale.",
    "meta_path": "/ai-services/clawbot-setup",
    "keywords": ["web crawler setup", "competitive intelligence", "price monitoring", "citation tracking", "data scraping"],
    "eyebrow": "AI Clawbot Setup", "title_orange": "AI Clawbots", "title_teal": "Automated Intelligence Gathering.",
    "subtitle": "Intelligent web crawlers that gather competitive intelligence, monitor pricing, track citations, and feed data to your AI systems. Automated research at scale.",
    "cta_label": "Deploy My Clawbots →",
    "breadcrumb_parent": "AI & Agent Services", "breadcrumb_parent_path": "/ai-services",
    "schema_name": "AI Clawbot Setup", "schema_desc": "Intelligent web crawling for competitive intelligence and data gathering.",
    "features_heading": "Intelligence Gathering, Automated",
    "features": [
      {"icon": "🕷️", "title": "Competitive Monitoring", "desc": "Track competitor websites for pricing changes, new services, content updates, and positioning shifts. Know what they're doing before your customers do."},
      {"icon": "💰", "title": "Price Tracking", "desc": "Monitor competitor pricing across multiple sources. Get alerts when prices change. Make data-driven pricing decisions."},
      {"icon": "📊", "title": "Citation Monitoring", "desc": "Track where your business (and competitors) are mentioned across the web — directories, review sites, news, and AI-generated content."},
      {"icon": "📰", "title": "Industry News Monitoring", "desc": "Crawl industry publications, regulatory sites, and news sources for developments relevant to your business. AI summarizes and alerts."},
      {"icon": "🔗", "title": "Data Pipeline Automation", "desc": "Crawled data feeds directly into your AI systems — informing content strategy, pricing decisions, and competitive positioning."},
      {"icon": "⚖️", "title": "Ethical & Compliant", "desc": "We respect robots.txt, rate limits, and terms of service. All crawling is ethical, legal, and compliant with platform policies."},
    ],
    "ai_callout_heading": "Know everything. Automatically.",
    "ai_callout_text": "The businesses that win are the ones that know the most about their market. Our clawbots gather competitive intelligence continuously — monitoring prices, tracking citations, watching competitor moves — and feed that data directly into your AI systems for smarter decisions.",
    "faqs": [
      {"q": "Is web crawling legal?", "a": "Yes, when done ethically. We respect robots.txt directives, rate limits, and platform terms of service. We crawl publicly available information — the same information anyone could find by visiting the websites. No hacking, no circumventing access controls."},
      {"q": "What kind of data can clawbots gather?", "a": "Publicly available information: competitor pricing, service listings, content updates, directory listings, review data, news mentions, and regulatory filings. We can monitor specific websites on schedule and alert you when changes are detected."},
      {"q": "How does this feed into my other AI services?", "a": "Crawled data goes into your Supabase database where other AI agents can use it. The content agent uses competitor analysis to write better content. The search agent uses citation data to identify optimization opportunities. The outreach agent uses prospect research to personalize messages."},
    ],
    "cta_heading": "Ready for Automated Intelligence?",
    "cta_text": "We'll identify the data sources most valuable for your business and deploy clawbots to monitor them continuously.",
    "cta_primary": "Deploy My Clawbots →", "cta_primary_href": "/contact",
  },
]


def generate_page(p):
    """Generate a service page TSX file from a page definition."""
    features_tsx = ""
    for f in p["features"]:
        desc_escaped = f["desc"].replace("'", "\\'")
        features_tsx += f"        {{ icon: '{f['icon']}', title: '{f['title']}', description: '{desc_escaped}' }},\n"

    faqs_tsx = ""
    for faq in p["faqs"]:
        q_escaped = faq["q"].replace("'", "\\'")
        a_escaped = faq["a"].replace("'", "\\'")
        faqs_tsx += f"        {{ question: '{q_escaped}', answer: '{a_escaped}' }},\n"

    keywords_str = ""
    if p.get("keywords"):
        kw = ", ".join([f"'{k}'" for k in p["keywords"]])
        keywords_str = f"\n  keywords:    [{kw}],"

    callout_jsx = ""
    if p.get("callout"):
        callout_escaped = p["callout"].replace("'", "\\'")
        callout_jsx = f"\n      calloutHtml={{<>{callout_escaped}</>}}"

    cta_primary_href = p.get("cta_primary_href", "/contact")

    return f"""import {{ buildMetadata }} from '@/lib/metadata'
import {{ ServicePageTemplate }} from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({{
  title:       '{p["meta_title"]}',
  description: '{p["meta_desc"]}',
  path:        '{p["meta_path"]}',{keywords_str}
}})

export default function Page() {{
  return (
    <ServicePageTemplate
      eyebrow="{p['eyebrow']}"
      titleHtml={{<><span style={{{{color:'#FF6B2B'}}}}>{p['title_orange']}</span><br /><span style={{{{color:'#52C9A0'}}}}>{p['title_teal']}</span></>}}
      subtitle="{p['subtitle']}"{callout_jsx}
      ctaLabel="{p['cta_label']}"
      breadcrumbs={{[
        {{ name: 'Home', path: '/' }},
        {{ name: '{p["breadcrumb_parent"]}', path: '{p["breadcrumb_parent_path"]}' }},
        {{ name: '{p["schema_name"]}', path: '{p["meta_path"]}' }},
      ]}}
      schemaName="{p['schema_name']}"
      schemaDescription="{p['schema_desc']}"
      schemaUrl="{p['meta_path']}"
      featuresHeading="{p['features_heading']}"
      features={{[
{features_tsx}      ]}}
      aiCalloutHeading="{p.get('ai_callout_heading', 'The AI Difference')}"
      aiCalloutText="{p.get('ai_callout_text', '')}"
      faqs={{[
{faqs_tsx}      ]}}
      ctaHeading="{p.get('cta_heading', 'Ready to Get Started?')}"
      ctaText="{p.get('cta_text', 'Tell us about your business and we will scope a solution within 48 hours.')}"
      ctaPrimaryLabel="{p.get('cta_primary', 'Get Started →')}"
      ctaPrimaryHref="{cta_primary_href}"
    />
  )
}}
"""


for page in PAGES:
    filepath = os.path.join(BASE, page["path"], "page.tsx")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    content = generate_page(page)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"✓ {page['path']}")

print(f"\nGenerated {len(PAGES)} pages")
