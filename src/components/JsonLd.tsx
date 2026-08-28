/**
 * Dane strukturalne wstrzykiwane jako <script type="application/ld+json">.
 *
 * Treść pochodzi wyłącznie z naszych stałych i tłumaczeń - nigdy z danych
 * wpisanych przez użytkownika - więc dangerouslySetInnerHTML jest tu bezpieczne.
 * Dodatkowo escapujemy "<", żeby żaden ciąg nie mógł zamknąć znacznika script.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
