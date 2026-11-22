const normalizeTitle = (value: string): string =>
  ` ${value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()} `;

// These title families are outside a software-development search even when
// they contain generic technical words such as "engineer", "Java" or "API".
// Keep this deterministic: an LLM may explain borderline roles later, but it
// must not be required to prevent obvious sales/CRM noise from being saved.
const NON_DEVELOPMENT_TITLE_PATTERNS = [
  /\b(?:pre ?sales|avant vente|sales) engineer\b/,
  /\b(?:sales|commercial) (?:representative|consultant|specialist|manager|director)\b/,
  /\bingenieur (?:commercial|avant vente)\b/,
  /\bsolutions? (?:engineer|consultant)\b/,
  /\baccount (?:executive|manager|director)\b/,
  /\bbusiness development\b/,
  /\bcustomer success\b/,
  /\b(?:technical )?recruiter\b/,
  /\btalent acquisition\b/,
  /\bmarketing (?:manager|specialist|director)\b/,
  /\bproduct manager\b/,
  /\bproject manager\b/,
  /\bchef de projet\b/,
  /\b(?:technical |application )?support engineer\b/,
  /\b(?:accountant|comptable)\b/,
  /\b(?:insurance )?graduate program\b/,
  /\btalent pool\b/,
  /\bdesign system director\b/,
] as const;

const SOFTWARE_TITLE_PATTERNS = [
  /\bsoftware\b/,
  /\blogiciel\b/,
  /\bdevelop(?:er|eur|euse|peur|pement|ments)?\b/,
  /\bdevops\b/,
  /\bback ?end\b/,
  /\bfront ?end\b/,
  /\bfull ?stack\b/,
  /\b(?:java|javascript|typescript|python|golang|node ?js|react|vue ?js)\b/,
  /\b(?:c\+\+|c#|\.net)\b/,
  /\b(?:data|cloud|platform|security) engineer\b/,
  /\b(?:ai|ia|machine learning|ml) (?:engineer|research engineer)\b/,
  /\b(?:ai|ia) agent (?:engineer|developer)\b/,
  /\bllm (?:application |agent )?(?:engineer|developer)\b/,
  /\bingenieur (?:informatique|ia|data)\b/,
  /\binformaticien\b/,
  /\bapplication engineer\b/,
] as const;

export function isNonDevelopmentJobTitle(title: string): boolean {
  const normalized = normalizeTitle(title);

  // Salesforce is a product/skill name, not evidence that the role is sales.
  if (/\bsalesforce\b/.test(normalized)) return false;

  return NON_DEVELOPMENT_TITLE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function isLikelySoftwareJobTitle(title: string): boolean {
  const normalized = normalizeTitle(title);
  return SOFTWARE_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function titleContainsExcludedTerm(
  title: string,
  excludedTerms: string[],
): boolean {
  const normalized = normalizeTitle(title);
  return excludedTerms.some((term) => {
    const candidate = normalizeTitle(term).trim();
    return candidate.length > 0 && normalized.includes(` ${candidate} `);
  });
}
