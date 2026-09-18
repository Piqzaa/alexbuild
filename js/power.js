/**
 * power.js — Baisse de régime sur appareil contraint
 * AlexBuild
 *
 * Aucune API ne permet de lire le mode basse consommation sous iOS/macOS.
 * getBattery() n'existe que sur Chromium (desktop + Android) ; sous iOS on
 * reste sur les heuristiques d'écran tactile déjà en place. Ce module agrège
 * les signal faible batterie, économiseur de données et animations réduites,
 * et prévient les consommateurs pour réagir pendant la session.
 */

const coarseQuery = window.matchMedia('(any-pointer: coarse)');
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let batterySaver = false;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const readBattery = () => {
  if (!('getBattery' in navigator)) return;
  navigator.getBattery()
    .then((battery) => {
      const update = () => {
        const next = !battery.charging && battery.level <= 0.25;
        if (next !== batterySaver) {
          batterySaver = next;
          notify();
        }
      };
      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
      update();
    })
    .catch(() => {});
};

export const initPowerWatcher = () => {
  readBattery();
  const connection = navigator.connection;
  connection?.addEventListener?.('change', notify);
};

export const isCoarse = () => coarseQuery.matches;
export const isNarrow = () => window.innerWidth < 901;
export const isBudgetMode = () =>
  isCoarse() || isNarrow() || batterySaver || navigator.connection?.saveData === true ||
  reducedQuery.matches;

export const onPowerChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};