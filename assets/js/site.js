(() => {
  // These page-level deterrents cannot control browser menus or external tools.
  const developerKeys = new Set(['i', 'j', 'c', 'k', 'e']);
  document.addEventListener('contextmenu', event => event.preventDefault(), { capture: true });
  document.addEventListener('keydown', event => {
    const key = event.code?.startsWith('Key')
      ? event.code.slice(3).toLowerCase()
      : (event.key || '').toLowerCase();
    const inspectShortcut = (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey)
      || (event.metaKey && (event.altKey || event.shiftKey) && !event.ctrlKey);
    const sourceShortcut = key === 'u' && (
      (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey)
      || (event.metaKey && event.altKey && !event.shiftKey && !event.ctrlKey)
    );
    if (key === 'f12' || event.code === 'F12' || (inspectShortcut && developerKeys.has(key)) || sourceShortcut) {
      event.preventDefault();
    }
  }, { capture: true });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-navigation');
  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('menu-open');
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', open);
  });
  navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); menuButton.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  const breakpoint = window.matchMedia('(min-width: 1001px)');
  breakpoint.addEventListener('change', closeMenu);

  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    backToTop.hidden = false;
    let visible = false;
    const updateBackToTop = () => {
      if (window.scrollY > 480) visible = true;
      else if (window.scrollY < 280) visible = false;
      backToTop.classList.toggle('is-visible', visible);
    };
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener('click', () => {
      document.querySelector('.site-header .brand')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  }

  // Content is visible by default, including without JavaScript or reduced motion.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
    }), { threshold: 0, rootMargin: '0px 0px 100px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight) { element.classList.add('will-reveal'); observer.observe(element); }
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        document.querySelectorAll('.will-reveal').forEach(element => element.classList.add('revealed'));
      }
    });
  }

  document.querySelectorAll('.faq-list details').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary || typeof details.animate !== 'function') return;
    let animation = null;
    let expanded = details.open;
    summary.addEventListener('click', event => {
      event.preventDefault();
      const startHeight = details.getBoundingClientRect().height;
      expanded = !expanded;
      animation?.cancel();
      if (reducedMotion.matches) {
        details.open = expanded;
        details.style.overflow = '';
        animation = null;
        return;
      }
      // Keep the native content present while its container eases closed.
      details.open = true;
      const style = getComputedStyle(details);
      const closedHeight = summary.getBoundingClientRect().height
        + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const endHeight = expanded ? details.getBoundingClientRect().height : closedHeight;
      details.style.overflow = 'hidden';
      animation = details.animate([
        { height: `${startHeight}px` }, { height: `${endHeight}px` }
      ], { duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
      animation.onfinish = () => {
        details.open = expanded;
        details.style.overflow = '';
        animation.cancel();
        animation = null;
      };
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) animation?.finish();
    });
  });

  const service = new URLSearchParams(location.search).get('service');
  const serviceSelect = document.querySelector('#contact-service');
  if (serviceSelect && [...serviceSelect.options].some(option => option.value === service)) serviceSelect.value = service;

  const dateField = document.querySelector('[name="datetime"]');
  const centralNow = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };
  if (dateField) {
    const updateMinimum = () => { dateField.min = centralNow(); };
    updateMinimum();
    dateField.addEventListener('focus', updateMinimum);
  }

  document.querySelectorAll('[data-inquiry-form]').forEach(form => {
    const status = form.querySelector('.form-status');
    const clearFieldErrors = () => {
      form.querySelectorAll('.field-error').forEach(error => error.remove());
      form.querySelectorAll('[aria-invalid]').forEach(field => {
        field.removeAttribute('aria-invalid');
        const hints = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && !id.endsWith('-error'));
        if (hints.length) field.setAttribute('aria-describedby', hints.join(' '));
        else field.removeAttribute('aria-describedby');
      });
    };
    const showFieldErrors = errors => {
      for (const [name, message] of Object.entries(errors || {})) {
        const field = form.elements.namedItem(name);
        if (!(field instanceof HTMLElement) || !field.closest('.field')) continue;
        const error = document.createElement('small');
        error.className = 'field-error';
        error.id = `${field.id}-error`;
        error.textContent = message;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
        field.closest('.field').append(error);
      }
    };
    const showStatus = (message, ok = false) => {
      status.textContent = message;
      status.hidden = false;
      status.classList.toggle('is-success', ok);
      status.setAttribute('role', ok ? 'status' : 'alert');
    };
    const redirectStatus = new URLSearchParams(location.search).get('status');
    const relevant = (form.elements.form_kind.value === 'quote' && location.hash === '#quote') || (form.elements.form_kind.value === 'contact' && location.hash === '#inquiry');
    if (redirectStatus && relevant) {
      const messages = { success: 'Thank you. Your inquiry has been sent. Our team will be in touch.', 'delivery-error': 'We couldn’t send your inquiry. Please email example@gmail.com.', 'validation-error': 'Please review the required details and try again.', 'service-unavailable': 'Online inquiries are temporarily unavailable. Please email example@gmail.com.' };
      if (messages[redirectStatus]) showStatus(messages[redirectStatus], redirectStatus === 'success');
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearFieldErrors();
      if (dateField && form.contains(dateField)) { dateField.min = centralNow(); }
      if (!form.reportValidity()) return;
      const button = form.querySelector('[type="submit"]');
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending your inquiry…';
      form.setAttribute('aria-busy', 'true');
      status.hidden = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, signal: controller.signal });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('The inquiry service is unavailable. Please email example@gmail.com.');
        const result = await response.json();
        if (!response.ok || !result.ok) {
          showFieldErrors(result.errors);
          throw new Error(result.message || 'We couldn’t send your inquiry. Please email example@gmail.com.');
        }
        showStatus(result.message, true);
        form.reset();
      } catch (error) {
        showStatus(error.name === 'AbortError' ? 'The connection took too long. Your inquiry may have arrived; please email example@gmail.com before resending.' : error.message === 'Failed to fetch' ? 'We couldn’t connect. Your inquiry may have arrived; please email example@gmail.com before resending.' : error.message);
      } finally {
        clearTimeout(timeout);
        button.disabled = false;
        button.textContent = original;
        form.removeAttribute('aria-busy');
        status.focus({ preventScroll: true });
        const bounds = status.getBoundingClientRect();
        if (bounds.top < 16 || bounds.bottom > innerHeight - 16) {
          status.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
        }
      }
    });
  });
})();
