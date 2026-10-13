// Výchozí seznam pražských hospod a souřadnic
var initialPubs = [
  {
    id: "u-zlateho-tygra",
    name: "U Zlatého tygra",
    website: "https://www.uzlatehotygra.cz/",
    address: "Husova 228/17, 110 00 Praha 1 - Staré Město",
    lat: 50.085817,
    lng: 14.418036,
    district: "Praha 1 - Staré Město",
    rating: 9.5,
    beerRating: "Plzeň 9.5/10",
    beerType: "Pilsner Urquell (hladinka, šnyt, mlíko)",
    priceLevel: "Běžná",
    tags: ["Legenda", "Tanková Plzeň", "Stoják i stoly", "Kultovní"],
    quote: "2x jsme přišli, neuspěli. Přemluvili starýho chlápka, aby nám koupil pivo. Totalitní klasika.",
    notes: [
      "Plzeň 9.5/10 – při naší návštěvě nám chutnala.",
      "Narvaná hospoda k prasknutí, bez rezervace či štěstí si nesedneš",
      "2x jsme přišli, neuspěli",
      "Přemluvili starýho chlápka, aby nám koupil pivo",
      "Starý interiér, hluk a plno.",
      "Chodil sem Bohumil Hrabal i Václav Havel s Billem Clintonem"
    ],
    atmosphere: "Hlučná hospoda s tradičním interiérem.",
    userReviewed: true
  },
  {
    id: "lokal-dlouha",
    name: "Lokál Dlouhááá",
    address: "Dlouhá 731/33, 110 00 Praha 1 - Staré Město",
    lat: 50.090705,
    lng: 14.425861,
    district: "Praha 1 - Staré Město",
    rating: 9.0,
    beerRating: "Plzeň 9/10 (80 Kč)",
    beerType: "Tankový Pilsner Urquell, Černý Kozel",
    priceLevel: "Vyšší",
    tags: ["Dlouhááá", "Tanková Plzeň", "Ambiente", "Klasika"],
    quote: "Velká hospoda, s atmosférou hospody fakt. Trochu větší, známí od Rosťi, výčepáci v pohodě.",
    notes: [
      "Dlouhááá nudle – nejznámější podnik ze sítě Lokál",
      "Tanková Plzeň – při návštěvě nám chutnala.",
      "Velká hospoda, s atmosférou hospody fakt",
      "Trochu větší prostor",
      "Známí od Rosťi",
      "Výčepáci v pohodě, točí bleskově"
    ],
    atmosphere: "Velká a rušná hospoda v Dlouhé ulici.",
    userReviewed: true
  },
  {
    id: "cerveny-jelen",
    name: "Červený jelen",
    website: "https://www.cervenyjelen.cz/",
    address: "Hybernská 1034/5, 110 00 Praha 1 - Nové Město",
    lat: 50.087316,
    lng: 14.430846,
    district: "Praha 1 - Nové Město",
    rating: 9.25,
    beerRating: "Plzeň tanková 9.25/10",
    beerType: "Tankový Pilsner Urquell (věž z 12 tanků)",
    priceLevel: "Vyšší střední",
    tags: ["12 tanků", "Bývalá banka", "Terasa & Salónky", "Obří prostor"],
    quote: "12 tanků = 3 patra hospody. Původní banka – mramor, kámen. Plzeň fakt dobrá, hořká, ale né nepříjemně, avšak jsme nalití.",
    notes: [
      "Obří, známý a velkolepý podnik ve Šporkovském paláci",
      "12 pivních tanků postavených nad sebou = 3 patra hospody",
      "Patro s terasou a salónky",
      "Původní banka – krásnej prostor, mramor, kámen atd.",
      "I ve větší skupině jsme se rychle dočkali objednávky.",
      "Plzeň tanková – 9.25/10 – fakt dobrý, hořký, ale né nepříjemně, avšak jsme nalití"
    ],
    atmosphere: "Moderní monumentální pivnice v historické bankovní hale, energická",
    userReviewed: true
  },
  {
    id: "kantyna",
    name: "Kantýna",
    website: "https://www.kantyna.ambi.cz/",
    address: "Politických vězňů 1511/5, 110 00 Praha 1 - Nové Město",
    lat: 50.083384,
    lng: 14.428757,
    district: "Praha 1 - Nové Město",
    rating: 8.5,
    beerRating: "Plzeň 8.5/10",
    beerType: "Tankový Pilsner Urquell",
    priceLevel: "Vyšší",
    tags: ["Jídlo na váhu", "Maso & Řeznictví", "Bývalá banka", "Na stojáka"],
    quote: "Pěkný prostředí, hodně historický. Společně s jídlem na váhu, lístek při vstupu. I při hodně lidí to jde rychle.",
    notes: [
      "Pěkný prostředí – hodně historický (bývalá zednářská banka)",
      "Společně s jídlem na váhu (tatarák, pečená žebra, carpaccio, řízek...)",
      "Konzumační lístek při vstupu",
      "Plzeň – 8.5/10 – něco tomu trochu chybí oproti ostatním",
      "Narváno, velký šrumec",
      "Hospodská atmosféra (hluk)",
      "I při hodně lidí to jde rychle díky sehranému personálu"
    ],
    atmosphere: "Řeznictví spojené s hospodou na stojáka, mramorový stůl uprostřed",
    userReviewed: true
  },
  {
    id: "u-dvou-kocek",
    name: "U dvou koček",
    website: "https://udvoukocek.cz/",
    address: "Uhelný trh 415/10, 110 00 Praha 1 - Staré Město",
    lat: 50.083513,
    lng: 14.420487,
    district: "Praha 1 - Staré Město",
    rating: 9.0,
    beerRating: "Plzeň 9/10",
    beerType: "Pilsner Urquell + vlastní světlé a tmavé Kočka",
    priceLevel: "Střední",
    tags: ["Na stojáka", "Vlastní pivo Kočka", "Štamgasti", "Tradice od 1678"],
    quote: "\"Na stojáka plzeň loček, nejlepší je u dvou koček.\" Super atmosféra, větší hospoda – nemačkáme se.",
    notes: [
      "Super atmosféra se staropražskou duší",
      "Větší hospoda – nemačkáme se",
      "Plzeň – 9/10, krásně ošetřená",
      "Příjemný prostředí – část štamgasti, část nálet",
      "Čistý podnik s poctivou péčí o sklo",
      "Heslo podniku: \"na stojáka plzeň loček, nejlepší je u dvou koček\"",
      "Večer často živý harmonikář"
    ],
    atmosphere: "Poctivá tradiční pivnice na Uhelném trhu, harmonika a družná nálada",
    userReviewed: true
  },
  {
    id: "u-vejvodu",
    name: "U Vejvodů",
    address: "Jilská 110/4, 110 00 Praha 1 - Staré Město",
    lat: 50.086036,
    lng: 14.418962,
    district: "Praha 1 - Staré Město",
    rating: 7.2,
    beerRating: "Plzeň 7.2/10",
    beerType: "Pilsner Urquell",
    priceLevel: "Střední",
    tags: ["Velkokapacitní", "Historický dům", "Turistické"],
    quote: "Velkokapacitní, dost místa pro každého. Plzeň 7.2/10 – hořčí. Atmoška nic moc, celkový požitek nic moc.",
    notes: [
      "Velkokapacitní hospoda v labyrintu staroměstského domu",
      "Dost místa pro každého, snadno se usadí i velká parta",
      "Plzeň – 7.2/10 – znatelně hořčí, méně pitelná než v top podnicích",
      "Atmoška nic moc – příliš orientované na turistické davy",
      "Celkový požitek nic moc, dobré spíš jen jako nouzovka když je jinde plno"
    ],
    atmosphere: "Obří pivnice s dřevěnými stoly, často plná turistických skupin",
    userReviewed: true
  },
  {
    id: "u-hrocha",
    name: "U Hrocha",
    address: "Thunovská 178/10, 118 00 Praha 1 - Malá Strana",
    lat: 50.089163,
    lng: 14.403239,
    district: "Praha 1 - Malá Strana",
    rating: 9.0,
    beerRating: "Plzeň 9/10",
    beerType: "Pilsner Urquell (hladinka se šlehačkovou pěnou)",
    priceLevel: "Férová",
    tags: ["Malostranská legenda", "Hodně pěny", "Sněmovna za rohem", "Nehipsterský"],
    quote: "Plzeň 9/10 – hodně pěny, jinak perfektní. Hospoda doslova přecpaná, nejde na stojáka. Nehipsterský, chlapi obsluha dobří.",
    notes: [
      "Plzeň 9/10 – hodně pěny, chuťově nám sedla.",
      "Hospoda doslova přecpaná, jen pár masivních dřevěných stolů",
      "Nejde na stojáka – buď sedíš, nebo máš smůlu",
      "Hodně hodně místní komunita",
      "Přímo vedle Poslanecké sněmovny pod zámeckými schody",
      "Chlapi obsluha dobří, rázná, ale férová škola",
      "Tradiční hospoda bez moderních designových úprav."
    ],
    atmosphere: "Klenutý strop, úzký prostor a několik velkých stolů.",
    userReviewed: true
  },
  {
    id: "u-pinkasu",
    name: "U Pinkasů",
    address: "Jungmannovo náměstí 755/15, 110 00 Praha 1 - Nové Město",
    lat: 50.083233,
    lng: 14.423320,
    district: "Praha 1 - Nové Město",
    rating: 9.0,
    beerRating: "Plzeň 9/10 (80 Kč)",
    beerType: "Pilsner Urquell (čepovaný od roku 1843!), Černý Kozel",
    priceLevel: "Vyšší (80 Kč za pivo)",
    tags: ["První Plzeň v Praze (1843)", "Víc pater", "Zelená s pěnou", "Zahrádka u chrámu"],
    quote: "Příjemní výčepáci, plzeň dražší 80 Kč, ale dobrý 9/10. Speciality – kozel v trávě, zelená s pěnou od černého piva. Velká historie úplně v centru!",
    notes: [
      "Historicky první místo v Praze, kde se 8. dubna 1843 začal čepovat plzeňský ležák",
      "Větší podnik – rozkládá se přes více pater",
      "Příjemní a zkušení výčepáci",
      "Plzeň – dražší 80 Kč, ale chuťově poctivých 9/10",
      "Speciality podniku: \"Kozel v trávě\", zelená zalitá krémovou pěnou z černého piva",
      "Krásná klidná letní zahrádka přímo u zdi gotického chrámu Panny Marie Sněžné",
      "Úplně v centru u Můstku"
    ],
    atmosphere: "Několik pater a zahrádka u chrámu.",
    userReviewed: true
  },
  {
    id: "u-fleku",
    name: "U Fleků",
    website: "https://ufleku.cz/",
    address: "Křemencova 1651/11, 110 00 Praha 1 - Nové Město",
    lat: 50.078898,
    lng: 14.416976,
    district: "Praha 1 - Nové Město",
    rating: 8.5,
    beerRating: "Flekovský tmavý ležák 13° (8.5/10)",
    beerType: "Vlastní černý 13° ležák U Fleků",
    priceLevel: "Vyšší turistická",
    tags: ["Založeno 1499", "Vlastní pivovar", "Kabaret & Harmonika", "Obří zahrada"],
    quote: "Nejstarší nepřetržitě fungující pivovar v Praze (od roku 1499). Vaří jedinečný černý třináctistupňový ležák.",
    notes: [
      "Jeden z nejstarších pivovarů v Evropě, vaří bez přestávky od roku 1499",
      "Čepuje se výhradně vlastní tmavý 13° ležák s karamelovo-kávovým nádechem",
      "Osm historických sálů (Akademie, Rytířský sál, Kufr, Šenk...) a rozsáhlá zahrada",
      "Číšníci roznášejí tácy s pivem a panáky Becherovky",
      "Živá hudba s tahací harmonikou",
      "Rada: Pozor na neustále nabízené panáky navíc, které naskakují na účtu!"
    ],
    atmosphere: "Staročeský folklór, klenuté dřevěné stropy, cinkot korbelů a harmonika",
    userReviewed: false
  },
  {
    id: "dva-kohouti",
    name: "Dva kohouti",
    website: "https://www.dvakohouti.ambi.cz/",
    address: "Sokolovská 81/55, 186 00 Praha 8 - Karlín",
    lat: 50.093494,
    lng: 14.446819,
    district: "Praha 8 - Karlín",
    rating: 8.0,
    beerRating: "Dva kohouti ležák 8/10",
    beerType: "Místní piva (např. Místní ležák 12°), speciály, Budvar kolaborace",
    priceLevel: "Vyšší (čepují 0.4 l)",
    tags: ["Karlínský dvůr", "Hipster & Craft", "Vlastní pivovar", "Pivní akce"],
    quote: "Hipsterský, dražší, skvělý pivo lokální – letní svěží, kalný, hodně chmelený. Velký dvůr, dávaj jen 0.4 l. Akce s Budvarem!",
    notes: [
      "Projekt sládka Adama Matušky a mistra výčepního Lukáše Svobody",
      "Hipsterský, moderní a dynamický podnik v srdci Karlína",
      "Dražší ceny a dávají sklenice jen o objemu 0.4 litru",
      "Skvělý lokální pivo Dva kohouti – hodnocení 8/10: letní, svěží, nefiltrované kalné, poctivě chmelené a chuťově plné",
      "Velký venkovní dvůr, v podvečer a o víkendech hlava na hlavě",
      "Pravidelné pivní akce a hostující pípy! Ochutnáno např. limitka Budvar Twogether Forever (letní Pale Ale 10° s 4.5% alk., vařeno s dánským Mikkellerem – chuťově jako Lomnice)"
    ],
    atmosphere: "Industriální karlínský vibe, nerezové tanky za sklem, venkovní foodtrucky a drinky na stojáka",
    userReviewed: true
  },
  {
    id: "u-glaubicu",
    name: "U Glaubiců",
    website: "https://uglaubicu.com/",
    address: "Malostranské náměstí 266/5, 118 00 Praha 1 - Malá Strana",
    lat: 50.087637,
    lng: 14.403511,
    district: "Praha 1 - Malá Strana",
    rating: 8.8,
    beerRating: "Plzeň cca 50,- Kč (8.8/10)",
    beerType: "Tankový Pilsner Urquell za bezkonkurenční cenu",
    priceLevel: "Mimořádně levná (50 Kč)",
    tags: ["Plzeň 50,-!!!", "700 let historie", "Gotické sklepy", "Malostranské nám."],
    quote: "Hodně plno, ale na pivo se místo +- najde. Plzeň 50,-!!! Přímo u chrámu sv. Mikuláše.",
    notes: [
      "Pivní zázrak Malé Strany: špičková tanková Plzeň za 50 Kč v naprostém turistickém epicentru!",
      "Hodně plno, ale díky kapacitě se na jedno či dvě místo plus mínus najde",
      "Obrovské gotické klenuté sklepení staré více než 700 let",
      "Rychlý výčep, pivo točené z tanku s parádní pěnou",
      "Zahrádka přímo na Malostranském náměstí s výhledem na chrám sv. Mikuláše"
    ],
    atmosphere: "Hustá pivní atmosféra, směsice studentů, místních a turistů těšících se z levného piva",
    userReviewed: true
  },
  {
    id: "u-medvidku",
    name: "U Medvídků",
    website: "https://umedvidku.cz/cs/",
    address: "Na Perštýně 345/7, 110 00 Praha 1 - Staré Město",
    lat: 50.082912,
    lng: 14.418696,
    district: "Praha 1 - Staré Město",
    rating: 8.2,
    beerRating: "Budvar 33 & X-BEER 33",
    beerType: "Tankový Budějovický Budvar 33, kroužkovaný ležák, extrémní speciál X-BEER 33",
    priceLevel: "Střední",
    tags: ["Historie od 1466", "Budvar bašta", "X-BEER 33", "Minipivovar"],
    quote: "Historický pivovarský dům se staletou tradicí Budvaru a nejmenším soukromým minipivovarem na půdě.",
    notes: [
      "Pivovarský dům fungující již od roku 1466",
      "Jedna z hlavních pražských ambasád Budějovického Budvaru (Budvar 33, kroužek)",
      "V podkroví je minipivovar s vlastními pivy.",
      "Specialita podniku: X-BEER 33 – nejsilnější světlý ležák na světě (12.6% alkoholu, 33° plato)",
      "Pivní zmrzlina a pivní suvenýry přímo v objektu"
    ],
    atmosphere: "Dlouhé dubové stoly, typický staroměstský měšťanský interiér",
    userReviewed: false
  },
  {
    id: "malostranska-beseda",
    name: "Malostranská beseda",
    website: "https://www.malostranska-beseda.cz/",
    address: "Malostranské náměstí 35/21, 118 00 Praha 1 - Malá Strana",
    lat: 50.088296,
    lng: 14.404904,
    district: "Praha 1 - Malá Strana",
    rating: 8.6,
    beerRating: "Tanková Plzeň 8.6/10",
    beerType: "Tankový Pilsner Urquell, Velkopopovický Kozel",
    priceLevel: "Střední až vyšší",
    tags: ["Kulturní památka", "Tanková Plzeň", "Hospoda & Klub", "Renesanční dům"],
    quote: "Plzeňská restaurace a pivnice v přízemí pozdně renesanční bývalé Malostranské radnice.",
    notes: [
      "Klenot Malostranského náměstí – bývalá Malostranská radnice s věžemi",
      "V přízemí je pivnice s tankovým Prazdrojem.",
      "V prvním patře legendární hudební klub a divadelní sál",
      "Tradiční česká kuchyně (svíčková, guláš, kachna) v moderním pojetí",
      "Krásná okna do náměstí a výhled na tramvaje i Mikuláše"
    ],
    atmosphere: "Důstojná měšťanská pivnice s vysokými klenbami a kulturním podtextem",
    userReviewed: false
  },
  {
    id: "u-bansethu",
    name: "U Bansethů",
    website: "https://ubansethu.cz/",
    address: "Táborská 389/49, 140 00 Praha 4 - Nusle",
    lat: 50.062885,
    lng: 14.439998,
    district: "Praha 4 - Nusle",
    rating: 9.3,
    beerRating: "Tanková Plzeň & Polotmavá Bašta 9.3/10",
    beerType: "Tankový Pilsner Urquell + vlastní řemeslná piva ze Sousedského pivovaru Bašta",
    priceLevel: "Příjemná nuselská",
    tags: ["Švejkova hospoda", "Legendární kachna", "Vlastní pivovar Bašta", "Pivní mekka Nuslí"],
    quote: "Kultovní nuselská bašta opěvovaná Švejkem. Proslulá nejlepší pečenou kachnou v Praze a dokonalou Plzní.",
    notes: [
      "Legendární nuselská hospoda, do které chodil Jaroslav Hašek a zmiňoval ji v Osudech dobrého vojáka Švejka",
      "V podniku čepují Plzeň z tanku; známý je také vlastním pivovarem Bašta a kachnou.",
      "Gurmánská ikona: Pečená kachna plněná lokšemi a červeným zelím s bramborovými plackami",
      "Hned vedle ve dvoře funguje vlastní Sousedský pivovar Bašta (polotmavý ležák vyhrává pravidelně Jarní cenu sládků)",
      "Rezervace večer prakticky nutností"
    ],
    atmosphere: "Poctivá čtvrťová hospoda, kde se stírají rozdíly – všichni přišli na pivo a kachnu",
    userReviewed: false
  },
  {
    id: "u-vystreleneho-oka",
    name: "U Vystřelenýho oka",
    address: "U Božích bojovníků 600/3, 130 00 Praha 3 - Žižkov",
    lat: 50.087065,
    lng: 14.449719,
    district: "Praha 3 - Žižkov",
    rating: 8.9,
    beerRating: "Prazdroj & Kozel 8.9/10",
    beerType: "Pilsner Urquell, Kozel, Radegast",
    priceLevel: "Lidová žižkovská",
    tags: ["Žižkovský kult", "Pod Vítkovem", "Zahrada ve svahu", "Underground"],
    quote: "Esence starého divokého Žižkova. Žádný snobismus, malby od Martina Velíška a pivo na svahu pod Vítkovem.",
    notes: [
      "Absolutní undergroundová legenda pod památníkem Jana Žižky na Vítkově",
      "Interiér zdobí nezaměnitelné kresby malíře Martina Velíška (autor obalů Už jsme doma)",
      "Svahovitá venkovní zahrádka pod stromy s výhledem na starý Žižkov",
      "Schází se tu umělci, rockeři, místní dělníci i studenti",
      "Poctivě točené pivo za normální ceny bez turistické přirážky",
      "Vyhlášený utopenec, nakládaný hermelín a tlačenka s cibulí"
    ],
    atmosphere: "Bohémský punk a žižkovská hrdost – tady čas plyne úplně jinak",
    userReviewed: false
  },
  {
    id: "modra-vopice",
    name: "Modrá Vopice",
    website: "https://www.modravopice.cz/",
    address: "Spojovací 1901, 190 00 Praha 9 - Vysočany",
    lat: 50.098956,
    lng: 14.493660,
    district: "Praha 9 - Vysočany",
    rating: 8.0,
    beerRating: "Svijany / Kozel / Gambrinus",
    beerType: "Svijanský Máz, Velkopopovický Kozel, Plzeň",
    priceLevel: "Klubová / lidová",
    tags: ["Rockový klub", "Venkovní areál", "Punk & Metal", "Vysočany"],
    quote: "Legendární rock/punkový klub s obřím venkovním posezením na pomezí Žižkova a Vysočan.",
    notes: [
      "Kultovní hudební klub založený v roce 1993 na křižovatce Ohrada / Harfa",
      "Rozlehlý venkovní areál s lavicemi pod stromy, pódiem a výčepními okénky",
      "Poctivé pivo do kelímku i skla za velmi příznivé klubové ceny",
      "Pravidelné koncerty české i zahraniční undergroundové a metalové scény",
      "Skvělé útočiště pro letní večerní pivo na čerstvém vzduchu"
    ],
    atmosphere: "Drsnější rockový ráz, vůně grilu, kytarové rify a svobodný duch",
    userReviewed: false
  },
  {
    id: "u-kocoura",
    name: "U Kocoura",
    address: "Nerudova 205/2, 118 00 Praha 1 - Malá Strana",
    lat: 50.088689,
    lng: 14.401998,
    district: "Praha 1 - Malá Strana",
    rating: 7.2,
    beerRating: "Plzeň 7.2/10",
    beerType: "Pilsner Urquell, Budějovický Budvar",
    priceLevel: "Střední",
    tags: ["Nerudova ulice", "Jednoduchá hospoda", "Švejkaři", "Sparta fans"],
    quote: "Plzeň 7.2/10 – divná hořkost, nepříjemný konec. Narváno, sraz nějakejch švejkařů. Jednoduchá hodně.",
    notes: [
      "Hospoda přímo v dolní části strmé Nerudovy ulice",
      "Plzeň – 7.2/10 – divná hořkost, nepříjemný konec na patře",
      "Narváno, při naší návštěvě probíhal sraz nějakejch švejkařů",
      "Jednoduchá hodně, žádný komfort nečekejte",
      "Půllitry sice čistý, ač překvapivě kvůli specifickému mytí",
      "Fanděj Spartě teplouši (výrazná sparťanská výzdoba a fanoušci u stolu)"
    ],
    atmosphere: "Rázovitá hospoda v turistické tepně, kontrast místních fandů a kolemjdoucích",
    userReviewed: true
  },
  {
    id: "u-cerneho-vola",
    name: "U Černého vola",
    address: "Loretánské náměstí 107/1, 118 00 Praha 1 - Hradčany",
    lat: 50.088148,
    lng: 14.391847,
    district: "Praha 1 - Hradčany",
    rating: 8.0,
    beerRating: "Plzeň & Kozel černý 8/10",
    beerType: "Velkopopovický Kozel černý, Pilsner Urquell",
    priceLevel: "Lidová na Hradčanech",
    tags: ["Hradčanský klenot", "Na stojáka", "Dobový pajzl", "Charitativní tradice"],
    quote: "Dobrá atmoška, dobový pajzl trochu. Pivo stojka, místní, Plzeň a parádní Kozel na Loretě.",
    notes: [
      "Jedna z posledních autentických nezkažených hospod v celém hradním areálu",
      "Dobrá atmoška, takový příjemný dobový pajzl se zachovaným interiérem z 60. let",
      "Oblíbené pivo na stojáka u pultu u vchodu",
      "Místní štamgasti, řemeslníci i studenti z okolních kolejí",
      "Výtečný řezaný Kozel s Plzní nebo čistý černý Kozel do těžkého skla",
      "Krásná tradice: Hospodu provozuje sdružení na podporu sousední školy pro nevidomé a zrakově postižené na Hradčanech!"
    ],
    atmosphere: "Tmavé dřevěné stoly, olovnatá skla, hradčanský klid a poctivý šenk",
    userReviewed: true
  },
  {
    id: "zaveseny-kafe",
    name: "Zavěšený kafe",
    address: "Úvoz 169/6, 118 00 Praha 1 - Hradčany",
    lat: 50.088480,
    lng: 14.396070,
    district: "Praha 1 - Hradčany",
    rating: 7.5,
    beerRating: "Moucha 12° (7/10), Černá Paka 13° (6.5/10)",
    beerType: "Moucha 12° z Braníka, Černá Paka 13° z Nové Paky",
    priceLevel: "Příjemná",
    tags: ["Václav Havel", "Hipster / Hospůdka", "Výhled na Prahu", "Alternativní piva"],
    quote: "Restaurace – hipsterský, měl to rád Václav Havel. Pohodový, fotky všude. Moucha 12 letní svěží 7/10, Černá paka sladší 6.5/10.",
    notes: [
      "Hospůdka a kavárna v prudkém kopci Úvozu těsně pod Strahovským klášterem",
      "Hipsterský nádech, velmi pohodové a útulné prostředí",
      "Měl to tady rád Václav Havel, jeho fotky a disidentská historie visí na zdech",
      "Moucha 12° – velmi letní, příjemná chmelová chuť, nehořký, trochu sladší, lehké pivo na dvanáctku (7/10)",
      "Černá Paka 13° – tmavé pivo, sladké ale dobré, ocas nic výrazného (6.5/10)",
      "Krásný výhled z oken na střechy Malé Strany a Petřínské sady"
    ],
    atmosphere: "Literární, bohémská, klidná oáza při výšlapu na Hrad nebo ze Strahova",
    userReviewed: true
  },
  {
    id: "dejvicka-nadrazka",
    name: "Dejvická nádražka",
    address: "Václavkova 169/1, 160 00 Praha 6 - Dejvice",
    lat: 50.096965,
    lng: 14.397286,
    district: "Praha 6 - Dejvice",
    rating: 8.0,
    beerRating: "Staráč 38 Kč!, Plzeň 60,-",
    beerType: "Staropramen 10° (38 Kč), Pilsner Urquell (60 Kč)",
    priceLevel: "Ultra levná (Staráč 38 Kč)",
    tags: ["Nádražka", "Staráč 38,-", "Zahrádka u kolejí", "Chlastací hospoda"],
    quote: "Staráč extra levnej – 38 Kč, Plzeň 60,-. Dobrej výčepní, taková chlastací hospoda. Odpoledne pohodka, večer plno. Pivo hodně dobrýyyyy.",
    notes: [
      "Kultovní nádražní hospoda na nejstarším pražském nádraží Praha-Dejvice",
      "V poznámkách máme Staropramen za 38 Kč a Plzeň za 60 Kč.",
      "Dobrej a vstřícný výčepní, poctivá nefalšovaná chlastací hospoda",
      "Odpoledne klídek a pohoda se sluníčkem, večer narváno studenty z ČVUT a místními",
      "Štamgasti spíše starší generace, ale večer se prolínají se studenty a hudebníky",
      "Pivo hodně dobrýyyyy a teče proudem",
      "Venkovní zahrádka přímo u nástupiště a projíždějících vlaků na Kladno"
    ],
    atmosphere: "Kulturní střet generací, cinkot sklenic u kolejí, svoboda a nefalšovaná nádražní romantika",
    userReviewed: true
  }
];

