# Kroje pisma

Pliki w tym katalogu to **podzbiory** krojów z Google Fonts, ograniczone do 226
znaków, których strona faktycznie używa: ASCII, polskie diakrytyki, litery
z Latin-1 i Latin Extended-A spotykane w nazwiskach oraz znaki typograficzne
używane w interfejsie.

| Plik | Krój | Licencja | Waga |
|---|---|---|---|
| `bodoni-moda-subset.woff2` | Bodoni Moda | SIL Open Font License 1.1 | 24,7 kB |
| `archivo-subset.woff2` | Archivo | SIL Open Font License 1.1 | 33,4 kB |

Obie rodziny są objęte [SIL OFL 1.1](https://openfontlicense.org/), która pozwala
na redystrybucję i modyfikację, w tym tworzenie podzbiorów. Pełne teksty licencji
znajdują się w repozytoriach źródłowych:
[Bodoni Moda](https://github.com/googlefonts/BodoniModa) ·
[Archivo](https://github.com/Omnibus-Type/Archivo).

## Odtworzenie

```bash
node scripts/fetch-fonts.mjs
```

Skrypt korzysta z parametru `text=` w API Google Fonts, więc nie wymaga żadnego
łańcucha narzędzi do subsettingu. Zakres znaków jest w nim wypisany jawnie i **nie
jest skanowany z treści** - panel wyświetla imiona i notatki wpisywane przez ludzi,
więc podzbiór oparty na skanie obecnych plików psułby się przy pierwszym nietypowym
nazwisku.

## Dlaczego bez osi `opsz`

Bodoni Moda ma oś optycznego rozmiaru. Zmierzone przy tym samym zestawie znaków:

- z osią `opsz`: **45,8 kB**
- bez osi: **24,7 kB**

Google ignoruje przypięcie pojedynczej wartości (`opsz,wght@32,400..600` zwraca
dokładnie ten sam plik co zakres `6..96`), więc jedyną opcją jest pominięcie osi.
Krój używa wtedy swojego domyślnego rozmiaru optycznego. Przy nagłówku 90 px
różnica jest ledwie widoczna, a 21 kB na ścieżce krytycznej - już nie.
