=== Idara Business Hours ===
Contributors:      sajidansari65
Tags:              business hours, opening hours, gutenberg block, local seo, fse
Requires at least: 6.5
Tested up to:      7.1
Stable tag:        1.0.1
Requires PHP:      7.4
License:           GPLv2 or later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Weekly business hours with a live "Open now" status plus optional LocalBusiness schema. Lightweight, FSE-ready, loads only where used.

== Description ==

**Idara Business Hours** is a focused, single-purpose Gutenberg block that shows your weekly opening hours in a clean, accessible table — with a live **"Open now / Closed"** status pill that updates in the visitor's browser against *your* business timezone, so it never goes stale behind page caching.

It also emits optional **LocalBusiness schema.org markup** (JSON-LD) so search engines can show your hours directly in results.

*Idara (إدارة) is the Arabic word for "administration" or "management". Idara Studio is a one-person studio building a growing family of carefully crafted, single-purpose Gutenberg blocks.*

Browse the full catalogue, live demos and per-block documentation at [idara.studio](https://idara.studio/plugins/business-hours).

= Why this and not a full block suite? =

Most block plugins ship 30+ blocks you'll never use, slowing your editor and your frontend. Idara plugins are deliberately small. This one loads its CSS and JavaScript **only on pages where the block is present** — never globally.

= Features =

* Weekly hours editor (Monday–Sunday), each day open or closed
* **Split shifts** — multiple time ranges per day (e.g. 9:00–12:00 and 14:00–18:00 for a lunch break)
* Live **"Open now / Closed"** status, computed in the browser against your business timezone (cache-safe via the WordPress Interactivity API)
* "Opens at…" / "Closes at…" hint next to the status
* **Special / holiday hours** — date-specific overrides (e.g. closed Dec 25)
* Optional **LocalBusiness JSON-LD** schema (name, address, phone, opening hours) for local SEO
* 12-hour or 24-hour time display
* Highlights the current day in the table
* Per-block timezone control (defaults to your site timezone)
* Inherits theme color and typography via block supports
* Full Site Editing (FSE) compatible — works inside block templates and template parts
* Semantic, accessible markup with ARIA labels
* No tracking, no external requests, no third-party services
* Translation-ready

= Use cases =

* Restaurants, cafés, and shops showing when they're open
* Clinics and professional services with split (morning/afternoon) hours
* Any local business that wants accurate hours in search results via schema

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`, or install via **Plugins → Add New → Upload Plugin**
2. Activate the plugin through the **Plugins** menu
3. Open any post or page in the block editor
4. Insert the **Business Hours** block where you want it displayed
5. Set your weekly hours, then configure status, time format, and schema from the block settings sidebar

== Frequently Asked Questions ==

= How does the "Open now" status stay accurate with page caching? =

The status is computed in the visitor's browser using the WordPress Interactivity API, comparing the current time in *your* business timezone against your hours. Because it runs client-side after the page loads, it stays correct even when the HTML is served from a CDN or page cache.

= Which timezone is used? =

By default the block uses your WordPress site timezone (Settings → General). You can override it per block if a particular location is in a different timezone.

= Can I set different hours for the morning and afternoon? =

Yes. Each day supports multiple time ranges (split shifts) — add as many open→close ranges per day as you need.

= Does it support holidays or one-off hours? =

Yes. Add **Special hours** for specific dates to override the weekly schedule (for example, closed on a public holiday, or reduced hours on a particular day).

= What is the LocalBusiness schema for? =

It outputs structured data (JSON-LD) describing your business name, address, phone, and opening hours in a format search engines understand, which can improve how your hours appear in local search results. It's optional, and only the fields you fill in are included.

= Will this slow down my site? =

No. The block ships no jQuery and makes zero external requests. Its CSS and JavaScript are enqueued **only on pages that actually contain the block** — never site-wide.

= Does this plugin track users or send data anywhere? =

No. Everything runs locally on your site. No external requests, no analytics, no tracking.

== Screenshots ==

1. Block in the WordPress block inserter — find it by searching "Business Hours"
2. Frontend — weekly hours table with the live "Open now" status pill and today's row highlighted
3. Block settings sidebar — the weekly hours editor with a split-shift day expanded
4. Special / holiday hours editor — date-specific overrides
5. Business details panel — name, address, and phone used for LocalBusiness schema
6. Frontend — a "Closed · Opens Monday at 9:00 AM" status outside business hours

== Development ==

Source code and build tools are available on GitHub:
https://github.com/sajid-ansari-65/idara-business-hours

The `src/` directory contains the unminified JavaScript (ES modules, JSX) and SCSS. Run `npm install && npm run build` to compile.

== Changelog ==

= 1.0.1 =
* Tested with WordPress 7.1.4.
* Editor: the 12/24-hour toggle no longer uses the ButtonGroup component, which is deprecated in WordPress 6.8 and later. It looks and behaves the same.
* Editor: an unrecognised timezone no longer stops the block from loading. The preview falls back to the browser's timezone.
* Frontend: if a visitor's browser can't resolve the business timezone, the server-rendered open/closed status stays as it is, without a script error.

= 1.0.0 =
* Initial release
