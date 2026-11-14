const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
const toggles = [...document.querySelectorAll('.nav-toggle')];
function closeDropdowns() {
  toggles.forEach(button => {
    button.setAttribute('aria-expanded', 'false');
    button.parentElement.classList.remove('is-open');
  });
}
function closeMenu(restoreFocus = false) {
  closeDropdowns();
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menu?.focus();
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  closeDropdowns();
  menu.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('open', open);
});
toggles.forEach(button => button.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') !== 'true';
  closeDropdowns();
  if (open) {
    button.setAttribute('aria-expanded', 'true');
    button.parentElement.classList.add('is-open');
  }
}));
nav?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
  else if (!event.target.closest('.nav-group')) closeDropdowns();
});
document.addEventListener('focusin', event => {
  if (!event.target.closest('.header')) closeMenu();
  else toggles.forEach(button => {
    if (!button.parentElement.contains(event.target)) {
      button.setAttribute('aria-expanded', 'false');
      button.parentElement.classList.remove('is-open');
    }
  });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const active = toggles.find(button => button.getAttribute('aria-expanded') === 'true');
  if (active) { closeDropdowns(); active.focus(); event.preventDefault(); }
  else if (menu?.getAttribute('aria-expanded') === 'true') { closeMenu(true); event.preventDefault(); }
});
window.matchMedia('(max-width: 1200px)').addEventListener('change', () => closeMenu());
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
const currentPage = location.pathname.split('/').pop() || 'index.html';
nav?.querySelectorAll('a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});
const requestedService = new URLSearchParams(location.search).get('service');
const serviceSelect = document.querySelector('#enquiry-service');
if (serviceSelect && requestedService && [...serviceSelect.options].some(option => option.value === requestedService)) serviceSelect.value = requestedService;
const form = document.querySelector('#enquiry-form');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity() || form.dataset.submitting) return;
  const status = document.querySelector('#enquiry-status');
  const button = form.querySelector('button[type="submit"]');
  const fields = new FormData(form);
  const data = Object.fromEntries(['name', 'email', 'phone', 'service', 'message', 'website'].map(key => [key, String(fields.get(key) || '')]));
  data.consent = fields.get('consent') === 'on';
  form.dataset.submitting = 'true';
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Sending your enquiry…';
  status.classList.remove('form-error');
  try {
    const response = await fetch(form.action, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:AbortSignal.timeout(20000)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Your enquiry could not be submitted. Please try again.');
    status.textContent = `${result.message} Reference: ${result.reference}`;
    form.reset();
  } catch (error) {
    status.classList.add('form-error');
    status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError' || error.name === 'SyntaxError'
      ? 'We could not confirm receipt. Please try again or call +91 91674 85843. Your details are still in the form.'
      : error.message;
  } finally {
    delete form.dataset.submitting;
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
