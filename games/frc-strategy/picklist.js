// The group picklist on a phone, modeled on the Iron Panthers 2026-scout picklist: "Your Picklist" (toggling with
// "Do Not Pick") beside "Available Teams". Drag cards between and within columns (mouse: move 8 px; touch: hold
// 200 ms, so a quick swipe still scrolls), dropping above or below a card by which half you release on. Tap a card
// for its full scouting and buttons to move it.
//
// The lists live in the game (shared with the group); this keeps a local copy so a drop shows at once, and holds
// incoming updates while a drag is in progress.
import { html } from '../../js/ui.js';
import { average, scoutCard, teamName, allianceOf } from './draft-views.js';

const SORTS = { seed: 'Seed', avg: 'Avg cycles', susceptibility: 'Least susceptible', defense: 'Best defense' };

/**
 * mount(container, { send, onInvite }) -> { update(view) }
 *   send(list, teamId, index)   move a team ('pick' | 'dnp' | 'bank')
 *   canInvite(view)             is this phone's captain on the clock?
 *   invite(teamId)              make the invitation
 */
export function mountPicklist(container, { send, canInvite, invite }) {
  let view = null;
  let lists = { pick: [], dnp: [] };
  let tab = 'pick';
  let sort = 'seed';
  let drag = null; // { id, from, ghost, el, startX, startY, offX, offY, target }
  let held = null; // a view update that arrived mid-drag
  let sheet = null; // team id whose details are open
  let lastDrop = 0;

  container.addEventListener('click', (e) => {
    // A tap on a card opens its details (but not the click that ends a drag).
    const tapped = e.target.closest('.pl-card');
    if (tapped && Date.now() - lastDrop > 300) {
      sheet = tapped.dataset.team;
      return draw();
    }
    const tabBtn = e.target.closest('[data-pl-tab]');
    if (tabBtn) {
      tab = tabBtn.dataset.plTab;
      return draw();
    }
    const move = e.target.closest('[data-pl-move]');
    if (move) {
      moveTo(sheet, move.dataset.plMove, lists[move.dataset.plMove]?.length ?? 0);
      sheet = null;
      return draw();
    }
    if (e.target.closest('[data-pl-invite]')) {
      invite(sheet);
      sheet = null;
      return draw();
    }
    if (e.target.closest('[data-pl-close]') || e.target.classList.contains('pl-backdrop')) {
      sheet = null;
      return draw();
    }
  });
  container.addEventListener('change', (e) => {
    if (e.target.matches('[data-pl-sort]')) {
      sort = e.target.value;
      draw();
    }
  });

  // ---------- dragging ----------

  container.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.pl-card');
    if (!card || e.button > 0 || drag) return;
    const pending = { id: card.dataset.team, from: card.closest('[data-col]').dataset.col, el: card, startX: e.clientX, startY: e.clientY, active: false, touch: e.pointerType === 'touch' };
    drag = pending;
    if (pending.touch) pending.timer = setTimeout(() => startDrag(e.clientX, e.clientY), 200);
  });

  // Touch: once a drag is active, stop the page from scrolling (needs a non-passive listener).
  container.addEventListener(
    'touchmove',
    (e) => {
      if (!drag?.active) return;
      e.preventDefault();
      follow(e.touches[0].clientX, e.touches[0].clientY); // in case the browser stopped sending pointer events
    },
    { passive: false },
  );
  container.addEventListener('touchend', () => drag?.active && drop());

  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (!drag.active) {
      if (drag.touch) {
        if (moved > 8) cancel(); // a swipe: let the page scroll
        return;
      }
      if (moved > 8) startDrag(e.clientX, e.clientY);
      return;
    }
    follow(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    if (!drag.active) return cancel(); // a tap: the click that follows opens the details
    drop();
  });
  window.addEventListener('pointercancel', () => drag?.active || cancel());

  function startDrag(x, y) {
    if (!drag) return;
    clearTimeout(drag.timer);
    const rect = drag.el.getBoundingClientRect();
    drag.active = true;
    drag.offX = x - rect.left;
    drag.offY = y - rect.top;
    drag.ghost = drag.el.cloneNode(true);
    drag.ghost.classList.add('pl-ghost');
    drag.ghost.style.width = `${rect.width}px`;
    document.body.append(drag.ghost);
    drag.el.classList.add('pl-dragging');
    drag.raf = requestAnimationFrame(autoScroll);
    try {
      navigator.vibrate?.(10);
    } catch {}
    follow(x, y);
  }

  /** Near the top or bottom edge while dragging, scroll the page so a card can travel the whole list. */
  function autoScroll() {
    if (!drag?.active) return;
    const scroller = container.closest('.stage') ?? document.scrollingElement;
    const edge = 70;
    const speed = drag.y < edge ? -(edge - drag.y) / 4 : drag.y > innerHeight - edge ? (drag.y - (innerHeight - edge)) / 4 : 0;
    if (speed) {
      scroller.scrollTop += speed;
      follow(drag.x, drag.y);
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function follow(x, y) {
    drag.x = x;
    drag.y = y;
    drag.ghost.style.transform = `translate(${x - drag.offX}px, ${y - drag.offY}px)`;
    // which column, and where in it
    drag.ghost.style.display = 'none';
    const under = document.elementFromPoint(x, y);
    drag.ghost.style.display = '';
    const col = under?.closest?.('[data-col]');
    container.querySelector('.pl-marker')?.remove();
    if (!col || !container.contains(col)) return (drag.target = null);
    const list = col.dataset.col;
    let index = 0;
    const cards = [...col.querySelectorAll('.pl-card')].filter((c) => c !== drag.el);
    if (list !== 'bank') {
      // drop before the first card whose middle is below the pointer
      index = cards.findIndex((c) => {
        const r = c.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      if (index < 0) index = cards.length;
      const marker = document.createElement('div');
      marker.className = 'pl-marker';
      if (cards[index]) cards[index].before(marker);
      else col.querySelector('.pl-cards').append(marker);
    }
    drag.target = { list, index };
  }

  function drop() {
    const { id, target } = drag;
    lastDrop = Date.now();
    cleanup();
    if (target) moveTo(id, target.list, target.index);
    if (held) {
      view = held;
      held = null;
    }
    draw();
  }

  function cancel() {
    cleanup();
  }

  function cleanup() {
    if (!drag) return;
    clearTimeout(drag.timer);
    cancelAnimationFrame(drag.raf);
    drag.ghost?.remove();
    drag.el?.classList.remove('pl-dragging');
    container.querySelector('.pl-marker')?.remove();
    drag = null;
  }

  /** Move locally right away, and tell the game. */
  function moveTo(id, list, index) {
    lists = { pick: lists.pick.filter((x) => x !== id), dnp: lists.dnp.filter((x) => x !== id) };
    if (list !== 'bank') lists[list].splice(Math.min(index, lists[list].length), 0, id);
    send(list, id, index);
  }

  // ---------- drawing ----------

  function card(s, rank) {
    const on = allianceOf(view, s.id);
    return html`
      <div class="pl-card ${on.alliance >= 0 && `taken a${on.alliance}`}" data-team="${s.id}">
        ${rank != null && html`<span class="pl-rank">${rank}</span>`}
        <span class="pl-seed">#${s.seed}</span>
        <span class="pl-name">
          <b>${teamName(s.id)}</b>
          <small>${on.alliance >= 0 ? `Alliance ${on.alliance + 1}` : `avg ${average(s).toFixed(1)} · S${Math.round(100 * s.susceptibility)} D${Math.round(100 * s.defense)}`}</small>
        </span>
      </div>`;
  }

  function column(key, title, ids, ranked, extra = null) {
    const byId = Object.fromEntries(view.event.map((s) => [s.id, s]));
    return html`
      <div class="pl-col ${key !== 'bank' && tab !== key && 'pl-hidden'}" data-col="${key}">
        <div class="pl-head"><span>${title}</span>${extra}</div>
        <div class="pl-cards">
          ${ids.length === 0 && html`<p class="pl-empty">${key === 'bank' ? 'Every team is on a list.' : 'Drag teams here.'}</p>`}
          ${ids.map((id, i) => card(byId[id], ranked ? i + 1 : null))}
        </div>
      </div>`;
  }

  function sortedBank() {
    const listed = new Set([...lists.pick, ...lists.dnp]);
    const key = { seed: (s) => s.seed, avg: (s) => -average(s), susceptibility: (s) => s.susceptibility, defense: (s) => -s.defense }[sort];
    return view.event.filter((s) => !listed.has(s.id)).sort((a, b) => key(a) - key(b) || a.seed - b.seed).map((s) => s.id);
  }

  function details() {
    const s = view.event.find((t) => t.id === sheet);
    if (!s) return null;
    const where = lists.pick.includes(s.id) ? 'pick' : lists.dnp.includes(s.id) ? 'dnp' : 'bank';
    const taken = allianceOf(view, s.id).alliance >= 0;
    return html`
      <div class="pl-backdrop">
        <div class="pl-sheet">
          ${scoutCard(view, s)}
          ${canInvite(view) && !taken && html`<button type="button" class="btn btn-xl block" data-pl-invite>Invite ${teamName(s.id)}</button>`}
          <div class="pl-moves">
            ${where !== 'pick' && html`<button type="button" class="btn btn-sm" data-pl-move="pick">Add to Picklist</button>`}
            ${where !== 'dnp' && html`<button type="button" class="btn btn-sm secondary" data-pl-move="dnp">Do Not Pick</button>`}
            ${where !== 'bank' && html`<button type="button" class="btn btn-sm" data-pl-move="bank">Back to Available</button>`}
          </div>
          <button type="button" class="btn ghost block" data-pl-close>Close</button>
        </div>
      </div>`;
  }

  function draw() {
    if (!view) return;
    container.innerHTML = html`
      <div class="pl">
        <div class="pl-tabs">
          <button type="button" class="${tab === 'pick' && 'on'}" data-pl-tab="pick">Your Picklist</button>
          <button type="button" class="${tab === 'dnp' && 'on'}" data-pl-tab="dnp">Do Not Pick</button>
        </div>
        <div class="pl-grid">
          ${column('pick', 'Your Picklist', lists.pick, true)}
          ${column('dnp', 'Do Not Pick', lists.dnp, true)}
          ${column(
            'bank',
            'Available Teams',
            sortedBank(),
            false,
            html`<select data-pl-sort aria-label="Sort available teams">${Object.entries(SORTS).map(([k, label]) => html`<option value="${k}" ${sort === k && 'selected'}>${label}</option>`)}</select>`,
          )}
        </div>
      </div>
      ${sheet && details()}`;
  }

  return {
    update(next) {
      if (drag?.active) {
        held = next; // don't redraw under a finger
        return;
      }
      view = next;
      lists = { pick: [...next.picklist.pick], dnp: [...next.picklist.dnp] };
      draw();
    },
  };
}
