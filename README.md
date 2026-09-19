# SQU Website — Drupal 11 + PostgreSQL Project

This is a project **scaffold**, not a pre-built running site: Drupal core and
contrib modules aren't bundled here (they're fetched by Composer, which
needs internet access). What's included and ready to use as-is:

- `composer.json` — pulls Drupal 11 core + the exact contrib modules this
  build needs (Paragraphs, Menu Block, Better Exposed Filters, Pathauto,
  Focal Point, Admin Toolbar)
- `web/modules/custom/squ_site_builder/` — a custom module that
  **programmatically creates your entire content architecture** (College/Major
  taxonomy, Program Page / News Article / Landing Page content types,
  all the homepage paragraph types, and the 3-level main menu) the moment
  you enable it. One command, and the structure exists — no manual
  clicking through 30 admin screens.
- `web/themes/custom/squ_theme/` — a fully coded subtheme of Olivero:
  the dark header bar, the full-screen hamburger overlay with sliding
  panels, the hero banner glass card, and the homepage section styling —
  all matching the Figma video.

---

## 1. Get Drupal running

### Option A — Docker (docker-compose.yml + Dockerfile included)

```bash
cp .env.example .env
# Generate a real hash salt and put it in .env:
openssl rand -hex 32          # paste the output as DRUPAL_HASH_SALT in .env

# Always rebuild explicitly rather than a bare `up` - if an earlier build
# failed partway, `up` alone will happily start whatever image happened
# to exist locally already instead of the fixed one:
docker compose build --no-cache
docker compose up -d
docker compose ps             # wait until "db" is healthy

# Install Drupal - settings.php already has the DB connection + hash salt
# baked in from the env vars above, so no --db-url is needed:
docker compose exec drupal vendor/bin/drush site:install standard \
  --site-name="Sultan Qaboos University" -y

# From here on, run every drush/composer command through the container, e.g.:
docker compose exec drupal vendor/bin/drush en squ_site_builder -y
docker compose exec drupal vendor/bin/drush theme:enable squ_theme -y
docker compose exec drupal vendor/bin/drush config:set system.theme default squ_theme -y
```

Site is then at **http://localhost:8080**. Postgres is also exposed on
`localhost:5432` if you want to connect with a DB client (Adminer/DBeaver/
psql) using the credentials from `.env`.

The `Dockerfile` builds a PHP 8.3 + Apache image with the `pdo_pgsql`
driver compiled in, runs `composer install` against this project's
`composer.json` (so Drupal 11 core + Paragraphs/Menu Block/Better Exposed
Filters/Pathauto/Focal Point/Admin Toolbar all get pulled in), and copies
`squ_site_builder` and `squ_theme` into the image. Rebuild
(`docker compose build`) any time you change either of those.

If you'd rather not build a custom image, `drush/drush` is already in
`composer.json`, so `docker compose exec drupal vendor/bin/drush ...` is
your one command for everything past this point — no need to install
anything else in the container.

### Option B — DDEV (recommended, easiest local setup)

```bash
# Install DDEV first if you don't have it: https://ddev.com/get-started/
cd squ-website
ddev config --project-type=drupal11 --docroot=web --php-version=8.3 --database=postgres:16
ddev start
ddev composer install
ddev drush site:install standard --db-url="pgsql://db:db@db/db" -y
```

### Option C — Manual (your own PHP 8.3 + PostgreSQL 16 server)

```bash
composer install
psql -U postgres -c "CREATE DATABASE squ_website;"
psql -U postgres -d squ_website -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

vendor/bin/drush site:install standard \
  --db-url=pgsql://DBUSER:DBPASS@localhost/squ_website \
  --site-name="Sultan Qaboos University" -y
```

`web/sites/default/settings.pgsql.php` has the same database array pre-written
if you'd rather paste it into `settings.php` than pass `--db-url`.

---

## 2. Build the content architecture (one command)

```bash
drush en squ_site_builder -y
```

This creates, via Drupal's Entity/Field API (no config-import fragility):
- Taxonomy vocabularies **College** and **Major** (Major references its
  parent College), seeded with a few real terms so you're not starting
  from zero
