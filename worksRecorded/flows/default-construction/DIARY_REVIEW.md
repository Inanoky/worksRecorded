# WhatsApp dienasgrāmatas un Forma2 Agents SDK pilots

Atļautā testa sūtītāja ziņa izvēlētajā pilotprojektā uzreiz nonāk OpenAI Agents SDK. Jaunais aģents pats izdala darbības, atrod precīzus Forma2 darbus un sagatavo strukturētus dienasgrāmatas ierakstus. Serveris validē izvadi un saglabā visu ziņas ierakstu kopu ar esošo biznesa darbību. Pārējiem sūtītājiem, projektiem, dashboard čatam un darbinieku plūsmām paliek esošie aģenti.

Šai plūsmai nav cron, gaidīšanas pēc pēdējās ziņas, periodiskas modeļa palaišanas, manuālas palaišanas pogas vai vecā aģenta rezultātu pēcapstrādes. Statusa lapas GET pieprasījumi tikai nolasa saglabāto izpildes gaitu. Esošais, atsevišķais projekta norādījumu atjaunošanas cron nav mainīts.

## Pilota robežas

Projekta `Site.siteDiaryRecordsMap.otherSettings.constructionDiaryReviewPilot` nosaka `enabled`, `allowedSenderPhones` un `allowedUserIds`. Servera karogam arī jābūt ieslēgtam. Projekti bez pilota konfigurācijas paliek vecajā plūsmā. `CONSTRUCTION_DIARY_REVIEW_SITE_IDS` var papildus sašaurināt atļautos projektus.

Sūtītāja numurs nāk no saņemtās Meta ziņas identitātes, nevis profila vai klienta padota argumenta. Ja nav uzticama numura vai ziņas ID, jaunais aģents neieslēdzas. Tiek atkārtoti pārbaudīta projekta piekļuve, organizācija un pilota atļaujas. Eval plūsma ar `isEval: true` turpina izmantot esošo izpildītāju.

Pirmais konfigurētais pilots: projekts `936fe1a6-1bbf-4e9e-b7c4-3571215e9e2e`, organizācija `4a606c0d-d165-4c4e-b8b1-948198415234`, lietotājs `kp_8c541e0b812c4d07afc51bc8f2f54161`, sūtītājs `+37129391891`. WhatsApp projektu izvēlnē jāizvēlas šis projekts. Projekta pilota konfigurācija pati par sevi neaktivizē servera karogu un nepiemēro migrāciju.

## Izpildes ceļš

| Komponente | Atbildība |
| --- | --- |
| `backend/site-manager-route.ts` | Saglabā esošo projekta izvēli, teksta/audio/foto maršrutēšanu un atbildes nosūtīšanu |
| `backend/diary-intake-dispatch.ts` | Pārbauda pilota atļaujas pirms vecā aģenta izsaukuma; izvēlas tieši vienu aģentu |
| `backend/diary-intake-context.ts` | Nolasa konkrētā projekta shēmu, visu Forma2 dokumentu, konfigurētos darbus, norādījumus un ierobežotu neseno ierakstu kontekstu |
| `backend/diary-intake-agent.ts` | Agents SDK rīku cikls ar strukturētu izvadi, konteksta lasīšanu, visas tāmes meklēšanu un melnraksta validāciju |
| `lib/diary-intake.ts` | Servera validācija un pārveidošana biznesa ierakstu laukos |
| `backend/diary-intake.ts` | Noturīgs izpildes ID, sesija, soļu uzskaite, kļūmes un saglabāšanas koordinācija |
| `backend/diary-review-session.ts` | SDK sesijas vēsture Postgres datubāzē, ierobežota ar izpildes ID un rezervācijas atslēgu |
| `server/actions/site-diary-actions.ts` | Esošā žurnāla saglabāšana, foto/audio avoti, skaitļu normalizācija un unikālais WhatsApp ziņas ID |
| `/api/sites/[siteId]/diary-review` | Tikai GET: autentificētā pilota lietotāja izpildes, soļi un saglabātie ieraksti |
| `/dashboard/sites/[siteId]/diary-review` | Projekta sadaļa “Dienasgrāmatas AI aģents” |

`backend/` un `lib/` ceļi tabulā ir attiecībā pret `flows/default-construction/`.

Aģentam nav vispārīga SQL, tīmekļa vai brīvas rakstīšanas rīka. Lasīšanas rīku dati ir serverī piesaistīti autorizētajam projektam. Forma2 meklēšana aptver visas pozīcijas un atbalsta lapošanu; precīzā pozīcija ietver arī vecāku un bērnu pozīcijas. Modelim obligāti jāizmanto avota, projekta un validācijas rīki; katrai izvēlētajai Forma2 pozīcijai jābūt nolasītai.

