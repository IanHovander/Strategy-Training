// Big-screen pieces shared by Learn/Test (host.js) and Alliance Selection (host-draft.js).
import { html } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';

export const nextButton = (v, label, extra = 'btn-xl') =>
  html`<button class="btn ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

/** The leaderboard: rank, robot, name, points just earned, total. Two columns above ten players. */
export function board(players, size, changes = true, short = false) {
  const list = [...players].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const more = list.length - size;
  return html`
    <div class="st-board ${(list.length > 10 || (short && list.length > 3)) && 'two'} ${short && 'short'}">
      ${list.slice(0, size).map((p) => {
        const moved = p.before == null ? 0 : p.before - p.rank;
        return html`
          <div class="st-row" style="--c:${p.color}">
            <span class="st-rank">${p.rank}</span>
            ${avatar(p, { mood: p.rank === 1 ? 'happy' : undefined })}
            <span class="st-name">${p.name}</span>
            ${changes && moved > 0 && html`<span class="st-move">▲${moved}</span>`}
            ${changes && p.gained != null && html`<span class="st-gain ${!p.gained && 'zero'}">+${p.gained}</span>`}
            <b class="st-score">${p.score}</b>
          </div>`;
      })}
    </div>
    ${more > 0 && html`<p class="st-foot">…and ${more} more. Everyone sees their own rank on their phone.</p>`}`;
}

/** The top three on a podium (2nd, 1st, 3rd), then the next few. */
export function podium(players) {
  const list = [...players].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const top = list.slice(0, 3);
  return html`
    <div class="st-podium">
      ${[top[1], top[0], top[2]].map(
        (p, i) =>
          p &&
          html`
            <div class="st-pod st-pod-${[2, 1, 3][i]}" style="--c:${p.color}">
              ${avatar(p, { mood: 'happy' })}
              <span class="st-name">${p.name}</span>
              <b class="st-score">${p.score}</b>
              <span class="st-place">${p.rank}</span>
            </div>`,
      )}
    </div>
    ${list.length > 3 && board(list.slice(3), 6, false, true)}`;
}

/** Who has finished the current step: a robot chip per player, checked once they're done. */
export function status(players) {
  return html`
    <div class="st-status">
      ${players.map(
        (p) => html`
          <span class="st-who ${p.done && 'done'} ${!p.connected && 'away'}" style="--c:${p.color}" title="${p.name}">
            ${avatar(p, { mood: p.done ? 'happy' : undefined })}
            <span>${p.name}</span>
          </span>`,
      )}
    </div>`;
}
