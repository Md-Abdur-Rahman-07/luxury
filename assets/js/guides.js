(() => {
  'use strict';

  const grid = document.querySelector('.guide-grid');
  if (!grid) return;

  const search = document.querySelector('#venue-search');
  const cards = Array.from(grid.querySelectorAll('.venue-card'));
  const status = document.querySelector('.filter-status');
  const emptyState = document.querySelector('.guide-no-results');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

  if (search) {
    document.querySelector('.guide-search').hidden = false;
    const updateResults = () => {
      const query = normalize(search.value);
      let visible = 0;
      cards.forEach(card => {
        const match = normalize(card.dataset.search).includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });
      if (status) {
        status.textContent = query
          ? `${visible} of ${cards.length} ${status.dataset.noun} match your search`
          : `${cards.length} ${status.dataset.noun} to explore`;
      }
      if (emptyState) emptyState.hidden = visible !== 0;
    };
    search.addEventListener('input', updateResults);
    search.addEventListener('search', updateResults);
    document.querySelector('[data-clear-search]')?.addEventListener('click', () => {
      search.value = '';
      updateResults();
      search.focus();
    });
    updateResults();
  }

  const dialog = document.querySelector('.venue-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const content = dialog.querySelector('[data-venue-content]');
  const closeButton = dialog.querySelector('.dialog-close');
  let opener = null;
  let startedOnBackdrop = false;

  grid.querySelectorAll('[data-venue-open]').forEach(button => {
    const template = document.getElementById(button.dataset.venueOpen);
    if (!(template instanceof HTMLTemplateElement)) return;
    button.hidden = false;
    button.addEventListener('click', () => {
      opener = button;
      content.replaceChildren(template.content.cloneNode(true));
      document.body.classList.add('dialog-open');
      dialog.showModal();
      dialog.scrollTop = 0;
      closeButton.focus({ preventScroll: true });
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('pointerdown', event => {
    startedOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && startedOnBackdrop) dialog.close();
    startedOnBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    content.replaceChildren();
    opener?.focus({ preventScroll: true });
    opener = null;
  });
})();
