# Dienasgrāmatas ekstraktora un checker prompta daļas

`flows/default-construction/backend/site-manager-agent/diary-prompts/composeCheckerPrompt.ts` importē noteikumu moduļus, izvēlas projektam piemērotās daļas un saliek vienu sistēmas promptu ar `join("\n\n")`. Katra daļa eksportē nosauktu funkciju un atgriež `id`, `title`, `description`, `version` un `text`.

Gala promptā katrai iekļautajai daļai ir atsevišķs virsraksts un mērķa apraksts. Esošie pārbaudes noteikumi ir sadalīti pēc to uzdevuma; detalizētās instrukcijas pārsvarā saglabā iepriekšējo formulējumu. Nav klientu ID vai telefona numuru nosacījumu.

| Modulis | Pārbaudes uzdevums | Kad iekļauts |
| --- | --- | --- |
| `avota_fakti_un_parklajums` | Avota fakti, pilnīgs pārklājums un katras rindas citāti | Vienmēr; `NoSorting` lieto piezīmes variantu |
| `atsauces_un_datumi` | Darba datums, atļautās atsauces un vēsturisku skaitļu nepārkopēšana | Vienmēr |
| `darbu_sadalisana` | Atsevišķi darbi, piegāde/iestrāde un viena darba apakšdarbības | Strukturētai ekstrakcijai |
| `darbu_kategorijas` | Projekta darbu vārdnīca un konfigurētie runas saīsinājumi | Strukturētai ekstrakcijai |
| `mervienibas_buvnieciba` | Daudzumi, izmēri, mērvienību aliasi un aprēķinu pierādījumi | Ir daudzumu/mērvienību lauki vai šādas vērtības piedāvātajā rindā |
| `darbinieki_un_darba_laiks` | Brigāde, konkrētā darba ilgums un kopīgā laika nedublēšana | Ir darbaspēka lauki vai šādas vērtības piedāvātajā rindā |
| `atrasanas_vietas` | Darba vietas pierādījumi un droša nepamatotas vietas noņemšana | Ir vietas lauks vai piedāvāta vietas vērtība |
| `forma2_piesaiste` | Pozīcijas atbilstība darba sistēmai, materiālam un izmēram | Katalogā ir pozīciju kodi vai konfigurācijā Forma2 darbu saites |
| `dienasgramatas_saglabasanas_piezimes` | Faktu un plānu saglabāšana piezīmēs, neiekļaujot aģenta instrukcijas | Vienmēr |
| `dienasgramata_bez_skirsanas` | Sākotnējās piezīmes saglabāšana bez strukturētas darbu sadalīšanas | Tikai uzticamam `AIpromptToUse.Client = NoSorting` |
| `lemums_un_labosanas_plans` | Verdict, drošās `set_null` darbības un mērķēti labojamās rindas/lauki | Vienmēr |
| `labojuma_gala_parbaude` | Salīdzinājums ar iepriekšējo lēmumu un apstiprinātajām rindām | Tikai pēc labošanas izsaukuma |

Atlase izmanto tās pašas uzticamās `getConfig(siteId)` vērtības un rindu datus, ko reālā ekstrakcija. `noRender` nav ieslēgts lauks. Ja modelis tomēr piedāvājis vērtību neieslēgtā laukā, attiecīgā pārbaude netiek apieta. `NoSorting` neiekļauj strukturēto darbu sadalīšanas, mērvienību, darbaspēka, vietu vai Forma2 moduļus. Izsaucēji bez projekta konfigurācijas saglabā pilno noklusēto pārbaudes profilu saderībai.

Mērvienību daļa saņem tikai izvēlētā projekta `Units.DropDownOptions`; darbu vārdnīca, vienības un projektu saīsinājumi joprojām tiek padoti kā dati, nevis papildu instrukcijas. Jaunus klienta noteikumus pievieno kā nosauktu moduli ar skaidru piemērošanas nosacījumu, nevis brīvu teksta pielikumu vai klienta ID pārbaudi.

## Ko redzēt izpildē

LangSmith modeļa izsaukuma metadatos `diaryCheckerPrompt` satur profilu, aktīvos standarta laukus un visu daļu sarakstu. Katrai daļai redzams nosaukums, mērķis, versija, `included`, iekļaušanas/izlaišanas iemesls un teksta garums. Modeļa sistēmas ziņā redzams arī pats saliktais teksts ar moduļu virsrakstiem.

JSON un HTML eval atskaišu `checker` soļa `promptComposition` satur to pašu aprakstu gan pirmajai, gan gala pārbaudei. Šis apraksts nerada papildu modeļa izsaukumu un nesatur organizācijas, lietotāja vai datubāzes identifikatorus. Mainot moduļa uzvedību pēc tā ieviešanas, palielini tā versiju un pārbaudi piemērojamos eval gadījumus.

## Pārskatāmās piezīmes un WhatsApp

