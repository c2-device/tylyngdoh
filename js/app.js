/**
 * Alpine.js components for the portfolio site.
 *
 * This file must be loaded (via <script defer src="js/app.js">) BEFORE the
 * Alpine core script tag, so that Alpine.data() registrations below are in
 * place before Alpine boots and scans the DOM. See index.html <head> for the
 * required script order.
 *
 * Laravel migration notes live inline next to the data/methods they affect —
 * search for "TODO (Laravel migration)".
 */

document.addEventListener('alpine:init', () => {

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finePointer = () =>
    window.matchMedia('(pointer: fine)').matches;

  /**
   * Light/dark theme toggle. The actual color swap happens entirely through
   * CSS custom properties keyed off [data-theme] (see css/style.css) feeding
   * Tailwind's black/white/bone/stone/zinc tokens (see the tailwind.config
   * colors block in index.html) — this component only owns which theme is
   * active and persisting that choice. The initial theme is already set
   * before first paint by the inline script in index.html's <head>, so this
   * just reads that back into Alpine state and updates it on click.
   */
  Alpine.data('themeToggle', () => ({
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.theme);
      localStorage.setItem('theme', this.theme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', this.theme === 'dark' ? '#0a0a0a' : '#F2EBDD');
    },
  }));

  /**
   * Full-page preloader shown while the page (and its images) load.
   * Enforces a minimum display time so it doesn't just flash on fast
   * connections, then fades out — the wrapping #page element (see
   * index.html) cross-fades in at the same time, and the hero's line-by-line
   * text reveal (bound to this same `loading` flag) fires right after.
   */
  Alpine.data('pageLoader', () => ({
    loading: true,
    init() {
      const minDuration = 1200; // ms
      const start = Date.now();
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo(0, 0);

      const finish = () => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(minDuration - elapsed, 0);
        setTimeout(() => {
          window.scrollTo(0, 0);
          this.loading = false;
          document.documentElement.style.overflow = '';
        }, remaining);
      };

      if (document.readyState === 'complete') {
        finish();
      } else {
        window.addEventListener('load', finish);
      }
    },
  }));

  /**
   * Generic scroll-reveal helper used on section headers and list items
   * throughout the page. Usage:
   *   x-data="revealOnScroll()" x-intersect.once="reveal()"
   *   :class="revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'"
   */
  Alpine.data('revealOnScroll', () => ({
    revealed: false,
    reveal() {
      this.revealed = true;
    },
  }));

  /**
   * Sticky header: darkens/blurs and shrinks once the page has scrolled,
   * tracks which section is in view for the nav underline, and drives the
   * mobile hamburger menu (with a body scroll-lock so the page underneath
   * can't drift while the fixed overlay is open).
   */
  Alpine.data('siteHeader', () => ({
    mobileOpen: false,
    scrolled: false,
    activeSection: '',
    init() {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          this.scrolled = window.scrollY > 40;
          ticking = false;
        });
      }, { passive: true });

      // Scroll-spy: highlight the nav link for whichever section is
      // currently in the "reading zone" of the viewport.
      const sections = ['about', 'work', 'education', 'collective', 'contact']
        .map(id => document.getElementById(id))
        .filter(Boolean);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.activeSection = entry.target.id;
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      sections.forEach(section => observer.observe(section));

      // Lock body scroll while the mobile menu is open — otherwise the page
      // underneath can still scroll behind the fixed overlay (invisibly),
      // and closing the menu snaps back to a stale scroll position, which
      // throws off the scroll-tied hero parallax.
      let savedScrollY = 0;
      this.$watch('mobileOpen', (open) => {
        if (open) {
          savedScrollY = window.scrollY;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${savedScrollY}px`;
          document.body.style.left = '0';
          document.body.style.right = '0';
        } else {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          window.scrollTo(0, savedScrollY);
        }
      });
    },
  }));

  /**
   * Hero background parallax + fade, tied to scroll position.
   * Skips updates entirely under prefers-reduced-motion so the hero stays
   * static instead of drifting/zooming on scroll.
   */
  Alpine.data('heroParallax', () => ({
    scrollY: 0,
    init() {
      if (prefersReducedMotion()) return;

      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          this.scrollY = window.scrollY;
          ticking = false;
        });
      }, { passive: true });
    },
  }));

  /**
   * Animated count-up for the About section stats (120+, 11, 9). Starts once
   * the number scrolls into view; settles instantly under reduced motion
   * rather than never animating in (which would leave it stuck at 0).
   * Usage: x-data="statCounter(120)" x-intersect.once="count()"
   */
  Alpine.data('statCounter', (target) => ({
    value: 0,
    count() {
      if (prefersReducedMotion()) {
        this.value = target;
        return;
      }
      const duration = 1200;
      const start = performance.now();
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        this.value = Math.round(easeOutCubic(t) * target);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  }));

  /**
   * A small ring that tracks the pointer and swells over interactive
   * elements — desktop (fine-pointer) only, and only when the user hasn't
   * asked for reduced motion. Toggles `.has-custom-cursor` on <html> so the
   * native cursor is hidden precisely while this one is active (see
   * css/style.css) — touch and reduced-motion users never lose their cursor.
   */
  Alpine.data('magneticCursor', () => ({
    enabled: false,
    x: -100,
    y: -100,
    hovering: false,
    init() {
      if (prefersReducedMotion() || !finePointer()) return;
      this.enabled = true;
      document.documentElement.classList.add('has-custom-cursor');

      let ticking = false;
      let lastX = -100, lastY = -100;
      window.addEventListener('mousemove', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          this.x = lastX;
          this.y = lastY;
          ticking = false;
        });
      }, { passive: true });

      document.addEventListener('mouseover', (e) => {
        this.hovering = !!e.target.closest('a, button, [role="tab"]');
      }, { passive: true });

      window.addEventListener('mouseleave', () => { this.x = -100; this.y = -100; });
    },
  }));

  /**
   * Thin top-of-viewport scroll progress indicator. Informational (like a
   * native scrollbar), not decorative, so it stays active under
   * prefers-reduced-motion rather than gating on it. Drives a `scaleX`
   * transform (not width) to avoid animating a layout property.
   */
  Alpine.data('scrollProgress', () => ({
    progress: 0,
    init() {
      let ticking = false;
      const update = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) * 100 : 0;
      };
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { update(); ticking = false; });
      }, { passive: true });
      update();
    },
  }));

  /**
   * Floating "back to top" button — appears once the page has scrolled well
   * past the hero. Deliberately no magnetic-button treatment: that's
   * reserved for rare, high-intent CTAs (see magneticButton doc comment),
   * and this is a frequently-available utility control.
   */
  Alpine.data('backToTop', () => ({
    visible: false,
    init() {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          this.visible = window.scrollY > 800;
          ticking = false;
        });
      }, { passive: true });
    },
    scrollTop() {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
  }));

  /**
   * Mouse-tracked 3D tilt for the work gallery cards — adds depth on hover
   * without fighting the existing image zoom (that's a separate element).
   * Desktop fine-pointer + motion-allowed only, matching magneticCursor()/
   * magneticButton(). Transition is swapped to near-instant while the
   * pointer is moving (so the tilt tracks responsively) and eased only on
   * release, rather than a single fixed-duration transition throughout.
   */
  Alpine.data('tiltCard', () => ({
    enabled: false,
    rx: 0,
    ry: 0,
    scale: 1,
    settling: false,
    init() {
      if (prefersReducedMotion() || !finePointer()) return;
      this.enabled = true;
    },
    onMove(e) {
      if (!this.enabled) return;
      const rect = this.$el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      this.settling = false;
      this.ry = px * 10;
      this.rx = -py * 10;
      this.scale = 1.03;
    },
    onLeave() {
      this.settling = true;
      this.rx = 0;
      this.ry = 0;
      this.scale = 1;
    },
    get style() {
      if (!this.enabled) return '';
      const transition = this.settling ? 'transform 600ms cubic-bezier(0.23,1,0.32,1)' : 'transform 60ms linear';
      return `transform: perspective(1000px) rotateX(${this.rx}deg) rotateY(${this.ry}deg) scale(${this.scale}); transition: ${transition};`;
    },
  }));

  /**
   * Real spring-ish magnetic pull for primary CTAs: while the pointer is
   * inside the element it tracks 1:1 (scaled down), and on leave it snaps
   * back to rest through an eased CSS transition — Emil Kowalski's "spring
   * mouse interaction" pattern, approximated without a physics library.
   * Reserved for occasional, high-intent buttons (hero CTAs, form submit),
   * not anything clicked frequently — see the animation-frequency guidance
   * in emil-design-eng: decorative motion belongs on rare interactions.
   */
  Alpine.data('magneticButton', (strength = 0.35) => ({
    enabled: false,
    tx: 0,
    ty: 0,
    pressed: false,
    init() {
      if (prefersReducedMotion() || !finePointer()) return;
      // Only take over `transform` via inline style when actually enabled —
      // an inline style is always present in the DOM once bound, and would
      // otherwise permanently out-rank the CSS `active:scale-*` press
      // feedback class below, even on touch devices where this never fires.
      this.enabled = true;
      const el = this.$el;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        this.tx = (e.clientX - rect.left - rect.width / 2) * strength;
        this.ty = (e.clientY - rect.top - rect.height / 2) * strength;
      });
      el.addEventListener('mouseleave', () => {
        this.tx = 0;
        this.ty = 0;
      });
    },
  }));

  /**
   * Selected Work gallery. Every card (image or video) opens in a unified
   * lightbox with keyboard prev/next navigation. The first open animates
   * from the clicked thumbnail's actual screen position — a "continuity"/
   * shared-element transition, so the viewer never loses spatial context of
   * which frame they opened (see emil-design-eng's shared-element-transition
   * guidance). Subsequent prev/next just cross-fade/scale from center, which
   * is the correct behavior once there's no single origin thumbnail.
   *
   * Laravel migration notes:
   * - Replace the `projects` seed array with a GET /api/projects fetch in
   *   init().
   * - addProject() should POST to /api/projects and push the record the
   *   server returns (with its real DB id) instead of a client-generated one.
   * - deleteProject(id) should DELETE /api/projects/{id} and only remove the
   *   item locally after a successful response.
   */
  Alpine.data('workGallery', () => ({
    showAddForm: false,
    activeIndex: null,
    entered: false,
    lightboxOrigin: { x: 0, y: 0, scale: 1 },
    newProject: { type: 'image', title: '', category: '', image: '', alt: '' },
    filter: 'all',
    touchStart: null,

    get categories() {
      return ['all', ...new Set(this.projects.map(p => p.category))];
    },

    get filteredProjects() {
      return this.filter === 'all' ? this.projects : this.projects.filter(p => p.category === this.filter);
    },

    /* @foreach($projects as $project) — seed data, replace via GET /api/projects.
       `type` is 'image' or 'video'; video items also carry `video` (the clip
       URL) and reuse `image` as the <video> poster frame. Real project
       titles/categories below are Tyrel's actual work; the images are
       curated stock placeholders standing in until real stills/reels are
       available (swap `type` to 'video' and add a `video` URL then). */
    projects: [
      { id: 1, type: 'image', category: 'Feature Film', title: 'Iewduh', image: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for the feature film Iewduh' },
      { id: 2, type: 'image', category: 'Feature Film', title: 'Lorni – The Flaneur', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for the feature film Lorni, The Flaneur' },
      { id: 3, type: 'image', category: 'Feature Film', title: 'Rwai Ka Shara', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for the feature film Rwai Ka Shara' },
      { id: 4, type: 'image', category: 'Short Film', title: 'Ka Jingshemphang (The Knowing)', image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for the short film Ka Jingshemphang, selected and considered for festival screenings' },
      { id: 5, type: 'image', category: 'Documentary', title: 'Hills on a Plate', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for the food and travel series Hills on a Plate, on JioHotstar' },
      { id: 6, type: 'image', category: 'Music Video', title: 'Shillong Chamber Choir', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder still for a Shillong Chamber Choir music video' },
      { id: 7, type: 'image', category: 'Documentary', title: 'Living Root Bridges', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder image documenting the Living Root Bridges of Meghalaya' },
      { id: 8, type: 'image', category: 'Documentary', title: 'IFAD × NESFAS: Food & Indigenous Knowledge', image: 'https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder image for documentation work with IFAD and NESFAS on food, agriculture and indigenous knowledge' },
      { id: 9, type: 'image', category: 'Campaign', title: 'Brand Campaigns', image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop', alt: 'Placeholder image representing commercial campaigns for Toyota, NEXA, Ather, Wild Stone and Unilever Ayush' },
    ],

    get activeProject() {
      return this.activeIndex !== null ? this.filteredProjects[this.activeIndex] : null;
    },

    addProject() {
      if (!this.newProject.title.trim() || !this.newProject.image.trim()) return;

      const nextId = this.projects.length ? Math.max(...this.projects.map(p => p.id)) + 1 : 1;

      // TODO (Laravel migration): replace with
      // axios.post('/api/projects', this.newProject).then(res => this.projects.push(res.data));
      this.projects.push({ id: nextId, ...this.newProject });

      this.newProject = { type: 'image', title: '', category: '', image: '', alt: '' };
      this.showAddForm = false;
    },

    deleteProject(id) {
      // TODO (Laravel migration): replace with
      // axios.delete(`/api/projects/${id}`).then(() => { this.projects = this.projects.filter(p => p.id !== id); });
      this.projects = this.projects.filter(p => p.id !== id);
    },

    openLightbox(index, evt) {
      if (prefersReducedMotion() || !evt?.currentTarget) {
        this.lightboxOrigin = { x: 0, y: 0, scale: 1 };
      } else {
        const rect = evt.currentTarget.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetWidth = Math.min(vw * 0.9, 896); // matches max-w-4xl below
        this.lightboxOrigin = {
          x: rect.left + rect.width / 2 - vw / 2,
          y: rect.top + rect.height / 2 - vh / 2,
          scale: Math.max(rect.width / targetWidth, 0.15),
        };
      }
      this.activeIndex = index;
      this.entered = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { this.entered = true; }));
    },

    closeLightbox() {
      if (this.$refs.lightboxVideo) {
        this.$refs.lightboxVideo.pause();
      }
      this.entered = false;
      this.activeIndex = null;
    },

    next() {
      if (this.activeIndex === null) return;
      if (this.$refs.lightboxVideo) this.$refs.lightboxVideo.pause();
      this.lightboxOrigin = { x: 0, y: 0, scale: 1 };
      this.entered = true; // no origin thumbnail for keyboard nav — just present centered
      this.activeIndex = (this.activeIndex + 1) % this.filteredProjects.length;
    },

    prev() {
      if (this.activeIndex === null) return;
      if (this.$refs.lightboxVideo) this.$refs.lightboxVideo.pause();
      this.lightboxOrigin = { x: 0, y: 0, scale: 1 };
      this.entered = true;
      this.activeIndex = (this.activeIndex - 1 + this.filteredProjects.length) % this.filteredProjects.length;
    },

    /**
     * Swipe-to-navigate for the lightbox on touch devices — a mobile
     * equivalent to the keyboard arrow-key nav above. Only commits to
     * next()/prev() once a drag is clearly more horizontal than vertical
     * (so a vertical swipe, e.g. an accidental page-scroll attempt, doesn't
     * get hijacked) and past a deliberate 50px threshold, so a light tap or
     * scroll gesture on the image doesn't misfire as a swipe.
     */
    onTouchStart(e) {
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY };
    },

    onTouchEnd(e) {
      if (!this.touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;
      this.touchStart = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) this.next(); else this.prev();
    },
  }));

  /**
   * Career Milestones — filterable, expandable horizontal roadmap with a
   * scroll-driven progress line and an add/delete provision.
   *
   * Only the years explicitly stated in Tyrel's bio are used (2016, 2019,
   * 2023) plus a "present" entry for his stated forward-looking ambitions —
   * the many undated events in the bio (specific films, campaigns, the UK
   * trip, festival selection) are folded into these entries' descriptions
   * rather than given invented years of their own.
   *
   * Laravel migration notes:
   * - Replace the `milestones` seed array with a GET /api/milestones
   *   fetch in init(), ordered by year.
   * - addMilestone() should POST to /api/milestones and push the record
   *   the server returns (with its real DB id).
   * - deleteMilestone(id) should DELETE /api/milestones/{id} and only
   *   remove the item locally after a successful response.
   */
  Alpine.data('achievementsTimeline', () => ({
    filter: 'all',
    active: null,
    currentId: null,
    showAddForm: false,
    timelineProgress: 1,
    autoScrollRAF: null,
    yearObserver: null,
    pulsingId: null,
    pulseTimeout: null,
    newMilestone: { year: '', category: 'milestone', tag: '', title: '', description: '' },

    init() {
      this.currentId = this.filtered[0]?.id ?? null;

      // Fires the dot "ping" exactly at the moment a card becomes active
      // (registered after the initial assignment above, so page load
      // doesn't trigger a spurious pulse — only real activations do).
      this.$watch('currentId', (value) => {
        if (value === null) return;
        this.pulsingId = value;
        clearTimeout(this.pulseTimeout);
        this.pulseTimeout = setTimeout(() => { this.pulsingId = null; }, 650);
      });

      // Changing filters swaps the card set under the track, so its
      // scrollWidth changes — reset to the start and re-measure rather than
      // leaving scrollLeft pointing past the new (possibly shorter) content.
      this.$watch('filter', () => {
        this.stopAutoScroll();
        this.$nextTick(() => {
          const track = this.$refs.timelineTrack;
          if (track) track.scrollLeft = 0;
          this.updateTimelineProgress();
          this.currentId = this.filtered[0]?.id ?? null;
        });
      });

      // Reduced motion: skip the scroll-driven line entirely and leave it
      // fully drawn (timelineProgress stays 1) rather than stuck at 0.
      if (prefersReducedMotion()) return;

      this.timelineProgress = 0;
      this.$nextTick(() => {
        const track = this.$refs.timelineTrack;
        if (!track) return;
        let ticking = false;
        track.addEventListener('scroll', () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => { this.updateTimelineProgress(); ticking = false; });
        }, { passive: true });
        this.updateTimelineProgress();
      });
    },

    updateTimelineProgress() {
      const track = this.$refs.timelineTrack;
      if (!track) return;
      const max = track.scrollWidth - track.clientWidth;
      this.timelineProgress = max > 0 ? Math.min(Math.max(track.scrollLeft / max, 0), 1) : 1;
    },

    scrollByCard(direction) {
      this.stopAutoScroll();
      const track = this.$refs.timelineTrack;
      if (!track) return;
      track.scrollBy({ left: direction * 360, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },

    /**
     * Gently auto-scrolls the roadmap forward while the pointer rests over
     * it — desktop fine-pointer + motion-allowed only, matching the site's
     * other hover-driven effects (magneticCursor, tiltCard). Stops itself
     * once it reaches the end rather than looping, and any manual scroll
     * input (drag, wheel, touch) cancels it immediately so it never fights
     * the user.
     */
    startAutoScroll() {
      if (prefersReducedMotion() || !finePointer()) return;
      this.stopAutoScroll();
      const track = this.$refs.timelineTrack;
      if (!track) return;
      // CSS scroll-snap fights small incremental scrollLeft nudges — some
      // browsers snap the position back to the nearest snap point after
      // each tiny programmatic step, which can cancel the auto-scroll
      // before it's visible. Suspend snapping only while this is running.
      track.style.scrollSnapType = 'none';
      const step = () => {
        const max = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= max) {
          this.autoScrollRAF = null;
          track.style.scrollSnapType = '';
          return;
        }
        track.scrollLeft += 9.5;
        this.autoScrollRAF = requestAnimationFrame(step);
      };
      this.autoScrollRAF = requestAnimationFrame(step);
    },

    stopAutoScroll() {
      const track = this.$refs.timelineTrack;
      if (track) track.style.scrollSnapType = '';
      if (this.autoScrollRAF) {
        cancelAnimationFrame(this.autoScrollRAF);
        this.autoScrollRAF = null;
      }
    },

    /**
     * Tracks which milestone card is currently centered in the track's
     * visible area so its year can pop into focus as the roadmap moves —
     * scoped to the track as the IntersectionObserver root (not the
     * viewport), which is well-defined regardless of the track's own
     * overflow-x clipping.
     */
    registerCard(el, id) {
      el.dataset.milestoneId = id;
      if (!this.yearObserver) {
        const track = this.$refs.timelineTrack;
        if (!track) return;
        this.yearObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              this.currentId = Number(entry.target.dataset.milestoneId);
            }
          });
        }, { root: track, threshold: [0.6] });
      }
      this.yearObserver.observe(el);
    },

    get categoryCounts() {
      const counts = {};
      this.milestones.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1; });
      return counts;
    },

    categories: [
      { key: 'all', label: 'All' },
      { key: 'milestone', label: 'Milestones' },
      { key: 'collective', label: 'The Collective' },
      { key: 'education', label: 'Education' },
    ],

    /* @foreach($milestones as $milestone) — seed data, replace via GET /api/milestones.
       Only years the bio explicitly states are used; undated events (specific
       films, brand campaigns, the UK trip, festival selection) are folded
       into these entries' descriptions rather than given invented years. */
    milestones: [
      { id: 1, year: '2016', category: 'milestone', tag: 'Milestone', title: 'Career Begins', description: 'Started in the media industry, evolving across creative direction, production and communications — work that would go on to span feature films, brand campaigns, and early documentation with IFAD, Roger King and NESFAS.', present: false },
      { id: 2, year: '2019', category: 'collective', tag: 'Collective', title: 'Founded The Hillspeople Collective', description: 'Founded The Hillspeople Collective, a creative and production company built around film production, creative direction, production management and communications.', present: false },
      { id: 3, year: '2023', category: 'education', tag: 'Education', title: 'Meghalaya Filmmakers Training Centre', description: 'Established the Meghalaya Filmmakers Training Centre to offer accessible, practical, industry-relevant training — close to 100 students trained since, across photography, videography, editing and mobile filmmaking.', present: false },
      { id: 4, year: '2026', category: 'milestone', tag: 'Present', title: 'Looking Ahead', description: 'Working toward feature films, series, a dedicated training institute, and conversations around media and film policy in Northeast India.', present: true },
    ],

    get filtered() {
      const list = this.filter === 'all' ? this.milestones : this.milestones.filter(m => m.category === this.filter);
      return [...list].sort((a, b) => Number(a.year) - Number(b.year));
    },

    toggle(id) {
      this.active = this.active === id ? null : id;
    },

    addMilestone() {
      if (!this.newMilestone.year.trim() || !this.newMilestone.title.trim()) return;

      const nextId = this.milestones.length ? Math.max(...this.milestones.map(m => m.id)) + 1 : 1;

      // TODO (Laravel migration): replace with
      // axios.post('/api/milestones', this.newMilestone).then(res => this.milestones.push(res.data));
      this.milestones.push({
        ...this.newMilestone,
        id: nextId,
        present: false,
        tag: this.newMilestone.tag.trim() || this.categories.find(c => c.key === this.newMilestone.category)?.label || 'Milestone',
      });

      this.newMilestone = { year: '', category: 'milestone', tag: '', title: '', description: '' };
      this.showAddForm = false;
    },

    deleteMilestone(id) {
      // TODO (Laravel migration): replace with
      // axios.delete(`/api/milestones/${id}`).then(() => { this.milestones = this.milestones.filter(m => m.id !== id); });
      this.milestones = this.milestones.filter(m => m.id !== id);
      if (this.active === id) this.active = null;
    },
  }));

  /**
   * Contact form — state, inline validation, and a stubbed submit handler.
   *
   * Fields validate on blur (not on every keystroke, which reads as
   * impatient) and re-validate live once a field has already been touched.
   *
   * Laravel migration notes:
   * - Replace the setTimeout stub in submitForm() with:
   *     axios.post('/api/contact', this.form)
   *       .then(() => { this.status = 'success'; this.resetForm(); })
   *       .catch((err) => { this.status = 'error'; this.applyServerErrors(err.response.data.errors); });
   * - `status` can drive server-validation error states once wired up
   *   (Laravel 422 responses) via applyServerErrors().
   * - CSRF: once this is a Blade view, add @csrf inside the <form> or send
   *   the X-XSRF-TOKEN header via axios.
   */
  Alpine.data('contactForm', () => ({
    form: { name: '', email: '', subject: '', message: '' },
    touched: { name: false, email: false, subject: false, message: false },
    status: 'idle', // idle | submitting | success | error

    errorFor(field) {
      if (!this.touched[field]) return '';
      const value = this.form[field].trim();
      if (!value) return 'This field is required.';
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Enter a valid email address.';
      }
      return '';
    },

    touch(field) {
      this.touched[field] = true;
    },

    get isValid() {
      return Object.keys(this.form).every(field => {
        const value = this.form[field].trim();
        if (!value) return false;
        if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return true;
      });
    },

    submitForm() {
      Object.keys(this.touched).forEach(field => { this.touched[field] = true; });
      if (!this.isValid) return;

      this.status = 'submitting';

      // TODO (Laravel migration): replace this stub with a real API call,
      // see the component doc comment above.
      setTimeout(() => {
        console.log('Contact form payload (stub):', this.form);
        this.status = 'success';
        this.resetForm();
      }, 900);
    },

    resetForm() {
      this.form = { name: '', email: '', subject: '', message: '' };
      this.touched = { name: false, email: false, subject: false, message: false };
    },
  }));

});
