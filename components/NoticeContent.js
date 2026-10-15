/**
 * Renders notice text with light structure, so admins can write plain text:
 *   "1. Step"  → numbered step with a badge
 *   "- point"  → bullet
 *   blank line → new paragraph
 * Colors come from the caller so it fits every page's theme.
 */
export function parseNotice(text = '') {
  const blocks = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    const num = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
    const bul = line.match(/^[-•*]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (!line) blocks.push({ type: 'gap' });
    else if (num) (last?.type === 'ol' ? last : (blocks.push({ type: 'ol', items: [] }), blocks[blocks.length - 1])).items.push({ n: num[1], text: num[2] });
    else if (bul) (last?.type === 'ul' ? last : (blocks.push({ type: 'ul', items: [] }), blocks[blocks.length - 1])).items.push(bul[1]);
    else if (last?.type === 'p') last.text += ' ' + line;
    else blocks.push({ type: 'p', text: line });
  }
  return blocks.filter((b, i, a) => b.type !== 'gap' || (i > 0 && i < a.length - 1 && a[i - 1].type !== 'gap'));
}

/** First readable sentence-ish snippet, for one-line previews */
export function noticePreview(text = '', max = 90) {
  const flat = parseNotice(text).map(b => b.type === 'p' ? b.text : b.type === 'ol' ? b.items[0]?.text : b.type === 'ul' ? b.items[0] : '').filter(Boolean).join(' ');
  return flat.length > max ? flat.slice(0, max).replace(/\s+\S*$/, '') + '…' : flat;
}

export default function NoticeContent({ text, color, strong, accent, accentSoft, size = 13 }) {
  const blocks = parseNotice(text);
  const lh = 1.6;
  return (
    <div style={{ color, fontSize: size, lineHeight: lh }}>
      {blocks.map((b, i) => {
        if (b.type === 'gap') return <div key={i} style={{ height: size * 0.6 }} />;
        if (b.type === 'p') return <p key={i} style={{ margin: `${i ? size * 0.35 : 0}px 0 0` }}>{b.text}</p>;
        if (b.type === 'ul') return (
          <ul key={i} style={{ margin: `${i ? size * 0.4 : 0}px 0 0`, padding: 0, listStyle: 'none' }}>
            {b.items.map((t, j) => (
              <li key={j} style={{ display: 'flex', gap: 8, marginTop: j ? size * 0.35 : 0 }}>
                <span style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 9, background: accent, marginTop: size * lh / 2 - 2.5 }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        );
        return (
          <ol key={i} style={{ margin: `${i ? size * 0.5 : 0}px 0 0`, padding: 0, listStyle: 'none' }}>
            {b.items.map((it, j) => (
              <li key={j} style={{ display: 'flex', gap: 10, marginTop: j ? size * 0.55 : 0 }}>
                <span style={{ flexShrink: 0, width: size + 7, height: size + 7, borderRadius: 999, background: accentSoft, color: accent,
                               fontSize: size - 3, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                               marginTop: (size * lh - (size + 7)) / 2, fontVariantNumeric: 'tabular-nums' }}>{it.n}</span>
                <span style={{ color: strong ? undefined : color }}>{it.text}</span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
