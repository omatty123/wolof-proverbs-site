export function normalize(value) {
  return String(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/ŋ/g, 'ng').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
export function searchRecords(records, query = '', topic = '') {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return records.filter(p => (!topic || p.topic === topic) && words.every(word => {
    if (/^#?\d+$/.test(word)) return p.id === Number(word.replace('#', ''));
    return normalize([p.wolof, ...p.variants, p.translation, p.explanation, ...p.equivalents, ...p.scripture, p.topic].join(' ')).includes(word);
  }));
}
export function shuffled(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
export function makeQuiz(records, topic = '', limit = 10, rng = Math.random, ids = null) {
  const eligible = records.filter(p => p.translation && !p.transcriptionNotes?.some(n => /translation.*unresolved|missing translation/i.test(n)));
  const pool = eligible.filter(p => (!topic || p.topic === topic) && (!ids || ids.includes(p.id)));
  // A unique prompt and answer per session prevents shared translations becoming duplicate questions.
  const seenPrompts = new Set(), seenAnswers = new Set();
  const chosen = shuffled(pool, rng).filter(p => {
    const w = normalize(p.wolof), a = normalize(p.translation);
    if (seenPrompts.has(w) || seenAnswers.has(a)) return false;
    seenPrompts.add(w); seenAnswers.add(a); return true;
  }).slice(0, limit);
  return chosen.map(p => {
    const seen = new Set([normalize(p.translation)]);
    const distractors = shuffled(eligible.filter(d => d.id !== p.id && normalize(d.wolof) !== normalize(p.wolof)), rng).filter(d => {
      const key = normalize(d.translation);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 3);
    return {proverb:p, options:shuffled([p, ...distractors], rng).map(d => ({id:d.id, text:d.translation}))};
  });
}
export function scoreQuiz(questions, answers) {
  return questions.reduce((sum, q, i) => sum + (answers[i] === q.proverb.id ? 1 : 0), 0);
}
