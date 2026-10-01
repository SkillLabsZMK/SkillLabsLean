# Kanban-Karten-Generator (VBA) – Code-Analyse und Fehlerbehebung

Dieser Ordner enthält den VBA-Quellcode aus `CreateKanbanSlides.xlsm` als
Textdateien, damit Änderungen als Diff nachvollziehbar sind. Die xlsm im
Repo ist die aktuell genutzte Version **ohne** die unten beschriebenen Fixes.
Die Fixes stehen in `vba/KanabanSlides.bas` und müssen per Import in die
Arbeitsmappe übernommen werden (siehe „Einbau").

## 1. Wie der Code arbeitet

Ablauf von `ChooseMaterialsCombined` (Modul `KanabanSlides`):

1. `InputRange` fragt Zeilennummern ab (z. B. `1, 2-5`). Gemeint ist die
   Spalte **Nr** (Spalte A) der Tabelle `Materialliste`.
2. `ProcessFormat` prüft je Format (`A6`, `VIS`), ob eine gewählte Zeile
   dieses Format in Spalte P hat, und ruft `RunA6` bzw. `RunVIS` auf.
3. `RunVIS` öffnet `KanbanSlides_Visitenkarte.pptx`, erzeugt pro Zeile zwei
   Folien (Vorder-/Rückseite, 8,5 × 5,4 cm), fügt das Produktbild ein,
   exportiert jede Folie als EMF nach `KanbanSlides_EMF\`.
4. `EMFsIntoTemplate_VIS` öffnet `Druckvorlage_Visitenkarte.pptx` (A4
   hoch), legt die EMFs in einem Raster 2 Spalten × 5 Zeilen auf je eine
   Vorder- und eine Rückseiten-Folie und exportiert das Ganze als PDF.

Produktbilder (Module `ButtonActions`, `Buttons`, `GroupImg`,
`InitializationAndUpdating`):

- Beim Einfügen wird die Datei `ProductImages\Image_<Tabellenzeile>.png`
  erzeugt; `<Tabellenzeile>` ist `row.Index`, also die Position in der
  Tabelle (1 = erste Datenzeile, unabhängig von Filtern).
- Der Dateiname wird in Spalte **Produktbild** (Spalte Q) gespeichert.
- `UpdateImgNames` benennt die Dateien bei jedem `AdaptTbl` so um, dass
  sie wieder zu `row.Index` passen (nach Sortieren/Löschen).
- `AdaptRowIndex` (läuft bei jedem `Worksheet_Calculate`) schreibt in
  Spalte **Nr** eine laufende Nummer **nur für sichtbare Zeilen**;
  ausgefilterte Zeilen bekommen `0`.

## 2. Aufgaben aus der Anweisung

| # | Aufgabe | Status |
|---|---------|--------|
| 1 | Code verstehen und dokumentieren | erledigt (dieses Dokument) |
| 2 | Bilder werden beim Erstellen der VIS-Karten falsch zugeordnet | Ursache gefunden, Fix in `KanabanSlides.bas` |
| 3 | Rückseite der VIS-Karte im PDF bei „Lange Kante spiegeln" falsch herum | Ursache gefunden, Fix in `KanabanSlides.bas` |
| 4 | Fix in die xlsm einbauen und mit echtem Druck testen | offen, nur in Excel/PowerPoint möglich |

## 3. Fehler 1: Bilder werden den Produkten nicht zugeordnet

**Ursache.** `CreateCanbanSlides_VIS` (und ebenso `CreateCanbanSlides_A6`)
bildeten den Bildnamen aus Spalte Nr:

```vba
bildName = "Image_" & row.Range.Cells(1).Value & ".png"
```

Spalte Nr zählt aber nur sichtbare Zeilen. In der hochgeladenen Datei ist
der Filter „Raum = VK Papier & Druck" aktiv, deshalb steht dort z. B.:

| Tabellenzeile (`row.Index`) | Nr (Spalte A) | Produktbild (Spalte Q) |
|---|---|---|
| 12 | 1 | Image_12.png |
| 13 | 2 | Image_13.png |
| 20 | 3 | Image_20.png |

Der Code suchte für Nr 1 die Datei `Image_1.png`, das ist das Bild der
ausgefilterten Zeile 1 („Model V3"). Ohne Filter sind Nr und `row.Index`
identisch, darum fiel der Fehler bisher nicht auf (A6 „funktioniert
soweit" nur deshalb).

**Änderung.** Neue Hilfsfunktion `ProductImageName(row)` liest den
Dateinamen aus Spalte **Produktbild** (per Spaltenname, Fallback Spalte 17)
und fällt nur bei leerer Zelle auf `Image_<row.Index>.png` zurück. Beide
Aufrufer (A6 und VIS) nutzen sie. Damit ist die Zuordnung unabhängig von
Filtern, Sortierung und der Nummerierung in Spalte Nr.

Die Auswahl im Eingabefeld und die EMF-Dateinamen arbeiten weiter mit
Spalte Nr; das ist unkritisch, weil Nr unter den sichtbaren Zeilen
eindeutig ist.

## 4. Fehler 2: Rückseite im Druck-PDF falsch herum

**Ursache.** Die Visitenkarten-Folie ist 8,5 × 5,4 cm (quer), aber das
Kartenlayout ist um 90° gedreht (daher `img.Rotation = 270` in
`InsertImage_VIS`); die Karte wird hochkant gelesen. Beim Duplexdruck
„Lange Kante spiegeln" wird das A4-Blatt um seine lange, senkrechte Kante
gewendet. Für die quer liegende Karte ist das ein Wenden um ihre **kurze**
Kante. Der alte Code spiegelte nur die Spalten (links/rechts), ließ die
Rückseite aber unverändert. Ergebnis: Position stimmt, aber wer die Karte
wie eine Buchseite um die lange Kante dreht, sieht die Rückseite auf dem
Kopf.

Zusätzlich war die Spiegelung um einen festen Rand gerechnet
(links 1,4 cm, rechts aber 21 − 19,4 = 1,6 cm), die Rückseite lag also
2 mm versetzt hinter der Vorderseite.

**Änderung** in `EMFsIntoTemplate_VIS`:

- Konstante `VIS_MirrorBackColumns` ersetzt durch `VIS_FlipLongEdge`
  (`True` = Lange Kante spiegeln, `False` = Kurze Kante spiegeln).
- Rückseitenposition wird an der echten Folienbreite bzw. -höhe
  gespiegelt (`SlideWidth − left − Kartenbreite`), nicht mehr über den
  Spaltenindex. Damit verschwindet der 2-mm-Versatz.
- Bei `VIS_FlipLongEdge = True` wird das Rückseiten-EMF um 180° gedreht
  (`img.Rotation = 180`). Die Drehung erfolgt um die Mitte, die Position
  bleibt gleich.
- Bei `VIS_FlipLongEdge = False` werden stattdessen die Zeilen
  (oben/unten) gespiegelt, ohne Drehung.

**Annahme, bitte prüfen.** Die PPTX-Vorlagen sind passwortverschlüsselt,
ich konnte das Layout nicht sehen. Die 90°-Drehung des Kartenlayouts ist
aus dem Code abgeleitet. Sollte das Rückseiten-Layout in der Vorlage
bereits gedreht sein, wäre `img.Rotation = 180` zu entfernen; der Testdruck
zeigt das sofort.

## 5. Kleine Zusatzänderung

`RunVIS` und `EMFsIntoTemplate_VIS` speicherten beide unter
`Saved_VIS_<yyyymmdd_HHMMSS>.pptx`. Fällt beides in dieselbe Sekunde,
überschreibt die Druckdatei das Kartendeck. Die Druckdatei heißt jetzt
`Saved_VIS_Druck_<Zeitstempel>.pptx`.

## 6. Einbau in die Arbeitsmappe

1. `CreateKanbanSlides.xlsm` öffnen, Alt+F11.
2. Im Projektbaum Modul `KanabanSlides` rechtsklicken, „Datei
   exportieren" (Sicherung), danach „KanabanSlides entfernen".
3. „Datei > Datei importieren" und `vba/KanabanSlides.bas` wählen.
4. Debuggen > Kompilieren von VBAProject, dann speichern.

## 7. Testplan

1. Filter „VK Papier & Druck" aktiv lassen, Zeilen `1-3` wählen. Erwartung:
   die Karten zeigen die Bilder `Image_12.png`, `Image_13.png`,
   `Image_20.png` (Augenspülflasche, Mundschutz, Kopierpapier).
2. Filter entfernen, dieselben Produkte über ihre neue Nr wählen.
   Erwartung: gleiche Bilder.
3. VIS-PDF mit „Lange Kante spiegeln" duplex drucken. Eine Karte
   ausschneiden, hochkant lesen, um die lange Kante wenden. Erwartung:
   Rückseite lesbar und deckungsgleich mit der Vorderseite.
4. Optional: `VIS_FlipLongEdge = False` setzen und mit „Kurze Kante
   spiegeln" drucken; Ergebnis muss gleich sein.
