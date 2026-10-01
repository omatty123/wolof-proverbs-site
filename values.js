const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createValues(data, records, root) {
  const values = data?.values || [];
  const byId = new Map(records.map(p => [p.id, p]));
  if (!values.length) {
    root.innerHTML = '<p role="alert">The values lessons could not load. <a href="#values" data-retry-values>Reload the lessons</a>, or <a href="#browse">read the collection</a>.</p>';
    root.querySelector('[data-retry-values]').addEventListener('click', e => {e.preventDefault(); location.reload();});
    return {select: () => false};
  }
  root.innerHTML = `<div class="values-layout"><div class="values-picker"><p id="values-instruction">Select a value to explore its meaning and proverbs.</p><div class="values-cluster" role="group" aria-label="Explore eight values" aria-describedby="values-instruction">${values.map(v => `<button type="button" class="value-bubble" data-value="${v.id}" aria-pressed="false" aria-controls="value-lesson"><span lang="wo">${escapeHTML(v.term)}</span><span>${escapeHTML(v.bubbleLabel || v.label)}</span></button>`).join('')}</div><button type="button" class="read-value">Read this lesson <span aria-hidden="true">↗</span></button><p class="values-context">These Wolof words offer a window into Senegalese life. Senegal has many languages and traditions; families may explain these values in different ways.</p></div><div id="value-lesson" role="region" aria-labelledby="value-title"></div></div><p id="values-status" class="sr-only" role="status" aria-live="polite"></p>`;

  function select(id, announce = false) {
    const value = values.find(v => v.id === id) || values[0];
    root.querySelectorAll('[data-value]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value.id)));
    root.querySelector('#value-lesson').innerHTML = `<div class="value-heading"><h2 id="value-title" tabindex="-1" lang="wo">${escapeHTML(value.term)}</h2><p>${escapeHTML(value.label)}</p></div><p class="value-meaning">${escapeHTML(value.meaning)}</p><div class="value-activity"><div><h3>In everyday life</h3><p>${escapeHTML(value.example)}</p></div><div><h3>Talk about it</h3><p>${escapeHTML(value.prompt)}</p></div></div><h3 class="values-proverbs-heading">Three proverbs to explore</h3><p class="values-reading-note">These paraphrases offer interpretations, not word-for-word translations.</p><div class="values-proverbs">${value.proverbs.map(selection => {
      const p = byId.get(selection.id);
      return `<article class="value-proverb" data-value-proverb="${p.id}"><div class="value-proverb-text"><h4 lang="wo">${escapeHTML(p.wolof)}</h4><p><span class="value-label">Plain meaning</span>${escapeHTML(selection.childReading)}</p></div><details class="value-discussion"><summary>Try it &amp; see the book’s translation<span class="sr-only"> for proverb ${p.id}</span></summary><p><strong>Try together:</strong> ${escapeHTML(selection.prompt)}</p><p><strong>Book translation:</strong> ${escapeHTML(p.translation)}</p><p><strong>Our connection:</strong> ${escapeHTML(selection.connection)}</p><div class="value-source-links"><a href="#proverb-${p.id}">Full entry · No. ${p.id}</a><a href="original.pdf#page=${p.page}" target="_blank" rel="noopener">PDF · page ${p.page}<span class="sr-only"> (opens in a new tab)</span></a></div></details></article>`;
    }).join('')}</div><details class="value-adult-notes"><summary>Context &amp; sources</summary><p>${escapeHTML(value.adultNote)}</p><p>These explanations and proverb connections were prepared for this page. They are not categories from the book or a complete list of Senegalese values.</p><ul>${value.sources.map(s => `<li><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title)}<span class="sr-only"> (opens in a new tab)</span></a></li>`).join('')}</ul></details>`;
    if (announce) root.querySelector('#values-status').textContent = `${value.term}: ${value.label}. Lesson updated after the bubbles.`;
    return value.id;
  }
  root.querySelector('.values-cluster').addEventListener('click', e => {
    const button = e.target.closest('[data-value]');
    if (button) location.hash = `values-${button.dataset.value}`;
  });
  root.querySelector('.read-value').addEventListener('click', () => {
    const title = root.querySelector('#value-title'); title.focus(); title.scrollIntoView({block:'start'});
  });
  select(values[0].id);
  return {select};
}