Daļējā atkopšanā apstiprinātās rindas saglabājas nemainītas. Pārskatāmās rindas komentārs ir `Jāpārbauda.` un attiecīgais pārbaudāmais avota fragments. Checker detalizētais pamatojums saglabājas kvalitātes metadatos un izpildes datos, nevis `Comments`.

WhatsApp daļējas saglabāšanas apstiprinājums paziņo saglabāto ierakstu skaitu un `Daļa darbu saglabāta piezīmēs. Lūdzu, pārbaudiet.`; tas neizvada visu pārskatāmo rindu saturu. Šis ceļš ir kopīgs ātrajai ekstrakcijai un legacy saglabāšanas rīka apstiprinājumam. Sākotnējie vēsturiskie datubāzes ieraksti ar šo koda maiņu netiek pārrakstīti.

## Ekstraktora instrukcijas un projekta zināšanas

`composeExtractorPrompt.ts` atlasa īsos `extractor/` moduļus pēc projekta aktīvajiem laukiem. Moduļi nošķir avotu un piezīmes, darbu sadalīšanu, darbu kategorijas, daudzumus, darbaspēku un vietu. `NoSorting` saņem tikai sākotnējās piezīmes saglabāšanas instrukciju; `GMCIRL` papildus saglabā sākotnējo tekstu komentāra beigās un lieto CE tikai tad, ja tā ir projekta opcija. Konkrētu klientu pozīciju piesaistes neiekļauj vispārīgajos noteikumos: tās nāk no projekta darbu kataloga un konfigurētajiem saīsinājumiem.

Projekta izvades shēma joprojām satur pilno darbu, vietu un mērvienību izvēlni. Konteksta teksts tās vairs neatkārto. Vēsturiskos ierakstus ielasa tikai ziņai ar skaidru atsauci; jaunam patstāvīgam ziņojumam šis vaicājums netiek veikts. Konteksta 12 000 rakstzīmju budžetā ietilpst arī projekta padomi. Pirms mazāk svarīgiem darbu vienību datiem saglabā avota izmantošanas noteikumus un atļautās vēsturiskās atsauces; vienību sarakstā prioritizē ziņai atbilstošos kandidātus. Pilnais katalogs netiek saīsināts izvades shēmā.

Manifestu saglabā `diaryExtractorPrompt` modeļa metadatos un eval soļa `extraction_prompt.promptComposition` laukā. HTML atskaite rāda iekļautās un izlaistās ekstraktora daļas tāpat kā checker daļas. Sākotnējo ziņu modelim padod atsevišķi, bez servera pievienota datuma tās beigās; atsauces datums ir sistēmas kontekstā.

## Modeļu pieprasījumu diagnostika un budžeti

`modelRequestDiagnostics.ts` novēro ekstraktora, checker un mērķētās labošanas HTTP izsaukumus. Katram pieprasījumam nosūta unikālu `X-Client-Request-Id`; reģistrē `x-request-id`, HTTP statusu, `openai-processing-ms`, laiku līdz galvenēm, pirmajam atbildes datu baitam un pilnam atbildes saturam. Reģistrē arī nosūtītā pieprasījuma izmēru, faktisko reasoning iestatījumu un izvades tokenu robežu. JSON atbildēm līdz 2 MiB pirms SDK parsēšanas nolasa tikai statusu, `incomplete_details.reason`, atbildes ID un tokenu patēriņu. Tādēļ arī SDK `SyntaxError` gadījumā saglabājas pieejamie OpenAI apstrādes dati; atbildes teksts diagnostikā netiek saglabāts. Pieprasījuma saturs, autentifikācijas galvenes un pilns API kļūdas teksts šajos diagnostikas ierakstos nenonāk.

`phase` rāda sasniegto transporta posmu: `not_started`, `waiting_for_headers`, `reading_body` vai `body_received`; `outcome` atsevišķi norāda `completed`, `timeout` vai `error`. Atbilde bez galvenēm paliek atšķirama no nepabeigtas atbildes lasīšanas. Pirmais datu baits nav pirmā atbildes tokena mērījums un nepierāda nepārtrauktu modeļa progresu. Izsaukumi saglabā esošo nestraumēto strukturētās izvades režīmu.

Kļūmes gadījumā neziņots tokenu patēriņš ir `null`, nevis `0`; arī kopējais patēriņš ir nezināms, ja kāda izsaukuma patēriņš nav saņemts. Saņemtam patēriņam atsevišķi reģistrē reasoning un kešoto ievades tokenu skaitu, ja tie ir pieejami. HTML atskaitē ir modeļu API diagnostikas tabula.