Forma2 piesaiste izmanto esošo darba izvēlnes manifestu: precīzs `Works` nosaukums atrisina konkrēto pozīciju. Serveris pārbauda, vai `work` un `positionId` ir viens un tas pats konfigurētais pāris. Nav atsevišķa, vēlāk izpildāma piesaistes rakstīšanas soļa. Piezīmēm un citiem nepiesaistītiem konfigurētiem darbiem pozīcija ir `null`.

## Validācija un saglabāšana

Katram darbam ir savs precīzs `sourceQuote`. Daudzumam, darbiniekiem un stundām jāpievieno citāts šīs pašas darbības ietvaros ar atbilstošu skaitli un tā nozīmi. Serveris pārbauda skaitļus, to mērvienības, atļautos darbus, Forma2 pozīcijas, datumu un identiski atkārtotus mērījumu pierādījumus. Darbinieki bez skaidra skaita ir `null`; nulle der tikai ar avota pierādījumu. Atbalstīti decimālatdalītāji, tūkstošu atstarpes un biežākie mazie latviešu vārdos rakstītie skaitļi. Minūtes drīkst determinēti pārvērst stundās; būvapjomu mērvienību pārrēķini nav atļauti. Vienai nepārprotami iebūvētai akai ar vienu konkrētu apzīmējumu vienskaitlī drīkst pamatot skaitu 1 gab./kompl arī bez skaitļa vārda; noliegums, nākotne, daļēja izpilde un vairāki apzīmējumi šo izņēmumu nepieļauj. Akas identifikatora cipars pats par sevi nav daudzums.

Norādījumi prasa atdalīt piegādi no iestrādes, dažādus materiālus un darbus, kopīgo darba laiku no darba apjomiem, kā arī nākotnes plānus no izpildes. Neskaidru daļu saglabā kā piezīmi ar trūkstošiem strukturētiem skaitļiem vai pieprasa precizējumu. Precīzs citāts pierāda avota esamību, bet nenodrošina pilnīgu semantiskās interpretācijas vai visu darbību pārklājuma garantiju; to jāmēra ar reālām, iepriekš manuāli pārbaudītām atskaitēm.

Ziņas noklusējuma datums ir saņemšanas diena `Europe/Riga`, izmantojot ienākošās ziņas laiku. Vakardienas/aizvakardienas un konkrēta datuma atskaitēm jāpievieno datuma citāts. Plāna/fakta profilā jaunā ziņā faktiskais daudzums nonāk `Comments_Custom_1`, bet `Amounts` netiek izdomāts kā plānotais daudzums.

Pirms saglabāšanas vēlreiz pārbauda piekļuvi, konfigurāciju un Forma2 dokumenta nemainīgumu. Biznesa ieraksti, unikālā avota ziņas grupa un izpildes statuss `completed` tiek saglabāti vienā transakcijā. Ja izpildes identitāte vai pilota atļauja vairs nav derīga, transakcija neizdodas.

## Dublikāti, kļūmes un novērošana

Katrai ziņai ir determinēts izpildes ID pēc organizācijas, projekta, lietotāja un WhatsApp ziņas ID. Atkārtota webhook piegāde nepalaiž modeli vēlreiz. Pabeigtai izpildei atgriež iepriekšējo atbildi; aktīvai ziņo, ka apstrāde turpinās. Esošais `SiteDiarySaveBatch.sourceMessageId` arī liedz dubultu biznesa saglabāšanu.

Jaunā aģenta kļūme neizraisa vecā aģenta izsaukumu. Nav automātisku atkārtotu maksas mēģinājumu vai pārtrūkušas izpildes atsākšanas ar taimeri. Pirms atkārtotas ziņas sūtīšanas lietotājam jāpārbauda žurnāls. Dzēšanas un esošu ierakstu labošanas pieprasījumus šis pilots novirza manuālam labojumam žurnālā.

Izpildes vēsture glabā sākotnējo ziņu, SDK sesiju, rīku soļus, strukturēto melnrakstu, saglabātos ierakstus un veiksmīgas modeļa izpildes tokenus/ilgumu. SDK sesija ir katrai ziņai atsevišķa; tā nepārņem vecā LangGraph kontrolpunktus vai Codex projektu sarunas. Projekta zināšanas jānodrošina shēmā, Forma2 un projekta norādījumos.

