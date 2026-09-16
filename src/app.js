import { jwtTool } from './tools/jwt.js';

const tools = [jwtTool];

const SIDEBAR_STORAGE_KEY = '4dev:sidebar-collapsed';

const sidebar = document.querySelector('#sidebar');
const sidebarToggle = document.querySelector('#sidebar-toggle');
const sidebarToggleIcon = document.querySelector('#sidebar-toggle-icon');
const nav = document.querySelector('#tool-nav');
const view = document.querySelector('#tool-view');

function renderNav() {
  nav.innerHTML = tools
    .map(
      tool => `
      <a href="#/${tool.id}" data-tool="${tool.id}" title="${tool.label}"
        class="group/item flex h-10 items-center gap-3 rounded-md px-2.5 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100">
        <span class="grid size-5 shrink-0 place-items-center">${tool.icon}</span>
        <span data-sidebar-label class="truncate">${tool.name}</span>
      </a>`
    )
    .join('');
}

function highlightActiveTool(toolId) {
  for (const link of nav.querySelectorAll('[data-tool]')) {
    const isActive = link.dataset.tool === toolId;
    link.classList.toggle('bg-zinc-800', isActive);
    link.classList.toggle('text-zinc-100', isActive);
    link.classList.toggle('text-zinc-400', !isActive);
  }
}

function applySidebarState(isCollapsed) {
  sidebar.classList.toggle('w-60', !isCollapsed);
  sidebar.classList.toggle('w-14', isCollapsed);
  for (const label of document.querySelectorAll('[data-sidebar-label]')) {
    label.classList.toggle('hidden', isCollapsed);
  }
  sidebarToggleIcon.classList.toggle('rotate-180', isCollapsed);
  sidebarToggle.title = isCollapsed ? 'Expandir menu' : 'Recolher menu';
  sidebarToggle.setAttribute('aria-label', sidebarToggle.title);
  sidebarToggle.classList.toggle('mx-auto', isCollapsed);
  sidebarToggle.classList.toggle('ml-auto', !isCollapsed);
}

function toggleSidebar() {
  const isCollapsed = !sidebar.classList.contains('w-14');
  applySidebarState(isCollapsed);
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  } catch {}
}

function readStoredSidebarState() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function resolveTool() {
  const toolId = location.hash.replace(/^#\/?/, '');
  return tools.find(tool => tool.id === toolId) ?? tools[0];
}

function renderRoute() {
  const tool = resolveTool();
  document.title = `${tool.name} — 4dev`;
  highlightActiveTool(tool.id);
  view.innerHTML = '';
  tool.mount(view);
}

renderNav();
applySidebarState(readStoredSidebarState());
sidebarToggle.addEventListener('click', toggleSidebar);
window.addEventListener('hashchange', renderRoute);

if (!location.hash) history.replaceState(null, '', `#/${tools[0].id}`);
renderRoute();
