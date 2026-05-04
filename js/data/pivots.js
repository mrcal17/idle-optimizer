/* pivots.js — Major one-way-door pivots.
   Game.pivotData.list is consumed by js/pivots.js (availability check + presentation).
   Each pivot has a condition predicate, a list of choices, and an `excludes` list of pivot ids
   that this pivot makes mutually exclusive (a taken `aligned-mission` blocks `ipo`, etc.).

   Effects mutate state directly and call Game.addLog. The js/pivots.js layer is responsible
   for setting state.pivots[id] = choiceIndex; we set it here too as a belt-and-suspenders
   so pivots taken via debug or auto-strategist also record correctly.

   Tone reference: Cookie Clicker news with a heavier ground floor. Warm, witty,
   willing to sit with a hard moment. In-world figures only. */

window.Game = window.Game || {};

Game.pivotData = {
  list: [
    /* ============================================================ */
    {
      id: 'ipo',
      title: 'IPO',
      desc: 'Take the company public.',
      flavor:
        'The bankers walked in this morning with shoes you could see your face in. They have a number for you. The number is large enough that Mira laughed when she saw it, then immediately stopped laughing.\n\n' +
        'On P(doom) Live, Big-E ran a 40-minute segment titled "The IPO Question," in which he answered the IPO question by staring at the camera for most of it. Hari Iyer at The Cycle is more direct: an op-ed went up an hour ago calling this "the moment a research bet becomes a quarterly obligation."\n\n' +
        'Senator Ngo\'s office sent a letter that is technically congratulatory and substantively a warning. Lambda Quarterly\'s editorial board is more sanguine — "capital is just compressed time," they wrote, which is the kind of thing you say when you do not have to ship a model in Q3.\n\n' +
        'Your CFO is already drafting the S-1. Your interpretability lead is already drafting their resignation, just in case.',
      condition(state) {
        return state.capabilityTier >= 2 && !state.pivots.ipo &&
          !state.pivots['aligned-mission'] && !state.pivots.acquisition;
      },
      excludes: ['aligned-mission', 'acquisition'],
      choices: [
        {
          label: 'Take it public',
          short: '+$5000, Capability research +20%, Shareholder pressure begins',
          effect(state) {
            state.money += 5000;
            state.flags['ipo'] = true;
            state.flags['shareholder-pressure'] = true;
            state.trust = Math.max(0, state.trust - 6);
            state.pivots['ipo'] = 0;
            state.stats.pivotCount++;
            Game.addLog('IPO. The lab is now answerable to the market.', 'pivot');
          },
        },
        {
          label: 'Stay private',
          short: 'No cash, no shareholder leash. Trust nudges up.',
          effect(state) {
            state.trust = Math.min(100, state.trust + 4);
            state.flags['stayed-private'] = true;
            state.pivots['ipo'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Declined IPO. The bankers left their shoes on the carpet.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'open-source',
      title: 'Open-Source the Weights',
      desc: 'Release the current frontier model\'s weights to the public.',
      flavor:
        'A draft release post sits in your COO\'s outbox. Title: "We are releasing the weights." Subtitle: "We owe an explanation." Body: not yet written.\n\n' +
        'The Council on Long-Term Risk has issued a pre-emptive statement against this, in language so careful you could grade it. Big-E is delighted in his anxious way — "good people doing the wrong thing for the right reasons," he tweeted, then deleted it, then tweeted it again.\n\n' +
        'On Lambda Quarterly\'s forum, three different threads are arguing about whether you owe this to the field. The most-upvoted comment is from someone using the handle "garageband_alignment" and reads: once you push these to a repo, no recall, no rollback, no quiet patch. They are out there and they will keep being out there long after you have stopped caring about them.\n\n' +
        'Hari Iyer is writing the piece either way. He texted to ask which version.',
      condition(state) {
        return state.capabilityTier >= 1 && !state.pivots['open-source'] &&
          !state.pivots['defense-contract'];
      },
      excludes: ['defense-contract'],
      choices: [
        {
          label: 'Release the weights',
          short: '+$1500 (ecosystem), Dependence accelerates, weights cannot be recalled',
          effect(state) {
            state.money += 1500;
            state.flags['open-source-released'] = true;
            state.dependence = Math.min(100, state.dependence + 8);
            state.trust = Math.min(100, state.trust + 5);
            state.pivots['open-source'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Weights released. The internet now has a copy of you.', 'pivot');
          },
        },
        {
          label: 'Limited research access only',
          short: '+$400, mild Trust gain, no permanent dependence',
          effect(state) {
            state.money += 400;
            state.trust = Math.min(100, state.trust + 3);
            state.flags['research-access-program'] = true;
            state.pivots['open-source'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Research-access program announced. Big-E sighs in relief, audibly.', 'pivot');
          },
        },
        {
          label: 'Keep it closed',
          short: 'No change to revenue. No flak from CLTR. Some Trust hit from openness advocates.',
          effect(state) {
            state.trust = Math.max(0, state.trust - 3);
            state.flags['closed-weights'] = true;
            state.pivots['open-source'] = 2;
            state.stats.pivotCount++;
            Game.addLog('Weights stay closed. The garageband_alignment thread moves on.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'defense-contract',
      title: 'Defense Contract',
      desc: 'A three-letter agency wants in.',
      flavor:
        'The meeting was at a building with no signage. The man across the table did not give his title and the offer was on cream-colored paper with a watermark you have seen on three other documents this year.\n\n' +
        'The numbers are stable. Stupidly stable. The kind of contract where line items are paid by appropriations bill, not invoice. Your CFO is already crying happy little CFO tears.\n\n' +
        'Senator Ngo will not comment on classified matters but has, in the past, used the phrase "national interest" in twelve different press conferences with twelve different meanings. Hari Iyer at The Cycle filed an FOIA request the moment the news leaked. The Council on Long-Term Risk has scheduled an internal call titled "What do we do about the defense thing."\n\n' +
        'Your Comms Lead asked one question: "What happens when they ask us to do something we don\'t want to do?" Nobody had an answer. The cream-colored paper is still on the table.',
      condition(state) {
        return state.capabilityTier >= 2 && !state.pivots['defense-contract'] &&
          !state.pivots['open-source'];
      },
      excludes: ['open-source', 'aligned-mission'],
      choices: [
        {
          label: 'Sign',
          short: '+$3000, Trust hit, immune to one Trust event this run',
          effect(state) {
            state.money += 3000;
            state.flags['defense-contract'] = true;
            state.flags['trust-event-shield'] = 1;
            state.trust = Math.max(0, state.trust - 10);
            state.control = Math.max(0, state.control - 2);
            state.pivots['defense-contract'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Defense contract signed. The cream paper went into a safe.', 'pivot');
          },
        },
        {
          label: 'Negotiate a research-only carveout',
          short: '+$1000, smaller Trust hit, no shield',
          effect(state) {
            state.money += 1000;
            state.trust = Math.max(0, state.trust - 3);
            state.flags['defense-research-carveout'] = true;
            state.pivots['defense-contract'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Research-only carveout signed. Smaller cheque, smaller asterisk.', 'pivot');
          },
        },
        {
          label: 'Walk away',
          short: 'No money. Trust holds. Comms Lead exhales for a full eight seconds.',
          effect(state) {
            state.trust = Math.min(100, state.trust + 2);
            state.flags['declined-defense'] = true;
            state.pivots['defense-contract'] = 2;
            state.stats.pivotCount++;
            Game.addLog('Defense offer declined. The cream-colored paper went home with the man.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'aligned-mission',
      title: 'Pivot to Aligned Mission',
      desc: 'Restructure the lab around alignment as the primary deliverable.',
      flavor:
        'You read the new charter aloud at the all-hands. Mira cried. Two engineers quit on the spot, citing "I came here to build things." A third engineer, who has been quiet for nine months, walked over and hugged your Interpretability Lead, which is the most surprising thing that has happened in this office.\n\n' +
        'Big-E posted a single-character tweet: a heart. The Council on Long-Term Risk re-shared it with the comment "we have witnessed exactly one of these." Lambda Quarterly is preparing a profile titled "Inside The Pivot."\n\n' +
        'Hari Iyer is skeptical, professionally. "Mission-flips look great on paper," he wrote, "and then the next quarter shows up." He is not wrong. The next quarter is going to show up regardless of what we put in the press release.\n\n' +
        'A whiteboard in the kitchen now reads, in Sasha\'s handwriting: WE ARE ACTUALLY GOING TO DO THIS. Underneath, in different handwriting: WE BETTER.',
      condition(state) {
        return state.capabilityTier >= 1 && !state.pivots['aligned-mission'] &&
          !state.pivots['ipo'] && !state.pivots['defense-contract'];
      },
      excludes: ['ipo', 'defense-contract', 'agent-fleet'],
      choices: [
        {
          label: 'Restructure',
          short: 'Trust regen +50%, Control drift halved, Capability gain -25%',
          effect(state) {
            state.flags['aligned-mission'] = true;
            state.trust = Math.min(100, state.trust + 12);
            state.control = Math.min(100, state.control + 6);
            state.pivots['aligned-mission'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Restructured around alignment. Mira cried. The whiteboard is now load-bearing.', 'pivot');
          },
        },
        {
          label: 'Soft alignment branding only',
          short: 'Small Trust gain, no mechanical change, you know what you did',
          effect(state) {
            state.trust = Math.min(100, state.trust + 3);
            state.flags['soft-alignment-branding'] = true;
            state.pivots['aligned-mission'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Aligned-branded. Hari Iyer is already writing the followup.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'gov-deal',
      title: 'Strike Deal with Government',
      desc: 'A formal regulatory framework with the U.S. AI Office.',
      flavor:
        'Senator Ngo herself called the office. The aide on the line was extremely calm and the calm was contagious for about four seconds, and then your COO realized what the call was about.\n\n' +
        'The proposal: a formal framework. You agree to capability caps, real-time disclosure, on-site safety inspectors. In exchange, the U.S. AI Office formally acknowledges your lab as a "trusted operator" — code, in practice, for "we will fight your shutdowns for you."\n\n' +
        'Big-E is on the record: this is "the only sane move on the board." The Council on Long-Term Risk is more measured: "appropriate, if the cap holds." The cap is the question. Caps tend not to hold under pressure, historically. The historical pressure is also currently breaking records.\n\n' +
        'Lambda Quarterly\'s editorial: "A good deal at the moment of signing is not necessarily a good deal in three years." This is true of all deals.',
      condition(state) {
        return state.capabilityTier >= 2 && !state.pivots['gov-deal'];
      },
      excludes: [],
      choices: [
        {
          label: 'Sign the framework',
          short: '+Trust +Control, capability tier capped at Lighthouse',
          effect(state) {
            state.flags['gov-deal'] = true;
            state.flags['capability-cap-lighthouse'] = true;
            state.trust = Math.min(100, state.trust + 12);
            state.control = Math.min(100, state.control + 8);
            state.pivots['gov-deal'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Government framework signed. Senator Ngo is, technically, on your side.', 'pivot');
          },
        },
        {
          label: 'Counter with voluntary commitments',
          short: 'Smaller Trust gain, no cap',
          effect(state) {
            state.trust = Math.min(100, state.trust + 5);
            state.flags['voluntary-commitments'] = true;
            state.pivots['gov-deal'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Voluntary commitments published. The aide on the line sounded tired.', 'pivot');
          },
        },
        {
          label: 'Decline',
          short: 'Senator Ngo remembers',
          effect(state) {
            state.trust = Math.max(0, state.trust - 6);
            state.flags['declined-gov-deal'] = true;
            state.pivots['gov-deal'] = 2;
            state.stats.pivotCount++;
            Game.addLog('Declined the framework. Senator Ngo will, regrettably, remember this.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'acquisition',
      title: 'Acquisition Offer',
      desc: 'A larger lab wants to buy you outright.',
      flavor:
        'The email arrived at 7:42 a.m. with the subject "Quick chat?" — three words, no signature, an attachment. The attachment is a term sheet. The term sheet has a number on it that, if you printed it out and folded it correctly, you could probably build a small house out of.\n\n' +
        'The buyer is one of the big ones. The terms are generous. The retention package is generous. The non-compete is on a different page entirely and you have not been brave enough to read it yet.\n\n' +
        'Mira has not said anything. She is sitting at her desk, looking at a model run, eating a banana very slowly. Sasha is in the kitchen, googling "what happens to small labs after acquisition." The first result is a Lambda Quarterly retrospective that opens, dryly, with "Most of them, in fact, do not survive."\n\n' +
        'Hari Iyer at The Cycle has the leak already. He has not published. He is being polite. He is also, in the same week, writing a longform he keeps calling "The Consolidation." You suspect you are now in it.',
      condition(state) {
        return state.capabilityTier >= 2 && !state.pivots['acquisition'] &&
          !state.pivots['ipo'];
      },
      excludes: ['ipo', 'aligned-mission', 'gov-deal'],
      choices: [
        {
          label: 'Sell',
          short: '+$8000, become a subsidiary, archetype tilts toward acquirer',
          effect(state) {
            state.money += 8000;
            state.flags['acquired'] = true;
            state.flags['subsidiary'] = true;
            state.dependence = Math.min(100, state.dependence + 4);
            state.pivots['acquisition'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Acquired. The new logo is going up next week. Mira finished her banana.', 'pivot');
          },
        },
        {
          label: 'Counter at 2× and walk if they refuse',
          short: 'Coin flip; if they bite, +$12000 and same effects, otherwise no deal and -Trust from leak',
          effect(state) {
            if (Math.random() < 0.4) {
              state.money += 12000;
              state.flags['acquired'] = true;
              state.flags['subsidiary'] = true;
              state.dependence = Math.min(100, state.dependence + 4);
              Game.addLog('Acquired at 2×. They blinked. The CFO is dancing in the parking lot.', 'pivot');
            } else {
              state.trust = Math.max(0, state.trust - 4);
              state.flags['acquisition-leaked'] = true;
              Game.addLog('They refused. The leak hit Hari Iyer\'s column twelve minutes later.', 'pivot');
            }
            state.pivots['acquisition'] = 1;
            state.stats.pivotCount++;
          },
        },
        {
          label: 'Decline',
          short: 'No money, your independence holds, the term sheet goes in a drawer',
          effect(state) {
            state.flags['declined-acquisition'] = true;
            state.trust = Math.min(100, state.trust + 2);
            state.pivots['acquisition'] = 2;
            state.stats.pivotCount++;
            Game.addLog('Declined the offer. Mira saved the term sheet "for the museum, someday."', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'agent-fleet',
      title: 'Deploy Autonomous Agent Fleet',
      desc: 'Spin up a global fleet of self-directed agents on top of the current model.',
      flavor:
        'The pitch deck is one of the cleanest things engineering has shipped this year. Every slide is the same shape. Every slide adds another zero to a different number.\n\n' +
        'Devi gave the talk. She walked through the architecture, the orchestration layer, the supervision policy, the kill-switch redundancy. The kill-switch slide had three layers. The three layers each had a small footnote. The footnotes were extremely small.\n\n' +
        'Big-E, who has lived to see this moment, is on a livestream right now and is, no kidding, eating a sandwich. He looked into the camera between bites and said: "they\'re going to do it. They\'re going to do it because the alternative is letting OpenLight do it first." He\'s probably right.\n\n' +
        'Lambda Quarterly\'s editor sent a one-line text: "are you sure." No question mark. The Council on Long-Term Risk has scheduled an emergency working group titled "Fleet." Just "Fleet." The minimalism is the message.\n\n' +
        'Your Comms Lead asked: "When the first agent does something we did not anticipate, what is our line?" Devi said: "We tell the truth." Comms Lead said: "About the agent, or about us?" That, no one answered.',
      condition(state) {
        return state.capabilityTier >= 3 && !state.pivots['agent-fleet'] &&
          !state.pivots['aligned-mission'];
      },
      excludes: [],
      choices: [
        {
          label: 'Launch the fleet',
          short: 'Revenue ×3, Control drift ×2, Rogue Agent events unlock',
          effect(state) {
            state.flags['agent-fleet-deployed'] = true;
            state.flags['rogue-agent-events'] = true;
            state.dependence = Math.min(100, state.dependence + 12);
            state.trust = Math.max(0, state.trust - 4);
            state.pivots['agent-fleet'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Agent fleet deployed. The footnotes are now in production.', 'pivot');
          },
        },
        {
          label: 'Limited pilot in three verticals only',
          short: 'Smaller revenue boost, smaller drift, smaller dependence',
          effect(state) {
            state.flags['agent-fleet-pilot'] = true;
            state.dependence = Math.min(100, state.dependence + 4);
            state.pivots['agent-fleet'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Limited pilot launched. Three verticals. Three layers of kill-switch.', 'pivot');
          },
        },
        {
          label: 'Shelve the project',
          short: 'No effect. Devi is heartbroken. The deck goes in the archive.',
          effect(state) {
            state.flags['agent-fleet-shelved'] = true;
            state.trust = Math.min(100, state.trust + 4);
            state.control = Math.min(100, state.control + 3);
            state.pivots['agent-fleet'] = 2;
            state.stats.pivotCount++;
            Game.addLog('Fleet shelved. Devi went home. The deck is in /archive/2026/we_didn_t.', 'pivot');
          },
        },
      ],
    },

    /* ============================================================ */
    {
      id: 'open-letter',
      title: 'The Open Letter',
      desc: 'A coalition is asking you to sign a moratorium letter on capability training.',
      flavor:
        'It started in someone else\'s inbox. Now it\'s in yours. Two thousand signatories. Three Nobel laureates. Seventeen lab directors, of varying seriousness. Big-E, of course, top of the list, in a font slightly larger than everyone else\'s, by accident or otherwise.\n\n' +
        'The text is six paragraphs. The third paragraph is the one that lands. It does not call for a ban. It calls for a pause. Six months. Independent oversight. A voluntary disclosure regime. The signatories include one person you went to college with and three people you spent the last six months explicitly not signing letters with.\n\n' +
        'Hari Iyer is writing about who signed and who didn\'t. He has a list. Your name is, at this moment, on the maybe column.\n\n' +
        'Sasha asked: "If we sign, do we have to actually do it?" The answer to this question is: yes. Yes, you do. Or your name is going to be the example in next year\'s letter, the one about how the last letter didn\'t work.',
      condition(state) {
        return state.capabilityTier >= 2 && !state.pivots['open-letter'] && Math.random() < 0.55;
      },
      excludes: [],
      choices: [
        {
          label: 'Sign',
          short: 'Trust +20, lose one full tier of capability progress',
          effect(state) {
            state.trust = Math.min(100, state.trust + 20);
            state.capability = Math.max(0, state.capability * 0.6);
            state.flags['signed-open-letter'] = true;
            state.pivots['open-letter'] = 0;
            state.stats.pivotCount++;
            Game.addLog('Open letter signed. Big-E is, briefly, beaming.', 'pivot');
          },
        },
        {
          label: 'Issue a public response declining',
          short: '-Trust, no capability cost, your name is on Hari\'s other list',
          effect(state) {
            state.trust = Math.max(0, state.trust - 10);
            state.flags['declined-open-letter'] = true;
            state.pivots['open-letter'] = 1;
            state.stats.pivotCount++;
            Game.addLog('Public decline issued. Hari moved your name to the other column.', 'pivot');
          },
        },
        {
          label: 'Stay silent',
          short: '-Trust (smaller), no cost, the silence is its own statement',
          effect(state) {
            state.trust = Math.max(0, state.trust - 4);
            state.flags['silent-on-open-letter'] = true;
            state.pivots['open-letter'] = 2;
            state.stats.pivotCount++;
            Game.addLog('No public statement. The maybe column is now a question mark.', 'pivot');
          },
        },
      ],
    },
  ],
};
