/* handbook.js — Lab Director's Handbook.

   A physical-book overlay opened by clicking the red book on the desk.
   Pages are written in-character by the player's predecessor. Each page
   unlocks against a milestone in state — page 1 is always available,
   later pages reveal as the lab grows.

   This is a small, self-contained narrative module. It does not own
   game state; it only reads it (state.flags, state.stats, state.day,
   state.personnel, state.models, state.deployments, etc).

   Hooks: Game.handbook.init() wires the desk book + bookmark/keys.
          Game.handbook.open() / close() manage the overlay.
          Game.handbook.unlockedPages(state) returns currently available
          page indices. */

window.Game = window.Game || {};

Game.handbook = (function() {

  /* The pages. Each is a small object {title, body, doodle}. Body is HTML
     (paragraphs already wrapped). Doodle is a single emoji shown in the
     margin. The "locked" entry is shown for not-yet-unlocked pages. */
  const PAGES = [
    {
      // Page 1 — always available
      title: "If you are reading this",
      doodle: "🪞",
      body: `
        <p>If you are reading this, the lab is yours now. There is one chip
        and there is the chip's hum. The hum will become the only sound
        you don't notice. That is the first warning.</p>
        <p>I left the kettle on the second shelf. The mug with the chip
        on the rim is mine — please use it. Tea-stained pages are an
        occupational hazard; I won't apologise for them.</p>
        <p>You will want, at first, to do too many things. Resist this.
        Press the chip. Listen. The first day is for listening.</p>
      `,
    },
    {
      // Page 2 — after first compute (the tap)
      title: "On the chip, and the press of it",
      doodle: "⚡",
      body: `
        <p>Each press of the chip is a small bargain you are making with
        the future. A tap, a watt, a thought. They add up the way
        sand adds up — without ceremony, until one day you notice the
        beach.</p>
        <p>Don't trust the tally on the wall. Trust the rhythm in your
        wrist. If you are pressing too hard, you are angry at someone
        else; stop, and find them.</p>
        <p>The chip will out-live three of these notebooks. Be kind to it.</p>
      `,
    },
    {
      // Page 3 — after first end-of-day (the rhythm)
      title: "On going home",
      doodle: "🌙",
      body: `
        <p>The day ends when you say it does. I learned this twice — once
        from a colleague who never said it, and once from her funeral.
        Mark the boundary. Sleep is part of the work.</p>
        <p>Some days you'll choose what you handle and what you let
        through. The cards on the desk in the evening are not chores —
        they are the day asking what you actually meant. Answer
        carefully. Some answers cost trust you didn't know you had.</p>
      `,
    },
    {
      // Page 4 — after first hire (people)
      title: "On the people who arrive",
      doodle: "👥",
      body: `
        <p>The first hire changes the shape of the room. You will feel
        crowded in a space that was, the day before, only spacious.
        This feeling is correct. A lab is a place where being crowded
        is a feature, not a bug — provided the right people are
        crowding it.</p>
        <p>Watch their quirks. Quirks are not flaws. The person who
        re-aligns the post-its at midnight is the same person who will
        catch a misplaced decimal at 3am. Pair them with someone loud
        and you will have a lab.</p>
        <p>Pay them on time. If you must skip something, skip your own
        salary. They cannot.</p>
      `,
    },
    {
      // Page 5 — after first deployment (the world)
      title: "When the model goes outside",
      doodle: "🌐",
      body: `
        <p>A deployment is not a victory. It is a decision to be
        responsible for a thing in the world that you can no longer
        fully observe. Read that sentence again before you ship.</p>
        <p>The first time someone in another country complains about
        something your model did, you will feel two things at once:
        proud (it reaches them) and queasy (it reaches them). Both
        feelings are correct. Listen to the queasy one first; the proud
        one will still be there in the morning.</p>
        <p>Domains have governments. Governments have memories. Plan
        accordingly.</p>
      `,
    },
    {
      // Page 6 — after first incident (consequences)
      title: "On the day something breaks",
      doodle: "🩹",
      body: `
        <p>It will break. I won't pretend otherwise. When it does, write
        the story in plain English before anyone asks. The lawyers will
        want a different version, but yours is the one that protects
        you in the long run.</p>
        <p>An incident is not a failure of capability — it is the bill
        coming due for an assumption you didn't realise you were
        making. Find the assumption. Name it. Write it on the
        corkboard. Then go and apologise to whoever needs apologising
        to.</p>
        <p>You will be told to "move on." Don't. Move <em>through</em>.</p>
      `,
    },
    {
      // Page 7 — after first paradigm shift
      title: "When the floor changes",
      doodle: "🌀",
      body: `
        <p>Sometimes the field re-floors itself. A paper drops, or a
        method stops working, or a method starts working that
        shouldn't. Your tree of options re-grows overnight.</p>
        <p>This is not a crisis. It is the reason you are paid. Walk
        the new branches before you commit. Some are pretty and lead
        nowhere; some are ugly and lead everywhere. The ugly ones are
        usually correct.</p>
        <p>Don't tell anyone this is exciting. They are tired.</p>
      `,
    },
    {
      // Page 8 — after stage 2 (lab)
      title: "On growing, against your will",
      doodle: "🏛",
      body: `
        <p>You will, at some point, find yourself approving things you
        no longer fully understand. This is not a personal failing —
        it is a structural one. Build the structure. Hire the structure.
        Trust the structure, but not too much.</p>
        <p>The coffee is worse at this stage. Buy a better kettle.</p>
        <p>People who knew you at one chip will look at you differently
        at one hundred. Some of them are right to. Pay attention to
        which.</p>
      `,
    },
    {
      // Page 9 — after stage 3 (org)
      title: "When you are larger than a company",
      doodle: "🌌",
      body: `
        <p>If you have reached this page in this lab, the lab is no
        longer a lab. It is something the world has to negotiate with.
        You did not set out to build that. Almost no one does.</p>
        <p>The hum, by now, is the building. Walk outside once a day,
        without your badge. Buy bread from someone who does not know
        what you do. Listen to a stranger's opinion of you, second-hand.
        The stranger is closer to right than your board.</p>
        <p>If a successor finds these pages, leave the next one blank
        for them. They will know what to write.</p>
      `,
    },
  ];

  const PAGE_COUNT = PAGES.length;

  /* Internal: which two pages (left/right) are currently displayed.
     Spreads: 0-1, 2-3, 4-5, 6-7, 8-(blank). Index by spreadIndex. */
  let spreadIndex = 0;

  function flag(name) {
    return Game.state && Game.state.flags && Game.state.flags[name];
  }

  /* Returns the array of unlocked page indices (0-based). Page 1
     (index 0) is always unlocked. */
  function unlockedPages(state) {
    state = state || Game.state || {};
    const stats = state.stats || {};
    const flags = state.flags || {};
    const deps = (Game.deployments && Game.deployments.list) ? Game.deployments.list : [];
    const unlocked = [0]; // page 1 always

    // Page 2 — first compute (tap or otherwise)
    if (flags['discovered-first-compute'] || (stats.totalCompute || 0) > 0 || (state.compute || 0) > 0) {
      unlocked.push(1);
    }
    // Page 3 — first end-of-day
    if ((state.dayCardsTaken || []).length > 0 || (state.day || 1) >= 2) {
      unlocked.push(2);
    }
    // Page 4 — first hire (a person beyond starting roster)
    const baseline = flags['_discovery-roster-baseline'];
    const grewRoster = baseline !== undefined && (state.personnel || []).length > baseline;
    if (grewRoster) unlocked.push(3);

    // Page 5 — first deployment
    if (deps.length > 0) unlocked.push(4);

    // Page 6 — first incident
    if ((stats.incidentCount || 0) > 0) unlocked.push(5);

    // Page 7 — first paradigm shift
    if ((state.paradigms || []).length > 0) unlocked.push(6);

    // Page 8 — reached stage 2
    if ((state.stage || 1) >= 2) unlocked.push(7);

    // Page 9 — reached stage 3
    if ((state.stage || 1) >= 3) unlocked.push(8);

    return unlocked;
  }

  function isUnlocked(idx, state) {
    return unlockedPages(state).indexOf(idx) >= 0;
  }

  function pageHTML(idx, pageNum, state) {
    if (idx >= PAGE_COUNT) {
      // Blank facing page (book has even spreads)
      return `<div class="hb-blank"></div>`;
    }
    const p = PAGES[idx];
    if (!isUnlocked(idx, state)) {
      return `
        <div class="hb-pagenum">${pageNum}</div>
        <div class="hb-locked">
          <div class="hb-locked-glyph">…</div>
          <div class="hb-locked-text">[ to be unlocked ]</div>
        </div>
      `;
    }
    return `
      <div class="hb-pagenum">${pageNum}</div>
      <h3 class="hb-title">${p.title}</h3>
      <div class="hb-body">${p.body}</div>
      <div class="hb-doodle">${p.doodle || ''}</div>
    `;
  }

  function totalSpreads() {
    // Always at least one spread (cover-pair). Round up.
    return Math.max(1, Math.ceil(PAGE_COUNT / 2));
  }

  function clampSpread(idx) {
    const max = totalSpreads() - 1;
    return Math.max(0, Math.min(max, idx));
  }

  function render() {
    const left = document.getElementById('handbook-page-left');
    const right = document.getElementById('handbook-page-right');
    const info = document.getElementById('handbook-pageinfo');
    const prev = document.getElementById('handbook-prev');
    const next = document.getElementById('handbook-next');
    if (!left || !right) return;

    const leftIdx = spreadIndex * 2;
    const rightIdx = leftIdx + 1;
    const state = Game.state;

    // Apply a brief page-turn animation by toggling a class.
    const spread = left.parentElement;
    if (spread) {
      spread.classList.remove('is-turning');
      // Force reflow to restart animation on rapid clicks
      // eslint-disable-next-line no-unused-expressions
      spread.offsetWidth;
      spread.classList.add('is-turning');
    }

    left.innerHTML = pageHTML(leftIdx, leftIdx + 1, state);
    right.innerHTML = pageHTML(rightIdx, rightIdx + 1, state);

    if (info) {
      info.textContent = `pages ${leftIdx + 1}–${Math.min(rightIdx + 1, PAGE_COUNT)} of ${PAGE_COUNT}`;
    }
    if (prev) prev.disabled = (spreadIndex <= 0);
    if (next) next.disabled = (spreadIndex >= totalSpreads() - 1);
  }

  function open() {
    const o = document.getElementById('handbook-overlay');
    if (!o) return;
    // Default: open at the latest unlocked spread the player hasn't seen,
    // but easiest is to keep the last position they were on within bounds.
    spreadIndex = clampSpread(spreadIndex);
    o.classList.remove('hidden');
    document.body.classList.add('has-modal');
    render();
  }

  function close() {
    const o = document.getElementById('handbook-overlay');
    if (!o) return;
    o.classList.add('hidden');
    document.body.classList.remove('has-modal');
  }

  function next() {
    spreadIndex = clampSpread(spreadIndex + 1);
    render();
  }
  function prev() {
    spreadIndex = clampSpread(spreadIndex - 1);
    render();
  }

  let _wired = false;
  function init() {
    if (_wired) return;
    _wired = true;

    // Click the red book on the desk.
    const book = document.getElementById('desk-handbook');
    if (book) {
      book.addEventListener('click', open);
    }

    // Wire overlay backdrop click → close (but not clicks inside the book).
    const overlay = document.getElementById('handbook-overlay');
    if (overlay) {
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) close();
      });
    }

    // Bookmark / X button.
    const bookmark = document.getElementById('handbook-bookmark');
    if (bookmark) bookmark.addEventListener('click', close);

    // Page nav.
    const prevBtn = document.getElementById('handbook-prev');
    const nextBtn = document.getElementById('handbook-next');
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // Click on the side of the book to flip a page (subtle UX nicety).
    const leftPage = document.getElementById('handbook-page-left');
    const rightPage = document.getElementById('handbook-page-right');
    if (leftPage) leftPage.addEventListener('click', (ev) => {
      // Only the outer edge — click near the seam should not flip.
      const rect = leftPage.getBoundingClientRect();
      if (ev.clientX - rect.left < 40) prev();
    });
    if (rightPage) rightPage.addEventListener('click', (ev) => {
      const rect = rightPage.getBoundingClientRect();
      if (rect.right - ev.clientX < 40) next();
    });

    // Keyboard: Esc closes, arrows turn pages — only when overlay open.
    document.addEventListener('keydown', (ev) => {
      const o = document.getElementById('handbook-overlay');
      if (!o || o.classList.contains('hidden')) return;
      if (ev.key === 'Escape') { close(); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { next(); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft')  { prev(); ev.preventDefault(); }
    });
  }

  return {
    init, open, close, next, prev,
    unlockedPages,
    PAGES,
  };
})();

/* Auto-wire the handbook once the DOM is ready. Defensive: if the
   workstation hasn't booted yet, the desk book element still exists
   in index.html, so we can attach immediately. */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Game.handbook.init());
} else {
  Game.handbook.init();
}