// Pěší trasy mezi podniky
var pubCrawlRoutes = [
  {
    id: "route-staromestska",
    title: "Staré Město",
    description: "Tygra, Dvě kočky, Pinkasy a Kantýna.",
    stops: ["u-zlateho-tygra", "u-dvou-kocek", "u-pinkasu", "kantyna"],
    badge: "4 zastávky"
  },
  {
    id: "route-malostranska",
    title: "Hradčany a Malá Strana",
    description: "Od Černého vola přes Úvoz a Nerudovu ulici k Malostranskému náměstí.",
    stops: ["u-cerneho-vola", "zaveseny-kafe", "u-hrocha", "u-glaubicu"],
    badge: "4 zastávky"
  },
  {
    id: "route-alternativni",
    title: "Karlín a Žižkov",
    description: "Dva kohouti, Červený jelen a Vystřelený oko.",
    stops: ["dva-kohouti", "cerveny-jelen", "u-vystreleneho-oka"],
    badge: "3 zastávky"
  },
  {
    id: "route-pivni-poklady",
    title: "Dejvice a Malá Strana",
    description: "Dejvická nádražka, Černý vůl a U Glaubiců.",
    stops: ["dejvicka-nadrazka", "u-cerneho-vola", "u-glaubicu"],
    badge: "3 zastávky"
  }
];

if (typeof window !== 'undefined') {
  window.initialPubs = initialPubs;
  window.pubCrawlRoutes = pubCrawlRoutes;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initialPubs, pubCrawlRoutes };
}
