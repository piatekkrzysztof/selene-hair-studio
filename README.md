# Sélene Hair Studio

Strona salonu fryzjerskiego z rezerwacją online, panelem dla obsługi, blogiem
i pełną wersją dwujęzyczną. Projekt pokazowy - fikcyjny salon, prawdziwy kod.

**[selene-hair-studio.vercel.app](https://selene-hair-studio.vercel.app/pl)** ·
[wersja angielska](https://selene-hair-studio.vercel.app/en) ·
[blog](https://selene-hair-studio.vercel.app/pl/blog)

![Strona główna](docs/home.png)

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma · Zod · next-intl · Vitest · Playwright + axe

---

## Co jest tu ciekawego

Większość stron salonów to statyczny layout z formularzem, który wysyła e-mail.
Tutaj interesujące są trzy rzeczy, których nie widać na pierwszym zrzucie ekranu.

### 1. Silnik wolnych terminów

`src/lib/availability.ts` to czysta funkcja bez zależności od bazy, sieci i zegara systemowego.
Dostaje godziny otwarcia, czas trwania usługi, listę osób, które ją wykonują, oraz istniejące
rezerwacje - zwraca okna startowe z informacją, które są wolne.

Rzeczy, które faktycznie musiał obsłużyć:

- **Usługa musi zmieścić się przed zamknięciem**, razem z buforem na sprzątnięcie stanowiska.
  Balejaż trwa 210 minut, więc we wtorek ostatni możliwy start to 16:00, a nie 19:30.
- **Styk nie jest kolizją.** Wizyta kończąca się o 11:15 nie blokuje wizyty o 11:30, bo bufor
  jest już wliczony w `endMin`.
- **„Dowolna osoba" to nie brak osoby.** Takie zgłoszenie zajmuje realny fotel, więc dopóki
  ktoś nie zostanie przypisany, blokuje wszystkich kandydatów - inaczej ten sam termin
  sprzedałby się dwa razy.
- **Godziny są liczone w minutach od północy**, nie jako `Date`. Salon myśli kategoriami
  „wtorek, 10:00" i wizyta nie może zmienić godziny przy zmianie czasu. Konwersja na
  znacznik czasu dzieje się raz, na granicy systemu.

24 testy jednostkowe (`npm test`) pokrywają dni zamknięte, granice godzin otwarcia,
nakładanie się rezerwacji, wyprzedzenie i logikę „dowolnej osoby".

### 2. Walidacja, która nie ufa przeglądarce

`src/lib/booking-schema.ts` to jeden schemat Zod używany po obu stronach.
Klient dostaje szybką informację zwrotną, serwer traktuje wszystko jak dane wrogie.

Endpoint `POST /api/bookings` sprawdza kolejno: limit żądań, schemat, pułapkę na boty,
a na końcu **jeszcze raz liczy dostępność na świeżych danych z bazy**. To najważniejszy krok:
między wyświetleniem formularza a jego wysłaniem ktoś inny mógł zająć ten sam termin.
Konflikt kończy się odpowiedzią 409 i komunikatem, a nie podwójną rezerwacją.

### 3. Dostępność sprawdzana automatem, nie deklaracją

`tests/e2e/a11y.spec.ts` uruchamia axe na czterech widokach i na formularzu **w stanie
błędu** - bo to właśnie tam najczęściej psuje się semantyka. Próg to zero naruszeń
WCAG 2.2 AA, na desktopie i na mobile.

Test wyłapał cztery realne błędy w trakcie pisania tego projektu:

- `aria-label` na zwykłym `<div>` z gwiazdkami oceny (atrybut niedozwolony bez roli),
- zwinięte menu mobilne zostawiało w kolejności tabulacji linki, których nie było widać -
  naprawione atrybutem `inert`,
- odwołana wizyta w panelu była wygaszana przez `opacity: 0.55`, co dosłownie zbija
  kontrast tekstu poniżej progu - wygaszenie musi iść kolorem, nie przezroczystością,
- ciemny pasek panelu dziedziczył kolor etykiety przeznaczony dla jasnego tła
  (kontrast 2,34:1).

Automat łapie około jednej trzeciej problemów, więc nie zastępuje przejścia strony
klawiaturą. Ale pilnuje, żeby regresje nie wchodziły niezauważone razem z commitem.

### 4. Panel salonu bez biblioteki do logowania

`/panel` to narzędzie pracy: grafik dnia, obłożenie, potwierdzanie i odwoływanie
wizyt. Odwołanie nie kasuje wpisu - zmienia status, przez co zwalnia termin
w silniku (`status: { not: "CANCELLED" }`), ale zostawia ślad, gdyby klient
zadzwonił z pretensją.

![Panel salonu](docs/panel.png)

**Dlaczego bez Auth.js:** panel ma jednego operatora, a provider Credentials
sprowadza się do tego samego, co robimy tutaj jawnie - podpisanej sesji
w ciasteczku HttpOnly. Zamiast zależności jest 90 linii z testami:

- podpis HMAC-SHA256 przez **Web Crypto**, bo middleware działa na edge,
  gdzie `node:crypto` nie istnieje (pierwsza wersja nie skompilowała się
  właśnie z tego powodu - stąd rozdział na `session.ts` i `password.ts`),
- hasło jako scrypt z solą w zmiennej środowiskowej,
- porównania w stałym czasie po obu stronach,
- ten sam komunikat dla złego loginu i złego hasła, żeby formularz nie
  podpowiadał, który login istnieje,
- limit 10 prób logowania na kwadrans z adresu.

Sesję sprawdzamy **dwa razy**: w middleware przy nawigacji i wewnątrz każdej
akcji serwerowej. Akcja serwerowa to zwykły POST pod adres strony, więc
oparcie autoryzacji wyłącznie na middleware byłoby jedną warstwą za mało.

Gdy salon będzie potrzebował kont per osoba, wymianie podlega jeden moduł.

---

## Struktura

```
src/
├─ app/
│  ├─ [locale]/          strony w wersji PL i EN (SSG)
│  ├─ panel/            narzędzie salonu: grafik, potwierdzanie wizyt
│  ├─ api/availability/  wolne terminy dla usługi i dnia
│  ├─ api/bookings/      przyjmowanie rezerwacji
│  ├─ sitemap.ts         mapa strony dla obu języków
│  └─ robots.ts
├─ components/           sekcje strony, w większości serwerowe
├─ i18n/                 routing, konfiguracja next-intl
├─ lib/
│  ├─ salon.ts           jedyne źródło prawdy: usługi, zespół, godziny
│  ├─ availability.ts    silnik terminów (czysty, testowalny)
│  ├─ booking-schema.ts  schemat Zod wspólny dla klienta i serwera
│  ├─ jsonld.ts          dane strukturalne schema.org
│  ├─ session.ts         podpis sesji panelu (Web Crypto, działa na edge)
│  ├─ password.ts        scrypt (tylko Node)
│  └─ blog.ts            wczytywanie wpisów z plików Markdown
└─ styles/globals.css    system tokenów, jasny i ciemny motyw

content/blog/{pl,en}/    treść bloga, wersjonowana razem z kodem
prisma/schema.prisma     model rezerwacji
prisma/migrations/       wersjonowana historia schematu
docker-compose.yml       Postgres do pracy lokalnej
tests/e2e/               Playwright + axe
```

Klientowych komponentów jest tylko trzy: nagłówek, karuzela opinii i formularz rezerwacji.
Reszta renderuje się na serwerze, dlatego strona główna waży **152 kB First Load JS**.

---

## Dwujęzyczność

Trasowanie `/pl` i `/en` przez `next-intl`, teksty w `messages/{locale}.json`.
Obie wersje są generowane statycznie i mają:

- poprawny atrybut `lang` na `<html>`,
- adres kanoniczny,
- odnośniki `hreflang` dla obu języków plus `x-default`,
- osobne wpisy w `sitemap.xml`.

Blog ma osobne pliki dla każdego języka - to świadomie **nie są tłumaczenia jeden do jednego**,
tylko treść dobrana pod czytelnika. Wpis o twardej wodzie w Warszawie w wersji angielskiej
ma inny kontekst niż w polskiej.

Dane niezależne od języka (ceny, czasy trwania, godziny otwarcia) siedzą w `src/lib/salon.ts`
i nie są duplikowane w plikach tłumaczeń. Dzięki temu zmiana ceny to jedna linia, a nie dwie.

---

## SEO

- **JSON-LD**: `HairSalon` z godzinami otwarcia i katalogiem usług, `FAQPage`, `BlogPosting`,
  `BreadcrumbList`. Generowane z tych samych stałych, co interfejs, więc cennik na stronie
  i cennik w wynikach Google nie mogą się rozjechać. Do sprawdzenia w
  [Google Rich Results Test](https://search.google.com/test/rich-results).
- `sitemap.xml` i `robots.txt` generowane przez Next, oba języki.
- Metadane Open Graph i Twitter Card z `generateMetadata`, wraz z **generowanym
  obrazkiem** (`opengraph-image.tsx`, Satori) - osobnym dla każdego języka, składanym
  z tych samych tekstów i krojów co strona. Ikona strony pochodzi z logo.
- Nagłówki bezpieczeństwa (CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) w `next.config.ts`.

Test e2e parsuje bloki JSON-LD ze strony i sprawdza, czy `HairSalon` ma poprawny adres
i pięć dni otwarcia - schema, która się rozjedzie, wywali CI.

---

## Warstwa prawna i uczciwość wobec odwiedzającego

Formularz rezerwacji **naprawdę** zapisuje dane do bazy, a salon jest fikcyjny.
To rodzi obowiązek, o którym łatwo zapomnieć w projekcie portfolio: ktoś w dobrej
wierze może zostawić swój prawdziwy numer telefonu.

Dlatego:

- **Nota przy formularzu**, nie schowana w regulaminie: projekt jest demonstracyjny,
  zgłoszenie nie tworzy wizyty, dane trafiają do bazy, więc lepiej wpisać wymyślone.
- **[Polityka prywatności](/pl/privacy)** opisująca stan faktyczny: kto jest
  administratorem (autor projektu, nie fikcyjny salon), jakie dane zbieramy, na jakiej
  podstawie z RODO, komu je powierzamy (Vercel, Neon, Resend), jak długo trzymamy
  i jakie prawa przysługują. Pole „Uwagi” może zawierać dane o zdrowiu - jest to
  wprost oznaczone razem z podstawą przetwarzania.
- **Brak banera zgody na cookies**, bo strona publiczna nie zapisuje żadnych plików
  cookie. Jedyne ciasteczko w serwisie obsługuje logowanie do panelu i jest niezbędne.
- **Brak `aggregateRating` w danych strukturalnych**, mimo że strona pisze o 382
  opiniach i ocenie 4,9. Wstawienie tego do schema.org bez prawdziwych opinii byłoby
  podaniem Google zmyślonych danych.

Obie wersje językowe polityki przechodzą ten sam audyt axe co reszta strony.

## Wydajność

Liczby zmierzone przez Lighthouse CI na runnerze GitHub Actions, mediana z trzech
przebiegów, **emulacja telefonu z dławieniem sieci i procesora** - czyli najtrudniejszy
wariant, nie desktop.

| Kategoria | `/pl` | `/pl/blog` |
|---|---|---|
| Wydajność | 96 | 98 |
| Dostępność | 100 | 100 |
| Dobre praktyki | 96 | 96 |
| SEO | 100 | 100 |

| Metryka | Wartość |
|---|---|
| First Contentful Paint | 1067 ms |
| Largest Contentful Paint | 2520 ms |
| Cumulative Layout Shift | 0 |
| Total Blocking Time | 129 ms |

CLS równe zero bierze się z trzech rzeczy: `next/font` rezerwuje miejsce na krój zanim
się wczyta, każdy `next/image` ma podane wymiary, a sekcje nie doklejają się do układu
po wczytaniu.

LCP na poziomie 3 sekund to najsłabszy punkt i jest opisany progiem ostrzegawczym,
a nie błędem. Przyczyna jest zmierzona: strona pobiera **cztery pliki fontów o łącznej
wadze 110 652 B** - dwa kroje po dwa podzbiory znaków, bo polskie znaki diakrytyczne
wymagają `latin-ext`. Nagłówek jest elementem LCP i czeka na Bodoni Moda.

### Dwie próby, które nic nie dały

Warto je opisać, bo oszczędzą komuś powtarzania tej samej drogi.

**Leniwe ładowanie zdjęć galerii.** Pomiar przed i po identyczny. Wąskim gardłem
nigdy nie były obrazy - hero nie zawiera zdjęcia.

**Odebranie preloadu fontowi tekstowemu.** Hipoteza: Archivo to 65 ze 103 kB
oznaczonych w buildzie jako preload, więc bez niego Bodoni - od którego zależy LCP -
dostanie pasmo wcześniej. Trzy przebiegi Lighthouse pokazały co innego:

| | preload włączony | preload wyłączony |
|---|---|---|
| pobrane fonty | 110 652 B | 110 652 B |
| LCP (mediana) | 2918 ms | 2912 ms |
| FCP (mediana) | 1071 ms | 1527 ms |

Bez preloadu przeglądarka **i tak pobiera** ten sam komplet plików - zmienia się
wyłącznie kolejność. Bajtów nie ubyło, więc nie miało z czego ubyć czasu, a FCP
pogorszyło się o 456 ms. Zmiana została cofnięta, a wniosek jest odwrotny do
popularnej rady „nie preloaduj za dużo": na tej stronie preload obu krojów jest
szybszy, i to mierzalnie.

### Trzecia próba: własne podzbiory

Ta zadziałała. Kroje są hostowane samodzielnie i ograniczone do 226 znaków, których
strona faktycznie używa - szczegóły w [`src/fonts/README.md`](src/fonts/README.md).

| | przed | po |
|---|---|---|
| pliki | 4 (latin + latin-ext × 2 kroje) | 2 |
| razem | 110,7 kB | **58,2 kB** |
| Bodoni Moda | 38,0 kB | 24,7 kB |
| Archivo | 65,0 kB | 33,4 kB |

Największa pojedyncza oszczędność wyszła z pominięcia osi `opsz` w Bodonim: 45,8 kB
z osią wobec 24,7 kB bez niej. Przypięcie pojedynczej wartości nic nie daje, bo Google
i tak wysyła całą oś - trzeba ją z zapytania usunąć.

Subsetting nie wymagał żadnego łańcucha narzędzi: parametr `text=` w API Google Fonts
zwraca gotowy plik z podanymi glifami. Zakres znaków jest wypisany jawnie, a nie
skanowany z treści - panel wyświetla nazwiska wpisywane przez ludzi, więc podzbiór
oparty na skanie psułby się przy pierwszym nietypowym znaku.

Efekt zmierzony w tym samym CI, mediana z trzech przebiegów:

| | `/pl` | `/pl/blog` |
|---|---|---|
| wydajność | 93 → **95** | 97 → **98** |
| LCP | 2918 → **2755 ms** | 2652 → **2404 ms** |
| transfer fontów | 108,1 → **59,7 kB** | 108,1 → **59,7 kB** |

Blog zszedł poniżej progu 2500 ms. Strona główna nie - jej nagłówek jest większy,
więc mocniej zależy od momentu wczytania kroju. Model się zgadza: 48 kB mniej to
około 240 ms transferu przy dławieniu do 1,6 Mb/s, a zysk na LCP wyniósł 163-247 ms.

### Czwarty krok: wąskie gardło przestało być siecią

Po subsettingu pomiar pokazał coś, czego nie zakładaliśmy: **cała sieć kończy się
przed 200 ms**, serwer odpowiada w 10 ms, a LCP pada dopiero o 2755 ms. Bajty
przestały być problemem - został główny wątek. `bootup-time` przypisywał 402 ms
samego wykonania fragmentowi z Reactem, a długie zadanie na 184 ms startowało
o 2583 ms, tuż przed LCP.

Rozbicie fragmentów: React 47 kB (framework), next-intl 28 kB, Zod 14 kB.
Dwa ostatnie były naszymi decyzjami, więc dało się je cofnąć:

- **Tłumaczenia**: do przeglądarki idą tylko przestrzenie nazw używane przez
  komponenty klienckie. Wcześniej cały plik był serializowany do HTML-a przy
  każdym żądaniu - płacili za to także ci, którzy nigdy nie dojdą do formularza.
- **Zod**: schemat ładuje się dynamicznie przy pierwszej wysyłce i rozgrzewa przy
  wyborze usługi. Wspólne źródło reguł dla klienta i serwera zostaje - zmienia się
  wyłącznie moment wczytania.

| | przed | po |
|---|---|---|
| First Load JS | 152 kB | **139 kB** |
| fragment strony głównej | 18,8 kB | **5,77 kB** |
| LCP | 2755 ms | **2520 ms** |
| TTI | 2799 ms | 2670 ms |

### Bilans i miejsce, w którym warto przestać

```
start              LCP [3157, 2918, 2913]  mediana 2918
po fontach         LCP [2956, 2755, 2735]  mediana 2755
po JavaScripcie    LCP [2885, 2520, 2494]  mediana 2520
```

Łącznie **-398 ms, czyli 13,6%**. Najcieplejszy przebieg schodzi poniżej progu
2500 ms, mediana zatrzymuje się 20 ms nad nim.

I na tym świadomie kończymy. Rozrzut między przebiegami na współdzielonym runnerze
wynosi 220-390 ms, więc dociskanie mediany o ostatnie 20 ms byłoby dopasowywaniem
się do szumu, a nie inżynierią. Zostały dwie realne dźwignie i obie mają cenę:
odroczenie hydracji formularza rezerwacji (jest pod pierwszym ekranem, ale przez
chwilę byłby widoczny i nieaktywny) oraz ograniczenie Bodoniego do jednej grubości
(ceny i wordmark musiałyby zmienić grubość). Obie są opisane, żadna nie została
zrobiona po cichu.

Progi w `lighthouserc.json` liczą **medianę** z trzech przebiegów. Pierwszy przebieg na
zimnym serwerze potrafi dać 72 punkty, więc próg oparty na pojedynczym pomiarze byłby
loterią, a nie budżetem.

---

## Uruchomienie

Wymagany Node 20.11 lub nowszy.

```bash
npm install
cp .env.example .env
docker compose up -d     # Postgres na porcie 5433
npm run db:migrate       # zakłada schemat z prisma/migrations
npm run dev
```

Przed pierwszym uruchomieniem testów e2e trzeba jeszcze pobrać przeglądarkę -
Playwright trzyma binaria poza `node_modules`, więc `npm install` ich nie ściąga:

```bash
npx playwright install chromium
```

Baza deweloperska stoi w kontenerze, na porcie 5433, żeby nie kolidować
z Postgresem zainstalowanym w systemie. Dane logowania są w `docker-compose.yml`
i celowo jawne - to element instrukcji uruchomienia, nie sekret.

Kilka rezerwacji na najbliższe dni, żeby było widać działanie wykrywania kolizji:

```bash
npm run db:seed
```

Panel salonu: **http://localhost:3000/panel**, login `salon`, hasło `selene-demo-2026`.
Te dane są w `.env.example` celowo, żeby dało się zajrzeć do panelu od razu po
`npm install`. Na produkcji wygeneruj własne: `npm run hash-password -- <hasło>`
i nowy `SESSION_SECRET`.

### Skrypty

| Polecenie | Co robi |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | `prisma generate` i build produkcyjny |
| `npm test` | testy jednostkowe silnika terminów |
| `npm run test:e2e` | Playwright + axe (sam buduje i startuje serwer) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | nowa migracja w dev |
| `npm run db:deploy` | zastosowanie migracji (CI, produkcja) |
| `npm run db:reset` | czyszczenie bazy i migracje od zera |
| `npm run db:seed` | przykładowe rezerwacje |
| `npm run hash-password -- <hasło>` | wpis do `ADMIN_PASSWORD_HASH` |
| `npm run db:studio` | podgląd bazy |

---

## Wdrożenie

Cel: Vercel plus Postgres na Neonie.

Zmienne środowiskowe do ustawienia w panelu Vercela:

| Zmienna | Skąd |
|---|---|
| `DATABASE_URL` | Neon, adres **z puli** (zawiera `-pooler`) |
| `DIRECT_URL` | Neon, adres **bez puli** - migracje muszą omijać PgBouncer |
| `NEXT_PUBLIC_SITE_URL` | adres produkcyjny, np. `https://selene-hair-studio.vercel.app` |
| `SESSION_SECRET` | własny, minimum 32 znaki |
| `ADMIN_USER`, `ADMIN_PASSWORD_HASH` | `npm run hash-password -- <hasło>` |
| `RESEND_API_KEY` | opcjonalnie, powiadomienia o rezerwacji |

**Nie kopiuj wartości z `.env.example` na produkcję.** Są tam po to, żeby projekt
dało się uruchomić po `npm install`, i leżą w publicznym repozytorium.

Migracje stosuje `vercel.json` w poleceniu budowania, a nie skrypt `build`
w `package.json` - dzięki temu `npm run build` nadal działa lokalnie bez
podniesionej bazy. Region ustawiony na `fra1` (Frankfurt), bo baza i klienci
są w Europie, a każdy przeskok przez Atlantyk to kilkadziesiąt milisekund
na zapytanie.

Bez klucza Resend aplikacja działa normalnie: zgłoszenie trafia do bazy,
a treść powiadomienia ląduje w logu serwera. Awaria poczty nie może kosztować
klienta terminu.

CI (`.github/workflows/ci.yml`) uruchamia lint, typy, testy jednostkowe, e2e z audytem axe
oraz Lighthouse CI z budżetem opisanym w `lighthouserc.json`. Zmienne bierze z
`.env.example` - dzięki temu konfiguracja CI i lokalna nie mogą się rozjechać.

---

## Decyzje i kompromisy

**Postgres, choć dane go nie wymagają.** Jeden salon, jedna tabela, kilka rezerwacji
dziennie - SQLite obsłużyłby to bez zadyszki i przez większość projektu tak właśnie
było. Powodem zmiany nie jest skala, tylko miejsce wdrożenia: na Vercelu system plików
funkcji jest efemeryczny, więc zapis do pliku SQLite albo się nie uda, albo zniknie przy
następnym uruchomieniu instancji. Gdyby ta strona stała na serwerze z trwałym dyskiem,
SQLite byłby wyborem właściwszym i tańszym.

**Dwa adresy bazy.** `DATABASE_URL` wskazuje na pulę połączeń, `DIRECT_URL` na
połączenie bezpośrednie. Każde wywołanie funkcji bezstanowej otwiera własne połączenie,
więc bez puli baza szybko wyczerpuje limit. Migracje muszą jednak omijać PgBouncer,
bo używają poleceń, których tryb transakcyjny nie przepuszcza.

**Zwykły CSS zamiast Tailwinda.** Projekt ma jeden spójny system tokenów i około 30 klas
komponentowych. Tailwind dołożyłby narzędzie tam, gdzie problem to nie objętość CSS,
tylko dyscyplina w kolorach i skali typograficznej - a tę wymusza `globals.css`.

**Blog na plikach zamiast headless CMS.** Trzy wpisy na język nie uzasadniają Sanity ani
Contentful. Pliki Markdown są wersjonowane razem z kodem, więc zmiana treści przechodzi
przez pull request. Gdy salon zacznie publikować co tydzień i zażąda panelu, warstwa
`src/lib/blog.ts` jest jedynym miejscem do wymiany.

**Limit żądań w pamięci procesu.** Przy wielu instancjach każda ma własny licznik, więc
realny limit to N × limit. Dla formularza jednego salonu to akceptowalne i nie wymaga Redisa.
Wymiana dotyczy jednego pliku.

**Rezerwacja jest prośbą o termin, nie potwierdzeniem.** Salon potwierdza ją telefonicznie.
To decyzja produktowa, nie techniczna: przy koloryzacji wycena zależy od diagnozy włosów,
której nie da się zrobić przez formularz.

---

## Czego tu nie ma

Uczciwa lista, żeby nie trzeba było jej odkrywać podczas przeglądania kodu:

- **Filtra po osobie w panelu.** Grafik pokazuje cały zespół naraz; przydałaby się
  lista rozwijana „pokaż tylko Martę". Świadomie **nie** planujemy kont per osoba -
  trzy osoby w jednym pomieszczeniu i jeden tablet na recepcji nie potrzebują
  osobnych logowań, a ślad „kto potwierdził wizytę" w takim zespole zastępuje pytanie
  na głos.
- **Widoku tygodnia i miesiąca w panelu.** Na razie jest tylko dzień z nawigacją.
- **Płatności i zadatków**, mimo że regulamin na stronie o nich mówi.
- **E-maila potwierdzającego dla klienta.** Powiadomienie o nowej rezerwacji idzie
  tylko do salonu; klient dostaje potwierdzenie telefonicznie.
- **Prawdziwej kursywy Bodoniego.** Akcent w nagłówku („przed tobą”) jest pochylany
  algorytmicznie przez przeglądarkę. Prawdziwa kursywa didone ma inną konstrukcję
  liter i typograf to zobaczy - ale doładowanie jej to kolejny plik na ścieżce
  krytycznej, więc kłóci się z pracą nad LCP.
- **Zdjęć własnych salonu.** Fotografie pochodzą z Unsplash i Pexels. W prawdziwym wdrożeniu
  sekcje „Metamorfozy" i „Zespół" muszą pokazywać realne prace - zdjęcia stockowe podpisane
  jako własne realizacje to problem prawny, nie tylko wizerunkowy.

---

## Licencja i zdjęcia

Kod: MIT. Zdjęcia: Unsplash i Pexels (licencja pozwala na użycie komercyjne, ale nie daje
praw do wizerunku osób). Logo i nazwa salonu są fikcyjne, stworzone na potrzeby tego projektu.
