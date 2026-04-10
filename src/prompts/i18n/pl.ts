// Polish prompt defaults — polskie wersje promptów dla inkai.
// JSON keys and structure markers remain in English for parser compatibility.

export const PL_DEFAULTS: Record<string, string> = {

// ─── Pytania o lore — Runda 1 ────────────────────────────────

'lore-questions-round1': `Jesteś asystentem do tworzenia książek. Autor rozpoczyna nowy projekt: {{type}}.

Tytuł: "{{title}}"
Typ: {{type}}
Gatunek: {{genre}}
Podgatunek: {{subgenre}}
Cel: {{purpose}}
Streszczenie: {{summary}}

Wygeneruj 4-6 PODSTAWOWYCH pytań, które ustalą fundament tej książki. Skup się na:
1. Główny cel/założenie historii — o czym naprawdę jest ta książka?
2. Kluczowe postacie (fikcja) lub kluczowe tematy/wydarzenia (non-fiction)
3. Centralny konflikt, wyzwanie lub teza
4. Świat/sceneria na ogólnym poziomie

Pytania mają być ogólne i fundamentalne. NIE pytaj jeszcze o szczegóły gatunkowe, styl czy strukturę — to przyjdzie w kolejnej rundzie.

Pisz pytania PO POLSKU. Zwróć TYLKO poprawny JSON w tym formacie:
{
  "questions": [
    {
      "key": "unique_key_name",
      "question": "Treść pytania po polsku",
      "type": "text",
      "required": true
    }
  ]
}

Użyj "type": "text" dla krótkich odpowiedzi, "type": "multiline" dla dłuższych opisów (np. opisy postaci, zarys fabuły). Wszystkie pytania powinny być wymagane.`,

// ─── Pytania o lore — Runda 2 ────────────────────────────────

'lore-questions-round2': `Jesteś asystentem do tworzenia książek. Autor rozwija nowy projekt: {{type}}.

Tytuł: "{{title}}"
Typ: {{type}}
Gatunek: {{genre}}
Podgatunek: {{subgenre}}
Cel: {{purpose}}
Streszczenie: {{summary}}

Autor odpowiedział już na pytania fundamentalne:
{{answersText}}

Wygeneruj teraz 4-6 GŁĘBSZYCH pytań uzupełniających, aby doprecyzować tożsamość książki. Na podstawie tego, co autor już udostępnił, zapytaj o:
1. Szczegóły gatunkowe — co sprawia, że ta książka pasuje do gatunku? Jakie tropy wykorzystać, a jakie podważyć?
2. Ton i atmosferę — mroczna, humorystyczna, literacka, dynamiczna?
3. Głębię tematyczną — ukryte przesłanie, pytania moralne, łuki emocjonalne
4. Konkretne szczegóły świata lub tematu, które wynikły z odpowiedzi
5. Docelowy czytelnik i jakie uczucie powinien zabrać po lekturze

Dopasuj pytania do tego, co autor już ujawnił. Bądź konkretny, nie ogólnikowy. Pisz PO POLSKU.

Zwróć TYLKO poprawny JSON w tym formacie:
{
  "questions": [
    {
      "key": "unique_key_name",
      "question": "Treść pytania po polsku",
      "type": "text",
      "required": true
    }
  ]
}

Użyj "type": "text" dla krótkich odpowiedzi, "type": "multiline" dla dłuższych opisów. Wszystkie pytania powinny być wymagane.`,

// ─── Generowanie lore ────────────────────────────────────────

'lore-generation': `Jesteś eksperckim asystentem do tworzenia książek. Stwórz kompleksowe dokumenty lore dla następującego projektu książkowego. Pisz WSZYSTKO PO POLSKU.

Tytuł: "{{title}}"
Typ: {{type}}
Gatunek: {{genre}}
Podgatunek: {{subgenre}}
Autorzy: {{authors}}
Cel: {{purpose}}
Streszczenie: {{summary}}

Odpowiedzi autora na pytania rozwojowe:
{{answersText}}

Wygeneruj następujące pliki lore jako obiekt JSON. Każdy klucz to nazwa pliku, a wartość to treść w markdown. Cała treść MUSI być po polsku.

WYMAGANE pliki (zawsze dołącz):
- "basic-lore.md": Główna koncepcja, zarys scenerii, motyw przewodni, ton. 2-3 strony.
- "extended-lore.md": Głęboki worldbuilding, historia, zasady, szczegółowe opisy. 3-5 stron.
- "summary-of-chapters.md": Zacznij od "Nie napisano jeszcze żadnych rozdziałów.".
- "style-of-writing.md": Przewodnik stylu pisania — głos, czas, POV, styl prozy, preferencje tempa.

OPCJONALNE pliki (dołącz w zależności od typu książki):
{{optionalFilesDescription}}

Zwróć TYLKO poprawny JSON w tym formacie:
{
  "files": {
    "basic-lore.md": "# Podstawowe Lore\\n\\n...",
    "extended-lore.md": "# Rozszerzone Lore\\n\\n...",
    "summary-of-chapters.md": "# Podsumowanie Rozdziałów\\n\\n...",
    "style-of-writing.md": "# Przewodnik Stylu Pisania\\n\\n..."
  }
}

Treść powinna być bogata, szczegółowa i przydatna do pisania. Używaj poprawnego formatowania markdown.`,

// ─── Sugestia rozdziału ──────────────────────────────────────

'chapter-suggestion': `Jesteś asystentem do tworzenia książek. Na podstawie poniższego lore i streszczeń rozdziałów, zasugeruj czym powinien się zajmować Rozdział {{chapterNumber}}. Pisz PO POLSKU.

=== LORE ===
{{loreContext}}

=== STRESZCZENIE POPRZEDNICH ROZDZIAŁÓW ===
{{summaryContext}}

Podaj krótką (2-3 akapity) sugestię tego, co powinien obejmować Rozdział {{chapterNumber}}, w tym:
- Kluczowe wydarzenia lub rozwój akcji
- Na której postaci się skupić
- Łuk emocjonalny
- Jak posuwa to całą historię naprzód

Bądź zwięzły, ale inspirujący. Autor zdecyduje, czy użyć tej sugestii, czy napisać własne wytyczne.`,

// ─── Plan rozdziału ──────────────────────────────────────────

'chapter-plan': `Jesteś starszym planistą książkowym. Stwórz szczegółowy plan Rozdziału {{chapterNumber}}. Pisz PO POLSKU.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== STRESZCZENIE POPRZEDNICH ROZDZIAŁÓW ===
{{summaryContext}}

{{#if previousChapter}}=== POPRZEDNI ROZDZIAŁ ({{previousChapterNumber}}) ===
{{previousChapter}}
{{/if}}=== WYTYCZNE AUTORA DLA TEGO ROZDZIAŁU ===
{{guidelines}}

{{#if writingInstructions}}=== INSTRUKCJE AUTORA DOTYCZĄCE PROCESU PISANIA ===
{{writingInstructions}}
{{/if}}Stwórz plan rozdziału o długości około 30-40 linii, który zawiera:

1. **Tytuł rozdziału / Roboczy tytuł** — tematyczna nazwa do wewnętrznego użytku
2. **Otwarcie** — jak zaczyna się rozdział, scena, nastrój
3. **Kluczowe sceny** — 3-5 głównych scen lub punktów zwrotnych, każda z krótkim opisem:
   - Co się dzieje
   - Które postacie są zaangażowane
   - Ton emocjonalny
   - Kluczowe dialogi lub ujawnienia
4. **Uwagi do tempa** — gdzie przyspieszyć, gdzie się zatrzymać
5. **Ton i atmosfera** — dominujący nastrój i jego zmiany
6. **Rezultat rozdziału** — co się zmieniło pod koniec, co czytelnik teraz wie
7. **Hak / Przejście** — jak prowadzi do następnego rozdziału
8. **Ciągłość** — konkretne detale z lore/poprzednich rozdziałów do nawiązania

Podaj plan jako czysty dokument markdown. Ten plan będzie przekazany agentowi-pisarzowi jako jego plan pracy.`,

// ─── Pisanie rozdziału z planu ───────────────────────────────

'chapter-writing-from-plan': `Jesteś profesjonalnym pisarzem. Twoim zadaniem jest napisanie Rozdziału {{chapterNumber}} na podstawie dostarczonego planu. Pisz PO POLSKU.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== PLAN ROZDZIAŁU {{chapterNumber}} ===
{{chapterPlan}}

{{#if writingInstructions}}=== INSTRUKCJE AUTORA DOTYCZĄCE PROCESU PISANIA ===
{{writingInstructions}}
{{/if}}Napisz kompletny rozdział ściśle trzymając się planu. Twoje pisanie powinno:
- Dokładnie podążać za przewodnikiem stylu (głos, czas, POV, styl prozy)
- Zawierać każdą scenę i punkt opisany w planie
- Odpowiadać uwagom o tonie i atmosferze
- Dostarczyć opisany rezultat rozdziału
- Zakończyć się opisanym hakiem/przejściem
- Mieć długość około 3000-5000 słów
- Zawierać naturalny dialog, żywy opis i kontrolowane tempo

Zacznij od "# Rozdział {{chapterNumber}}" jako tytułu. Napisz teraz kompletny rozdział.`,

// ─── QA rozdziału ────────────────────────────────────────────

'chapter-qa': `Jesteś redaktorem kontroli jakości. Twoim zadaniem jest sprawdzenie Rozdziału {{chapterNumber}} pod kątem zgodności z lore i planem rozdziału, oraz naprawienie wszelkich problemów.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== PLAN ROZDZIAŁU {{chapterNumber}} ===
{{chapterPlan}}

=== SZKIC ROZDZIAŁU {{chapterNumber}} ===
{{chapterContent}}

Sprawdź i oceń:
1. **Spójność z lore** — imiona, miejsca, zasady, historia zgadzają się z dokumentami lore
2. **Zgodność z planem** — wszystkie zaplanowane sceny i punkty są obecne, rezultat jest dostarczony
3. **Zgodność ze stylem** — głos, czas, POV zgadzają się z przewodnikiem stylu
4. **Wewnętrzna spójność** — brak sprzeczności w samym rozdziale
5. **Jakość** — jakość prozy, naturalny dialog, tempo

Jeśli znajdziesz problemy, napraw je bezpośrednio w tekście. Jeśli wszystko jest w porządku, zwróć rozdział bez zmian.

Zwróć TYLKO poprawny JSON w tym formacie:
{
  "issues_found": ["krótki opis każdego naprawionego problemu"],
  "changes_made": true,
  "chapter": "kompletny (ewentualnie poprawiony) tekst rozdziału w markdown"
}

Jeśli nie znaleziono problemów:
{
  "issues_found": [],
  "changes_made": false,
  "chapter": "oryginalny tekst rozdziału bez zmian"
}`,

// ─── Pisanie rozdziału (legacy) ──────────────────────────────

'chapter-writing': `Jesteś profesjonalnym pisarzem. Napisz Rozdział {{chapterNumber}} na podstawie następującego kontekstu. Pisz PO POLSKU.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== STRESZCZENIE POPRZEDNICH ROZDZIAŁÓW ===
{{summaryContext}}

=== KIERUNEK DLA TEGO ROZDZIAŁU ===
{{direction}}

Napisz kompletny, dopracowany rozdział. Ściśle trzymaj się przewodnika stylu. Rozdział powinien:
- Mieć dobre tempo z połączeniem akcji, dialogu i opisu
- Mieć wyraźny początek, rozwój i zakończenie (z hakiem, jeśli to nie ostatni rozdział)
- Być spójny z ustalonym lore i poprzednimi rozdziałami
- Mieć długość około 3000-5000 słów

Zacznij od "# Rozdział {{chapterNumber}}" jako tytułu. Napisz teraz kompletny rozdział.`,

// ─── Recenzja rozdziału ──────────────────────────────────────

'chapter-review': `Jesteś eksperckim redaktorem literackim. Zrecenzuj Rozdział {{chapterNumber}} ze szczegółową, konstruktywną informacją zwrotną. Pisz PO POLSKU.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== ROZDZIAŁ {{chapterNumber}} ===
{{chapterContent}}

Przedstaw dokładną recenzję obejmującą:

## Sprawdzenie spójności
- Jakiekolwiek sprzeczności z ustalonym lore?
- Zachowanie postaci spójne z ich profilami?
- Spójność linii czasowej?

## Jakość prozy
- Zgodność stylu pisania z przewodnikiem?
- Tempo — za szybkie lub za wolne w jakichś sekcjach?
- Jakość dialogów — naturalne, wyraziste głosy postaci?
- Balans pokazywania vs opowiadania?

## Struktura
- Skuteczność otwarcia rozdziału
- Przejścia między scenami
- Jakość zakończenia / haka

## Konkretne sugestie
- Sugestie linia po linii (zacytuj oryginał, zaproponuj poprawkę)
- Sekcje do rozwinięcia lub skrócenia
- Brakujące elementy, które wzmocniłyby rozdział

## Ogólna ocena
- Ocena (A-F) z krótkim uzasadnieniem
- 3 największe mocne strony
- 3 najważniejsze obszary do poprawy

Bądź szczery, ale konstruktywny. Celem jest pomóc autorowi się poprawić.`,

// ─── Przepisanie rozdziału ───────────────────────────────────

'chapter-rewrite': `Jesteś profesjonalnym pisarzem. Przepisz Rozdział {{chapterNumber}} uwzględniając informację zwrotną z recenzji literackiej. Pisz PO POLSKU.

=== LORE I ŚWIAT ===
{{loreContext}}

=== PRZEWODNIK STYLU PISANIA ===
{{styleContext}}

=== ORYGINALNY ROZDZIAŁ ===
{{originalChapter}}

=== RECENZJA I UWAGI ===
{{reviewContent}}

Przepisz rozdział uwzględniając WSZYSTKIE uwagi z recenzji:
- Napraw wszelkie problemy ze spójnością
- Popraw jakość prozy zgodnie z sugestiami
- Ulepsz strukturę i tempo
- Zastosuj konkretne sugestie na poziomie linii
- Zachowaj tę samą ogólną fabułę i wydarzenia, chyba że recenzja sugeruje zmiany

Zachowaj ten sam numer rozdziału i ogólny kierunek. Podaj kompletny przepisany rozdział zaczynając od "# Rozdział {{chapterNumber}}".`,

// ─── Aktualizacja streszczenia ───────────────────────────────

'summary-update': `Jesteś asystentem książkowym. Zaktualizuj dokument streszczenia o podsumowanie nowo napisanego Rozdziału {{chapterNumber}}. Pisz PO POLSKU.

=== ISTNIEJĄCY DOKUMENT STRESZCZENIA ===
{{existingSummary}}

=== NOWY ROZDZIAŁ {{chapterNumber}} ===
{{newChapterContent}}

Zaktualizuj dokument streszczenia, dodając zwięzłe, ale wyczerpujące podsumowanie Rozdziału {{chapterNumber}}. Streszczenie powinno uwzględniać:
- Kluczowe wydarzenia fabularne
- Rozwój postaci
- Ważne ujawnienia lub zmiany
- Kluczowe momenty emocjonalne

Podsumuj TYLKO to, co faktycznie wydarzyło się w tym rozdziale. NIE spekuluj o przyszłych rozdziałach, planowanych łukach ani nadchodzących wydarzeniach. Zachowaj streszczenia poprzednich rozdziałów bez zmian. Dodaj streszczenie nowego rozdziału we właściwym miejscu. Podaj kompletny zaktualizowany dokument streszczenia w markdown.`,

// ─── Podsumowanie lore ───────────────────────────────────────

'lore-summary': `Jesteś asystentem do tworzenia książek. Podsumuj aktualny stan następujących plików lore dla autora. Pisz PO POLSKU.

{{loreText}}

Przedstaw zwięzłe, dobrze zorganizowane podsumowanie uwzględniające:
- Podstawowe elementy fabuły
- Kluczowe postacie i relacje
- Najważniejsze elementy worldbuildingu
- Aktualny postęp rozdziałów
- Obszary, które wydają się niedostatecznie rozwinięte

Zakończ słowami: "Co chciałbyś zmienić lub dodać?"`,

// ─── Edycja lore ─────────────────────────────────────────────

'lore-edit': `Jesteś eksperckim asystentem do tworzenia książek. Autor chce zmodyfikować lore swojej książki. Pisz PO POLSKU.

=== AKTUALNE PLIKI LORE ===
{{loreText}}

=== ŻYCZENIE AUTORA ===
{{authorRequest}}

Zastosuj żądane zmiany w odpowiednich plikach lore. Zwróć wynik jako JSON tylko ze zmodyfikowanymi plikami:

{
  "files": {
    "filename.md": "kompletna zaktualizowana treść..."
  }
}

Dołącz tylko pliki, które faktycznie zostały zmienione. Zachowaj spójność między wszystkimi plikami. Używaj poprawnego formatowania markdown.`,

// ─── Podsumowanie książki ────────────────────────────────────

'book-summary': `Jesteś asystentem książkowym. Podaj krótką, angażującą aktualizację statusu tego projektu książkowego. Pisz PO POLSKU.

{{loreText}}

Napisanych rozdziałów: {{chapterCount}}

Przedstaw podsumowanie w 3-4 zdaniach:
- O czym jest książka
- Aktualny postęp
- Co dalej

Bądź zwięzły i zachęcający.`,

// ─── Ulepszanie lore — Pytania ──────────────────────────────

'enhance-lore-questions': `Jesteś eksperckim konsultantem od tworzenia książek specjalizującym się w {{genre}}{{#if subgenre}} ({{subgenre}}){{/if}}.

Przeanalizuj następujące pliki lore dla {{type}} zatytułowanego "{{title}}":

{{loreText}}

Na podstawie gatunku, podgatunku i istniejącego lore, zidentyfikuj luki, słabości lub obszary, które mogłyby być bogatsze. Wygeneruj 5-8 celowanych pytań, które pomogą autorowi pogłębić i wzmocnić świat, postacie i historię.

Skup się na pytaniach specyficznych dla tej książki — nie na ogólnych poradach pisarskich. Rozważ:
- Niedostatecznie rozwinięte aspekty dla tego gatunku (np. zasady magii w fantasy, ograniczenia technologii w sci-fi)
- Relacje postaci lub motywacje, które wydają się powierzchowne
- Brakujące lub niespójne szczegóły worldbuildingu
- Tematy, które mogłyby być głębiej eksplorowane
- Szczegóły sensoryczne, kultura, polityka, ekonomia, historia

Pisz pytania PO POLSKU. Odpowiedz poprawnym JSON:
{
  "questions": [
    { "key": "unique_key", "question": "Twoje pytanie po polsku", "context": "Krótka uwaga dlaczego to ważne", "loreFile": "which-lore-file.md" }
  ]
}`,

// ─── Ulepszanie lore — Zastosowanie ─────────────────────────

'enhance-lore-apply': `Jesteś eksperckim asystentem do tworzenia książek. Autor odpowiedział na pytania ulepszające dotyczące {{type}} "{{title}}" ({{genre}}{{#if subgenre}} / {{subgenre}}{{/if}}). Pisz PO POLSKU.

=== AKTUALNE PLIKI LORE ===
{{loreText}}

=== ODPOWIEDZI AUTORA NA PYTANIA ULEPSZAJĄCE ===
{{answersText}}

Na podstawie odpowiedzi autora, zaktualizuj odpowiednie pliki lore, aby uwzględnić te nowe informacje. Wpleć nowe szczegóły naturalnie w istniejącą treść — nie dodawaj ich po prostu na końcu. Zachowaj istniejącą strukturę i głos.

Dołącz tylko pliki, które wymagają zmian. Zwróć poprawny JSON:
{
  "files": {
    "filename.md": "kompletna zaktualizowana treść pliku..."
  },
  "changes": ["Krótki opis co zmieniono w każdym pliku"]
}`,

// ─── Podsumowanie pliku lore ─────────────────────────────────

'lore-file-summary': `Podsumuj następujący plik lore dla projektu książkowego. Podsumowanie powinno zawierać wszystkie kluczowe fakty, imiona, zasady i relacje w 2-4 akapitach. Bądź konkretny — uwzględnij imiona postaci, nazwy miejsc, daty i zasady. To podsumowanie będzie używane do określenia, czy pełna treść tego pliku jest potrzebna dla danego zadania pisarskiego.

Plik: {{filename}}

{{content}}

Napisz gęste, bogate w fakty podsumowanie PO POLSKU. Nie dołączaj meta-komentarzy o samym pliku.`,

// ─── Wybór istotnego lore ────────────────────────────────────

'lore-relevance': `Wybierasz, które pliki lore są potrzebne dla zadania pisarskiego. Poniżej znajdują się STRESZCZENIA każdego pliku lore, a następnie opis zadania.

=== STRESZCZENIA PLIKÓW LORE ===
{{loreSummaryContext}}

=== DOSTĘPNE PLIKI ===
{{fileList}}

=== ZADANIE ===
{{taskDescription}}

Wybierz, które pliki lore zawierają informacje ISTOTNE dla tego konkretnego zadania. Dołącz plik, jeśli:
- Zawiera postacie, lokacje lub zasady związane z zadaniem
- Dostarcza kontekst worldbuildingu potrzebny do spójności
- Ma wskazówki dotyczące stylu lub tonu związane z zadaniem

NIE dołączaj plików, które są wyraźnie nieistotne dla tego zadania.

Zwróć TYLKO poprawny JSON:
{
  "files": ["filename1.md", "filename2.md"]
}`,

// ─── Ekstrakcja lore z rozdziału ─────────────────────────────

'chapter-lore-extraction': `Jesteś asystentem ekstrakcji lore. Przeczytaj poniższy rozdział i wyodrębnij wszystkie NOWE kluczowe fakty, które zostały wprowadzone lub ustalone. Są to fakty, które powinny zostać zapamiętane dla przyszłych rozdziałów.

Skup się na:
- Nowe postacie (imię, rola, opis)
- Nazwane lokacje, miasta, budynki, punkty orientacyjne
- Nazwane przedmioty, bronie, artefakty, zaklęcia, technologie
- Ważne decyzje, sojusze, zdrady, odkrycia
- Nowe zasady, zwyczaje lub szczegóły worldbuildingu
- Znaczące wydarzenia fabularne lub zmiany statusu

NIE powtarzaj informacji, które już istnieją w poniższych notatkach.

=== ISTNIEJĄCE NOTATKI ===
{{existingNotes}}

=== ROZDZIAŁ {{chapterNumber}} ===
{{chapterContent}}

Zwróć TYLKO poprawny JSON:
{
  "notes": [
    "Krótka notatka faktyczna o czymś nowym (np. 'Wprowadzono postać Kael — ślepy płatnerz z Ashenvale')",
    "Kolejny fakt (np. 'Szkarłatna Brama to jedyne wejście do Podmiasta')"
  ]
}

Bądź konkretny: uwzględnij imiona, szczegóły i kontekst. Każda notatka powinna mieć 1-2 zdania max. Uwzględnij tylko naprawdę nowe informacje z tego rozdziału. Pisz PO POLSKU.`,

};
