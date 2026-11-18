import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataFile = path.join(root, 'data', 'terms.json');
const stopWords = new Set('about after again all also and are because been before being between but can could did does doing down each for from get got has have her here him his how into its just like more most not now off one only other our out over people really said say she should some than that the their them then there these they this those through time too use very was way were what when where which while who why will with would you your slang meaning'.split(' '));
const seedCandidates = ['rizzler', 'fanum tax', 'looksmaxxing', 'mogging', 'aura farming', 'girl dinner', 'boy math', 'situationship', 'core memory', 'main character energy', 'canon event', 'caught in 4k', 'understood the assignment', 'let him cook', 'crash out', 'locked in', 'yap', 'yapping', 'mid', 'delulu', 'bussin', 'gyatt', 'sigma', 'brainrot', 'skibidi'];
const clean = s => String(s || '').replace(/\[([\s\S]*?)\]/g, '$1').replace(/\([^)]*\)/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().slice(0, 420);
const terms = JSON.parse(await fs.readFile(dataFile, 'utf8'));
const known = new Set(terms.map(t => t.term.toLowerCase()));
const candidateScores = new Map();
const sourceResults = [];
const addCandidate = (phrase, score, source) => {
  const term = clean(phrase).toLowerCase().replace(/[^a-z0-9' -]/g, '').replace(/\s+/g, ' ').trim();
  if (term.length < 3 || term.length > 40 || known.has(term)) return;
  const old = candidateScores.get(term) || { score: 0, sources: new Set() };
  old.score += score;
  old.sources.add(source);
  candidateScores.set(term, old);
};

async function fetchReddit() {
  const response = await fetch('https://www.reddit.com/r/GenZ+OutOfTheLoop/hot.json?limit=40', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LingoPulse/1.0; public educational dictionary)' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const posts = (await response.json()).data?.children?.map(x => x.data).filter(x => x?.title) || [];
  for (const post of posts) {
    const title = post.title.toLowerCase();
    const weight = 1 + Math.min(4, Math.floor((post.score || 0) / 500));
    for (const phrase of title.match(/[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){1,3}/g) || []) {
      const words = phrase.split(' ');
      if (words.some(w => stopWords.has(w)) || phrase.length > 40) continue;
      addCandidate(phrase, weight, 'Reddit');
    }
    for (const word of title.match(/[a-z][a-z'-]{3,17}/g) || []) if (!stopWords.has(word)) addCandidate(word, Math.max(1, weight - 1), 'Reddit');
  }
  return `OK (${posts.length} posts)`;
}

async function fetchHackerNews() {
  const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: AbortSignal.timeout(10000) }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  const stories = await Promise.all(ids.slice(0, 30).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null).catch(() => null)));
  for (const story of stories.filter(Boolean)) {
    const text = `${story.title || ''} ${story.text || ''}`.toLowerCase();
    for (const phrase of text.match(/[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){1,3}/g) || []) {
      const words = phrase.split(' ');
      if (words.some(w => stopWords.has(w)) || phrase.length > 40) continue;
      addCandidate(phrase, 1, 'Hacker News');
    }
  }
  return `OK (${stories.filter(Boolean).length} stories)`;
}

async function fetchUrbanDefinition(term) {
  const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`, { headers: { 'User-Agent': 'LingoPulse/1.0' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const defs = (await response.json()).list || [];
  return defs.sort((a,b) => (b.thumbs_up || 0) - (a.thumbs_up || 0))[0];
}

for (const [name, fn] of [['Reddit', fetchReddit], ['Hacker News', fetchHackerNews]]) {
  try { sourceResults.push(`${name}: ${await fn()}`); }
  catch (error) { sourceResults.push(`${name}: FAILED (${error.message})`); }
}

// Known current slang terms are a fallback when trend feeds block automation or return no useful candidates.
if (candidateScores.size < 8) for (const term of seedCandidates) addCandidate(term, 1, 'fallback list');

const ranked = [...candidateScores].sort((a,b) => b[1].score - a[1].score).slice(0, 30);
const additions = [];
let urbanFailures = 0;
for (const [term, info] of ranked) {
  try {
    const def = await fetchUrbanDefinition(term);
    const meaningEn = clean(def?.definition);
    if (meaningEn.length < 12) continue;
    additions.push({
      term,
      category: 'Culture',
      meaningZh: '自动发现的网络用语候选。英文释义来自 Urban Dictionary 社区投稿，建议结合语境判断。',
      meaningEn,
      example: clean(def.example) || `A current community-trending term: ${term}.`,
      source: `${[...info.sources].join(' + ')} + Urban Dictionary`,
      updated: new Date().toISOString().slice(0, 10),
      status: 'emerging',
      trend: Math.min(95, 45 + info.score * 4)
    });
    if (additions.length >= 12) break;
  } catch (error) { urbanFailures++; if (urbanFailures === 1) sourceResults.push(`Urban Dictionary: lookup failed (${error.message})`); }
}

if (additions.length) {
  const updatedTerms = [...additions, ...terms.filter(t => !additions.some(a => a.term === t.term))];
  await fs.writeFile(dataFile, JSON.stringify(updatedTerms, null, 2) + '\n', 'utf8');
}

console.log('Source status:');
for (const result of sourceResults) console.log(`- ${result}`);
console.log(JSON.stringify({ candidates: candidateScores.size, checked: ranked.length, discovered: additions.length, urbanFailures, totalTerms: terms.length + additions.length, updated: new Date().toISOString() }));
