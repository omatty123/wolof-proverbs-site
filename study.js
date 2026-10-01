// Accent-sensitive lookup: Wolof diacritics can distinguish different words.
export const wordKey = text => text.normalize('NFC').toLocaleLowerCase('wo');
export function splitWords(text) {
  return [...text.matchAll(/[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu)].map(m => m[0]);
}
export function createStudy(data = {}) {
  const lexicon = new Map((data.lexicon || []).map(w => [wordKey(w.term), w]));
  const glosses = new Map((data.glosses || []).map(p => [p.id, p]));
  const recordings = new Map((data.recordings || []).map(p => [p.id, p]));
  const audio = new Map((data.wordAudio || []).map(w => [wordKey(w.word), w]));
  function words(p) {
    const gloss = glosses.get(p.id);
    return splitWords(p.wolof).map((text, index) => {
      const key = wordKey(text);
      const candidate = gloss?.complete ? gloss.words[index] : gloss?.words.find(w => wordKey(w.text) === key);
      const contextual = candidate && wordKey(candidate.text) === key ? candidate : null;
      return {text, index, contextual, dictionary:lexicon.get(key), audio:audio.get(key)};
    });
  }
  return {lexicon, glosses, recordings, audio, words,
    hasWords:p => words(p).some(w => w.contextual || w.dictionary),
    hasRecording:p => recordings.has(p.id) || words(p).some(w => w.audio),
    hasGloss:p => glosses.has(p.id)};
}
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,label) => url.startsWith('#') ? `<a href="${esc(url)}">${esc(label)}</a>` : `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}<span class="sr-only"> (opens in a new tab)</span></a>`;
export function wordAudioHTML(a) {
  return `<div class="word-audio"><label><span lang="wo">${esc(a.word)}</span><audio controls preload="none" aria-label="Pronunciation of ${esc(a.word)}" src="${esc(a.url)}"></audio></label><p class="audio-error" role="status" hidden>Audio could not load. ${external(a.sourcePage,'Open the original recording')}.</p><p class="study-credit">${external(a.sourcePage,a.credit)} · ${external(a.licenseUrl,a.license)}</p></div>`;
}
export function wordDefinitionHTML(word, study, p) {
  const w = word, contextual = w.contextual, d = w.dictionary;
  const referenceLinks = contextual ? (contextual.sources || []).map((url,i) => {
    const ref = study.glosses.get(p.id)?.sources?.find(s=>s.url===url);
    return external(url,ref?.title || `Reference ${i+1}`);
  }).join(' · ') : d ? external(d.sourceUrl,d.sourceTitle) : '';
  return `<h4 lang="wo">${esc(w.text)}</h4>${contextual ? `<p class="word-kind">In this proverb</p><p>${esc(contextual.meaning)}</p>${contextual.note ? `<p>${esc(contextual.note)}</p>` : ''}` : d ? `<p class="word-kind">Dictionary meanings</p><p>${esc(d.meanings.join('; '))}${d.partOfSpeech ? ` <span class="word-pos">(${esc(d.partOfSpeech)})</span>` : ''}</p>${d.note ? `<p>${esc(d.note)}</p>` : ''}<p class="study-hint">These are general senses; the sentence may use a different one.</p>` : `<p>No definition is included for this form yet.</p><p class="study-hint">It may contain a grammatical ending or use a different spelling. The links below search the word as printed.</p>`}${w.audio ? wordAudioHTML(w.audio) : ''}${referenceLinks ? `<p class="study-credit">${referenceLinks}${d?.license && !contextual ? ` · ${external('https://creativecommons.org/licenses/by-sa/4.0/','CC BY-SA 4.0')} · adapted` : ''}</p>` : ''}<p class="study-credit">${external(`https://en.wiktionary.org/wiki/${encodeURIComponent(wordKey(w.text))}#Wolof`,'Wiktionary')} · ${external(`https://glosbe.com/wo/en/${encodeURIComponent(wordKey(w.text))}`,'Wolof–English lookup')}</p>`;
}
export function wordsPanelHTML(p, study) {
  const words = study.words(p), gloss = study.glosses.get(p.id);
  const first = Math.max(0,words.findIndex(w=>w.contextual || w.dictionary));
  return `<h4>Words &amp; grammar</h4><p class="study-hint">${gloss?.complete ? 'Every word below has a source-based explanation for this proverb.' : `${words.filter(w=>w.contextual || w.dictionary).length} of ${words.length} words have notes or dictionary entries. Definitions are not available for every form.`} Select a word.</p><div class="word-tokens" role="group" aria-label="Words in proverb ${p.id}">${words.map((w,i)=>`<button type="button" data-word-index="${i}" aria-pressed="${i===first}" class="word-token ${w.contextual || w.dictionary ? 'has-definition' : ''}"><span lang="wo">${esc(w.text)}</span>${!(w.contextual || w.dictionary) ? '<span class="sr-only"> — lookup only</span>' : ''}</button>`).join('')}</div><div class="word-definition" aria-live="polite" aria-atomic="true">${words[first] ? wordDefinitionHTML(words[first],study,p) : ''}</div>${gloss?.grammar || gloss?.translationNotes ? `<details class="grammar-note"><summary>How the sentence works</summary><p>${esc(gloss.grammar || '')}</p>${gloss.translationNotes ? `<p>${esc(gloss.translationNotes)}</p>` : ''}<p class="study-credit">${(gloss.sources||[]).map(s=>external(s.url,s.title)).join(' · ')}</p></details>` : ''}<p class="study-credit">Word notes are an added learning aid, separate from the book’s translation. ${external('#study-sources','Sources and coverage')}</p>`;
}
export function listenPanelHTML(p, study) {
  const recording = study.recordings.get(p.id);
  const seen = new Set();
  const audio = study.words(p).filter(w=>w.audio && !seen.has(wordKey(w.text)) && seen.add(wordKey(w.text))).map(w=>w.audio);
  return `${recording ? `<h4>Hear the proverb in a scene</h4><p>Boston University’s Wolof lesson ${recording.lesson}: <span lang="wo">${esc(recording.title)}</span></p>${recording.variantNote ? `<p class="study-hint">${esc(recording.variantNote)}</p>` : ''}<div class="video-slot"><button type="button" data-load-video="${p.id}" class="primary">Play lesson video</button><p class="study-hint">Loads the original YouTube player when selected.</p></div><p class="study-credit">${external(recording.url,'Watch on YouTube')} · ${external(recording.transcriptUrl,'Transcript')} · ${external(recording.glossaryUrl,'Lesson glossary')} · ${external(recording.sourceUrl,'Boston University source')}</p>` : '<h4>Hear individual words</h4><p class="study-hint">A full-proverb recording is not available here. These are separate word pronunciations, not a reading of the sentence.</p>'}${audio.length ? `${recording ? '<h4>Individual word pronunciations</h4>' : ''}<label class="audio-speed">Playback speed <select data-audio-speed aria-label="Word audio playback speed"><option value="1">Normal</option><option value="0.75">Slower · 0.75×</option></select></label><div class="word-recordings">${audio.map(wordAudioHTML).join('')}</div><p class="study-credit">Recorded by Mamadou Sy in Dakar for the Shtooka Project. Human voice; no synthesized speech.</p>` : ''}`;
}
export function stopVideos(scope=document) {
  scope.querySelectorAll('iframe[data-lesson]').forEach(frame=>{const slot=frame.parentElement; const id=frame.dataset.lesson;frame.remove();slot.innerHTML=`<button type="button" data-load-video="${id}" class="primary">Play lesson video</button>`;});
}

export function stopMedia(scope=document) {
  scope.querySelectorAll('audio').forEach(a=>a.pause());
  stopVideos(scope);
}
