/* stage-cinematics.js — Scripted cinematic moments for act transitions.
   Three acts: Garage (Spark/Ember), Lab (Beacon/Lighthouse), Org (Pharos/Apex).
   The opening cinematic plays at run start. Each Garage→Lab and Lab→Org
   transition has a generic version plus per-archetype variants.

   Each cinematic is a plain data object — Game.stages.showCinematic
   reads {actLabel, title, flavor, changes} and Game.substitute resolves
   the {lab} / {model} placeholders before render.

   Tone references: late-period Halt and Catch Fire, Severance threshold
   moments. A door closing on something the player liked, another opening.
*/

window.Game = window.Game || {};

Game.stageCinematics = (function() {

  /* ============================================================
     OPENING — every run, regardless of archetype.
     "Welcome to the Garage." First day of the lab.
     ============================================================ */
  const opening = {
    id: 'opening-garage',
    fromStage: 0,
    toStage: 1,
    actLabel: 'ACT I',
    title: 'The Garage',
    flavor:
      "The lease on the unit ran out three weeks ago, but the landlord — Hari Iyer's cousin, as it turns out — keeps forgetting to chase you. There is one folding table. There is a coffee machine you brought from home. There is the chip humming under the desk like an animal that just woke up.\n\n" +
      "Today is day one of {lab}.\n\n" +
      "You taped the founding doc to the inside of the door so the FedEx guy doesn't read it. The TV on the workbench is muted but Lambda Quarterly is running B-roll of someone else's compute farm — twelve thousand racks lit up like a city. You change the channel. Big-E is doing a livestream from a kitchen somewhere, telling four million teenagers that the next year is going to bend the curve of history. He might be right. He's been right before.\n\n" +
      "The chip hums. The coffee is bitter. The whiteboard is empty. You uncap a marker.",
    changes: [
      { icon: '🔥', text: 'Day 1. The lab is you, the chip, and a folding table.' },
      { icon: '📺', text: 'P(doom) Live is on in the background. It will not stop.' },
      { icon: '🪑', text: 'Every action costs energy. There is no one to delegate to yet.' },
    ],
  };

  /* ============================================================
     GARAGE → LAB (generic + 4 archetype variants)
     The garage gets a moving truck. Things you liked end.
     ============================================================ */
  const garageToLabGeneric = {
    id: 'garage-to-lab-generic',
    fromStage: 1, toStage: 2,
    actLabel: 'ACT II',
    title: 'The Lab',
    flavor:
      "The movers came on a Tuesday. They wrapped the espresso machine in three layers of bubble wrap because Mira asked them to — she had been the one who fixed it twice when it leaked. The folding table did not make the trip. Someone made the call to throw it out and nobody told you.\n\n" +
      "{lab} has hallways now. You have a corner office with a door that closes. The door is heavier than you expected — solid, weighted, the kind that costs money. The first time you closed it for a meeting you stood there afterward, alone in the new quiet, and noticed you couldn't hear the chips anymore. The chips are two floors down behind keycard-locked doors. Beacon-tier compute lives on a raised floor with humidity sensors and a guy named Devi whose job is to walk between the racks at 3am.\n\n" +
      "Hari Iyer's number is in the COO's contacts now. Not yours. The COO is also new.\n\n" +
      "Senator Ngo's office sent a polite letter requesting a tour next quarter. You will say yes.",
    changes: [
      { icon: '🏢', text: 'New building. Beacon-tier compute lives on a raised floor.' },
      { icon: '👥', text: 'You are no longer the only person who knows the codebase.' },
      { icon: '⚙', text: 'Up to 3 training runs in parallel.' },
      { icon: '📅', text: 'The cadence has shifted. Weeks are starting to feel like the unit.' },
    ],
  };

  const garageToLabFrontier = {
    id: 'garage-to-lab-frontier',
    fromStage: 1, toStage: 2, archetypeId: 'frontier',
    actLabel: 'ACT II',
    title: 'The Lab',
    flavor:
      "The Series B closed at 11:47pm on a Thursday. By Saturday morning there were six new hires in the parking lot of the old garage, looking confused, because the address on the offer letter was a building you had not yet leased.\n\n" +
      "{lab} is in the new building by Wednesday. The rack delivery overlapped with the sign installation; for one afternoon there were forklifts inside and forklifts outside and the racket was so loud Mira put noise-cancelling headphones on her cat, which she had brought to work, because she had been working seven days straight and there was nowhere else to put it.\n\n" +
      "Lambda Quarterly ran your photo on the cover. The caption: 'They're not waiting.' Big-E retweeted it with a fire emoji. Senator Ngo's office sent a less polite letter than they sent the other labs.\n\n" +
      "You closed the door of the new corner office and realized you missed the folding table. Then you opened the door, because there was a meeting, because there were now meetings.",
    changes: [
      { icon: '🔥', text: 'Series B funded the new building. Beacon racks on-site.' },
      { icon: '📰', text: 'Lambda Quarterly cover. Big-E noticed.' },
      { icon: '⚙', text: 'Up to 3 training runs in parallel.' },
      { icon: '🪪', text: 'Six new hires you have not met yet are waiting in the lobby.' },
    ],
  };

  const garageToLabSafety = {
    id: 'garage-to-lab-safety',
    fromStage: 1, toStage: 2, archetypeId: 'safety',
    actLabel: 'ACT II',
    title: 'The Lab',
    flavor:
      "The Committee approved the move with three signatures and one abstention. The abstaining member wrote a memo that the new floor plan would, quote, 'create distance between the people writing the model and the people interpreting it.' The memo went into the binder. The lease was signed anyway.\n\n" +
      "{lab} now has a hallway. The interp team is at one end and the capabilities team is at the other and someone, in the first week, posted a hand-drawn sign on the kitchen door that said 'NEUTRAL TERRITORY — NO ARGUING ABOUT THE BENCHMARKS.'\n\n" +
      "Beacon-tier compute came in on a flatbed at 4am to avoid the protestors who had started showing up at the old garage. There were not many of them. They were polite. One of them brought you coffee. CLTR sent a quarterly grant with a personal note from the chair. The note said: 'You are doing this the right way. Please keep doing it the right way.'\n\n" +
      "Mira Park saved one of the old whiteboards from the garage. She mounted it in the hallway, frame and all, with the original chemistry on it untouched. People stop to read it.",
    changes: [
      { icon: '🛡', text: 'Oversight Committee on-site. Charter framed in the lobby.' },
      { icon: '🏢', text: 'Interp wing and capability wing on opposite ends of the hall.' },
      { icon: '⚙', text: 'Up to 3 training runs in parallel.' },
      { icon: '☕', text: 'A protestor brought you coffee. You drank it.' },
    ],
  };

  const garageToLabOpensource = {
    id: 'garage-to-lab-opensource',
    fromStage: 1, toStage: 2, archetypeId: 'opensource',
    actLabel: 'ACT II',
    title: 'The Lab',
    flavor:
      "GitHub Sponsors hit a number that shocked you. The grant from a foundation you'd never heard of came through with no strings attached. By the time you signed the lease, the README on the project repo had been translated into eleven languages by people you have never met and never paid.\n\n" +
      "{lab} is in a real building now. The movers were three contributors who flew in from out of state because someone in the Discord said help was needed. They would not take cash. You bought them lunch.\n\n" +
      "Beacon-tier compute is on the floor below. The machines run public dashboards — anyone with the URL can watch the loss curves in real time, which a few people have made a hobby of. Lambda Quarterly ran a piece titled 'The Open-Weights Question' and quoted you twice, both times slightly out of context.\n\n" +
      "On the wall by the door someone hung a printout: every release tag, with dates. There are seven so far. The list is a one-way door. You stand in front of it sometimes.",
    changes: [
      { icon: '🌐', text: 'New building paid for by sponsors and one quiet foundation.' },
      { icon: '📡', text: 'Beacon racks live-stream loss curves to anyone watching.' },
      { icon: '⚙', text: 'Up to 3 training runs in parallel.' },
      { icon: '🚪', text: 'Seven releases on the wall. Each one is permanent.' },
    ],
  };

  const garageToLabResearch = {
    id: 'garage-to-lab-research',
    fromStage: 1, toStage: 2, archetypeId: 'research',
    actLabel: 'ACT II',
    title: 'The Lab',
    flavor:
      "The university extension came through. The dean of computing, who had been quietly skeptical for two years, asked you to lunch and afterward signed off on the wing. Your name will not be on the door. The Senior PI's name will. This was always the deal.\n\n" +
      "{lab} occupies the third floor of a building that used to be a particle physics annex. The Lab Bench moved over the weekend. The Senior PI hand-carried the original kettle from the garage in a tote bag like it was an heirloom, which by some reasonable measure it was. The kettle still works.\n\n" +
      "Beacon-tier compute came with a twenty-year operations contract attached. The annex has chilled water, redundant power, a freight elevator, and a Postdoc named Ren whose job description is technically 'chip whisperer' but who in practice spends most days reading. Lambda Quarterly will not cover you. You are too obscure. CLTR will. The senior PI knows the chair personally.\n\n" +
      "You hung the first publication in the hallway. There will be more.",
    changes: [
      { icon: '🎓', text: 'University wing leased. The Bench survived the move.' },
      { icon: '🪞', text: 'First publication framed. The wall is meant to fill up.' },
      { icon: '⚙', text: 'Up to 3 training runs in parallel.' },
      { icon: '☕', text: 'Senior PI carried the original kettle by hand.' },
    ],
  };

  /* ============================================================
     LAB → ORG (generic + 4 archetype variants)
     The founder is in airports. Strangers wear your lanyard.
     ============================================================ */
  const labToOrgGeneric = {
    id: 'lab-to-org-generic',
    fromStage: 2, toStage: 3,
    actLabel: 'ACT III',
    title: 'The Org',
    flavor:
      "You woke up in a hotel in a city you did not pick and could not, for a moment, name. The slides for the keynote were already on the lectern. Someone — not you, not anymore — had put your bio in the program. The bio called you a 'pioneer.' You did not feel like a pioneer. You felt like a person who had not slept enough.\n\n" +
      "{lab} has a billboard now. Two cities have it. One of them is on the highway you drive home from the airport, and the first time you saw your model's face on it — they had given the model a face — you pulled the car over and sat with the engine running.\n\n" +
      "There are people who work for you whose names you have never been told. They wear lanyards. The lanyards have your crest on them. The lanyards have a version number you didn't approve.\n\n" +
      "Mira's email signature now has 'VP, Research.' Hari Iyer was deposed last month. Senator Ngo invited you to a private dinner. Big-E hasn't tweeted in eleven days, which the press is treating as news.",
    changes: [
      { icon: '✈', text: 'You travel constantly. Cities blur.' },
      { icon: '🏛', text: 'Pharos-tier compute. Parallelism is no longer the bottleneck.' },
      { icon: '🪪', text: 'Strangers wear your lanyard. They are on your team.' },
      { icon: '🌃', text: 'The model has a face on a billboard somewhere.' },
    ],
  };

  const labToOrgFrontier = {
    id: 'lab-to-org-frontier',
    fromStage: 2, toStage: 3, archetypeId: 'frontier',
    actLabel: 'ACT III',
    title: 'The Org',
    flavor:
      "The IPO rang the bell at 9:30am Eastern. By 10:14 you were a billionaire on paper and by 10:23 a Senate aide had texted your COO asking for a meeting. The meeting happened. You do not remember most of it. You remember the carpet.\n\n" +
      "{lab} is everywhere now. The product runs in seven enterprise verticals you have not personally evaluated. The press calls you a frontier. They mean it as a compliment. Sometimes you are not sure.\n\n" +
      "Big-E congratulated you publicly and then, three weeks later, announced his own competing tier. Lambda Quarterly ran a profile that referred to your earliest hires by their first names without explanation, as if everyone reading already knew them. Many people do.\n\n" +
      "Senator Ngo's hearings begin in the spring. Your General Counsel has a strategy. You have a flight at six.\n\n" +
      "The folding table from the garage is in a glass case in the lobby of the new HQ. Visitors photograph it.",
    changes: [
      { icon: '📈', text: 'IPO closed. Pharos-tier compute online.' },
      { icon: '🏛', text: 'Senate hearings scheduled. The General Counsel has plans.' },
      { icon: '∞', text: 'Parallelism unbounded. Compute is no longer scarce.' },
      { icon: '🪧', text: 'The original folding table is in a glass case.' },
    ],
  };

  const labToOrgSafety = {
    id: 'lab-to-org-safety',
    fromStage: 2, toStage: 3, archetypeId: 'safety',
    actLabel: 'ACT III',
    title: 'The Org',
    flavor:
      "The Committee voted unanimously and then, immediately afterward, three of them resigned. They wrote a joint letter. The letter said {lab} had outgrown the structure that had held it. The letter said the next phase requires governance the Committee cannot provide. The letter was kind. It was also a kind of ending.\n\n" +
      "You are in airports now. Not because you want to be — because the Senate wants to be briefed in person, the EU wants to be briefed in person, CLTR wants to be briefed in person, and the briefings cannot be delegated yet, although they will be soon, because there is a new Chief of Policy whose name you keep almost remembering.\n\n" +
      "Pharos-tier compute lives in a facility you have toured exactly once. The interp team has tripled. The interp team has its own building. Mira Park is on the cover of a magazine she does not read. She kept her old corner desk anyway. People photograph it through the glass.\n\n" +
      "Senator Ngo, in a hearing, said your name three times in five minutes, twice approvingly. The clip is on every feed. You did not watch it.",
    changes: [
      { icon: '🛡', text: 'Pharos-tier compute. Interp team has its own building.' },
      { icon: '✈', text: 'Senate, EU, CLTR — all want briefings in person.' },
      { icon: '∞', text: 'Parallelism unbounded.' },
      { icon: '📰', text: 'Mira is on a magazine cover. She has not read it.' },
    ],
  };

  const labToOrgOpensource = {
    id: 'lab-to-org-opensource',
    fromStage: 2, toStage: 3, archetypeId: 'opensource',
    actLabel: 'ACT III',
    title: 'The Org',
    flavor:
      "There is a fork of {lab}'s last release running in a country that has placed sanctions against your country. There is another fork running in a country that has placed sanctions against that country. You read about both forks in the same Lambda Quarterly issue, in articles that did not reference each other.\n\n" +
      "Pharos-tier weights went up at 3am Pacific because that is what the release window has always been, since the garage, and someone in operations argued — successfully — that changing the convention would be a kind of betrayal. Within forty-eight hours the model had been deployed by entities you cannot list and you would not, even if you could.\n\n" +
      "You are in a hotel in Geneva. There is a hearing next week. The lead lawyer for the coalition opposing your governance proposal cited your own README from three years ago in her opening remarks.\n\n" +
      "Big-E is using your model. Senator Ngo is using your model. Hari Iyer's grandkid did a school project on it. The community has fifteen million people in it. None of them work for you. All of them, in a sense, do.",
    changes: [
      { icon: '🌐', text: 'Pharos weights released. The forks proliferate.' },
      { icon: '🏛', text: 'Geneva hearing on governance. Your old README is exhibit A.' },
      { icon: '∞', text: 'Parallelism unbounded.' },
      { icon: '🚪', text: 'Every release was a one-way door. There were many doors.' },
    ],
  };

  const labToOrgResearch = {
    id: 'lab-to-org-research',
    fromStage: 2, toStage: 3, archetypeId: 'research',
    actLabel: 'ACT III',
    title: 'The Org',
    flavor:
      "The Senior PI gave the keynote. You sat in the third row. The auditorium was full and the simulcast was watched live by — the conference organizers later told you, in tones meant to sound impressed — over two million people. The Senior PI's hands shook a little at the lectern. You are the only one who would have noticed.\n\n" +
      "{lab} has a Pharos-tier model now. It has a name. The name is in a journal whose acceptance rate is under three percent. The model is co-authored by sixty-seven people, three of whom you have met, four of whom are no longer at the lab, and one of whom is a Postdoc named Ren whose office still smells faintly of bergamot.\n\n" +
      "The Lab Bench is in a museum. They asked. You said yes. The replacement Bench is twice as fast and somehow less interesting to walk past. The original kettle is gone. Nobody is saying who took it.\n\n" +
      "CLTR has invited you to chair a working group. Senator Ngo's staff, off the record, calls your lab 'the adults in the room.' You are not sure when you became an adult. You are not sure you did.",
    changes: [
      { icon: '🎓', text: 'Pharos-tier model. Three-percent journal accepted it.' },
      { icon: '🪞', text: 'The original Lab Bench is in a museum now.' },
      { icon: '∞', text: 'Parallelism unbounded.' },
      { icon: '☕', text: 'Nobody is saying who took the kettle.' },
    ],
  };

  /* ============================================================
     Index — flat list, plus a lookup helper.
     ============================================================ */
  const all = [
    opening,
    garageToLabGeneric,
    garageToLabFrontier,
    garageToLabSafety,
    garageToLabOpensource,
    garageToLabResearch,
    labToOrgGeneric,
    labToOrgFrontier,
    labToOrgSafety,
    labToOrgOpensource,
    labToOrgResearch,
  ];

  function findOpening() {
    return opening;
  }

  /* Find the best cinematic for a transition. Prefers archetype-specific
     variants; falls back to the generic for that fromStage→toStage. */
  function findTransition(fromStage, toStage, archetypeId) {
    if (archetypeId) {
      const specific = all.find(c =>
        c.fromStage === fromStage &&
        c.toStage === toStage &&
        c.archetypeId === archetypeId);
      if (specific) return specific;
    }
    const generic = all.find(c =>
      c.fromStage === fromStage &&
      c.toStage === toStage &&
      !c.archetypeId);
    return generic || null;
  }

  function findById(id) {
    return all.find(c => c.id === id) || null;
  }

  return {
    all,
    opening,
    findOpening,
    findTransition,
    findById,
  };

})();
