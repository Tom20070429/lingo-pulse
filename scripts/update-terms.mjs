import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataFile = path.join(root, 'data', 'terms.json');
const stopWords = new Set('about after again all also and are because been before being between but can could did does doing down each for from get got has have her here him his how into its just like more most not now off one only other our out over people really said say she should some than that the their them then there these they this those through time too use very was way were what when where which while who why will with would you your slang meaning'.split(' '));
const clean = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().slice(0, 420);
const terms = JSON.parse(await fs.readFile(dataFile, 'utf8'));
const known = new Set(terms.map(t => t.term.toLowerCase()));
const additions = [];
try {
  const response = await fetch('https://www.reddit.com/r/GenZ+OutOfTheLoop/hot.json?limit=25', { headers: { 'User-Agent': 'LingoPulse/1.0 (public trend research)' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Reddit ${response.status}`);
  const posts = (await response.json()).data?.children?.map(x => x.data).filter(x => x?.title) || [];
  const counts = new Map();
  for (const post of posts) for (const word of new Set(post.title.toLowerCase().match(/[a-z][a-z'-]{3,17}/g) || [])) if (!stopWords.has(word) && !known.has(word)) counts.set(word, (counts.get(word) || 0) + Math.max(1, Math.min(5, Math.round((post.score || 1) / 300))));
  for (const [word, heat] of [...counts].sort((a,b) => b[1]-a[1]).slice(0, 6)) {
    try {
      const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const def = ((await response.json()).list || []).sort((a,b) => (b.thumbs_up || 0) - (a.thumbs_up || 0))[0];
      const meaningEn = clean(def?.definition); if (meaningEn.length < 12) continue;
      additions.push({ term: word, category: 'Culture', meaningZh: '社区趋势候选词。英文释义来自 Urban Dictionary 社区投稿，建议结合原始语境理解。', meaningEn, example: clean(def.example) || `A current community-trending term: ${word}.`, source: 'Reddit trends + Urban Dictionary', updated: new Date().toISOString().slice(0, 10), status: 'emerging', trend: Math.min(95, 45 + heat * 4) });
    } catch { /* Keep the existing verified cache when one lookup fails. */ }
  }
} catch (error) { console.log(`No external update: ${error.message}`); }
if (additions.length) await fs.writeFile(dataFile, JSON.stringify([...additions, ...terms.filter(t => !additions.some(a => a.term === t.term))], null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ discovered: additions.length, updated: new Date().toISOString() }));