- Content types **Program Page**, **News Article**, **Landing Page**
  (plus core's built-in **Basic Page**)
- 11 paragraph types that make the whole homepage drag-and-drop editable
  (Hero Banner, Feature Tile Group, Stat Counter Group, Research
  Highlight, We Are SQU Block, Student Life Gallery, News Teaser Block)
- The 3-level main menu (Study → Under Graduate → Home/About Us/Programs/
  Students, plus Research/News & Events/Staff/Open Data/Student Life) and
  the Header Quick Links menu

After this runs, **everything it created is a normal, admin-UI-editable
part of the site.** The module has done its job — you don't need to touch
it again unless you're rebuilding from scratch.

**Note:** the menu links point to placeholder paths like `/study` and
`/research`. Create matching **Basic Page** nodes with those URL aliases
(Content > Add content > Basic page, then set the URL alias under the
node's "URL path settings"), or edit the links directly in
**Structure > Menus > Main navigation**.

---

## 3. Enable the theme

```bash
drush theme:enable squ_theme -y
drush config:set system.theme default squ_theme -y
```

---

## 4. Place the blocks

Go to **Structure > Block layout**, and in the **Header** region, place
these blocks — the Twig templates in `squ_theme` key off their exact
**machine names**, so set each one via the "Machine name" edit link when
placing it:

| Block | Machine name | Settings |
|---|---|---|
| Site branding (core) | `squ_site_branding` | Show logo + site name |
| Search form (core) | `squ_search` | — |
| Menu Block: Header Quick Links | `header_quick_links` | Start level 1, depth 1 |
| Menu Block: Main navigation | `header_menu_level1` | Start level 1, depth 1 |
| Menu Block: Main navigation | `header_menu_level2` | Start level 2, depth 1 |
| Menu Block: Main navigation | `header_menu_level3` | Start level 3, depth 1 |

(The Menu Block plugin is added by the `drupal/menu_block` module pulled
in via Composer — it appears in the block-placement list as
"Main navigation (Menu Block)" etc.)

---

## 5. Build the College/Major "LET'S GO" selector

This one's built through the Views UI rather than shipped as config,
because hand-written Views YAML is fragile to hand-edit blind. Follow
**Structure > Views > Add view**:

- Show: Content of type **Program Page**, Page display at `/programs`
- Exposed filter 1: **College** (`field_college`), required
- Exposed filter 2: **Major** (`field_major`), required
- Under the view's exposed form settings (enable **Better Exposed
  Filters** on this display first): set widget to Select list, submit
  button label **LET'S GO**, enable AJAX

Place the resulting block at the bottom of your homepage's Hero Banner
paragraph — the theme's `.squ-college-major-bar` CSS class is already
styled for it; just add that class to the block via **Block Class**
(`drupal/block_class`, optional extra module) or a block template
override.

Full rationale for this approach is in the companion build guide from
earlier in this conversation.

---

## 6. Assemble the homepage

1. **Content > Add content > Landing Page**, title "Home"
2. Add paragraph sections in order: Hero Banner → Feature Tile Group →
   Stat Counter Group → Research Highlight → We Are SQU Block → News
   Teaser Block → Student Life Gallery
3. **Configuration > System > Basic site information** → set this node
   as the front page

---

## 7. Images & icons to upload (Content > Media > Add media)

- SQU crest/shield logo (SVG or transparent PNG)
- Hero banner background (campus fountain/clocktower photo)
- 3 feature tile images: Postgraduate, Undergraduate, International
- 2 research highlight card images
- "We Are SQU" background image
- News thumbnails
- 4 student life gallery images

---

## What's genuinely no-code from here on

Once steps 1–6 are done, an editor never opens a code editor again: every
heading, image, stat number, menu link, college, and major is a field or
menu item filled in through the Drupal admin UI. Steps 1–6 are the
one-time build; `squ_site_builder` and `squ_theme` are the "scaffolding,"
not something you maintain as ongoing "code."
