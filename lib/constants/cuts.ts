export interface CutInfo {
  id: number;
  name: string;
  descriptionShort: string;
  descriptionFull: string;
  weight: string;
  price: string;
}

export const AVAILABLE_CUTS: CutInfo[] = [
  {
    id: 3,
    name: "Hakket kjøtt",
    descriptionShort: "Finmalt kjøtt",
    descriptionFull: "Vårt finmalt kjøtt egner seg perfekt til boller, kjøttsaus og andre klassiske rettter.",
    weight: "~500g",
    price: "kr 149",
  },
  {
    id: 8,
    name: "Nakkekoteletter",
    descriptionShort: "Møre koteletter",
    descriptionFull: "Møre og saftige koteletter fra nakken. Perfekt til steking eller grilling.",
    weight: "~150g",
    price: "kr 85",
  },
  {
    id: 5,
    name: "Ytrefilet",
    descriptionShort: "Premiumkvalitet",
    descriptionFull: "Ytrefilet (ryggfilet) er et av de fineste og mest ettertraktede stykkene.",
    weight: "~300g",
    price: "kr 199",
  },
  {
    id: 7,
    name: "Smalahove",
    descriptionShort: "Tradisjonell norsk delikatesse",
    descriptionFull: "Smalahove er et tradisjonelt norsk kjøttretter som består av sauekjøtt.",
    weight: "~800g",
    price: "kr 249",
  },
  {
    id: 9,
    name: "Gravlaks",
    descriptionShort: "Syltet laks",
    descriptionFull: "Vår hjemmelaget gravlaks med dill og sitron.",
    weight: "~400g",
    price: "kr 179",
  },
  {
    id: 10,
    name: "Røkt kalkun",
    descriptionShort: "Helstekt og røkt",
    descriptionFull: "Helstekt og røkt kalkun, perfekt for fest eller større selskaper.",
    weight: "~1.5kg",
    price: "kr 349",
  },
  {
    id: 11,
    name: "Spekeskinke",
    descriptionShort: "Tradisjonell norsk spekeskinke",
    descriptionFull: "Vår egenlagde spekeskinke er tilberedt med gammelt håndverk.",
    weight: "~600g",
    price: "kr 299",
  },
];
