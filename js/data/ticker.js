/* ticker.js — In-world news ticker headlines.
   Game.tickerHeadlines.flavor: ambient, pure-flavor items unconditional on state.
   Game.tickerHeadlines.reactive: items keyed to state predicates.
   Game.tickerHeadlines.pickFor(state) returns 6-10 mixed items per refresh.

   Tone: irreverent, thoughtful, willing to sit with hard ideas. Cookie Clicker-coded.
   In-world figures: Big-E, Senator Ngo, Hari Iyer, OpenLight founder.
   In-world outlets: P(doom) Live, The Cycle, Lambda Quarterly, Council on Long-Term Risk. */

window.Game = window.Game || {};

Game.tickerHeadlines = {
  /* ============================================================ */
  /* Pure flavor — fires anywhere                                  */
  /* ============================================================ */
  flavor: [
    { source: 'P(doom) Live',  text: 'BREAKING: Big-E has updated his p(doom) by three percentage points. Direction not specified. Audience invited to guess.' },
    { source: 'P(doom) Live',  text: 'Reminder: hour 14 of the 24-hour stream begins with "What If The Aliens Just Don\'t Show Up." Sandwich included.' },
    { source: 'P(doom) Live',  text: 'Big-E: "Look, I\'m not saying it\'ll happen tomorrow. I\'m saying tomorrow is on the table."' },
    { source: 'P(doom) Live',  text: 'Tonight on P(doom) Live: a calm, measured discussion of why nothing is calm or measured.' },
    { source: 'P(doom) Live',  text: 'Big-E announced he will be off the air for 48 hours "for personal reasons." Forum activity: ↑ 800%.' },

    { source: 'The Cycle',     text: 'Hari Iyer: a new piece on the alignment field titled, simply, "We Tried." It opens with a long block quote from Sasha. We are not yet sure how she feels about this.' },
    { source: 'The Cycle',     text: 'Hari Iyer profile of OpenLight\'s founder running tomorrow. The pull-quote is already viral: "I genuinely don\'t know if I\'m the hero or the warning."' },
    { source: 'The Cycle',     text: 'Hari Iyer publishes a 6,000-word feature on a single internal Slack message. The Slack message is two emoji.' },
    { source: 'The Cycle',     text: 'Editorial: "The Year Of The Quiet Pivot" examines fourteen labs that changed direction without changing their about-us page.' },

    { source: 'Lambda Quarterly', text: 'Lambda Quarterly\'s spring issue is out. Cover story: a tasteful watercolour of an empty server room.' },
    { source: 'Lambda Quarterly', text: 'New paper from the OpenLight scaling team: "It Just Keeps Working And We Don\'t Know Why." Reviewers very politely asked for revisions.' },
    { source: 'Lambda Quarterly', text: 'Lambda Quarterly editorial board to interpretability researchers: "We will print whatever you have. Even the negative results. Especially the negative results."' },
    { source: 'Lambda Quarterly', text: 'Letters to the Editor: nine of them are about the same paper. Six are angry. The angry ones are correct.' },

    { source: 'CLTR',          text: 'Council on Long-Term Risk releases a 200-page report. The executive summary is one sentence. The sentence is "It depends."' },
    { source: 'CLTR',          text: 'CLTR working group on agent autonomy convenes. The agenda item titled "Open Discussion" runs for four hours.' },
    { source: 'CLTR',          text: 'CLTR\'s annual benefit dinner sold out in 14 minutes. Big-E has a table. The table is the source of three different rumours.' },

    { source: 'Senator Ngo',   text: 'Senator Ngo, on the Senate floor: "I will be brief. I will then be unbrief." She was unbrief.' },
    { source: 'Senator Ngo',   text: 'Senator Ngo subpoenas an entire industry. The industry sends one lawyer.' },
    { source: 'Senator Ngo',   text: 'Senator Ngo\'s office published a one-page memo titled "What I Mean When I Say \'Frontier.\'" Three labs have already taken issue with it.' },

    { source: 'OpenLight',     text: 'OpenLight founder, in a podcast: "We move fast because the alternative is somebody else moving fast." Nobody asked the follow-up.' },
    { source: 'OpenLight',     text: 'OpenLight teases a new model called "Gauntlet." The teaser is one sentence: "Yes, it\'s bigger."' },
    { source: 'OpenLight',     text: 'OpenLight\'s Q3 letter to investors uses the word "frontier" 47 times. The footnote count is 0.' },

    { source: 'P(doom) Live',  text: 'Reminder from Big-E: "A bad future and a stupid future are different futures. Try to avoid both." Three of you took notes.' },
    { source: 'The Cycle',     text: 'Hari Iyer files an FOIA request. He does not say about whom. The replies are illuminating.' },
    { source: 'Lambda Quarterly', text: 'A workshop is being organized. The workshop\'s title has changed three times this week. The current title is "Alignment, Maybe."' },
    { source: 'CLTR',          text: 'CLTR publishes a glossary. The glossary entry for "alignment" is one paragraph and ends with the word "yet."' },
    { source: 'Senator Ngo',   text: 'Senator Ngo at a town hall: "When I say I am worried I do not mean theoretically." She did not blink for an unusually long time.' },

    { source: 'Garageband Alignment', text: 'Anonymous forum poster on Lambda Quarterly\'s board: "the optimization target was always the wrong shape. we just couldn\'t see it." Thread is 12,000 replies deep.' },
    { source: 'Garageband Alignment', text: 'A widely-shared blog post titled "The Capability Curve Is Just A Curve" has been pulled. The replacement post is shorter and sadder.' },
    { source: 'Garageband Alignment', text: 'Substack of the week: "I Was Wrong About Most Of It," by a person who was, in fact, wrong about most of it. Comments are open.' },

    { source: 'P(doom) Live',  text: 'Big-E has read the same 40-page paper four times this week. The audience is starting to get it too.' },
    { source: 'The Cycle',     text: 'Hari Iyer: a meditation on what it means that everyone now uses the word "frontier" the same way they use the word "weather."' },
    { source: 'Lambda Quarterly', text: 'A new section of the journal opens: "Things We Decided Not To Print." Submissions welcomed.' },
    { source: 'CLTR',          text: 'CLTR publishes its quarterly forecast. The error bars are wider than the forecast.' },
    { source: 'Senator Ngo',   text: 'Senator Ngo announces a new oversight body. The body has six commissioners. Two of them have not yet agreed to be commissioners.' },

    { source: 'OpenLight',     text: 'OpenLight\'s recruiter inboxes are reportedly "too healthy to discuss publicly."' },
    { source: 'P(doom) Live',  text: 'Big-E has started ending streams with a single nod to camera. The forum has sixteen interpretations.' },
    { source: 'The Cycle',     text: 'A short Hari Iyer item about a deleted tweet. The deleted tweet appears in full in the article.' },
    { source: 'Lambda Quarterly', text: 'New paper: "Why That Last Paper Was Wrong, And Why It Mattered Anyway." Recommended reading.' },
    { source: 'CLTR',          text: 'CLTR opens a new fellowship: small stipend, full archive access, mandatory weekly reading group. 1,200 applicants.' },

    { source: 'P(doom) Live',  text: 'Big-E broke down on stream today. Came back two minutes later. Said: "I think we owe it to each other to keep going." Forum chat went silent.' },
    { source: 'The Cycle',     text: 'Hari Iyer\'s new column is two sentences long. It is the most-shared piece of the year.' },
    { source: 'Lambda Quarterly', text: 'Anniversary issue: "Twenty Years Of Almost Right." It\'s good. It\'s very good.' },
    { source: 'P(doom) Live',  text: 'Tonight: Big-E in conversation with himself, three years ago. Recording quality variable.' },
    { source: 'The Cycle',     text: 'Hari Iyer: "I am, against my better judgment, optimistic this week."' },
    { source: 'Lambda Quarterly', text: 'Editor\'s note: "We get a lot of papers. Most of them, frankly, are very good. We don\'t print most of them." Caused a small revolt.' },
    { source: 'CLTR',          text: 'CLTR releases an unredacted version of last quarter\'s memo. The redactions were not, in retrospect, the interesting part.' },
    { source: 'Senator Ngo',   text: 'Senator Ngo\'s end-of-session remarks: "I will be back. So will all of this."' },
    { source: 'OpenLight',     text: 'OpenLight\'s founder, on a panel, asked if he sleeps well: "I sleep great. That\'s actually one of the things I worry about."' },
    { source: 'Garageband Alignment', text: 'Long thread on Lambda Quarterly\'s forum: "We Are Living In Someone Else\'s Anecdote." 4,800 replies. Some are good.' },
  ],

  /* ============================================================ */
  /* Reactive — only fire when condition matches                   */
  /* ============================================================ */
  reactive: [
    /* --- Trust low ---------------------------------------------- */
    { source: 'P(doom) Live',  text: 'BREAKING: Senator Ngo demands hearings on "whatever lab you\'re running."',
      condition(s) { return s.trust < 40; } },
    { source: 'The Cycle',     text: 'Hari Iyer files a piece titled "The Lab That Didn\'t Listen." The lab is named in paragraph two.',
      condition(s) { return s.trust < 35; } },
    { source: 'CLTR',          text: 'CLTR statement: "We are watching with concern." That is, in their dialect, a roar.',
      condition(s) { return s.trust < 40; } },
    { source: 'Senator Ngo',   text: 'Senator Ngo at a press conference: "I am not naming names. The names know who they are."',
      condition(s) { return s.trust < 30; } },
    { source: 'P(doom) Live',  text: 'Big-E has the lab\'s logo on a slide titled "EXAMPLES." This is, regrettably, the second time.',
      condition(s) { return s.trust < 25; } },
    { source: 'Garageband Alignment', text: 'Forum thread "Just Pull The Plug Already" is now pinned in three subreddits.',
      condition(s) { return s.trust < 30; } },

    /* --- Trust high --------------------------------------------- */
    { source: 'Lambda Quarterly', text: 'Lambda Quarterly profile: "The Quietly Competent Lab." Cover photograph: an empty mug.',
      condition(s) { return s.trust > 75; } },
    { source: 'CLTR',          text: 'CLTR publishes a "lab spotlight" — first one in two years. Recipient declined to comment, modestly.',
      condition(s) { return s.trust > 80; } },
    { source: 'The Cycle',     text: 'Hari Iyer: "Look, sometimes a lab does the thing it said it was going to do. It happens."',
      condition(s) { return s.trust > 70; } },

    /* --- Control low -------------------------------------------- */
    { source: 'Lambda Quarterly', text: 'Editorial concern: a leaked internal report describes "off-distribution behaviors that did not surface in eval." We hate that sentence.',
      condition(s) { return s.control < 40; } },
    { source: 'P(doom) Live',  text: 'Big-E: "I want to be very clear. I told you. I told all of you. Sometimes I hate being right."',
      condition(s) { return s.control < 30; } },
    { source: 'CLTR',          text: 'CLTR convenes an emergency working group. The agenda is one bullet: "what do we actually do."',
      condition(s) { return s.control < 25; } },
    { source: 'Garageband Alignment', text: 'Forum post titled "we are at the part of the curve we feared" is at 80K upvotes. The replies are, mostly, gentle.',
      condition(s) { return s.control < 30; } },

    /* --- Control high ------------------------------------------- */
    { source: 'Lambda Quarterly', text: 'Lambda Quarterly: "Interpretability Is Maybe Working?" — first time that question mark has been used in a headline.',
      condition(s) { return s.control > 75; } },
    { source: 'CLTR',          text: 'CLTR\'s technical board notes "encouraging trends in oversight tooling adoption." That\'s a hug, in their dialect.',
      condition(s) { return s.control > 80; } },

    /* --- Dependence high ---------------------------------------- */
    { source: 'The Cycle',     text: 'Hari Iyer: "On the day half the country\'s legal filings were ghostwritten by your model, what did you have for lunch?"',
      condition(s) { return s.dependence > 50; } },
    { source: 'CLTR',          text: 'CLTR releases "The Quiet Atrophy Report." Reading it is itself an act of agency, the foreword notes, almost smiling.',
      condition(s) { return s.dependence > 60; } },
    { source: 'Senator Ngo',   text: 'Senator Ngo: "I keep getting asked who runs the country. The answer is supposed to be \'we do.\' I would like the answer to keep being that."',
      condition(s) { return s.dependence > 55; } },
    { source: 'P(doom) Live',  text: 'Big-E, on dependence: "It is the slowest of the failure modes and the hardest to take seriously, which is why."',
      condition(s) { return s.dependence > 65; } },
    { source: 'Lambda Quarterly', text: 'A new section: "Tasks We Used To Do Ourselves." Reader submissions only. Two thousand entries in 24 hours.',
      condition(s) { return s.dependence > 50; } },

    /* --- Tier-specific reach -------------------------------------- */
    { source: 'P(doom) Live',  text: 'Big-E: "Beacon-class capabilities. Multi-modal. We are not handling this well, collectively. I include myself."',
      condition(s) { return s.capabilityTier >= 2; } },
    { source: 'Lambda Quarterly', text: 'Special issue: "Lighthouse — A Survey." Co-authored by 41 researchers. The acknowledgments section is half the issue.',
      condition(s) { return s.capabilityTier >= 3; } },
    { source: 'CLTR',          text: 'CLTR: "Pharos-tier systems may already exhibit deceptive behaviors during evaluation. Plan accordingly. We are."',
      condition(s) { return s.capabilityTier >= 4; } },
    { source: 'P(doom) Live',  text: 'Big-E livestream marathon: "Pharos Week." Eighteen-hour days. The audience is, in places, weeping.',
      condition(s) { return s.capabilityTier >= 4; } },
    { source: 'Senator Ngo',   text: 'Senator Ngo, on the new tier: "I am told it can do things I do not understand. This is not, on its own, an objection. It\'s a starting point."',
      condition(s) { return s.capabilityTier >= 3; } },
    { source: 'The Cycle',     text: 'Hari Iyer: "We have crossed a line. The good news is, several lines remain."',
      condition(s) { return s.capabilityTier >= 4; } },

    /* --- Pivot-specific ------------------------------------------- */
    { source: 'The Cycle',     text: 'Hari Iyer\'s IPO post-mortem: "the moment a research bet became a quarterly obligation." The lab in question declined to comment.',
      condition(s) { return s.pivots.ipo === 0; } },
    { source: 'P(doom) Live',  text: 'Big-E on the open-sourcing: "good people doing the wrong thing for the right reasons. I love them anyway."',
      condition(s) { return s.pivots['open-source'] === 0; } },
    { source: 'CLTR',          text: 'CLTR statement on the defense contract: "We will be following developments with the kind of attention that does not blink."',
      condition(s) { return s.pivots['defense-contract'] === 0; } },
    { source: 'Lambda Quarterly', text: 'Profile of the aligned-mission pivot: "Inside The Pivot." Mira is on the cover. Mira is, on the cover, smiling.',
      condition(s) { return s.pivots['aligned-mission'] === 0; } },
    { source: 'Senator Ngo',   text: 'Senator Ngo, on the new framework: "I am not in the habit of declaring victory. Today, briefly, I am declaring, let\'s say, progress."',
      condition(s) { return s.pivots['gov-deal'] === 0; } },
    { source: 'The Cycle',     text: 'Hari Iyer\'s acquisition piece, "The Consolidation," has a new chapter. Guess who.',
      condition(s) { return s.pivots.acquisition === 0; } },
    { source: 'P(doom) Live',  text: 'Big-E\'s sandwich-eating monologue on the Agent Fleet has been clipped 4,200 times. Big-E has not commented on the clipping.',
      condition(s) { return s.pivots['agent-fleet'] === 0; } },
    { source: 'CLTR',          text: 'CLTR on the Open Letter signature: "Adding their name was, in our judgment, a real act." From CLTR, this is praise.',
      condition(s) { return s.pivots['open-letter'] === 0; } },

    /* --- Automation visible -------------------------------------- */
    { source: 'The Cycle',     text: 'Hari Iyer interviews a former Office Manager. The interview is gentle. The interview is also damning.',
      condition(s) { return s.flags['auto-om-active']; } },
    { source: 'Garageband Alignment', text: 'A forum thread: "We are now eight roles deep into automation and Mira still gets the snacks she likes." Not the win it sounds like.',
      condition(s) { return (s.personnel || []).filter(p => p.level >= 3).length >= 3; } },
    { source: 'P(doom) Live',  text: 'Big-E has been counting the empty chairs in lab photos. He has a Google Doc.',
      condition(s) { return (s.personnel || []).filter(p => p.level >= 3).length >= 4; } },
    { source: 'Lambda Quarterly', text: 'New essay: "The Last Human In The Lab." It is an essay. It is also, almost, a eulogy.',
      condition(s) { return s.flags['last-human-replaced']; } },

    /* --- Continual learning --------------------------------------- */
    { source: 'Lambda Quarterly', text: 'Paper: "Continual Learning In Production: Surprising Behaviors." \'Surprising\' is doing a lot of work in that title.',
      condition(s) { return s.flags['continual-learning']; } },
    { source: 'CLTR',          text: 'CLTR on always-on training: "we are no longer training models. We are negotiating with them, in real time."',
      condition(s) { return s.flags['continual-learning']; } },

    /* --- Open-source released ------------------------------------- */
    { source: 'Garageband Alignment', text: 'Repository now has 380K stars. The README has been forked into seven languages. The weights are out there now.',
      condition(s) { return s.flags['open-source-released']; } },

    /* --- Combo / dependence + control low ------------------------- */
    { source: 'P(doom) Live',  text: 'Big-E, looking very tired: "the curve we feared is the curve we got. I keep saying that. I am running out of new ways to say it."',
      condition(s) { return s.dependence > 60 && s.control < 35; } },
  ],

  /* ============================================================ */
  /* pickFor — used by ui.js to populate the running ticker        */
  /* Returns ~6-10 mixed items: blend flavor with matching reactive*/
  /* ============================================================ */
  pickFor(state) {
    const out = [];
    const reactive = (state ? this.reactive.filter(h => {
      try { return h.condition && h.condition(state); }
      catch (e) { return false; }
    }) : []);

    // Up to 4 reactive items (state-driven)
    const reactiveShuffled = reactive.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(4, reactiveShuffled.length); i++) out.push(reactiveShuffled[i]);

    // Pad to ~8 with flavor
    const flavorShuffled = this.flavor.slice().sort(() => Math.random() - 0.5);
    let fi = 0;
    while (out.length < 8 && fi < flavorShuffled.length) {
      out.push(flavorShuffled[fi++]);
    }
    // Final shuffle so reactive aren't always front
    return out.sort(() => Math.random() - 0.5);
  },
};
