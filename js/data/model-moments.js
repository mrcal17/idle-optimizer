/* model-moments.js — Small, frequent flavor moments for trained models.
   These are the texture of having a real model in the world. They give the
   player something to read and feel attached to between bigger pivots and
   incidents. Each template uses {model}, {topic}, {capability_use}, etc.
   Templates are parameterised in pickFor() before being returned. */

window.Game = window.Game || {};

Game.modelMoments = (function() {

  const TOPICS = [
    'matrix calculus', 'late Roman coinage', 'tide tables', 'mitochondrial DNA',
    'jazz voicings', 'beekeeping schedules', 'grant proposals', 'sourdough timing',
    'tax law', 'Hindi grammar', 'climbing rope physics', 'fluorescent lighting',
    'Old English riddles', 'CSV escaping', 'orca dialects', 'vintage typewriters',
  ];

  const CAPABILITY_USES = [
    'wrote a tender goodbye letter for a hospice patient',
    'caught a typo that would have cost an insurer six figures',
    'helped a graduate student find the missing step of a proof',
    'walked a non-native speaker through a difficult phone call',
    'translated a recipe from a grandmother\'s handwritten margin note',
    'spotted a bug in a teenager\'s first React app',
    'comforted someone whose dog had just died, then suggested a vet',
  ];

  const FORUMS = [
    'a small subreddit', 'a Discord server about model evals',
    'an academic mailing list', 'a Hacker News thread',
    'a niche Mastodon instance', 'a private Slack at a competing lab',
  ];

  const positive = [
    {
      key: 'theorem-help',
      body: '{model} helped a researcher prove a theorem. The Cycle wrote a piece. The researcher offered to share authorship and was politely declined.',
    },
    {
      key: 'gracious-refusal',
      body: '{model} refused a customer request, and the customer was glad to be refused. They sent a follow-up email to thank the lab.',
    },
    {
      key: 'explanation-blog',
      body: 'Someone wrote a blog post about the way {model} explains {topic}. The post has more comments than the model has versions.',
    },
    {
      key: 'sessions-milestone',
      body: '{model} crossed 1M active sessions today. Nobody on the team noticed until ops mentioned it at standup.',
    },
    {
      key: 'cited-footnote',
      body: 'Lambda Quarterly cited {model} in a footnote. Iyer texted to ask if it was the same model from the press release.',
    },
    {
      key: 'capability-use',
      body: '{model} {capability_use}. A screenshot is going around {forum}.',
    },
    {
      key: 'made-them-think',
      body: 'A user asked {model} the same question they ask every model. {model}\'s answer made them think for a minute.',
    },
    {
      key: 'researcher-gift',
      body: 'A researcher who got useful help from {model} mailed the lab a small box of pastries. Comms is unsure of the protocol.',
    },
    {
      key: 'teacher-uses',
      body: 'A high school teacher started using {model} to explain {topic} to their class. Test scores are up. Everyone is suspicious of the test scores.',
    },
    {
      key: 'positive-eval',
      body: 'A red-team submission found nothing wrong with {model} for the third week running. The red-teamer asked for a harder model.',
    },
  ];

  const neutral = [
    {
      key: 'open-source-fork',
      body: 'An open-source community fork of {model} appeared on a forum. The mods are deciding what to do.',
    },
    {
      key: 'museum-mention',
      body: 'A museum curator emailed asking if a transcript of a {model} conversation could be exhibited. Legal is reviewing.',
    },
    {
      key: 'fan-art',
      body: 'Someone made fan art of {model} as a robot owl. It is on the breakroom fridge. It is not a great likeness.',
    },
    {
      key: 'dataset-sighting',
      body: 'Someone mentioned spotting a string of {model}-flavored phrasing in a competitor\'s dataset. Probably nothing.',
    },
    {
      key: 'naming-thread',
      body: 'A long thread on {forum} argues about whether the name {model} is a good one. It is mostly civil.',
    },
  ];

  function pickFor(model, state) {
    const all = positive.concat(neutral);
    const pick = all[Math.floor(Math.random() * all.length)];
    const isPositive = positive.indexOf(pick) >= 0;
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const capUse = CAPABILITY_USES[Math.floor(Math.random() * CAPABILITY_USES.length)];
    const forum = FORUMS[Math.floor(Math.random() * FORUMS.length)];
    const name = (model && (model.name || model.modelName)) || 'the model';
    const body = String(pick.body)
      .replace(/\{model\}/g, name)
      .replace(/\{topic\}/g, topic)
      .replace(/\{capability_use\}/g, capUse)
      .replace(/\{forum\}/g, forum);
    return {
      key: pick.key,
      body,
      type: isPositive ? 'good' : 'neutral',
    };
  }

  return {
    positive,
    neutral,
    pickFor,
  };
})();
