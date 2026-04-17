// Tiny clsx replacement — joins truthy class fragments.
export function cx(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === 'string') out.push(p);
    else if (Array.isArray(p)) {
      const inner = cx(...p);
      if (inner) out.push(inner);
    } else if (typeof p === 'object') {
      for (const [k, v] of Object.entries(p)) if (v) out.push(k);
    }
  }
  return out.join(' ');
}

// Static maps so Tailwind's content scanner picks the class names up.
export const classBg = { A: 'bg-classA', B: 'bg-classB', C: 'bg-classC', D: 'bg-classD' };
export const classText = { A: 'text-classA', B: 'text-classB', C: 'text-classC', D: 'text-classD' };
export const classBorder = { A: 'border-classA', B: 'border-classB', C: 'border-classC', D: 'border-classD' };
export const classBorderL = { A: 'border-l-classA', B: 'border-l-classB', C: 'border-l-classC', D: 'border-l-classD' };
export const classBgSoft = { A: 'bg-classA/15', B: 'bg-classB/15', C: 'bg-classC/15', D: 'bg-classD/15' };
export const classBorderSoft = { A: 'border-classA/40', B: 'border-classB/40', C: 'border-classC/40', D: 'border-classD/40' };
