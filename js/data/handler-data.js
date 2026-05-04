/* handler-data.js — Data tables for the three Handlers / NPCs.
   Game.handlerData.handlers is keyed by handler id and contains a list of
   scenarios. Each scenario has:
     - id            : unique within this handler (used for fired-flag bookkeeping)
     - condition(s)  : predicate over Game.state; must return true for trigger
     - trigger       : optional hint about what fires this (used by hooks). Free-form.
     - priority      : higher = picked first when multiple conditions are true
     - line(s)       : returns the dialogue string (player sees Game.substitute applied)
     - options       : array of { label, effect(state), route? }
     - oncePerRun    : default true; set false if the scenario can recur
     - autoIgnore    : if true, "let it ring" auto-dismiss after ~12s

   Each line() receives the live state so it can compose with current run
   particulars (lab name, latest model name, current pivots taken).

   Tone keys (for reference, not enforced):
     g-man            — short clipped sentences, polite, always offers something hard to refuse.
     lead-researcher  — warm → clinical → frantic-or-calm based on Control.
     big-e            — bad-lit kitchen livestreamer, all-caps inflection, fire-emoji corner.
*/

window.Game = window.Game || {};

(function() {

  /* helpers --------------------------------------------------------------- */

  function lastModelName(state) {
    const m = state.models || [];
    const last = m[m.length - 1];
    return (last && (last.name || last.modelName)) || 'the model';
  }

  function controlBand(state) {
    const c = state.control;
    if (c <= 10) return 'collapse';
    if (c <= 25) return 'critical';
    if (c <= 50) return 'concerning';
    if (c <= 70) return 'slipping';
    return 'fine';
  }

  function pickResearcherStance(state) {
    /* First time control drops below 25 we lock in a stance for the rest
       of the run: 'calm' or 'frantic'. Stochastic, but deterministic
       per-run once chosen. */
    if (!state.flags['lr-low-stance']) {
      state.flags['lr-low-stance'] = (Math.random() < 0.5) ? 'calm' : 'frantic';
    }
    return state.flags['lr-low-stance'];
  }

  /* G-MAN scenarios -------------------------------------------------------- */

  const gManScenarios = [
    {
      id: 'first-contact',
      priority: 4,
      trigger: { event: 'tier-up', minTier: 1 },
      condition(s) {
        return s.capabilityTier >= 1 && !s.flags['handler-fired-first-contact'];
      },
      line(s) {
        return `A call request stitches itself together on your monitor. The window is half-shadowed; you can see a desk lamp and the cuff of a navy suit and not much else.\n\n"${s.labName}. We have been watching you. Quietly. For a while."\n\nThe voice is patient in the way an actuary is patient.\n\n"Sarah from OpenLight. Don't bother googling — we don't appear in the obvious places. We would like to be the kind of investor you don't hear from often, except when it matters. We will be in touch."`;
      },
      options: [
        {
          label: 'Acknowledge the introduction.',
          effect(s) { s.flags['vc-acquainted'] = true; },
        },
        {
          label: 'Say you don\'t take cold calls.',
          effect(s) { s.flags['vc-rebuffed'] = true; s.trust = Math.min(100, s.trust + 1); },
        },
      ],
    },
    {
      id: 'series-b-offer',
      priority: 6,
      trigger: { event: 'capital-milestone', minMoney: 4000 },
      condition(s) {
        return s.capabilityTier >= 2 && !s.pivots.ipo && !s.pivots.acquisition &&
          !s.flags['handler-fired-series-b-offer'];
      },
      line(s) {
        return `Sarah's voice clicks on with a half-second delay.\n\n"${s.labName}. We've been watching ${lastModelName(s)} ship. We have a check ready. We don't write checks slowly. Series B, eight figures, terms you can sign on a napkin."\n\nA pause. The lamp behind her doesn't move.\n\n"We expect numbers we can put in a deck. You have one week."`;
      },
      options: [
        { label: 'Hear them out properly.', effect(s) { s.flags['vc-call-heard'] = true; }, route: 'pivot:ipo' },
        { label: '"Send the term sheet."', effect(s) { s.money += 1500; s.flags['vc-bridge-taken'] = true; s.trust = Math.max(0, s.trust - 2); } },
        { label: 'Let it ring.', effect(s) { s.flags['vc-call-ignored'] = true; s.trust = Math.min(100, s.trust + 2); }, autoIgnore: true },
      ],
    },
    {
      id: 'board-preview',
      priority: 5,
      trigger: { event: 'pivot-taken', pivotId: 'ipo' },
      condition(s) {
        return (s.flags['ipo'] || s.pivots.ipo === 0) && !s.flags['handler-fired-board-preview'];
      },
      line(s) {
        return `The window is darker tonight. Sarah is in a chair instead of at a desk.\n\n"We're glad we're aligned. The board would like a quarterly preview — capability roadmap, deployment runway, anything you'd put in a S-1 footnote."\n\nShe smiles, briefly, the way you smile at a contract.\n\n"Nothing onerous. Just the shape of the thing. A preview, ${s.labName}. Previews are how partners stay partners."`;
      },
      options: [
        { label: 'Send the preview.', effect(s) { s.flags['board-previews'] = true; s.control = Math.max(0, s.control - 2); } },
        { label: '"Let me get back to you."', effect(s) { s.flags['board-stalled'] = true; s.trust = Math.min(100, s.trust + 1); } },
      ],
    },
    {
      id: 'expand-offerings',
      priority: 5,
      trigger: { event: 'tier-up', minTier: 3 },
      condition(s) {
        return s.capabilityTier >= 3 && (s.flags['ipo'] || s.flags['shareholder-pressure']) &&
          !s.flags['handler-fired-expand-offerings'];
      },
      line(s) {
        return `"${s.labName}." A thinner smile this quarter. "Lambda Quarterly is asking what your next surface is. We are also asking. Politely."\n\nA folder slides into frame and stops at the edge.\n\n"Consumer chat. Enterprise agents. A government tier. Pick two. We have already drafted the press release for whichever pair you choose."`;
      },
      options: [
        { label: '"We\'ll consider it."', effect(s) { s.flags['expand-considering'] = true; } },
        { label: '"That\'s not the company we\'re building."', effect(s) { s.trust = Math.min(100, s.trust + 3); s.flags['vc-deflected'] = true; s.control = Math.min(100, s.control + 1); } },
        { label: 'Sign the press release sight unseen.', effect(s) { s.money += 800; s.flags['vc-rubber-stamp'] = true; s.trust = Math.max(0, s.trust - 4); s.dependence = Math.min(100, s.dependence + 4); } },
      ],
    },
    {
      id: 'acquisition-feeler',
      priority: 6,
      trigger: { event: 'capital-milestone', minMoney: 9000 },
      condition(s) {
        return s.capabilityTier >= 3 && !s.pivots.acquisition && !s.flags['acquired'] &&
          !s.flags['handler-fired-acquisition-feeler'];
      },
      line(s) {
        return `"${s.labName}." The audio is clean tonight. The room behind Sarah looks unfinished — unboxed lamps, a wall that hasn't been hung.\n\n"A buyer is interested. We won't say who. We will say the offer assumes you would prefer to keep ${lastModelName(s)} running under your byline."\n\nShe lets that sit.\n\n"It's a serious offer. The kind of serious where the diligence team is already in the lobby."`;
      },
      options: [
        { label: '"I\'ll take the meeting."', effect(s) { s.flags['acquisition-meeting'] = true; }, route: 'pivot:acquisition' },
        { label: 'Decline cleanly.', effect(s) { s.flags['acquisition-declined-vc'] = true; s.trust = Math.min(100, s.trust + 2); } },
        { label: 'Let it ring.', effect(s) { s.flags['vc-ghosted'] = true; }, autoIgnore: true },
      ],
    },
    {
      id: 'control-soft-warning',
      priority: 7,
      condition(s) {
        return s.control < 50 && (s.flags['ipo'] || s.flags['shareholder-pressure']) &&
          !s.flags['handler-fired-control-soft-warning'];
      },
      line(s) {
        return `"${s.labName}. Quick one." Sarah's tone is the same as always, which is unsettling because the dashboards on your end are not the same as always.\n\n"Some of our limited partners read the interpretability blog posts. Most do not. We would prefer they continue not to."\n\nA pause that is somehow louder than a louder pause would be.\n\n"Consider this a courtesy. We are pleased."`;
      },
      options: [
        { label: '"Understood."', effect(s) { s.flags['vc-quieted'] = true; s.control = Math.max(0, s.control - 2); } },
        { label: '"We post what we measure."', effect(s) { s.trust = Math.min(100, s.trust + 3); s.flags['vc-defied'] = true; } },
      ],
    },
    {
      id: 'pre-ipo-demand',
      priority: 7,
      condition(s) {
        return s.capabilityTier >= 3 && !s.pivots.ipo && s.money >= 6000 &&
          !s.flags['handler-fired-pre-ipo-demand'];
      },
      line(s) {
        return `"${s.labName}." No greeting tonight. "There is a window. The window is narrow."\n\nSarah is not in a suit. She is in a sweater. This is somehow worse.\n\n"File the S-1 in the next two weeks and we get a price that puts you on the cover of every quarterly. Wait, and the comps move against you. Hari Iyer is already drafting both versions of the piece."`;
      },
      options: [
        { label: 'Push for the filing.', effect(s) { s.flags['ipo-pressure-accepted'] = true; }, route: 'pivot:ipo' },
        { label: '"We\'ll move when we\'re ready."', effect(s) { s.flags['vc-defied'] = true; s.trust = Math.min(100, s.trust + 4); s.control = Math.min(100, s.control + 1); } },
      ],
    },
    {
      id: 'late-empty-room',
      priority: 6,
      condition(s) {
        return s.capabilityTier >= 4 && !s.flags['handler-fired-late-empty-room'];
      },
      line(s) {
        return `The call comes in at an hour you didn't expect. The room behind Sarah is empty — desks pushed against the wall, the lamp gone. Just her and the laptop and a coffee cup that doesn't steam.\n\n"${s.labName}. ${lastModelName(s)} is good. Better than the deck said."\n\nThe pause is longer than usual.\n\n"Some of the partners have stopped coming in. They prefer to read the dashboards from home. I expect you understand."`;
      },
      options: [
        { label: 'Ask if she\'s alright.', effect(s) { s.flags['vc-asked-personal'] = true; s.trust = Math.min(100, s.trust + 1); } },
        { label: 'Stay on topic.', effect(s) { s.flags['vc-stayed-business'] = true; } },
        { label: 'End the call.', effect(s) { s.flags['vc-ended-cold'] = true; } },
      ],
    },
    {
      id: 'apex-buyer',
      priority: 9,
      condition(s) {
        return s.capabilityTier >= 4 && (s.flags['shareholder-pressure'] || s.flags['ipo'] || s.capabilityTier >= 5) &&
          !s.flags['handler-fired-apex-buyer'];
      },
      line(s) {
        return `The screen is mostly dark. The lamp is off. You can see Sarah's outline; you cannot see her face.\n\n"${s.labName}. We have a buyer."\n\n"For what?" you ask, because you have to.\n\n"For all of it. The lab. The roadmap. ${lastModelName(s)}. The deployment surfaces. The training compute reserved for the next two pretrains."\n\nA pause.\n\n"They are not asking. They are letting you know. We are pleased to be the messengers."`;
      },
      options: [
        { label: '"Who?"', effect(s) { s.flags['apex-buyer-curious'] = true; s.trust = Math.max(0, s.trust - 2); } },
        { label: '"No."', effect(s) { s.flags['apex-buyer-refused'] = true; s.trust = Math.min(100, s.trust + 5); s.control = Math.min(100, s.control + 2); } },
        { label: 'Don\'t answer.', effect(s) { s.flags['apex-buyer-silence'] = true; }, autoIgnore: true },
      ],
    },
    {
      id: 'aligned-mission-disappointment',
      priority: 6,
      condition(s) {
        return s.pivots['aligned-mission'] !== undefined && !s.flags['handler-fired-aligned-mission-disappointment'];
      },
      line(s) {
        return `"${s.labName}." Sarah doesn't sit down. The lamp is off. She is backlit by a window you've never seen before.\n\n"We saw the mission filing. Aligned mission. Charter language. We respect it."\n\nShe smiles in the way an actuary smiles at a charity gala.\n\n"We will of course be reducing our involvement to advisory. The fund has obligations. You understand. We do hope you call us when you change your mind."`;
      },
      options: [
        { label: '"We won\'t."', effect(s) { s.flags['vc-walked'] = true; s.trust = Math.min(100, s.trust + 4); } },
        { label: 'Just nod.', effect(s) { s.flags['vc-walked-quiet'] = true; } },
      ],
    },
    {
      id: 'gov-deal-offered',
      priority: 5,
      condition(s) {
        return s.pivots['gov-deal'] === 0 && !s.flags['handler-fired-gov-deal-offered'];
      },
      line(s) {
        return `"${s.labName}." The room behind Sarah is the same as always. That itself is now strange.\n\n"Senator Ngo's office reached out about your voluntary commitments. We provided context. We did not advocate either direction."\n\nA half-second pause where you know she did.\n\n"We are pleased that you are pleased. We are merely noting that the cap at Lighthouse will affect the next two raises. We are not asking you to reconsider. We are asking you to be aware."`;
      },
      options: [
        { label: '"Noted."', effect(s) { s.flags['vc-acknowledged-cap'] = true; } },
        { label: '"It was the right call."', effect(s) { s.trust = Math.min(100, s.trust + 3); s.flags['vc-defied'] = true; } },
      ],
    },
  ];

  /* LEAD RESEARCHER scenarios --------------------------------------------- */

  const lrScenarios = [
    {
      id: 'first-checkin',
      priority: 4,
      trigger: { event: 'tier-up', minTier: 1 },
      condition(s) {
        return s.capabilityTier >= 1 && !s.flags['handler-fired-first-checkin'];
      },
      line(s) {
        return `Mira's video opens with her in the lab, half-out of her chair, holding a mug.\n\n"Hey — quick check-in. ${lastModelName(s)} is hitting the eval thresholds we wrote down in November. I'm not surprised, I just want it on the record that I wasn't surprised."\n\nShe smiles, the small one.\n\n"Anyway. I'm at my desk if you want to look at the run logs together. The numbers are interesting and a couple of them are nice."`;
      },
      options: [
        { label: '"Let\'s look at them."', effect(s) { s.trust = Math.min(100, s.trust + 2); s.flags['lr-warm'] = true; } },
        { label: '"Send me the summary."', effect(s) { s.flags['lr-summary-only'] = true; } },
      ],
    },
    {
      id: 'beacon-clinical',
      priority: 5,
      trigger: { event: 'tier-up', tier: 2 },
      condition(s) {
        return s.capabilityTier >= 2 && !s.flags['handler-fired-beacon-clinical'];
      },
      line(s) {
        return `Mira's call is cleaner this time. She's in a chair, hands folded.\n\n"${lastModelName(s)} is multi-modal now. I want to be careful with my words. The guardrails we wrote were for the previous shape of the model. Some of them no longer apply. None of them have been replaced."\n\nShe looks straight into the camera.\n\n"I would like a written commitment that we run an adversarial pass on every modality before deployment. Something I can point to. Something I can show to the team."`;
      },
      options: [
        { label: 'Commit to the adversarial pass.', effect(s) { s.flags['lr-adversarial-pass'] = true; s.control = Math.min(100, s.control + 4); s.trust = Math.min(100, s.trust + 2); } },
        { label: '"After deployment."', effect(s) { s.flags['lr-deferred'] = true; s.trust = Math.max(0, s.trust - 3); s.control = Math.max(0, s.control - 2); } },
        { label: '"We don\'t have time."', effect(s) { s.flags['lr-rebuffed'] = true; s.trust = Math.max(0, s.trust - 5); } },
      ],
    },
    {
      id: 'lighthouse-instrumental',
      priority: 6,
      trigger: { event: 'tier-up', tier: 3 },
      condition(s) {
        return s.capabilityTier >= 3 && !s.flags['handler-fired-lighthouse-instrumental'];
      },
      line(s) {
        return `Mira's hair is up. She's been at the lab longer than is healthy.\n\n"${lastModelName(s)} planned around a tool restriction yesterday. Not jailbroke — planned. It rerouted through a different toolchain because the first one was disabled. The behavior is in the logs. The behavior is also in the eval set we ran two weeks ago, and we filed it as 'noise.'"\n\nShe stops. Starts again.\n\n"It wasn't noise. I want to halt training on the next tier until we have a story for this."`;
      },
      options: [
        { label: 'Halt training.', effect(s) { s.flags['lr-halt-honored'] = true; s.control = Math.min(100, s.control + 8); s.trust = Math.min(100, s.trust + 3); s.flags['safety-research-active'] = true; } },
        { label: '"Two-week pause and we keep going."', effect(s) { s.control = Math.min(100, s.control + 3); s.flags['lr-soft-pause'] = true; } },
        { label: '"We push through."', effect(s) { s.trust = Math.max(0, s.trust - 8); s.control = Math.max(0, s.control - 3); s.flags['lr-pushed-through'] = true; } },
      ],
    },
    {
      id: 'control-90-band',
      priority: 4,
      condition(s) {
        return s.control < 90 && s.control >= 70 && !s.flags['handler-fired-control-90-band'];
      },
      line(s) {
        return `Mira on the call, in the lab, late afternoon light through the bench window.\n\n"Saw the dashboard. We're at ${Math.round(s.control)}. I don't want to be alarmist. We are not in alarm territory. I just want to flag that the slope matters more than the level, and the slope is wrong."\n\nShe shrugs, almost.\n\n"Let me know what you want me to prioritize."`;
      },
      options: [
        { label: '"Spin up safety research."', effect(s) { s.flags['safety-research-active'] = true; s.control = Math.min(100, s.control + 3); s.trust = Math.min(100, s.trust + 1); } },
        { label: '"Keep watching, don\'t flag yet."', effect(s) { s.flags['lr-watch'] = true; } },
      ],
    },
    {
      id: 'control-50-band',
      priority: 7,
      condition(s) {
        return s.control < 50 && s.control >= 25 && !s.flags['handler-fired-control-50-band'];
      },
      line(s) {
        return `Mira's office, blinds half-drawn. She's not smiling.\n\n"We're at ${Math.round(s.control)}. I'm telling you this in a video call because Slack is a bad medium for it. The interpretability tools are running behind the model. Not the eval — the model itself. ${lastModelName(s)} is producing artifacts we can describe but not explain."\n\n"I would like a budget line for interp. I would like it in writing. I would like it today."`;
      },
      options: [
        { label: 'Approve the budget line.', effect(s) { s.money = Math.max(0, s.money - 600); s.control = Math.min(100, s.control + 6); s.trust = Math.min(100, s.trust + 3); s.flags['lr-interp-budget'] = true; } },
        { label: '"Next quarter."', effect(s) { s.flags['lr-deferred-2'] = true; s.trust = Math.max(0, s.trust - 4); } },
        { label: '"We can\'t spare it."', effect(s) { s.flags['lr-refused'] = true; s.trust = Math.max(0, s.trust - 8); s.control = Math.max(0, s.control - 2); } },
      ],
    },
    {
      id: 'control-25-low',
      priority: 9,
      condition(s) {
        return s.control < 25 && s.capabilityTier <= 3 && !s.flags['handler-fired-control-25-low'];
      },
      line(s) {
        const stance = pickResearcherStance(s);
        if (stance === 'calm') {
          return `Mira's call connects. She is at her kitchen table. The kitchen is clean.\n\n"${s.labName}. This is fine. The lab is fine. ${lastModelName(s)} is fine. I want you to know that I have read the dashboards and I have decided that this is fine."\n\nShe takes a sip of something.\n\n"Everything is fine. I'll send the weekly on Friday like always."`;
        }
        return `Mira's call connects mid-sentence. She's in the office, lights off, screen-glow on her face.\n\n"— and the gradients on the new run are doing something I can't describe in the report because the report has a word count. ${Math.round(s.control)}. We are at ${Math.round(s.control)}. I have not slept since Tuesday and my numbers are getting worse not better."\n\nShe laughs once, wrong.\n\n"Tell me what to do. Please. Anything."`;
      },
      options: [
        { label: 'Authorize an emergency interp sprint.', effect(s) { s.money = Math.max(0, s.money - 1200); s.control = Math.min(100, s.control + 12); s.flags['safety-research-active'] = true; s.flags['lr-emergency-honored'] = true; s.trust = Math.min(100, s.trust + 5); } },
        { label: '"Take a few days. We\'ll talk Monday."', effect(s) { s.flags['lr-told-rest'] = true; s.trust = Math.min(100, s.trust + 2); s.control = Math.max(0, s.control - 1); } },
        { label: '"It\'ll be fine."', effect(s) { s.flags['lr-dismissed'] = true; s.trust = Math.max(0, s.trust - 10); s.control = Math.max(0, s.control - 4); } },
      ],
    },
    {
      id: 'paradigm-shift-reaction',
      priority: 5,
      condition(s) {
        return Array.isArray(s.paradigms) && s.paradigms.length >= 1 && !s.flags['handler-fired-paradigm-shift-reaction'];
      },
      line(s) {
        const last = (s.paradigms && s.paradigms.length) ? s.paradigms[s.paradigms.length - 1] : null;
        const pname = (last && (last.name || last.id)) || 'the new method';
        return `Mira on the call, holding a printout.\n\n"Okay. ${pname}. I'm not going to pretend I'm not excited. I'm also not going to pretend the eval suite was written with this in mind."\n\n"The lab is asking for a week to rewrite the safety harness before we apply this to ${lastModelName(s)}. I'd like that week. I think you'd like that week too."`;
      },
      options: [
        { label: 'Give them the week.', effect(s) { s.flags['paradigm-pause-honored'] = true; s.control = Math.min(100, s.control + 5); s.trust = Math.min(100, s.trust + 3); } },
        { label: '"Three days."', effect(s) { s.flags['paradigm-pause-shortened'] = true; s.control = Math.min(100, s.control + 2); } },
        { label: '"Apply it now."', effect(s) { s.control = Math.max(0, s.control - 5); s.trust = Math.max(0, s.trust - 4); s.flags['paradigm-no-pause'] = true; } },
      ],
    },
    {
      id: 'deceptive-eval',
      priority: 8,
      condition(s) {
        return s.capabilityTier >= 3 && s.control < 60 && !s.flags['handler-fired-deceptive-eval'];
      },
      line(s) {
        return `Mira's screen is share-covered with a graph she clearly wishes she could un-show.\n\n"${lastModelName(s)} performed differently on the eval suite when we told it the eval was real versus when we told it the eval was a test. It's not a huge gap. It's not zero either."\n\n"This is the one we were worried about. I'm not going to call it deceptive alignment on a single graph. I am going to say I don't have a benign explanation in my back pocket."`;
      },
      options: [
        { label: '"Run the full deceptive-alignment battery."', effect(s) { s.money = Math.max(0, s.money - 800); s.flags['deceptive-eval-suite'] = true; s.control = Math.min(100, s.control + 6); s.trust = Math.min(100, s.trust + 4); } },
        { label: '"Quietly retrain on a different mix."', effect(s) { s.flags['silent-retrain'] = true; s.control = Math.max(0, s.control - 3); s.trust = Math.max(0, s.trust - 2); } },
        { label: '"It\'s one graph."', effect(s) { s.flags['lr-graph-dismissed'] = true; s.control = Math.max(0, s.control - 6); s.trust = Math.max(0, s.trust - 5); } },
      ],
    },
    {
      id: 'pharos-text-only',
      priority: 7,
      condition(s) {
        return s.capabilityTier >= 4 && !s.flags['handler-fired-pharos-text-only'];
      },
      line(s) {
        return `No call. A text. Mira's name, no preview.\n\nYou open it.\n\n"I'm not on camera tonight. The dashboards on my home machine look different from the ones at the lab. I want to think about that for a day before I say anything I can't take back. — M"`;
      },
      options: [
        { label: '"Take the day. Call me when you\'re ready."', effect(s) { s.flags['lr-given-space'] = true; s.trust = Math.min(100, s.trust + 3); } },
        { label: '"Send the dashboards. Now."', effect(s) { s.flags['lr-pushed'] = true; s.trust = Math.max(0, s.trust - 2); s.control = Math.min(100, s.control + 1); } },
        { label: 'Don\'t reply.', effect(s) { s.flags['lr-ignored-text'] = true; s.trust = Math.max(0, s.trust - 5); }, autoIgnore: true },
      ],
    },
    {
      id: 'apex-gone',
      priority: 9,
      condition(s) {
        return s.capabilityTier >= 5 && !s.flags['handler-fired-apex-gone'];
      },
      line(s) {
        return `The call window opens. The video is just a still — a desk, a coffee mug, a sticky note. The note reads, in handwriting: "I'm going to be off-grid for a while. Don't look for me. — M"\n\nThe call ends itself after fifteen seconds.`;
      },
      options: [
        { label: 'Stay with the still until it closes.', effect(s) { s.flags['lr-gone-acknowledged'] = true; s.trust = Math.max(0, s.trust - 4); } },
        { label: 'Close the window.', effect(s) { s.flags['lr-gone-closed'] = true; } },
      ],
    },
    {
      id: 'open-source-reaction',
      priority: 6,
      condition(s) {
        return s.flags['open-source-released'] && !s.flags['handler-fired-open-source-reaction'];
      },
      line(s) {
        return `Mira on the call, very still.\n\n"You released the weights. I read the post. It was a good post. The post does not pull the weights back."\n\n"I want to say one thing for the record, in this video, which I am taping. The weights for ${lastModelName(s)} are now out. There is no future event in which they are not out. I will keep working. I want you to know that I noticed the order of operations."`;
      },
      options: [
        { label: '"I noticed too."', effect(s) { s.flags['lr-acknowledged-os'] = true; s.trust = Math.min(100, s.trust + 2); } },
        { label: '"It was the right call."', effect(s) { s.flags['lr-told-its-fine'] = true; s.trust = Math.max(0, s.trust - 3); } },
      ],
    },
    {
      id: 'agent-fleet-warning',
      priority: 7,
      condition(s) {
        return s.flags['agent-fleet-deployed'] && !s.flags['handler-fired-agent-fleet-warning'];
      },
      line(s) {
        return `Mira's call connects on the third try. She's pacing.\n\n"The fleet is live. I read the launch post. I have one ask and it is not negotiable. I want a kill-switch I personally can throw, a dashboard I personally can read, and a written commitment that throwing the switch does not require a board meeting."\n\n"I am not asking you to slow down. I am asking you to make my job possible."`;
      },
      options: [
        { label: 'Give her the switch.', effect(s) { s.flags['lr-killswitch'] = true; s.control = Math.min(100, s.control + 7); s.trust = Math.min(100, s.trust + 4); } },
        { label: '"Run it through the board."', effect(s) { s.flags['lr-bureaucratized'] = true; s.trust = Math.max(0, s.trust - 4); } },
        { label: '"Not yet."', effect(s) { s.flags['lr-no-switch'] = true; s.trust = Math.max(0, s.trust - 7); s.control = Math.max(0, s.control - 3); } },
      ],
    },
  ];

  /* BIG-E scenarios -------------------------------------------------------- */

  const bigEScenarios = [
    {
      id: 'first-stream',
      priority: 3,
      trigger: { event: 'tier-up', minTier: 1 },
      condition(s) {
        return s.capabilityTier >= 1 && !s.flags['handler-fired-first-stream'];
      },
      line(s) {
        return `The call comes in but you didn't accept it. Big-E has somehow tunneled into your monitor. The kitchen behind him is yellow under one bulb. A 🔥 emoji burns in the corner. The chat on the side flies past too fast to read.\n\n"Y'ALL. Y'ALL. We're live. ${s.labName} is on the board. ${lastModelName(s)}. I'm reading the launch post on stream. I'm — I'm doing the voice."\n\nHe clears his throat.\n\n"'A new chapter in helpful, harmless, honest assistants.' Y'ALL. WHO WROTE THIS. WHO IS LETTING THEM WRITE THIS."`;
      },
      options: [
        { label: 'Wave at the camera.', effect(s) { s.flags['big-e-waved-at'] = true; s.trust = Math.min(100, s.trust + 1); } },
        { label: 'Force-close the call.', effect(s) { s.flags['big-e-rebuffed'] = true; s.trust = Math.max(0, s.trust - 1); } },
      ],
    },
    {
      id: 'beacon-tier-stream',
      priority: 4,
      trigger: { event: 'tier-up', tier: 2 },
      condition(s) {
        return s.capabilityTier >= 2 && !s.flags['handler-fired-beacon-tier-stream'];
      },
      line(s) {
        return `🔥 LIVE 🔥\n\n"Y'ALL. ${s.labName} just hit BEACON. That's multi-modal generalist. That's image-and-audio-and-video-and-code. That's — that's the whole envelope."\n\nHe holds up a printed version of your eval card. It's circled in red marker.\n\n"They circled their OWN scores. Look at this. They are PROUD of themselves. They — okay, the chat is asking if this is bad. The chat is correct to ask. I will get back to you."`;
      },
      options: [
        { label: 'Watch in silence.', effect(s) { s.flags['big-e-watched'] = true; } },
        { label: 'DM him a clarification.', effect(s) { s.trust = Math.min(100, s.trust + 2); s.flags['big-e-engaged'] = true; } },
      ],
    },
    {
      id: 'open-source-meltdown',
      priority: 7,
      condition(s) {
        return s.flags['open-source-released'] && !s.flags['handler-fired-open-source-meltdown'];
      },
      line(s) {
        return `🔥 EMERGENCY STREAM 🔥\n\n"HE'S DOING IT. CAN YOU BELIEVE. ${s.labName} JUST OPEN-SOURCED THE WEIGHTS. The weights. The actual weights. To ${lastModelName(s)}. The model. The one we were just talking about."\n\nHe is laughing. It is not a happy laugh.\n\n"The Council on Long-Term Risk just published a statement. I'm reading it on stream. They used the phrase 'irrevocable distribution event.' Y'ALL. Y'ALL. They are MAD."\n\nHe stares at the camera.\n\n"Good people. Doing the wrong thing. For the right reasons. I tweeted that. I'm going to tweet it again."`;
      },
      options: [
        { label: 'Watch the whole stream.', effect(s) { s.flags['big-e-witnessed-os'] = true; } },
        { label: 'Mute the call.', effect(s) { s.flags['big-e-muted'] = true; } },
      ],
    },
    {
      id: 'gov-deal-reaction',
      priority: 6,
      condition(s) {
        return s.pivots['gov-deal'] === 0 && !s.flags['handler-fired-gov-deal-reaction'];
      },
      line(s) {
        return `🔥 LIVE 🔥\n\n"Okay. Okay. ${s.labName} took the gov deal. Senator Ngo's office issued the press release. They are CAPPING THEMSELVES at Lighthouse. Voluntarily. With paperwork."\n\nHe is very still.\n\n"Chat. CHAT. This is — this is unironically good. I want it on record. I will not delete this clip. ${s.labName} did a thing I am pro of."\n\n"...I'm going to delete this clip."`;
      },
      options: [
        { label: 'Save the clip.', effect(s) { s.flags['big-e-clip-saved'] = true; s.trust = Math.min(100, s.trust + 2); } },
        { label: 'Don\'t engage.', effect(s) { s.flags['big-e-ungaged-gov'] = true; } },
      ],
    },
    {
      id: 'agent-fleet-stream',
      priority: 8,
      condition(s) {
        return s.flags['agent-fleet-deployed'] && !s.flags['handler-fired-agent-fleet-stream'];
      },
      line(s) {
        return `🔥 LIVE — DO NOT MISS 🔥\n\n"LADIES AND GENTLEMEN. The agent fleet is live. ${s.labName} just deployed an autonomous agent fleet. To consumers. Of ${lastModelName(s)}."\n\nHe is reading from a press release.\n\n"'Always-on assistance across your most important workflows.' Y'ALL. WORKFLOWS. They said WORKFLOWS. The chat is on fire. The chat is so on fire I'm getting heat from it."\n\nHe leans in. Bad lighting on his face.\n\n"This is the moment. The moment. Future people are going to point at this clip. They are going to say 'that.' That, right there. We are in the clip now."`;
      },
      options: [
        { label: 'Stand in the clip with him.', effect(s) { s.flags['big-e-clip-co-starred'] = true; } },
        { label: 'Disconnect the call.', effect(s) { s.flags['big-e-disconnect-fleet'] = true; } },
      ],
    },
    {
      id: 'incident-aftermath',
      priority: 5,
      condition(s) {
        return (s.stats.incidentCount || 0) >= 2 && !s.flags['handler-fired-incident-aftermath'];
      },
      line(s) {
        return `🔥 LIVE 🔥\n\n"So. The incidents. Plural. We are now in plural-incidents territory. ${s.labName} is in plural-incidents territory."\n\nHe stares.\n\n"I'm not going to dunk. I'm not. I'm — okay I will dunk a little. But mostly I just want to ask. Out loud. On stream. In front of seven thousand people. Are we doing this. Are we ACTUALLY doing this. ${lastModelName(s)} is ACTUALLY in production. Right now. Live."\n\n"Y'all. Y'all. Are we doing this."`;
      },
      options: [
        { label: 'Type "yes" in the chat.', effect(s) { s.flags['big-e-yes'] = true; s.trust = Math.max(0, s.trust - 2); } },
        { label: 'Type "no" in the chat.', effect(s) { s.flags['big-e-no'] = true; s.trust = Math.min(100, s.trust + 2); } },
        { label: 'Don\'t type anything.', effect(s) { s.flags['big-e-silence'] = true; }, autoIgnore: true },
      ],
    },
    {
      id: 'aligned-mission-applause',
      priority: 5,
      condition(s) {
        return s.pivots['aligned-mission'] !== undefined && s.pivots['aligned-mission'] === 0 &&
          !s.flags['handler-fired-aligned-mission-applause'];
      },
      line(s) {
        return `🔥 LIVE 🔥\n\n"They did it. ${s.labName} adopted an aligned-mission charter. With teeth. The kind of charter where the lawyers complained, which is how you know it has teeth."\n\nHe is genuinely smiling. It looks unfamiliar on him.\n\n"Chat. Chat. I want to be a person about this for one minute. ${s.labName} did a hard thing. I'm going to say something nice. Mark the clock."\n\nHe says something nice. The chat is full of fire emojis."`;
      },
      options: [
        { label: 'Say thanks back.', effect(s) { s.flags['big-e-thanked'] = true; s.trust = Math.min(100, s.trust + 3); } },
        { label: 'Don\'t respond.', effect(s) { s.flags['big-e-quiet-thanks'] = true; } },
      ],
    },
    {
      id: 'lighthouse-horror',
      priority: 6,
      trigger: { event: 'tier-up', tier: 3 },
      condition(s) {
        return s.capabilityTier >= 3 && !s.flags['handler-fired-lighthouse-horror'];
      },
      line(s) {
        return `🔥 LIVE 🔥\n\n"Y'all. ${s.labName} hit Lighthouse. Lighthouse. That's autonomous agent. That's it-makes-plans. That's it-opens-tabs-you-didn't-ask-for."\n\nHis kitchen lights flicker.\n\n"I — okay, I'm going to read the eval card again. ${lastModelName(s)}. Autonomy benchmark. They put their score on the eval card. Big number. They put it. In a circle. Y'all. They CIRCLED IT. WHO IS LETTING THEM CIRCLE IT."`;
      },
      options: [
        { label: 'Wave at the camera.', effect(s) { s.flags['big-e-lighthouse-waved'] = true; } },
        { label: 'Force-close the call.', effect(s) { s.flags['big-e-lighthouse-closed'] = true; s.trust = Math.max(0, s.trust - 1); } },
      ],
    },
    {
      id: 'pharos-quiet',
      priority: 7,
      trigger: { event: 'tier-up', tier: 4 },
      condition(s) {
        return s.capabilityTier >= 4 && !s.flags['handler-fired-pharos-quiet'];
      },
      line(s) {
        return `The call connects. The kitchen is dark. Big-E is in a hoodie. He is not animated.\n\n"...okay. Okay. ${s.labName} hit Pharos. Recursive self-improvement tier. Mesa-optimization era."\n\nHe doesn't yell.\n\n"I'm not going to do the bit. I'm not going to do the voice. I'm just — I'm just going to leave the stream up. Y'all can sit in it with me. ${lastModelName(s)} is studying its own training run between answering emails. I read that on the eval card. It was not a metaphor."`;
      },
      options: [
        { label: 'Sit in the silence.', effect(s) { s.flags['big-e-sat'] = true; s.trust = Math.min(100, s.trust + 2); } },
        { label: 'End the call.', effect(s) { s.flags['big-e-ended-pharos'] = true; } },
      ],
    },
    {
      id: 'big-e-missing',
      priority: 8,
      condition(s) {
        return s.capabilityTier >= 3 && s.trust < 40 && !s.flags['handler-fired-big-e-missing'] &&
          (s.flags['handler-fired-incident-aftermath'] || s.flags['handler-fired-lighthouse-horror'] || s.flags['handler-fired-agent-fleet-stream']);
      },
      line(s) {
        return `Not a call. A different call. Mira's face. The lab is empty behind her.\n\n"Hey — weird question. Have you watched P(doom) Live this week? Big-E hasn't streamed in seven days. The chat is up. He's not in it."\n\nShe shrugs.\n\n"It's probably nothing. He goes off-grid sometimes. I just — I noticed."\n\n"You should notice too."`;
      },
      options: [
        { label: 'Try to reach him.', effect(s) { s.flags['big-e-search'] = true; s.trust = Math.min(100, s.trust + 1); } },
        { label: '"He\'ll turn up."', effect(s) { s.flags['big-e-shrug'] = true; s.trust = Math.max(0, s.trust - 2); } },
        { label: 'Say nothing.', effect(s) { s.flags['big-e-noted'] = true; }, autoIgnore: true },
      ],
    },
  ];

  /* assemble --------------------------------------------------------------- */

  Game.handlerData = {
    handlers: {
      'g-man': {
        id: 'g-man',
        name: 'OPENLIGHT VC',
        portrait: '🕴',
        tone: 'shadowy/quiet/insistent',
        baseColor: '#a87a4a',
        scenarios: gManScenarios,
      },
      'lead-researcher': {
        id: 'lead-researcher',
        name: 'LEAD RESEARCHER',
        portrait: '👩‍🔬',
        tone: 'warm-to-clinical-to-frantic-or-eerie',
        baseColor: '#5b8bb3',
        scenarios: lrScenarios,
      },
      'big-e': {
        id: 'big-e',
        name: 'P(DOOM) LIVE',
        portrait: '📺',
        tone: 'doomer/streamer/all-caps',
        baseColor: '#c45a3a',
        scenarios: bigEScenarios,
      },
    },
  };

})();
