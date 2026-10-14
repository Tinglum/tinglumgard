const ribbeSlugs = new Set(['ullgris-ribbe-langstekt', 'ullgris-ribbe-rask', 'asiatisk-ribbe-glaze'])

// These recipes use our skinned Mangalitsa, not supermarket pork with crackling.
export function withSkinlessRibbe<T extends { slug: string }>(recipe: T): T {
  if (!ribbeSlugs.has(recipe.slug)) return recipe
  const base = { ...recipe, image_url: '/recipes/norsk-ribbe-uten-svor.png' }
  if (recipe.slug === 'asiatisk-ribbe-glaze') return { ...base, image_url: '/recipes/norsk-ribbe-glaze-uten-svor.png' }
  const slow = recipe.slug === 'ullgris-ribbe-langstekt'
  return {
    ...base,
    title_no: slow ? 'Langtidsstekt ullgrisribbe uten svor' : 'Tynnribbe av ullgris uten svor',
    title_en: slow ? 'Slow-roasted skinless Mangalitsa belly' : 'Skinless Mangalitsa belly roast',
    intro_no: 'Ullgrisen flås, så ribba leveres uten svor. Fettmarmoreringen gir saftig kjøtt og fyldig smak. Stek med fettlaget opp og ta vare på den gode sjyen.',
    intro_en: 'Our woolly pigs are skinned, so the belly comes without skin. Rich fat marbling keeps the meat juicy and full of flavour. Roast fat-side up and save the pan juices.',
    steps_no: [
      'Tørk ribba og gni inn salt og pepper. Sett kaldt over natten om du har tid.',
      'Legg ribba i en langpanne med fettlaget opp og litt vann i bunnen. Ikke rut overflaten for svor.',
      slow ? 'Dekk med folie og stek ved 125 °C i omtrent 3 timer. Steketiden varierer med tykkelsen; fortsett til kjøttet er mørt.' : 'Stek ved 180 °C i omtrent 80–90 minutter. Dette passer mindre stykker under 2 kg; fortsett til kjøttet er mørt.',
      'Ta av eventuell folie. Brun overflaten kort ved 200 °C om nødvendig. Følg godt med så kjøttet ikke tørker ut.',
      'La ribba hvile i 15 minutter før du skjærer den.',
      slow ? 'Server med kokte poteter og rødkål. Sil og kok inn stekesjyen til saus.' : 'Server med potetmos. Visp litt sennep inn i varm stekesjy til saus.',
    ],
    steps_en: [
      'Pat the belly dry and season with salt and pepper. Refrigerate overnight if time allows.',
      'Place fat-side up in a roasting tray with a little water. There is no skin to score.',
      slow ? 'Cover with foil and roast at 125 °C for approximately 3 hours. Timing depends on thickness; continue until tender.' : 'Roast at 180 °C for approximately 80–90 minutes. This suits smaller pieces under 2 kg; continue until tender.',
      'Remove any foil. Briefly brown the surface at 200 °C if needed. Watch closely to avoid drying out the meat.',
      'Rest for 15 minutes before carving.',
      slow ? 'Serve with boiled potatoes and red cabbage. Strain and reduce the pan juices for sauce.' : 'Serve with mashed potatoes and a little mustard whisked into the warm pan juices.',
    ],
    tips_no: 'Ribba har ikke svor og skal ikke grilles for å få den til å boble. Bruk mørhet, ikke bare klokken, som tegn på at den er klar.',
    tips_en: 'There is no crackling to puff under the grill. Check tenderness rather than relying only on cooking time.',
    mangalitsa_tip_no: 'Mangalitsa-fettet gir saftighet og smak. Ta vare på det smeltede fettet til poteter, grønnsaker eller saus.',
    mangalitsa_tip_en: 'Mangalitsa fat adds juiciness and flavour. Save the rendered fat for potatoes, vegetables or sauces.',
  }
}