Kopējais 180 sekunžu budžets un SDK `maxRetries=0` saglabājas. Ekstraktors var vienreiz atkārtot HTTP 200 atbildi, kas beigusies nepilna vai ar JSON sintakses kļūdu, ja pirms atkārtojuma atlikuši vismaz 30 sekundes. Abi izsaukumi, to pieprasījumu ID un patēriņš paliek atskaitē; saglabāšana notiek tikai pēc veiksmīgas validācijas. Taimautus, 429, autorizācijas un datubāzes kļūdas šis atkārtojums neaptver. Otro neveiksmi apstrādā esošais piezīmes/daļējas atkopšanas ceļš. Izvades tokenu budžets ir 8192, garākam avotam tas palielinās līdz 24576; tas ietver reasoning un izvadi. `incomplete` vai `length` atbilde netiek pieņemta kā gatavs rezultāts. Checker atbildei obligāti jāiziet shēmas pārbaude, un trūkstošs verdict nekļūst par noklusētu `accept`. Esošā daļējā atkopšana vai sākotnējās ziņas piezīme paliek kļūmes apstrādes ceļš.


## Skaitlisko lauku null līgums

`AIschemas.ts` skaitliskajiem laukiem izmanto `z.union([z.null(), num]).optional()`: null zars ir pirmais, lai skaitļu coercion nepārvērstu `null` par 0. Skaitļi teksta formā joprojām tiek parsēti, un stundu/darbinieku skaita ierobežojumi saglabājas.

Ar uzstādītajām bibliotēku versijām `z.coerce.number().nullable().optional()` neierobežotam Amounts laukam tika konvertēts par `type: number, nullable: true`, nevis JSON Schema skaitļa un null apvienojumu. Stingrā izvade tādēļ konfliktēja ar instrukciju nezināmu apjomu atstāt null; novērotajā izpildē modelis pēc Amounts atslēgas ģenerēja tukšumus līdz tokenu limitam. `AIschemas.test.ts` ar īsto LangChain/OpenAI klientu un lokālu fetch pārbauda faktisko nosūtīto shēmu un null atbildes parsēšanu. Šī ir API shēmas pārbaude bez reāliem modeļu izsaukumiem.

## Forma2 ID un avota pretrunas

Forma2 projektā ar sinhronizācijas manifestu ekstraktora izvades darba lauks ir `positionId`. Shēma atļauj tikai šī projekta katalogā esošos ID; `diaryWorkCatalog.ts` padod ID, pašreizējo pilno nosaukumu un mērvienību kā vārdnīcu. Vispārīgās kategorijas, arī Piezīmes, saņem no nosaukuma deterministiski veidotu `category:` ID. `mapToDbFields` no ID atjauno precīzo konfigurēto Works vērtību; datubāzes shēma nemainās. Bez Forma2 manifesta un NoSorting režīmā saglabā esošo lauku līgumu. Metadati `diaryWorkSelectionMode` un `diaryPositionCatalogCount` norāda izmantoto režīmu.

Kopīgā `forma2-work-matching.ts` pārbaude neļauj precīzam kodam automātiski pārspēt skaidru sistēmas, objekta, materiāla vai diametra pretrunu. Nezināms vēsturisks hierarhijas kods pats par sevi nav nesaderība. Modeļi joprojām vērtē darba nozīmi; šo pārbaudi izmanto skaidru pretrunu izslēgšanai. Nelielam katalogam līdz 128 darbiem kandidātu atlase neatmet citādi formulētus darbus tikai nulles vārdu sakritības dēļ. Lielākam katalogam atlase izmanto normalizētu būvniecības leksiku un plašāku 48 kandidātu robežu; tā nav embeddings indeksa ieviešana. Automātiskās piesaistes pieprasījumā kandidātu pilnie dati ir vienā kopīgā tabulā, katram avotam norādot atļautos ID.

Labošanas shēma tiek veidota katram pieprasījumam: atļautie rowId, lauki, vērtību tipi un darbu ID ir ierobežoti jau modeļa atbildes shēmā. Bloķētās rindas nevar atgriezt arī unresolvedRowIds. Ja labojums neskar Works, modelim nepadod visu nesaistīto darbu kandidātu sarakstu.

Neizmantojamās additions/replacements sadaļas un brīvā teksta reason nav modeļa izvades shēmā; iekšējo reason un tukšos darbību masīvus izveido kods. Instrukcijā atgriežamo JSON lauku saraksts tiek veidots no tās pašas shēmas. Reālā pārbaudē iepriekšējā atbilde jau saturēja pareizo labojumu, bet apstājās pirms shēmā prasītā reason un turpināja ar tukšumiem līdz 8192 tokeniem. Nepabeigtu JSON nelabo ar teksta piegriešanu vai iekavu pielikšanu; tas joprojām iet caur kļūmes/daļējas atkopšanas ceļu.

Daļēja atkopšana saglabā avotā pamatotās accept rindas arī tad, ja plānotais gala rindu skaits atšķiras no sākotnējā vai pārklājums nav pilnīgs. Vienas dienas neatrisinātos avota fragmentus apvieno īsā pārskatāmā piezīmē, izņemot atkārtotus citātus. Ja pārklājums nav pilnīgi apstiprināts, saglabā arī atlikušos avota fragmentus. Apvienotai piezīmei nesummē dažādu darbu skaitļus. Tas nemaina labojumu, jautājumu un vēsturisku ierakstu saglabāšanas atļaujas.
