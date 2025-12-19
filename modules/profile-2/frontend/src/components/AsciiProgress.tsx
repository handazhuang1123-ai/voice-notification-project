/**
 * AsciiProgress - ASCII 风格进度条
 * [■■■□□□] 50%
 */

export function AsciiProgress({
  percent,
  total = 6,
  showPercent = true
}: {
  percent: number;
  total?: number;
  showPercent?: boolean;
}) {
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;

  return (
    <span>
      [<span className="progress-filled">{'■'.repeat(filled)}</span>
      <span className="progress-empty">{'□'.repeat(empty)}</span>]
      {showPercent && ` ${percent}%`}
    </span>
  );
}

export default AsciiProgress;
