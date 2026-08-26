/*
 * The page-side measurement `design-parity-statuscell-text.mjs --reproduce` evaluates, kept in
 * its own file rather than as a string literal in that script.
 *
 * A string literal would have to travel through a template literal and then through CDP, and a
 * measurement expression is exactly the kind of code where one lost backslash produces a
 * plausible-looking number instead of an error. In a file it is read verbatim.
 *
 * Returns JSON so the caller stores it rather than re-parsing prose: the fractional widths are
 * the whole finding, and rounding any of them away would erase it.
 */
(() => {
  const buttons = [...document.querySelectorAll('button')];
  const active = buttons.find((b) => (b.textContent || '').trim() === 'checkBeginner');
  const inactive = buttons.find((b) => (b.textContent || '').trim() === 'Expert');
  if (!active || !inactive) return JSON.stringify({ error: 'the mode picker is not on this screen' });
  const picker = active.parentElement;
  const glyph = active.querySelector('.msym');
  const credits = buttons.find((b) => (b.textContent || '').trim().startsWith('confirmation_number'));

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, width: r.width, right: r.x + r.width };
  };
  const textBox = (root, wanted) => {
    const find = (el) => {
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent === wanted) return node;
        if (node.nodeType === 1) { const hit = find(node); if (hit) return hit; }
      }
      return null;
    };
    const node = find(root);
    if (!node) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    return { x: r.x, width: r.width, right: r.x + r.width };
  };
  const weightOf = (el) => (el ? getComputedStyle(el).fontWeight : null);

  return JSON.stringify({
    picker: box(picker),
    activeButton: box(active),
    inactiveButton: box(inactive),
    checkGlyph: box(glyph),
    creditsPill: box(credits),
    beginnerLabel: textBox(active, 'Beginner'),
    expertLabel: textBox(inactive, 'Expert'),
    computedWeight: { active: weightOf(active), inactive: weightOf(inactive), picker: weightOf(picker) },
  });
})()
