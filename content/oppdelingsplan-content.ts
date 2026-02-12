export const oppdelingsplanContent = {
  no: {
    page: {
      title: 'Oppdelingsplan - Mangalitsa Ullgris',
      subtitle: 'Se hva du får i hver boks, og hvilke kutt vi bruker. Klikk på et område for å lære mer.',
      diagramAlt: 'Oppdelingsplan Mangalitsa ullgris',
      premium: 'Premium',
      cutDetails: {
        nakke: {
          name: 'Nakkekam (coppa)',
          description: 'Svine-entrecôte med dyp marmorering. Kan serveres rosa. Perfekt til hard stek eller speking.',
          inBox: ['Premium Cuts boks: Nakkekam i skiver, ca. 1,5 kg', 'BBQ og Steakhouse boks: Svine-entrecôte biffer'],
          extraOrder: ['Ekstra nakkekam for speking (coppa-prosjekt)', 'Nakkebiffer', 'Nakkestek'],
          weight: '1,2-1,8 kg',
          preparation: 'Hard varme, hvile 5 min, skjær tykt. Kan serveres medium.',
          premiumNote: 'Dette er grisens entrecôte - marmorering som wagyu.',
        },
        indrefilet: {
          name: 'Indrefilet (tenderloin)',
          description: 'Møreste kutt fra ullgris. Lite fett, men saftig tekstur. Eksklusivt og lite.',
          inBox: ['Premium Cuts boks: Hel indrefilet, ca. 0,5 kg'],
          extraOrder: ['Ekstra indrefilet (kun når tilgjengelig)'],
          weight: '400-600 g per side',
          preparation: 'Høy varme, kort tid, rosa kjerne. Aldri gjennomstekt.',
          premiumNote: 'Kun én per gris. Svært begrenset.',
        },
        kotelettkam: {
          name: 'Kotelettkam (ribeye/tomahawk)',
          description: 'Tykke koteletter med fettkappe. Kan skjæres som tomahawk med langt bein, eller ribeye-biffer.',
          inBox: [
            'Premium Cuts boks: Koteletter med fettkappe, ca. 2 kg',
            'BBQ og Steakhouse boks: Tomahawk-koteletter med langt bein',
            'Familieboks: Standard koteletter'
          ],
          extraOrder: ['Ekstra koteletter', 'Tomahawk-format spesialskjært'],
          weight: '2-3 kg total',
          preparation: 'Tykke koteletter (3-4 cm) på hard varme, hvil, server rosa.',
          premiumNote: 'Fettkappe er nøkkelen til smak. Ikke trim den bort.',
        },
        ribbeside: {
          name: 'Ribbeside og buk (ribs/belly)',
          description: 'Dette er hjertet av julematen OG BBQ-kulturen. Velg mellom 3 ribbevarianter + Butcher\'s Choice.',
          inBox: ['Alle bokser: 1,5 kg ribbevalg'],
          extraOrder: [
            'Ekstra ribbe (avhengig av tilgjengelighet)',
            'Sideflesk/buklist til pancetta eller bacon',
            'Spare ribs format'
          ],
          weight: '4-5 kg total per gris',
          preparation: 'Lang tid (3-4 timer), lav varme, sprø svor på slutten.',
          premiumNote: 'Mangalitsa-ribbe har 3x mer fett enn vanlig. Dette er julen du husker.',
        },
        svinebog: {
          name: 'Svinebog (shoulder)',
          description: 'Perfekt til pulled pork, lange koketider, eller storsteiker. Mye bindevev = mye smak.',
          inBox: [
            'BBQ og Steakhouse boks: Bogstek 2,5-3,5 kg',
            'Familieboks: Gryte/stekekjøtt fra bog'
          ],
          extraOrder: ['Ekstra bogstek', 'Bogstek til pulled pork-prosjekt'],
          weight: '2,8-3,8 kg',
          preparation: 'Langkok (6-8 timer) på lav varme, eller røyk 12 timer.',
          premiumNote: 'Bliver aldri tørt. Fettet smelter inn og gir dybde.',
        },
        skinke: {
          name: 'Skinke (ham)',
          description: 'Kan brukes til speking, langstekt julehele, eller skinkestek. Stor og imponerende.',
          inBox: ['Kun tilgjengelig som ekstrasalg eller spesialbestilling'],
          extraOrder: ['Hel skinke med fettkappe til speking', 'Skinkestek'],
          weight: '3-4,5 kg',
          preparation: 'Speking (lufttørket 6-12 mnd), eller langstekt i ovn.',
          premiumNote: 'Mangalitsa-skinke er fetere og mer egnet til speking enn vanlig gris.',
        },
        knoke: {
          name: 'Knoke og skank',
          description: 'Kraftbein, gelatin, langkok. Gir dybde til supper og gryter.',
          inBox: ['Julespesial boks: 1 knoke', 'Alle bokser: 1 knoke per boks'],
          extraOrder: ['Ekstra knoker til kraftbuljong', 'Skank til braising'],
          weight: '0,8-1,3 kg per knoke',
          preparation: 'Kok 4-6 timer til kraft, eller braisér med grønnsaker.',
          premiumNote: 'Mangalitsa-knoke gir rikere, fetere kraft.',
        },
        labb: {
          name: 'Labb (trotter)',
          description: 'Ekstremt gelatinrikt. Brukes til terrine, aspic, eller tilsatt kraft for konsistens.',
          inBox: ['Ikke standard i bokser'],
          extraOrder: ['Labb, 4 stk', 'Labb til gelé eller terrine'],
          weight: '200-400 g per labb',
          preparation: 'Kok 6-8 timer til gelé, eller bruk i terrine.',
          premiumNote: 'Niche produkt for entusiaster og kokker.',
        },
        polserFarse: {
          name: 'Pølser og farse',
          description: 'Premium pølser laget av ullgris med høyere fettprosent. Smaker kraftigere enn standard.',
          inBox: [
            'Premium Cuts boks: Premium pølse, 1 smak',
            'BBQ og Steakhouse boks: BBQ-pølse',
            'Julespesial boks: Medisterpølser + medisterfarse',
            'Familieboks: Hverdagspølse (men premium)'
          ],
          extraOrder: [
            'Ekstra fancy pølse',
            'Ekstra medisterpølser',
            'Ekstra kjøttdeig (grov, høy fettprosent)'
          ],
          weight: 'Varierer per boks',
          preparation: 'Pølse: Grill, steke, eller koke. Farse: Medisterkaker, pølsevev.',
          premiumNote: 'Fettprosenten gjør at pølser holder seg saftige, ikke tørre.',
        },
      },
      ribbeCards: [
        {
          title: 'Familieribbe',
          subtitle: 'Inkluderer kotelettkam',
          points: ['Ribbe + kotelettkam', 'Mer magert kjøtt', 'Best for store familier'],
          premium: true,
        },
        {
          title: 'Tynnribbe',
          subtitle: 'Klassisk ribbe med ribbein',
          points: ['Kun ribbein-området', 'Perfekt sprøstekt svor', 'God balanse kjøtt/fett'],
          premium: false,
        },
        {
          title: 'Porchetta',
          subtitle: 'Beinfri nedre mage',
          points: ['100% beinfri', 'Enkel å skjære', 'Saftig og smakfull'],
          premium: false,
        },
        {
          title: 'Butcher\'s Choice',
          subtitle: 'Slakterens valg',
          points: ['Slakterens valg', 'Beste kvalitet', 'Variert opplevelse'],
          premium: false,
        },
      ],
      // Special premium cuts (not in the diagram polygons but referenced by boxes)
      specialCuts: {
        guanciale: {
          name: 'Svinekinn (guanciale)',
          description: 'Kun 2 per gris. Dyp smak, perfekt til carbonara, amatriciana eller confit. Ekstremt begrenset.',
          inBox: ['Premium Cuts boks: Begge svinekinn (2 stk), ca. 0,8-1,4 kg total'],
          extraOrder: ['Ikke tilgjengelig - kun 2 per gris, allerede i Premium Cuts'],
          weight: '400-700 g per kinn',
          preparation: 'Cure til guanciale (2 uker), eller confit i eget fett.',
          premiumNote: 'Dette er høyeste verdi per gram. Kun for Premium Cuts boks.',
        },
        lardo: {
          name: 'Ryggspekk (lardo)',
          description: 'Rent fett fra ryggen. Kan saltes og cures til lardo, eller brukes som stekefett.',
          inBox: [
            'Premium Cuts boks: Lardo-blokk, ca. 1,2 kg',
            'Familieboks: Litt kokkefett'
          ],
          extraOrder: ['Ekstra ryggspekk til lardo-prosjekt', 'Smult i glass (ferdig smeltet)'],
          weight: '5-8 kg total per gris',
          preparation: 'Salt og cure 3-6 uker, eller smelt ned til smult.',
          premiumNote: 'Mangalitsa-lardo har renere, hvitere fett og smelter lavere temperatur.',
        },
        secretoPresaPluma: {
          name: 'Slakterens hemmelige biffer (secreto, presa, pluma)',
          description: 'Små, skjulte kutt med ekstrem marmorering. Finnes mellom større muskelgrupper. Svært begrenset.',
          inBox: ['Premium Cuts boks: Mix av secreto, presa, pluma - ca. 1,1 kg total'],
          extraOrder: ['Ikke tilgjengelig som ekstra - for lite per gris'],
          weight: '300-500 g per type',
          preparation: 'Høy varme, kort tid (2-3 min per side), rosa kjerne, hvil.',
          premiumNote: 'Dette er grisens wagyu. Kun i Premium Cuts.',
        },
      },
    },
    mobile: {
      diagramAlt: 'Oppdelingsplan Mangalitsa ullgris',
      partLabel: 'Del',
      cutDetails: {
        nakke: {
          name: 'Nakkekam (coppa)',
          inBox: ['Premium Cuts: Nakkekam 1,5 kg', 'BBQ: Svine-entrecôte biffer'],
          extraOrder: ['Ekstra nakkekam', 'Nakkebiffer'],
        },
        indrefilet: {
          name: 'Indrefilet (tenderloin)',
          inBox: ['Premium Cuts: Hel indrefilet, ca. 0,5 kg'],
          extraOrder: ['Ekstra indrefilet (kun når tilgjengelig)'],
        },
        kotelettkam: {
          name: 'Kotelettkam (ribeye/tomahawk)',
          inBox: ['Premium Cuts: Koteletter 2 kg', 'BBQ: Tomahawk', 'Familieboks: Koteletter'],
          extraOrder: ['Ekstra koteletter', 'Tomahawk-format'],
        },
        ribbeside: {
          name: 'Ribbeside og buk (ribs/belly)',
          inBox: ['Alle bokser: 1,5 kg ribbevalg'],
          extraOrder: ['Ekstra ribbe', 'Sideflesk/buklist', 'Spare ribs'],
        },
        svinebog: {
          name: 'Svinebog (shoulder)',
          inBox: ['BBQ: Bogstek 2,5-3,5 kg', 'Familieboks: Grytekjøtt'],
          extraOrder: ['Ekstra bogstek', 'Pulled pork-emne'],
        },
        skinke: {
          name: 'Skinke (ham)',
          inBox: ['Kun som ekstrasalg'],
          extraOrder: ['Hel skinke til speking', 'Skinkestek'],
        },
        knoke: {
          name: 'Knoke og skank',
          inBox: ['Julespesial: 1 knoke', 'Alle bokser: 1 knoke'],
          extraOrder: ['Ekstra knoker', 'Skank'],
        },
        labb: {
          name: 'Labb (trotter)',
          inBox: ['Ikke standard i bokser'],
          extraOrder: ['Labb, 4 stk'],
        },
        polserFarse: {
          name: 'Pølser og farse',
          inBox: ['Premium: Premium pølse', 'BBQ: BBQ-pølse', 'Julespesial: Medister', 'Familieboks: Hverdagspølse'],
          extraOrder: ['Ekstra pølse', 'Ekstra medister', 'Ekstra kjøttdeig'],
        },
      },
    },
  },
  en: {
    page: {
      title: 'Butcher Diagram - Mangalitsa Woolly Pig',
      subtitle: 'See what you get in each box, and which cuts we use. Click on an area to learn more.',
      diagramAlt: 'Butcher diagram Mangalitsa woolly pig',
      premium: 'Premium',
      cutDetails: {
        nakke: {
          name: 'Neck collar (coppa)',
          description: 'The pig\'s ribeye with deep marbling. Can be served pink. Perfect for searing or curing.',
          inBox: ['Premium Cuts box: Neck collar slices, approx. 1.5 kg', 'BBQ & Steakhouse box: Pork ribeye steaks'],
          extraOrder: ['Extra neck collar for curing (coppa project)', 'Neck steaks', 'Neck roast'],
          weight: '1.2-1.8 kg',
          preparation: 'High heat, rest 5 min, slice thick. Can be served medium.',
          premiumNote: 'This is the pig\'s ribeye - marbling like wagyu.',
        },
        indrefilet: {
          name: 'Tenderloin',
          description: 'The most tender cut from woolly pig. Low fat but juicy texture. Exclusive and small.',
          inBox: ['Premium Cuts box: Whole tenderloin, approx. 0.5 kg'],
          extraOrder: ['Extra tenderloin (only when available)'],
          weight: '400-600 g per side',
          preparation: 'High heat, short time, pink center. Never well done.',
          premiumNote: 'Only one per pig. Very limited.',
        },
        kotelettkam: {
          name: 'Loin (ribeye/tomahawk)',
          description: 'Thick chops with fat cap. Can be cut as tomahawk with long bone, or ribeye steaks.',
          inBox: [
            'Premium Cuts box: Chops with fat cap, approx. 2 kg',
            'BBQ & Steakhouse box: Tomahawk chops with long bone',
            'Family Box: Standard chops'
          ],
          extraOrder: ['Extra chops', 'Tomahawk format custom cut'],
          weight: '2-3 kg total',
          preparation: 'Thick chops (3-4 cm) on high heat, rest, serve pink.',
          premiumNote: 'The fat cap is the key to flavor. Don\'t trim it off.',
        },
        ribbeside: {
          name: 'Rib side and belly (ribs/belly)',
          description: 'The heart of Christmas dinner AND BBQ culture. Choose between 3 rib types + Butcher\'s Choice.',
          inBox: ['All boxes: 1.5 kg rib selection'],
          extraOrder: [
            'Extra ribs (subject to availability)',
            'Pork belly for pancetta or bacon',
            'Spare ribs format'
          ],
          weight: '4-5 kg total per pig',
          preparation: 'Long time (3-4 hours), low heat, crispy crackling at the end.',
          premiumNote: 'Mangalitsa ribs have 3x more fat than regular. This is the Christmas you\'ll remember.',
        },
        svinebog: {
          name: 'Shoulder',
          description: 'Perfect for pulled pork, long cooking times, or large roasts. Lots of connective tissue = lots of flavor.',
          inBox: [
            'BBQ & Steakhouse box: Shoulder roast 2.5-3.5 kg',
            'Family Box: Stew/roast meat from shoulder'
          ],
          extraOrder: ['Extra shoulder roast', 'Shoulder for pulled pork project'],
          weight: '2.8-3.8 kg',
          preparation: 'Slow cook (6-8 hours) on low heat, or smoke 12 hours.',
          premiumNote: 'Never dries out. The fat melts in and adds depth.',
        },
        skinke: {
          name: 'Ham',
          description: 'Can be used for curing, slow-roasted whole, or as ham roast. Large and impressive.',
          inBox: ['Only available as extra purchase or special order'],
          extraOrder: ['Whole ham with fat cap for curing', 'Ham roast'],
          weight: '3-4.5 kg',
          preparation: 'Curing (air-dried 6-12 months), or slow-roasted in oven.',
          premiumNote: 'Mangalitsa ham is fattier and more suitable for curing than regular pig.',
        },
        knoke: {
          name: 'Hock and shank',
          description: 'Stock bones, gelatin, slow cooking. Adds depth to soups and stews.',
          inBox: ['Christmas Special box: 1 hock', 'All boxes: 1 hock per box'],
          extraOrder: ['Extra hocks for stock', 'Shank for braising'],
          weight: '0.8-1.3 kg per hock',
          preparation: 'Simmer 4-6 hours for stock, or braise with vegetables.',
          premiumNote: 'Mangalitsa hock produces richer, fattier stock.',
        },
        labb: {
          name: 'Trotter',
          description: 'Extremely rich in gelatin. Used for terrine, aspic, or added to stock for body.',
          inBox: ['Not standard in boxes'],
          extraOrder: ['Trotters, 4 pcs', 'Trotters for gelée or terrine'],
          weight: '200-400 g per trotter',
          preparation: 'Simmer 6-8 hours for gelée, or use in terrine.',
          premiumNote: 'Niche product for enthusiasts and chefs.',
        },
        polserFarse: {
          name: 'Sausages and ground meat',
          description: 'Premium sausages made from woolly pig with higher fat percentage. Tastes stronger than standard.',
          inBox: [
            'Premium Cuts box: Premium sausage, 1 flavor',
            'BBQ & Steakhouse box: BBQ sausage',
            'Christmas Special box: Medister sausages + medister mix',
            'Family Box: Everyday sausage (but premium)'
          ],
          extraOrder: [
            'Extra fancy sausage',
            'Extra medister sausages',
            'Extra ground pork (coarse, high fat)'
          ],
          weight: 'Varies per box',
          preparation: 'Sausage: Grill, pan-fry, or simmer. Ground: Patties, sausage rolls.',
          premiumNote: 'The fat percentage keeps sausages juicy, not dry.',
        },
      },
      ribbeCards: [
        {
          title: 'Family ribs',
          subtitle: 'Includes loin section',
          points: ['Ribs + loin', 'Leaner meat', 'Best for larger families'],
          premium: true,
        },
        {
          title: 'Thin ribs',
          subtitle: 'Classic ribs with rib bones',
          points: ['Rib section only', 'Perfect crispy crackling', 'Great meat/fat balance'],
          premium: false,
        },
        {
          title: 'Porchetta',
          subtitle: 'Boneless lower belly',
          points: ['100% boneless', 'Easy to slice', 'Juicy and flavorful'],
          premium: false,
        },
        {
          title: 'Butcher\'s Choice',
          subtitle: 'Chef\'s selection',
          points: ['Butcher\'s pick', 'Best quality', 'Varied experience'],
          premium: false,
        },
      ],
      specialCuts: {
        guanciale: {
          name: 'Pork jowl (guanciale)',
          description: 'Only 2 per pig. Deep flavor, perfect for carbonara, amatriciana or confit. Extremely limited.',
          inBox: ['Premium Cuts box: Both pork jowls (2 pcs), approx. 0.8-1.4 kg total'],
          extraOrder: ['Not available - only 2 per pig, already in Premium Cuts'],
          weight: '400-700 g per jowl',
          preparation: 'Cure for guanciale (2 weeks), or confit in own fat.',
          premiumNote: 'Highest value per gram. Only for Premium Cuts box.',
        },
        lardo: {
          name: 'Back fat (lardo)',
          description: 'Pure fat from the back. Can be salted and cured to lardo, or used as cooking fat.',
          inBox: [
            'Premium Cuts box: Lardo block, approx. 1.2 kg',
            'Family Box: Some cooking fat'
          ],
          extraOrder: ['Extra back fat for lardo project', 'Rendered lard in jar'],
          weight: '5-8 kg total per pig',
          preparation: 'Salt and cure 3-6 weeks, or render down to lard.',
          premiumNote: 'Mangalitsa lardo has cleaner, whiter fat and melts at lower temperature.',
        },
        secretoPresaPluma: {
          name: 'Butcher\'s secret steaks (secreto, presa, pluma)',
          description: 'Small, hidden cuts with extreme marbling. Found between larger muscle groups. Very limited.',
          inBox: ['Premium Cuts box: Mix of secreto, presa, pluma - approx. 1.1 kg total'],
          extraOrder: ['Not available as extra - too little per pig'],
          weight: '300-500 g per type',
          preparation: 'High heat, short time (2-3 min per side), pink center, rest.',
          premiumNote: 'This is the pig\'s wagyu. Only in Premium Cuts.',
        },
      },
    },
    mobile: {
      diagramAlt: 'Butcher diagram Mangalitsa woolly pig',
      partLabel: 'Part',
      cutDetails: {
        nakke: {
          name: 'Neck collar (coppa)',
          inBox: ['Premium Cuts: Neck collar 1.5 kg', 'BBQ: Pork ribeye steaks'],
          extraOrder: ['Extra neck collar', 'Neck steaks'],
        },
        indrefilet: {
          name: 'Tenderloin',
          inBox: ['Premium Cuts: Whole tenderloin, approx. 0.5 kg'],
          extraOrder: ['Extra tenderloin (only when available)'],
        },
        kotelettkam: {
          name: 'Loin (ribeye/tomahawk)',
          inBox: ['Premium Cuts: Chops 2 kg', 'BBQ: Tomahawk', 'Family Box: Chops'],
          extraOrder: ['Extra chops', 'Tomahawk format'],
        },
        ribbeside: {
          name: 'Rib side and belly (ribs/belly)',
          inBox: ['All boxes: 1.5 kg rib selection'],
          extraOrder: ['Extra ribs', 'Pork belly', 'Spare ribs'],
        },
        svinebog: {
          name: 'Shoulder',
          inBox: ['BBQ: Shoulder roast 2.5-3.5 kg', 'Family Box: Stew meat'],
          extraOrder: ['Extra shoulder roast', 'Pulled pork cut'],
        },
        skinke: {
          name: 'Ham',
          inBox: ['Only as extra purchase'],
          extraOrder: ['Whole ham for curing', 'Ham roast'],
        },
        knoke: {
          name: 'Hock and shank',
          inBox: ['Christmas Special: 1 hock', 'All boxes: 1 hock'],
          extraOrder: ['Extra hocks', 'Shank'],
        },
        labb: {
          name: 'Trotter',
          inBox: ['Not standard in boxes'],
          extraOrder: ['Trotters, 4 pcs'],
        },
        polserFarse: {
          name: 'Sausages and ground meat',
          inBox: ['Premium: Premium sausage', 'BBQ: BBQ sausage', 'Christmas: Medister', 'Family: Everyday sausage'],
          extraOrder: ['Extra sausage', 'Extra medister', 'Extra ground pork'],
        },
      },
    },
  },
} as const;
