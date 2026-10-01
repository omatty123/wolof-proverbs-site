import {aboutIntroductionHTML} from './about.js';
import {createValues} from './values.js';
import {searchRecords, makeQuiz, scoreQuiz} from './core.js';
import {createStudy, wordsPanelHTML, wordDefinitionHTML, listenPanelHTML, stopMedia, stopVideos} from './study.js';
const $ = s => document.querySelector(s);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const listHTML = (values, lang = '') => `<ul>${values.map(v => `<li${lang ? ` lang="${lang}"` : ''}>${escapeHTML(v)}</li>`).join('')}</ul>`;
const pageSize = 12;
let records = [], metadata, topic = '', page = 1, query = '', activeView = 'browse';
let valuesView;
let quizState = null, study = createStudy(), studyAvailable = false, studyFilter = '';
const filteredRecords = () => searchRecords(records, query, topic).filter(p => !studyFilter || (studyFilter === 'lessons' ? study.recordings.has(p.id) : studyFilter === 'glosses' ? study.glosses.get(p.id)?.complete : study.hasRecording(p)));
const sourceLink = p => `<a href="original.pdf#page=${p.page}" target="_blank" rel="noopener">Original PDF · ${p.pageEnd > p.page ? `pages ${p.page}–${p.pageEnd}` : `page ${p.page}`}<span class="sr-only"> (opens in a new tab)</span></a>`;
function entryHTML(p) {
  const context = [
    p.variants.length ? `<h4>Other Wolof versions</h4>${listHTML(p.variants, 'wo')}` : '',
    p.explanation ? `<h4>Explanation in the source</h4><p>${escapeHTML(p.explanation)}</p>` : '',
    p.equivalents.length ? `<h4>English ${p.equivalents.length === 1 ? 'parallel' : 'parallels'}</h4>${listHTML(p.equivalents)}` : '',
    p.scripture.length ? `<h4>Scripture quoted in the source</h4>${listHTML(p.scripture)}` : '',
    p.sharedWith?.length ? `<p class="source-line">The source presents this with ${p.sharedWith.map(id => `<a href="#proverb-${id}">proverb ${id}</a>`).join(', ')} and shares the translation or commentary.</p>` : '',
    p.transcriptionNotes?.length ? `<details class="transcription-note"><summary>Transcription notes</summary>${listHTML(p.transcriptionNotes)}</details>` : '',
    `<p class="source-line">${sourceLink(p)}${p.sourceRefs.length ? `<br>Bibliography: ${p.sourceRefs.map(id => `<a href="#reference-${id}">${id}</a>`).join(', ')}` : ''}<br><a href="#proverb-${p.id}">Link to proverb ${p.id}</a></p>`
  ].join('');
  return `<article class="proverb" id="proverb-${p.id}" tabindex="-1"><div class="entry-meta">No. ${p.id}<span>${escapeHTML(p.topic)}</span></div><h3 lang="wo">${escapeHTML(p.wolof)}</h3><p class="translation">${p.translation ? escapeHTML(p.translation) : 'No separate literal translation in the source. Open the context below for its explanation.'}</p><div class="entry-actions"><button type="button" id="context-toggle-${p.id}" data-entry-panel="context" aria-expanded="false" aria-controls="context-${p.id}">Meaning &amp; context<span class="sr-only"> for proverb ${p.id}</span></button>${studyAvailable ? `<button type="button" id="words-toggle-${p.id}" data-entry-panel="words" aria-expanded="false" aria-controls="words-${p.id}">Words<span class="sr-only"> in proverb ${p.id}</span></button>${study.hasRecording(p) ? `<button type="button" id="listen-toggle-${p.id}" data-entry-panel="listen" aria-expanded="false" aria-controls="listen-${p.id}">Listen<span class="sr-only"> to ${study.recordings.has(p.id) ? 'a lesson for' : 'words from'} proverb ${p.id}</span></button>` : ''}` : ''}</div><div id="context-${p.id}" class="entry-panel entry-context" role="region" aria-labelledby="context-toggle-${p.id}" hidden>${context}</div>${studyAvailable ? `<div id="words-${p.id}" class="entry-panel study-panel" role="region" aria-labelledby="words-toggle-${p.id}" hidden></div>${study.hasRecording(p) ? `<div id="listen-${p.id}" class="entry-panel study-panel" role="region" aria-labelledby="listen-toggle-${p.id}" hidden></div>` : ''}` : ''}</article>`;
}
function renderResults(focus = false) {
  stopMedia();
  const matches = filteredRecords();
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  page = Math.min(Math.max(1, page), pages);
  const start = (page - 1) * pageSize;
  $('#results-heading').textContent = topic || 'All proverbs';
  $('#result-count').textContent = matches.length ? `${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} ${matches.length === 1 ? 'proverb' : 'proverbs'}` : 'No proverbs found';
  $('#results').innerHTML = matches.length ? matches.slice(start, start + pageSize).map(entryHTML).join('') : `<div class="empty"><h3>No matching proverbs</h3><p>Try a shorter word, another topic, or show all study aids.</p><button id="reset-filters">Clear all filters</button></div>`;
  $('#pagination').innerHTML = pages > 1 ? `<button id="previous-page" ${page === 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span><button id="next-page" ${page === pages ? 'disabled' : ''}>Next</button>` : '';
  $('#clear-search').hidden = !query;
  document.querySelectorAll('#topic-list button').forEach(button => { const selected = button.dataset.topic === topic; button.setAttribute('aria-pressed', String(selected)); button.tabIndex = selected ? 0 : -1; });
  $('#topic').value = topic;
  $('#study-filter').value = studyFilter;
  if (focus) { $('#results-heading').tabIndex = -1; $('#results-heading').focus(); $('#results-heading').scrollIntoView({block:'start'}); }
}
function setTopic(value) {topic = value; page = 1; renderResults();}
function renderTopics() {
  const topics = [...new Set(records.map(p => p.topic))];
  const options = `<option value="">All ${topics.length} topics</option>${topics.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)} (${records.filter(p => p.topic === t).length})</option>`).join('')}`;
  $('#topic').innerHTML = options;
  $('#topic-list').innerHTML = ['', ...topics].map(t => `<button type="button" data-topic="${escapeHTML(t)}" aria-pressed="${t === topic}"><span>${escapeHTML(t || 'All proverbs')}</span><span class="topic-count">${t ? records.filter(p => p.topic === t).length : records.length}</span></button>`).join('');
}
function showView(view, focus = false) {
  stopMedia();
  activeView = ['browse', 'values', 'practice', 'source'].includes(view) ? view : 'browse';
  for (const name of ['browse', 'values', 'practice', 'source']) $(`#${name}`).hidden = name !== activeView;
  document.querySelectorAll('.site-header nav a').forEach(a => {
    if (a.hash === `#${activeView}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (activeView === 'practice' && !$('#quiz').children.length) renderQuizSetup();
  if (focus) { const heading = $(`#${activeView} h1`); heading.tabIndex = -1; heading.focus(); window.scrollTo(0, 0); }
}
function route(focus = false) {
  const hash = location.hash.slice(1) || 'browse';
  if (/^values(?:-[a-z]+)?$/.test(hash)) { const entering = activeView !== 'values'; showView('values', focus && entering); valuesView?.select(hash.slice(7) || 'sutura', focus && !entering); return; }
  if (['about-author','about-sources','about-reading','about-bibliography'].includes(hash)) { showView('source'); const target=document.getElementById(hash); if(target){target.tabIndex=-1;target.focus();target.scrollIntoView({block:'start'});} return; }
  if (hash === 'study-sources') { showView('source'); const target=$('#study-sources'); target.tabIndex=-1; target.focus(); target.scrollIntoView({block:'start'}); return; }
  if (hash === 'photo-credit') { showView('source'); const target=$('#photo-credit'); target.tabIndex=-1; target.focus(); target.scrollIntoView({block:'center'}); return; }
  if (hash === 'main') { $('#main').focus(); return; }
  const proverb = /^proverb-(\d+)(?:-(words|listen))?$/.exec(hash), reference = /^reference-(\d+)$/.exec(hash);
  if (proverb) {
    studyFilter = '';
    const id = Number(proverb[1]), index = records.findIndex(p => p.id === id);
    showView('browse');
    if (index < 0) { query = String(id); topic = ''; page = 1; $('#search').value = query; renderResults(); return; }
    query = ''; topic = ''; $('#search').value = ''; page = Math.floor(index / pageSize) + 1; renderResults();
    const target = $(`#proverb-${id}`); toggleEntryPanel(target.querySelector(`[data-entry-panel=${proverb[2] || 'context'}]`) || target.querySelector('[data-entry-panel=context]')); target.focus(); target.scrollIntoView({block:'start'});
  } else if (reference) {
    showView('source'); const target = $(`#reference-${reference[1]}`); if (target) { target.tabIndex = -1; target.focus(); target.scrollIntoView({block:'center'}); }
  } else showView(hash, focus);
}
function renderQuizSetup() {
  quizState = null;
  $('#quiz').innerHTML = `<h2>Practise the meanings</h2><p>Up to 10 questions, one at a time. There’s no timer. Each answer includes the source translation and context.</p><p>Questions follow this book’s literal English translations. Some proverbs have several possible interpretations.</p><div class="quiz-setup-row"><div><label for="quiz-topic">Choose a topic</label><select id="quiz-topic">${$('#topic').innerHTML}</select></div><button class="primary" id="start-quiz">Start practice</button></div><p class="source-line">Your answers stay in this tab. Refreshing starts over.</p>`;
  $('#quiz-topic').value = topic;
}
function startQuiz(selectedTopic, ids = null) {
  const questions = makeQuiz(records, selectedTopic, 10, Math.random, ids);
  if (!questions.length) { $('#quiz').innerHTML = '<h2>No questions available</h2><p>Choose another topic to practise.</p><button id="quiz-reset">Choose a topic</button>'; return; }
  quizState = {questions, answers:[], index:0, topic:selectedTopic, finished:false}; renderQuestion();
}
function renderQuestion() {
  const {questions, index, answers} = quizState, question = questions[index];
  $('#quiz').innerHTML = `<div class="quiz-topline"><span>Question ${index + 1} of ${questions.length}</span><span>${scoreQuiz(questions, answers)} correct</span></div><progress max="${questions.length}" value="${index}" aria-label="Questions completed">${index} of ${questions.length}</progress><h2 id="question-heading" tabindex="-1" class="quiz-prompt" lang="wo">${escapeHTML(question.proverb.wolof)}</h2><p id="answer-instruction">Which English translation matches?</p><div class="quiz-options" role="group" aria-labelledby="answer-instruction">${question.options.map((option, i) => `<button type="button" data-answer="${option.id}"><span class="sr-only">Option ${i+1}: </span>${escapeHTML(option.text)}</button>`).join('')}</div><div id="quiz-feedback" class="quiz-feedback" role="status" aria-live="polite"></div><div class="quiz-actions"><button id="quiz-next" class="primary" hidden>${index + 1 === questions.length ? 'See results' : 'Next question'}</button><button id="quiz-reset">Start over</button></div>`;
  $('#question-heading').focus();
}
function answerQuiz(id) {
  if (!quizState || quizState.finished || quizState.answers[quizState.index] !== undefined) return;
  const question = quizState.questions[quizState.index];
  if (!question.options.some(o => o.id === id)) return;
  quizState.answers[quizState.index] = id;
  const correct = id === question.proverb.id;
  document.querySelectorAll('[data-answer]').forEach(button => {
    button.disabled = true;
    const optionId = Number(button.dataset.answer);
    if (optionId === question.proverb.id) { button.classList.add('correct'); button.insertAdjacentHTML('beforeend', '<span class="answer-label">Correct translation</span>'); }
    else if (optionId === id) { button.classList.add('wrong'); button.insertAdjacentHTML('beforeend', '<span class="answer-label">Your answer</span>'); }
  });
  $('#quiz-feedback').innerHTML = `<h3>${correct ? 'That’s right.' : 'A chance to learn this one.'}</h3>${!correct ? `<p><strong>The translation:</strong> ${escapeHTML(question.proverb.translation)}</p>` : ''}${question.proverb.explanation ? `<p>${escapeHTML(question.proverb.explanation)}</p>` : ''}${question.proverb.equivalents.length ? `<p><strong>English parallel:</strong> ${escapeHTML(question.proverb.equivalents[0])}</p>` : ''}<p class="source-line">Proverb ${question.proverb.id} · ${escapeHTML(question.proverb.topic)} · ${sourceLink(question.proverb)}</p>`;
  $('#quiz-next').hidden = false; $('#quiz-next').focus();
}
function renderQuizResults() {
  quizState.finished = true;
  const score = scoreQuiz(quizState.questions, quizState.answers);
  const missed = quizState.questions.filter((q,i) => quizState.answers[i] !== q.proverb.id).map(q => q.proverb);
  $('#quiz').innerHTML = `<h2 id="quiz-result-heading" tabindex="-1">Practice complete</h2><p class="quiz-score">${score} / ${quizState.questions.length}</p><p>${missed.length ? 'Return to the ones you missed, or try a fresh set.' : 'You matched every translation in this set.'}</p>${missed.length ? `<h3 style="font-family:inherit;font-size:1.1rem;font-weight:600">Review the missed proverbs</h3><ul class="missed-list">${missed.map(p => `<li><a href="#proverb-${p.id}">Proverb ${p.id}</a><p lang="wo">${escapeHTML(p.wolof)}</p><p>${escapeHTML(p.translation)}</p></li>`).join('')}</ul>` : ''}<div class="quiz-actions">${missed.length ? '<button class="primary" id="retry-missed">Practise missed proverbs</button>' : ''}<button ${!missed.length ? 'class="primary"' : ''} id="quiz-new">New set</button><button id="quiz-reset">Choose a topic</button></div>`;
  $('#quiz-result-heading').focus();
}
function renderSource() {
  $('#source-content').innerHTML = `${aboutIntroductionHTML()}<h2 id="study-sources">Listening and word study</h2><p>These learning aids supplement the book. They include ${study.lexicon.size} dictionary words, ${[...study.glosses.values()].filter(g=>g.complete).length} complete word-by-word explanations and ${[...study.glosses.values()].filter(g=>!g.complete).length} partial explanations. They were checked against the linked sources; they have not had a fluent-speaker review.</p><p>Start with ${[...study.glosses.values()].filter(g=>g.complete).map(g=>`<a href="#proverb-${g.id}-words">proverb ${g.id}</a>`).join(', ')}. Select <strong>Words</strong> under any proverb to explore the printed forms. Dictionary entries list general senses; only entries marked “In this proverb” explain that sentence. Unknown forms have external lookup links. Accents and word endings are preserved when matching definitions.</p><p><strong>Listen:</strong> ${study.recordings.size} proverb lessons from the <a href="https://www.bu.edu/africa/forstudents/alp/lang-teaching-resources/african-proverbs-project/wolof-proverbs/" target="_blank" rel="noopener">Boston University African Proverbs Project<span class="sr-only"> (opens in a new tab)</span></a>, plus ${study.audio.size} individual-word recordings by Mamadou Sy of Dakar for the Shtooka Project, shared through Wikimedia Commons under <a href="https://creativecommons.org/licenses/by/2.0/fr/deed.en" target="_blank" rel="noopener">CC BY 2.0 France<span class="sr-only"> (opens in a new tab)</span></a>. Videos are acted scenes, not isolated readings; spelling or wording differences are noted. Recordings play from their original hosts on request. No synthetic voices are used.</p><p>Vocabulary and grammar references include Boston University lesson glossaries, the UCLA Phonetics Lab Archive, and Elhadji Bamba Diop’s <cite>Aay naa ci Wolof!</cite> (Peace Corps Senegal, 2012). Each word note links to its supporting source.</p><p>Selected definitions are adapted from Wiktionary and Wiktionnaire contributors, with English translations, shortened wording and grammatical notes. Those adapted entries are licensed <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0<span class="sr-only"> (opens in a new tab)</span></a>; their original pages are linked next to the definitions. This license does not apply to the original proverb book or the other cited resources.</p><h2>Reading the text</h2><p>Wording and spellings follow the 2009 source; line breaks have been joined for screen reading. Translations and commentary are those of the book, and reflect its editorial and historical context. English parallels are approximate equivalents, not literal translations.</p><p class="notice">The PDF’s legacy font encoding has been repaired in eight entries to preserve the printed character “ŋ”. The repair was checked against the original pages and is documented in the affected entries; spellings have not been modernised.</p><p>The page uses keyboard-accessible controls, visible focus, text labels and language tags. Search ignores accents. Quiz progress lasts only while this tab remains open.</p><details><summary>Read the original foreword</summary><p style="white-space:pre-line">${escapeHTML(metadata.foreword.replace(/^Foreword\s*/, ''))}</p></details><h2 id="about-bibliography">Bibliography</h2><p>Reference numbers in each entry refer to the bibliography on page 99 of the original PDF.</p><ol class="bibliography">${metadata.bibliography.map(b => `<li id="reference-${b.id}" value="${b.id}">${escapeHTML(b.text)}</li>`).join('')}</ol>${metadata.additionalBibliography.length ? `<h3 style="font-family:inherit;font-size:1.1rem">Further sources listed in the book</h3>${listHTML(metadata.additionalBibliography)}` : ''}${metadata.topics.some(t => t.notes.length || t.scripture.length) ? `<h2>Additional topic context</h2><p>The book includes these notes or quotations at topic level, separate from individual proverbs.</p>${metadata.topics.filter(t => t.notes.length || t.scripture.length).map(t => `<h3 style="font-family:inherit;font-size:1.1rem">${escapeHTML(t.name)}</h3>${listHTML([...t.notes, ...t.scripture])}`).join('')}` : ''}<h2 id="photo-credit">Saint-Louis, Senegal</h2><figure class="place-photo"><img src="images/saint-louis-pirogues.jpg" alt="Painted fishing pirogues and Senegalese flags along the waterfront at Guet Ndar, Saint-Louis" width="4032" height="3024" loading="lazy"></figure><p>Pirogues at Guet Ndar, Saint-Louis, Senegal. Photo by <a href="https://commons.wikimedia.org/wiki/File:Pirogues_Guet_ndar.jpg" target="_blank" rel="noopener">Ibfal / Wikimedia Commons<span class="sr-only"> (opens in a new tab)</span></a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0<span class="sr-only"> (opens in a new tab)</span></a>. Displayed with a responsive crop; the original photograph is unchanged.</p><h2>Attribution</h2><p>${escapeHTML(metadata.copyright)}. This is a digital reading and practice adaptation of the user-supplied PDF.</p><p>${escapeHTML(metadata.scriptureAttribution)}</p>`;
}
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
  const definitions = [{name:'search_wolof_proverbs',title:'Search Wolof proverbs',description:'Set the visible collection query and optional exact topic, and return matching entries.',inputSchema:{type:'object',properties:{query:{type:'string'},topic:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if (!input || typeof input.query !== 'string' || input.query.length > 1000 || (input.topic !== undefined && (typeof input.topic !== 'string' || (input.topic && !records.some(p => p.topic === input.topic))))) throw new Error('Provide a query string and a topic from this collection.');query=input.query;topic=input.topic||'';studyFilter='';page=1;$('#search').value=query;showView('browse');history.replaceState(null,'','#browse');renderResults();const matches=searchRecords(records,query,topic);return {total:matches.length,entries:matches.slice(0,pageSize).map(p=>({id:p.id,wolof:p.wolof,translation:p.translation,topic:p.topic,page:p.page}))};}}];
  definitions.forEach(tool => {try {Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});} catch { /* Browsers without working WebMCP still have the complete UI. */ }});
}
$('#search-form').addEventListener('submit', e => e.preventDefault());
$('#search').addEventListener('input', e => {query=e.target.value;page=1;renderResults();});
$('#clear-search').addEventListener('click', () => {query='';page=1;$('#search').value='';renderResults();$('#search').focus();});
$('#topic').addEventListener('change', e => setTopic(e.target.value));
$('#topic-list').addEventListener('keydown', e => {
  const buttons = [...document.querySelectorAll('#topic-list button')], index = buttons.indexOf(e.target);
  if (index < 0) return;
  let next = index;
  if (e.key === 'ArrowDown') next = (index + 1) % buttons.length;
  else if (e.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = buttons.length - 1;
  else return;
  e.preventDefault();setTopic(buttons[next].dataset.topic);buttons[next].focus();
});
$('#topic-list').addEventListener('click', e => {const b=e.target.closest('[data-topic]');if(b)setTopic(b.dataset.topic);});
function toggleEntryPanel(button) {
  const article = button.closest('.proverb'), id = Number(article.id.replace('proverb-',''));
  const kind = button.dataset.entryPanel, panel = document.getElementById(button.getAttribute('aria-controls'));
  const opening = button.getAttribute('aria-expanded') !== 'true';
  stopMedia(article);
  article.querySelectorAll('[data-entry-panel]').forEach(b=>b.setAttribute('aria-expanded','false'));
  article.querySelectorAll('.entry-panel').forEach(p=>p.hidden=true);
  if (!opening) return;
  const p = records.find(p=>p.id===id);
  if (kind === 'words' && !panel.children.length) panel.innerHTML=wordsPanelHTML(p,study);
  if (kind === 'listen' && !panel.children.length) panel.innerHTML=listenPanelHTML(p,study);
  panel.hidden=false;button.setAttribute('aria-expanded','true');
}
$('#study-filter').addEventListener('change',e=>{studyFilter=e.target.value;page=1;renderResults();});
$('#results').addEventListener('click', e => {
  if(e.target.closest('#reset-filters')){query='';topic='';studyFilter='';page=1;$('#search').value='';renderResults();$('#search').focus();return;}
  const toggle=e.target.closest('[data-entry-panel]');if(toggle){toggleEntryPanel(toggle);return;}
  const word=e.target.closest('[data-word-index]');
  if(word){const article=word.closest('.proverb'),p=records.find(p=>p.id===Number(article.id.replace('proverb-','')));stopMedia(article);article.querySelectorAll('[data-word-index]').forEach(b=>b.setAttribute('aria-pressed',String(b===word)));article.querySelector('.word-definition').innerHTML=wordDefinitionHTML(study.words(p)[Number(word.dataset.wordIndex)],study,p);return;}
  const video=e.target.closest('[data-load-video]');
  if(video){const recording=study.recordings.get(Number(video.dataset.loadVideo));if(!recording)return;stopMedia();const iframe=document.createElement('iframe');iframe.src=recording.embedUrl+'?autoplay=1';iframe.title='Wolof lesson: '+recording.title;iframe.dataset.lesson=String(recording.id);iframe.allow='autoplay; encrypted-media; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';video.parentElement.replaceChildren(iframe);iframe.focus();}
});
$('#results').addEventListener('change',e=>{if(e.target.matches('[data-audio-speed]'))e.target.closest('.study-panel').querySelectorAll('audio').forEach(a=>a.playbackRate=Number(e.target.value));});
$('#results').addEventListener('play',e=>{if(e.target.tagName==='AUDIO'){stopVideos();document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause();});}},true);
$('#results').addEventListener('error',e=>{if(e.target.tagName==='AUDIO')e.target.closest('.word-audio').querySelector('.audio-error').hidden=false;},true);
window.addEventListener('pagehide',()=>stopMedia());
$('#pagination').addEventListener('click', e => {if(e.target.closest('#previous-page')){page--;renderResults(true);}if(e.target.closest('#next-page')){page++;renderResults(true);}});
$('#quiz').addEventListener('click', e => {const b=e.target.closest('button');if(!b)return;
  if(b.id==='start-quiz')startQuiz($('#quiz-topic').value);
  else if(b.dataset.answer)answerQuiz(Number(b.dataset.answer));
  else if(b.id==='quiz-next'){if(quizState.index+1===quizState.questions.length)renderQuizResults();else{quizState.index++;renderQuestion();}}
  else if(b.id==='quiz-reset'){renderQuizSetup();$('#quiz-topic').focus();}
  else if(b.id==='quiz-new')startQuiz(quizState.topic);
  else if(b.id==='retry-missed'){const ids=quizState.questions.filter((q,i)=>quizState.answers[i]!==q.proverb.id).map(q=>q.proverb.id);startQuiz('',ids);}
});
window.addEventListener('hashchange', () => route(true));
try {
  const valuesRequest = fetch('values-data.json').then(r=>{if(!r.ok)throw new Error('Values unavailable');return r.json();}).catch(()=>null);
  const studyRequest = fetch('study-data.json').then(r=>{if(!r.ok)throw new Error('Study aids unavailable');return r.json();}).catch(()=>null);
  const responses = await Promise.all([fetch('proverbs.json'), fetch('metadata.json')]);
  if (responses.some(r=>!r.ok)) throw new Error('Collection unavailable');
  [records, metadata] = await Promise.all(responses.map(r=>r.json()));
  const studyData = await studyRequest;
  if (studyData) {study=createStudy(studyData);studyAvailable=true;}
  $('#study-filter').disabled=!studyAvailable;
  valuesView=createValues(await valuesRequest, records, $('#values-content'));
  renderTopics();renderResults();renderSource();route();registerTools();
  if (!studyAvailable) $('#result-count').insertAdjacentHTML('afterend','<p role="status">Word and audio aids could not load. Refresh to retry.</p>');
} catch(error) {
  $('#result-count').textContent='The full collection could not load.';
  $('#results').insertAdjacentHTML('afterbegin','<div class="notice" role="alert"><p>The collection could not load. Refresh the page to try again, or read the original PDF below.</p><a href="original.pdf">Read the original PDF</a></div>');
  $('#values-content').innerHTML='<p role="alert">Values lessons are unavailable because the collection could not load. Refresh to try again.</p>';
  $('#quiz').innerHTML='<p role="alert">Practice is unavailable because the collection could not load. Refresh the page to try again.</p>';
  $('#source-content').innerHTML='<p><a href="original.pdf">Read the original PDF</a></p>';
}
