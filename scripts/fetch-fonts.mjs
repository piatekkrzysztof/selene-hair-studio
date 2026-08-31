/**
 * Pobiera kroje ograniczone do znaków, których strona faktycznie używa.
 *
 * Zamiast narzędzi do subsettingu korzystamy z parametru `text=` w API Google
 * Fonts: serwer zwraca jeden plik woff2 zawierający wyłącznie podane glify.
 * Dzięki temu w repozytorium nie ląduje żaden łańcuch narzędzi, a wynik da się
 * odtworzyć jednym poleceniem:
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Zakres znaków jest wypisany jawnie, a NIE skanowany z treści. Panel salonu
 * wyświetla imiona i notatki wpisane przez ludzi - gdyby podzbiór powstawał ze
 * skanu obecnych plików, pierwsza klientka z nietypowym znakiem w nazwisku
 * zobaczyłaby krój zastępczy w środku zdania.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "src", "fonts");

// Nowoczesny UA jest konieczny - inaczej Google odsyła formaty zapasowe (ttf).
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const zakresy = [
  // ASCII drukowalne
  rozpietosc(0x20, 0x7e),
  // Polskie znaki diakrytyczne
  "ĄĆĘŁŃÓŚŹŻąćęłńóśźż",
  // Litery z Latin-1: nazwiska klientów i nazwy marek kosmetyków
  "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß",
  "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ",
  // Litery z Latin Extended-A spoza polskiego, spotykane w regionie
  "ČčĎďĚěŇňŘřŠšŤťŮůŽžĂăÎîȘșȚțŐőŰű",
  // Typografia i symbole używane w interfejsie
  "„”‘’«»–—…·•×°€£$§©®™→←↑↓✓№",
].join("");

const znaki = [...new Set([...zakresy])].sort().join("");

const KROJE = [
  {
    nazwa: "Bodoni Moda",
    // Nagłówki: 400 (ceny), 500 (h1-h3), 600 (wordmark).
    //
    // Oś `opsz` (optyczny rozmiar) jest z zapytania POMINIĘTA, nie przypięta.
    // Google ignoruje przypięcie pojedynczej wartości i tak czy tak wysyła całą
    // oś - zmierzone: 45,8 kB z osią, 24,7 kB bez niej przy tym samym zestawie
    // znaków. Krój używa wtedy swojego domyślnego rozmiaru optycznego.
    zapytanie: "Bodoni+Moda:wght@400..600",
    plik: "bodoni-moda-subset.woff2",
  },
  {
    nazwa: "Archivo",
    // Tekst: 400, 500, 600, 700.
    zapytanie: "Archivo:wght@400..700",
    plik: "archivo-subset.woff2",
  },
];

function rozpietosc(od, do_) {
  let s = "";
  for (let i = od; i <= do_; i++) s += String.fromCodePoint(i);
  return s;
}

async function pobierz(krój) {
  const url =
    `https://fonts.googleapis.com/css2?family=${krój.zapytanie}` +
    `&text=${encodeURIComponent(znaki)}&display=swap`;

  const css = await fetch(url, { headers: { "User-Agent": UA } }).then((r) => {
    if (!r.ok) throw new Error(`${krój.nazwa}: CSS ${r.status}`);
    return r.text();
  });

  // Adresy podzbiorów mają postać /l/font?kit=... i nie kończą się na .woff2,
  // więc dopasowujemy po deklaracji formatu, a nie po rozszerzeniu.
  const adres = css.match(/url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!adres) throw new Error(`${krój.nazwa}: brak woff2 w odpowiedzi`);

  const bufor = Buffer.from(await fetch(adres).then((r) => r.arrayBuffer()));
  await writeFile(path.join(OUT, krój.plik), bufor);

  return { nazwa: krój.nazwa, plik: krój.plik, kB: (bufor.length / 1024).toFixed(1) };
}

/**
 * Osobno pobieramy warianty woff dla generatora obrazka Open Graph.
 * Satori nie obsługuje woff2, a starszy User-Agent wymusza na Google
 * zwrócenie woff. Te pliki nie trafiają do przeglądarki - są używane
 * wyłącznie po stronie serwera przy budowaniu obrazka.
 */
const UA_WOFF = "Mozilla/5.0 (Windows NT 6.1; rv:27.0) Gecko/20100101 Firefox/27.0";

const OG = [
  { nazwa: "Bodoni Moda (og)", zapytanie: "Bodoni+Moda:wght@500", plik: "og-bodoni.woff" },
  { nazwa: "Archivo (og)", zapytanie: "Archivo:wght@600", plik: "og-archivo.woff" },
];

async function pobierzOg(krój) {
  const url =
    `https://fonts.googleapis.com/css2?family=${krój.zapytanie}` +
    `&text=${encodeURIComponent(znaki)}&display=swap`;

  const css = await fetch(url, { headers: { "User-Agent": UA_WOFF } }).then((r) => r.text());
  const adres = css.match(/url\((https:\/\/[^)]+)\)\s*format\('woff'\)/)?.[1];
  if (!adres) throw new Error(`${krój.nazwa}: brak woff w odpowiedzi`);

  const bufor = Buffer.from(await fetch(adres).then((r) => r.arrayBuffer()));
  await writeFile(path.join(OUT, krój.plik), bufor);
  return { nazwa: krój.nazwa, plik: krój.plik, kB: (bufor.length / 1024).toFixed(1) };
}

await mkdir(OUT, { recursive: true });

console.info(`Zakres: ${znaki.length} znaków\n`);
for (const krój of KROJE) {
  const wynik = await pobierz(krój);
  console.info(`  ${wynik.nazwa.padEnd(18)} ${wynik.kB.padStart(6)} kB  ->  src/fonts/${wynik.plik}`);
}

for (const krój of OG) {
  const wynik = await pobierzOg(krój);
  console.info(`  ${wynik.nazwa.padEnd(18)} ${wynik.kB.padStart(6)} kB  ->  src/fonts/${wynik.plik}`);
}
