# WP.org submission — paste-ready notes

Not part of the plugin. `.gitignore` does not exclude it, so either commit it as
developer documentation or delete it before `git add`. It is **not** in the zip
(`package.json`'s `files` field controls that).

---

## "Additional Information" field — copy/paste

> Idara Business Hours is a single-purpose Gutenberg block that shows a weekly
> opening-hours table with a live "Open now / Closed" status.
>
> On Guideline 18 (functionality already well represented) — how this differs
> from the existing business-hours plugins:
>
> • The open/closed status is computed in the visitor's browser through the
> WordPress Interactivity API, against the business's own timezone. That keeps
> it correct behind page caches and CDNs, where a server-rendered status goes
> stale. render.php still outputs a correct server-side result as the no-JS and
> crawler fallback.
> • Split shifts — several open→close ranges per day (09:00–12:00 and
> 14:00–18:00, say), which clinics, restaurants and workshops need.
> • Special / holiday date overrides that replace the weekly schedule on
> specific dates.
> • Optional LocalBusiness JSON-LD generated from the same hours, so the visible
> table and the structured data cannot drift apart.
>
> Every feature is free. There is no pro tier, upsell, license gate, usage cap
> or trial anywhere in the code. The plugin makes no external HTTP requests and
> collects no data. CSS and JS are registered through block.json, so they load
> only on pages that actually contain the block.
>
> Source: the package ships its unminified sources in /src — /build is compiled
> from them with @wordpress/scripts. Repository:
> https://github.com/sajid-ansari-65/idara-business-hours
>
> Tested with the Plugin Check plugin (all categories, including experimental):
> no errors. Verified on WordPress 7.1 with PHP 8.4.

---

## Form checkboxes — what backs each one

| Form asks | Evidence |
|---|---|
| Read the FAQ | — |
| Complies with the Directory Guidelines | Plugin Check clean on all categories + experimental; no admin nags, menus or redirects; no external requests or tracking; every function/constant prefixed `idara_business_hours_*` / `IDARA_BUSINESS_HOURS_*` |
| Tested with Plugin Check, issues resolved | Run against the **extracted zip**: `Success: Checks complete. No errors found.` It flagged `Tested up to: 7.0 < 7.1`, which is fixed. No false-positives to explain |
| Name not confusingly similar | "Idara Business Hours" leads with the brand, exactly as Guideline 17 asks. WP.org search for "business hours" returns no plugin with a similar name — the closest is *Orivo Business Hours Block*, a different brand and a different feature set (12 display styles; no live status, split shifts, special dates or schema) |
| Account represents the owner | **Verify before submitting** — see below |
| No artificial limitations | No `freemius`, `premium`, `upsell`, `license key` or `trial` strings anywhere in the code. All features ship free |
| Not an excluded plugin type | No arbitrary code insertion/execution, no code downloaded from outside. Guideline 18 is addressed in the Additional Information text above |

---

## Check before you submit

1. **Log in as `sajidansari65`.** The form shows the email attached to whichever
   account you are logged into, and *that* account becomes the plugin owner.
   `readme.txt` has `Contributors: sajidansari65` and the plugin header's Author
   URI points at that profile — if you submit from a different account, the two
   will not match.
2. **The slug comes from `Plugin Name`, not the zip filename.**
   `Plugin Name: Idara Business Hours` → `wordpress.org/plugins/idara-business-hours`.
   Confirmed free. Once approved it cannot be renamed.
3. Upload `idara-business-hours.zip` (35 KB, well under the 10 MB cap).
4. Icon, banner and the six screenshots are **not** in the zip — they go into
   SVN `/assets/` after approval.

## The top-four rejection reasons, against this plugin

- **Unescaped output** — every user-controlled value goes through `esc_html()`.
  The four `phpcs:ignore` lines in `render.php` are core output:
  `get_block_wrapper_attributes()`, `wp_interactivity_data_wp_context()`, and
  two static directive strings. JSON-LD goes through `wp_json_encode()` with
  `JSON_HEX_TAG`, which blocks a `</script>` breakout from user fields.
- **Unsanitized input** — times are regex-validated `HH:MM`, special dates
  `YYYY-MM-DD`, `businessType` is checked against an allow-list, the accent
  colour is passed through a CSS-safe character whitelist, and the heading
  through `wp_strip_all_tags()`.
- **Missing nonces** — the plugin processes no form data. Attributes are saved
  by the block editor through the REST API, which handles its own auth.
- **Guideline compliance** — covered above.

---

## After approval — SVN, mirroring idara-reading-time

WP.org creates `trunk/`, `tags/`, `assets/` and `branches/` for you. The layout
to match is the one at `IdaraStudio/wp-plugins/idara-reading-time/`.

```bash
cd ~/Documents/IdaraStudio/wp-plugins
svn co https://plugins.svn.wordpress.org/idara-business-hours
cd idara-business-hours

# 1. trunk = exactly what was reviewed, so unpack the reviewed zip into it
unzip -o ~/Documents/IdaraStudio/idara-business-hours/idara-business-hours.zip -d /tmp/bh-trunk
rsync -a --delete --exclude '.svn' /tmp/bh-trunk/idara-business-hours/ trunk/

# 2. assets — PNGs plus icon.svg. NOT banner.svg: WP.org takes an SVG icon
#    but banners must be PNG/JPG. banner.svg stays in the repo as the source.
mkdir -p assets
cd ~/Documents/IdaraStudio/idara-business-hours/.wordpress-org
cp icon-128x128.png icon-256x256.png icon.svg \
   banner-772x250.png banner-1544x500.png \
   screenshot-1.png screenshot-2.png screenshot-3.png \
   screenshot-4.png screenshot-5.png screenshot-6.png \
   ~/Documents/IdaraStudio/wp-plugins/idara-business-hours/assets/

# 3. commit trunk + assets
cd ~/Documents/IdaraStudio/wp-plugins/idara-business-hours
svn add --force trunk assets
svn st                       # review before committing
svn commit -m "Idara Business Hours 1.0.0 — initial release"

# 4. tag it. readme says "Stable tag: 1.0.0", and WP.org serves the plugin
#    page and the download from tags/1.0.0 — without this tag the listing breaks.
svn cp trunk tags/1.0.0
svn commit -m "Tag 1.0.0"
```

Credentials are already cached in `~/.subversion` from the Reading Time release;
add `--username sajidansari65` if SVN asks.

Files removed later need `svn rm` — `rsync --delete` only clears the working
copy, it does not stage the deletion.
