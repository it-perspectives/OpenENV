/** Extract one version's Markdown body, preserving its subsections. */
export function extractReleaseNotes(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  for (const [index, line] of lines.entries()) {
    const heading = /^##[ \t]+(\S+)/.exec(line);
    if (heading) sections.push({ index, version: heading[1] });
  }
  const matches = sections.filter((section) => section.version === version);
  if (matches.length === 0) throw new Error(`Missing changelog entry for ${version}.`);
  if (matches.length > 1) throw new Error(`Duplicate changelog entries for ${version}.`);
  const start = matches[0].index;
  const end = sections.find((section) => section.index > start)?.index ?? lines.length;
  const notes = lines.slice(start + 1, end).join('\n').trim();
  if (!notes) throw new Error(`Empty changelog entry for ${version}.`);
  return `${notes}\n`;
}