Statusi: `running`, `completed`, `needs_clarification`, `replied`, `failed`. Pēc izpildes laika limita pārsniegšanas statusa API nepabeigtu `running` rāda kā `interrupted`, neveicot rakstīšanu vai modeļa palaišanu. Saskarne redzamā lapā ik pēc 3 sekundēm nolasa jaunākās 30 izpildes. Raw SDK sesijas saturs API atbildē netiek dots. Izpilde turpinās WhatsApp apstrādes pieprasījumā neatkarīgi no statusa lapas; nav ieviesta atsevišķa noturīga darbu platforma.

## Konfigurācija un testa sākšana

| Mainīgais | Nozīme |
| --- | --- |
| `CONSTRUCTION_DIARY_REVIEW_ENABLED` | Tikai `true` ieslēdz tiešo pilota maršrutēšanu un statusa lapu; noklusējums izslēgts |
| `CONSTRUCTION_DIARY_REVIEW_SITE_IDS` | Papildu projektu ierobežojums, sākumā tikai testa projekta ID |
| `CONSTRUCTION_DIARY_REVIEW_MODEL` | Modelis; noklusējums `gpt-6.1-sol` |
| `OPENAI_API_KEY` | Esošā servera API atslēga |

Nosaukumos saglabāts sākotnējais `DIARY_REVIEW` prefikss. SDK ir fiksēts uz `@openai/agents@0.3.9`, kas atbalsta esošo Zod 3. Šajā versiju kombinācijā lieto skaidru `z.union([type, z.null()])`, jo `.nullable()` serializējās kā OpenAPI `nullable: true`, nevis nepieciešamais JSON Schema null tips. Pārbaude aptver reālo SDK serializēto rīka un gala izvades shēmu. Validācijas kļūdas rīkam atgriež konkrētu rindas indeksu, lauku un labošanas skaidrojumu. Tracing ir izslēgts, modeļa pieprasījumiem ir `store: false`, automātiskie OpenAI klienta atkārtojumi ir izslēgti. Viena modeļa cikla limits ir 240 sekundes un 16 soļi.

1. Pārbaudīt lokālos testus un pending migrācijas ar `npx prisma migrate status`.
2. Ar skaidru produkcijas izmaiņu apstiprinājumu piemērot migrāciju `20261116120000_add_construction_diary_review` atbilstoši `DATABASE_MIGRATIONS.md` un izvietot atbilstošo lietotni/Prisma klientu. Migrācijas izpildes tabula glabā tiešās izpildes; sākotnējā rindas tabula šajā plūsmā netiek izmantota.
3. Ieslēgt servera karogu tikai minētajam pilotprojektam. Jaunas atļautās WhatsApp ziņas tad veiks maksas modeļa izsaukumus; statusa lasīšana tos neveic.
4. WhatsApp izvēlēties “Test Project”, no atļautā numura nosūtīt darba atskaiti un atvērt projekta “Dienasgrāmatas AI aģents” sadaļu. Nav jāgaida 10–20 minūtes.
5. Pārbaudīt sākotnējo ziņu, rīku soļus, visus sagaidāmos ierakstus, to daudzumus un Forma2 piesaistes žurnālā. Salīdzināt ar manuāli pārbaudītu sagaidāmo rezultātu.

Karoga izslēgšana atjauno veco maršrutēšanu nākamajām ziņām un liedz jaunā pilota saglabāšanu. Tā neizdzēš jau saglabātos ierakstus vai izpildes vēsturi.

`scripts/copy-forma2-template.ts` pārnes tikai tāmes definīciju un darbu izvēlnes. Avota ieraksti un faktiskās piesaistes netiek kopēti. Skripta noklusējums ir priekšskatījums; `--apply` veic autorizētu datu kopēšanu ar rezerves kopiju. Tas ir atsevišķs solis no aģenta aktivizēšanas.

## Pārbaudes robežas

`npm run test:diary-review` ietver tiešo SDK plūsmu ar determinētu lokālu `Model` aizvietotāju, pilota izvēli, piekļuvi, idempotenci, atomiskās saglabāšanas argumentus, validāciju un statusa saskarni. Papildus izmanto esošos AI validatorus un fixture dry-run. Šie testi neizsauc modeli, nesūta WhatsApp un nepiemēro migrācijas.

Augsta precizitāte nav pierādīta tikai ar SDK vai šiem testiem. Dzīvajā pilotā jāsalīdzina darbību pārklājums, precīzi Forma2 ID, plāna/fakta atšķiršana, mērvienības, daudzumi, darba laiks, trūkstošie darbinieku skaiti, izmaksas un latentums. Audio transkripcija un foto sākotnējā apstrāde paliek esošajā ceļā.

Oficiālā dokumentācija: [Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents), [Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents).
