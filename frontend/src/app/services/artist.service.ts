import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Artist } from '../models/artist';
import exhibited_with from '../models/exhibited_with';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})

export class ArtistService {
  private dataUrl = 'http://localhost:3000'




  constructor(private http: HttpClient) { }


  getAllArtists(): Observable<any[]> {
    return this.http.get<any[]>(this.dataUrl + '/artist/').pipe(shareReplay());
  }

  turnIntoMap(array: any[]): Map<number, { name: string, artworks: number }> {
    const idNameMap = new Map<number, { name: string, artworks: number }>();
  
    array.forEach((item: any) => {
      const { id, firstname, lastname, artworks } = item; // Assuming the array elements have an age property
      idNameMap.set(id, { name: `${firstname} ${lastname}`, artworks: artworks});
    });
  
    return idNameMap;
  }
  

  getArtistsWithRange(range:number[]):Observable<any[][]>{
    //console.log(range)
    const [minLimit, maxLimit] = range;
    const params = new HttpParams()
      .set('minLimit', minLimit.toString())
      .set('maxLimit', maxLimit.toString());
    return this.http.get<any[][]>(this.dataUrl+ '/artist/amount', { params }).pipe(shareReplay());
  }
  clusterAmountArtists(range:number[], k:number):Observable<any[][]>{
    const params = new HttpParams()
    .set('minLimit', JSON.stringify(range[0]))
    .set('maxLimit', JSON.stringify(range[1]))
    .set('k', JSON.stringify(k));

  return this.http.get<[any[][]]>(this.dataUrl+ '/artist/cluster', { params }).pipe(shareReplay());

  }

  getArtistsWithNationalityTechnique():Observable<any[][]>{
    return this.http.get<any[][]>(this.dataUrl+ '/artist/nationality/technique').pipe(shareReplay())
  }

  getAmountArtistsWithNationalityTechnique(range:number[]):Observable<any[][]>{
    //console.log(range)
    const [minLimit, maxLimit] = range;
    const params = new HttpParams()
      .set('minLimit', minLimit.toString())
      .set('maxLimit', maxLimit.toString());
    return this.http.get<any[][]>(this.dataUrl+ '/artist/amount/nationality/technique', { params }).pipe(shareReplay());
  
  }

  getArtistsWithBirthcountryTechnique():Observable<any[][]>{
    return this.http.get<any[][]>(this.dataUrl+ '/artist/birthcountry/technique').pipe(shareReplay())
  }

  getAmountArtistsWithBirthcountryTechnique(range:number[]):Observable<any[][]>{
    const [minLimit, maxLimit] = range;
    const params = new HttpParams()
      .set('minLimit', minLimit.toString())
      .set('maxLimit', maxLimit.toString());
    return this.http.get<any[][]>(this.dataUrl+ '/artist/amount/birthcountry/technique', { params }).pipe(shareReplay());
  
  }

  getArtistsWithDeathcountryTechnique():Observable<any[][]>{
    return this.http.get<any[][]>(this.dataUrl+ '/artist/deathcountry/technique').pipe(shareReplay())
  }

  getAmountArtistsWithDeathcountryTechnique(range:number[]):Observable<any[][]>{
    const [minLimit, maxLimit] = range;
    const params = new HttpParams()
      .set('minLimit', minLimit.toString())
      .set('maxLimit', maxLimit.toString());
    return this.http.get<any[][]>(this.dataUrl+ '/artist/amount/deathcountry/technique', { params }).pipe(shareReplay());
  
  }

  getArtistsWithMostExhibitedInTechnique():Observable<any[][]>{
    return this.http.get<any[][]>(this.dataUrl+ '/artist/mostexhibitedincountry/technique').pipe(shareReplay())
  }

  getAmountArtistsWithMostExhibitedInTechnique(range:number[]):Observable<any[][]>{
   
    const [minLimit, maxLimit] = range;
    const params = new HttpParams()
      .set('minLimit', minLimit.toString())
      .set('maxLimit', maxLimit.toString());
    return this.http.get<any[][]>(this.dataUrl+ '/artist/amount/mostexhibitedincountry/technique', { params }).pipe(shareReplay());
  
  }

  getArtistsWithTechnique():Observable<any[][]>{
    return this.http.get<any[][]>(this.dataUrl+ '/artist/technique').pipe(shareReplay())
  }

  clusterArtists(artists:Artist[],relationships:exhibited_with[], k:number):Observable<any[]>{
    const params = new HttpParams()
      .set('minLimit', JSON.stringify(artists))
      .set('maxLimit', JSON.stringify(relationships))
      .set('k', k);
    return this.http.get<any[][]>(this.dataUrl+ '/artist/cluster',{ params }).pipe(shareReplay())
  }

  clusterAmountArtistsNationality(range:number[], k:number):Observable<any[][]>{
    const params = new HttpParams()
      .set('minLimit', JSON.stringify(range[0]))
      .set('maxLimit', JSON.stringify(range[1]))
      .set('k', JSON.stringify(k));

    return this.http.get<any[][]>(this.dataUrl+ '/artist/cluster/nationality', { params }).pipe(shareReplay());
  
  }
  clusterAmountArtistsBirthcountry(range:number[], k:number):Observable<any[][]>{
    const params = new HttpParams()
      .set('minLimit', JSON.stringify(range[0]))
      .set('maxLimit', JSON.stringify(range[1]))
      .set('k', JSON.stringify(k));

    return this.http.get<any[][]>(this.dataUrl+ '/artist/cluster/birthcountry', { params }).pipe(shareReplay());
  
  }

  clusterAmountArtistsDeathcountry(range:number[], k:number):Observable<any[][]>{
    const params = new HttpParams()
      .set('minLimit', JSON.stringify(range[0]))
      .set('maxLimit', JSON.stringify(range[1]))
      .set('k', JSON.stringify(k));

    return this.http.get<any[][]>(this.dataUrl+ '/artist/cluster/deathcountry', { params }).pipe(shareReplay());
  
  }

  clusterAmountArtistsMostExhibited(range:number[], k:number):Observable<any[][]>{
    const params = new HttpParams()
      .set('minLimit', JSON.stringify(range[0]))
      .set('maxLimit', JSON.stringify(range[1]))
      .set('k', JSON.stringify(k));

    return this.http.get<any[][]>(this.dataUrl+ '/artist/cluster/mostexhibited', { params }).pipe(shareReplay());
  
  }


public europeanRegions = {

    "North Europe": ["DK", "EE", "FI", "IE", "LV", "LT", "NO", "SE", "GB"],
    "Eastern Europe": ["BY", "BG", "CZ", "HU", "PL", "MD", "RO", "RU", "SK", "UA"],
    "Southern Europe": ["BA", "HR", "GI", "GR", "IT", "ME", "PT", "RS", "SI", "ES", "XK","MT", "MK"],
 "Western Europe": ["AT", "BE", "FR", "DE", "LU", "NL", "CH"],
 "Others": ['AM', 'AR', 'AU', 'AZ', 'BL', 'BO', 'BR', 'CA', 'CD', 'CL', 'CN', 'CU', 'CW', 'DO', 
  'DZ', 'EC', 'EE', 'EG', 'GE', 'GT', 'GY', 'ID', 'IL', 'IN', 'IR', 'JM', 'JO', 'JP', 'KH', 'KZ',
   'LK', 'MA', 'MC', 'MQ', 'MU', 'MX', 'NA', 'NZ', 'PE', 'PF', 'PY', 'SA', 'SG', 'SV', 'SY', 'TH', 
   'TN', 'TR', 'US', 'UY', 'UZ', 'VE', 'VI', 'VN', 'ZA']
 ,
  "\\N" :["\\N"]
};

/* public europeanRegions = {Z

  "North Europe": ["DK", "EE", "FI", "IE", "LV", "LT", "NO", "SE", "GB"], // Denmark, Estonia, Finland, Ireland, Latvia, Lithuania, Norway, Sweden, United Kingdom
  "Eastern Europe": ["BY", "BG", "UA", "RU", "MD", "RO"], // Belarus, Bulgaria, Ukraine, Russia, Moldova, Romania
  "Southern Europe": ["BA", "HR", "GI", "GR", "IT", "ME", "PT", "RS", "ES", "XK", "MT", "MK"], // Bosnia and Herzegovina, Croatia, Gibraltar, Greece, Italy, Montenegro, Portugal, Serbia, Spain, Kosovo, Malta, North Macedonia
  "Western Europe": ["BE", "FR", "LU", "NL"], // Belgium, France, Luxembourg, Netherlands
  "Central Europe": ["DE", "PL", "CZ", "HU", "SK", "AT", "LI", "CH", "SI"], // Germany, Poland, Czech Republic, Hungary, Slovakia, Austria, Liechtenstein, Switzerland, Slovenia
  "Others": ["ID", "US", "AU", "CA", "GE", "DZ", "MX", "AZ", "AR", "UY", "CU", "TN", "EG", "TR", "VI", "DO", "JP", 
             "MQ", "IN", "MU", "CL", "ZA", "NZ", "KH", "VE", "GT", "SV", "PY", "LK", "EC", "BR", "SG", "BL", "PE", 
             "TH", "PF", "AM", "IL", "MC", "CN", "UZ", "KZ", "MA", "BO", "VN", "NA", "JO", "IR", "JM", "SA", "CD", 
             "CW", "SY", "GY"], // Indonesia, United States, Australia, Canada, Georgia, Algeria, Mexico, Azerbaijan, Argentina, Uruguay, Cuba, Tunisia, Egypt, Turkey, Virgin Islands, Dominican Republic, Japan, Martinique, India, Mauritius, Chile, South Africa, New Zealand, Cambodia, Venezuela, Guatemala, El Salvador, Paraguay, Sri Lanka, Ecuador, Brazil, Singapore, Saint Barthélemy, Peru, Thailand, French Polynesia, Armenia, Israel, Monaco, China, Uzbekistan, Kazakhstan, Morocco, Bolivia, Vietnam, Namibia, Jordan, Iran, Jamaica, Saudi Arabia, Democratic Republic of the Congo, Curaçao, Syria, Guyana
  "\\N" : ["\\N"]
}; */

/* private europeanRegions = {

  "North Europe": ['Iceland', 'Sweden–Norway', 'Denmark'], // Iceland, Sweden, Norway, Denmark
  "Eastern Europe": ['Romania', 'Serbia', 'Montenegro', 'Bosnia-Herzegovina', 'Bulgaria', 'Russian Empire'], // Romania, Serbia, Montenegro, Bosnia-Herzegovina, Bulgaria, Russian Empire (modern Russia)
  "Southern Europe": ['Spain', 'Portugal', 'Italy', 'Greece', 'Malta'], // Spain, Portugal, Italy, Greece, Malta
  "Western Europe": ['Luxembourg', 'Belgium', 'Netherlands', 'France', 'Switzerland', 'United Kingdom of Great Britain and Ireland'], // Luxembourg, Belgium, Netherlands, France, Switzerland, United Kingdom
  "Central Europe": ['Austria Hungary', 'Germany'], // Austria-Hungary, Germany
};
 */


public getRegionColorScale(region: string): (t: number) => string {
  switch (region) {
    case "North Europe":
      return this.getColorScale(this.cyanColorPalette);
    case "Eastern Europe":
      return this.getColorScale(this.blueColorPalette);
    case "Southern Europe":
      return this.getColorScale(this.purpleColorPalette);
    case "Western Europe":
      return this.getColorScale(this.pinkColorPalette);
    case "Others":
      return this.getYellowOrangeColor;
    case "Central Europe":
      return this.getColorScale(this.greenColorPalette);
    case "\\N":
      return this.getColorScale(this.capuccinoColorPalette); 
    default:
      return this.getColorScale(this.capuccinoColorPalette); // Default color scale if region is not found
  }
}

public getOldRegionColorScale(region: string): (t: number) => string {
  switch (region) {
    case "North Europe":
      return this.getColorScale(this.cyanOldColorPalette);
    case "Eastern Europe":
      return this.getColorScale(this.blueOldColorPalette);
    case "Southern Europe":
      return this.getColorScale(this.purpleOldColorPalette);
    case "Western Europe":
      return this.getColorScale(this.pinkOldColorPalette);
    case "Others":
      return this.getYellowOrangeColor;
    case "Central Europe":
      return this.getColorScale(this.greenColorPalette);
    case "\\N":
      return this.getColorScale(this.capuccinoColorPalette); 
    default:
      return this.getColorScale(this.capuccinoColorPalette); // Default color scale if region is not found
  }
}

// Function to create a color scale from a given color palette
public getColorScale(palette: string[]): (t: number) => string {
  return (t: number) => {
    const index = Math.round(t * (palette.length - 1));
    return palette[index];
  };
}
public capuccinoColorPalette: string[] = [
  "#c9ada7"
];

public greyColorPalette: string[] = [
  "black"
];
//9
public cyanColorPalette: string[] = [
  "#18857f",
  "#28918b",
  "#359d97",
  "#41a9a3",
  "#4db6af",
  "#59c2bb",
  "#64cfc8",
  "#70dcd4",
  "#7be9e1"
];


//10
public blueColorPalette: string[] = [
  "#0f5a91", // Darker blue added
  "#1575c2",
  "#2183cb",
  "#2f92d3",
  "#3fa0db",
  "#50aee3",
  "#62bcea",
  "#75caf1",
  "#88d8f8",
  "#9ce6ff"
];



//13
public purpleColorPalette: string[] = [
  "#471377",
  "#6019A6",
  "#6D1DBD", 
  "#7A21D4",
  "#8725EB",
  "#9338F1",
  "#9D4EF3",
  "#A764F6",
  "#B27AF8",
  "#BD90FA",
  "#C7A6FC",
  "#D2BCFE",
  "#C7A6FC",
  "#D2BCFE"
];



//8
public pinkColorPalette: string[] = [
  "#CC149B",
  "#EA2BB7", // Dark pink
  "#ED3EBE",
  "#F050C5",
  "#F262CC",
  "#F474D3",
  "#F686DA",
  "#F898E1"
];

public greenColorPalette:string[]=
[
  "#6EA133",

  "#92C755",

  "#AEE371",


]

 // Divergent color scale from yellow to orange
 public getYellowOrangeColor(t: number): string {
  return d3.interpolateLab("#FFDA75", "#FF9751")(t);
}





// Function to get color based on country and region
public getCountryColor(countryName: string | undefined, opacity: number = 1): string {
  // Explicitly handle the case where the region or country is \N
  if (countryName === "\\N") {
      let capuccinoColor = d3.color(this.capuccinoColorPalette[0]);
      if (capuccinoColor) {
          capuccinoColor.opacity = opacity;
          return capuccinoColor.toString();
      }
      return d3.interpolateGreys(0.5); // Fallback
  }

  // If countryName is undefined, return a default color
  if (countryName === undefined) {
      return d3.interpolateGreys(0.5); // Default color for undefined countries
  }

  // Iterate through the regions and find the matching country
  for (const [region, countries] of Object.entries(this.europeanRegions)) {
      const index = countries.indexOf(countryName);
      if (index !== -1) {
          const colorScale = this.getRegionColorScale(region);
          const t = index / (countries.length - 1); // Calculate interpolation factor
          let color = d3.color(colorScale(t));
          if (color) {
              color.opacity = opacity;
              return color.toString();
          }
      }
  }

  // Fallback color if no match is found
  let defaultColor = d3.color("#C3C3C3");
  if (defaultColor) {
      defaultColor.opacity = opacity;
      return defaultColor.toString();
  }
  return d3.interpolateGreys(0.5); // Fallback
}


public countryMap : { [key: string]: string } = {
  "AL": "Albania",
  "AD": "Andorra",
  "AT": "Austria",
  "BY": "Belarus",
  "BE": "Belgium",
  "BA": "Bosnia and Herzegovina",
  "BG": "Bulgaria",
  "HR": "Croatia",
  "CY": "Cyprus",
  "CZ": "Czech Republic",
  "DK": "Denmark",
  "EE": "Estonia",
  "FI": "Finland",
  "FR": "France",
  "DE": "Germany",
  "GR": "Greece",
  "HU": "Hungary",
  "IS": "Iceland",
  "IE": "Ireland",
  "IT": "Italy",
  "LV": "Latvia",
  "LI": "Liechtenstein",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "MT": "Malta",
  "MD": "Moldova",
  "MC": "Monaco",
  "ME": "Montenegro",
  "NL": "Netherlands",
  "MK": "Macedonia",
  "NO": "Norway",
  "PL": "Poland",
  "PT": "Portugal",
  "RO": "Romania",
  "RU": "Russia",
  "SM": "San Marino",
  "RS": "Republic of Serbia",
  "SK": "Slovakia",
  "SI": "Slovenia",
  "ES": "Spain",
  "SE": "Sweden",
  "CH": "Switzerland",
  "UA": "Ukraine",
  "GB": "England",
  "XK": "Kosovo",
  "AZ": "Azerbaijan",
  "GI": "Gibraltar",
  "US": "United States",
  "AU": "Australia",
  "GE": "Georgia",
  "MX": "Mexico",
  "AM": "Armenia",
  "IL": "Israel",
  "CL": "Chile",
  "AR": "Argentina",
  "CA": "Canada",
  "DO": "Dominican Republic",
  "PE": "Peru",
  "JP": "Japan",
  "TR": "Turkey",
  "BR": "Brazil",
  "ZA": "South Africa",
  "NZ": "New Zealand",
  "VE": "Venezuela",
  "GT": "Guatemala",
  "UY": "Uruguay",
  "SV": "El Salvador",
  "PY": "Paraguay",
  "IN": "India",
  "PF": "French Polynesia",
  "KZ": "Kazakhstan",
  "UZ": "Uzbekistan",
  "VN": "Vietnam",
  "NA": "Namibia",
  "JO": "Jordan",
  "IR": "Iran",
  "KH": "Cambodia",
  "JM": "Jamaica",
  "SA": "Saudi Arabia",
  "DZ": "Algeria",
  "CN": "China",
  "EG": "Egypt",
  "VI": "Virgin Islands",
  "ID": "Indonesia",
  "CU": "Cuba",
  "TN": "Tunisia",
  "MQ": "Martinique",
  "MU": "Mauritius",
  "LK": "Sri Lanka",
  "EC": "Ecuador",
  "SG": "Singapore",
  "BL": "Saint Barthélemy",
  "TH": "Thailand",
  "BO": "Bolivia"
};

public getCountrycode(fullName: string): string | undefined {
  for (const [code, name] of Object.entries(this.countryMap)) {
    if (name.toLowerCase() === fullName.toLowerCase()) {
      return code;
    }
  }
  return undefined; // Return undefined if the country name is not found
}


  
  /*
  getArtistById(id: string): Observable<any> {
    return this.http.get<any>(`${this.dataUrl}/${id}`);
  }
  */


// Old country map with unique codes
public oldCountryMap: { [key: string]: string } = {
  "UK": "United Kingdom of Great Britain and Ireland",
  "NL": "Netherlands",
  "RE": "Russian Empire",
  "CH": "Switzerland",
  "FR": "France",
  "US": "United States of America",
  "IT": "Italy",
  "AH": "Austria Hungary",
  "DE": "Germany",
  "\\N": "\\N",
  "BE": "Belgium",
  "GR": "Greece",
  "VI": "Virgin Islands",
  "SN": "Sweden–Norway",
  "UA": "Ukraine",
  "ES": "Spain",
  "DK": "Denmark",
  "NSW": "New South Wales (UK)",
  "MX": "Mexico",
  "OT": "Ottoman Empire",
  "NEI": "Netherlands Indies",
  "MC": "Monaco",
  "PT": "Portugal",
  "CA": "Canada",
  "QLD": "Queensland (UK)",
  "AR": "Argentina",
  "BR": "Kingdom of Brazil",
  "LU": "Luxembourg",
  "SE": "Sweden",
  "CL": "Chile",
  "RO": "Romania",
  "BH": "Bosnia-Herzegovina",
  "DZ": "Algeria",
  "VIC": "Victoria (UK)",
  "NO": "Norway",
  "RS": "Serbia",
  "M?ori": "M?ori",
  "Unknown": "Unknown",
  "TN": "Tunisia",
  "MA": "Morocco",
  "SA": "South Australia (UK)",
  "EC": "Ecuador",
  "PE": "Peru",
  "BO": "Bolivia",
  "CC": "Cape Colony",
  "BG": "Bulgaria",
  "FRI": "French Indochina",
  "TV": "Transvaal",
  "NA": "Namibia",
  "IJ": "Imperial Japan",
  "IN": "India",
  "AN": "Netherlands Antilles",
  "EE": "Estonia",
  "RU": "Russia",
  "WA": "Western Australia (UK)",

  "EG": "Egypt",
  "BUO": "Bunyoro",
  "HR": "Croatia",
  "AU": "Australia",
  "IE": "Ireland",
  "UY": "Uruguay",
  "SV": "El Salvador",
  "PY": "Paraguay",
  "ID": "Indonesia",
  "BRJ": "British Raj",
  "PL": "Poland",
  "KH": "Kingdom of Hawaii",
  "MT": "Malta",
  "JP": "Japan",
  "IS": "Iceland",
  "MO": "Montenegro",
  "CR": "Costa Rica",
  "IM": "Isle of Man",
  "MU": "Mauritius",
  "DO": "Dominican Republic",
  "AF": "Afghanistan",
  "GT": "Guatemala",
  "CEY": "Ceylon",
  "AG": "Antigua and Barbuda",
  "VE": "Venezuela",
  "SG": "Singapore",
  "HK": "Hong Kong",
  "RAT": "Rattanakosin Kingdom",
  "GI": "Gibraltar",
  "PF": "French Polynesia",
  "PER" : "Persia",
  "MCH":"Manchu Empire", 
  "NZ": "New Zealand",
  "JUK":"British Colony Jamaica",
  "CBE":"Belgian Colony Congo",
  "CES":"Spanish Colony Cuba",
  "MFR": "French Colony Martinique",
  "BFR":"French Colony Saint-Barthélemy"
};




/* public oldCountryMap: { [key: string]: string } = {
  "LU": "Luxembourg",
  "ES": "Spain",
  "UK": "United Kingdom of Great Britain and Ireland", // Use "UK" for United Kingdom of Great Britain and Ireland
  "IS": "Iceland",
  "BE": "Belgium",
  "PT": "Portugal",
  "NL": "Netherlands",
  "FR": "France",
  "CH": "Switzerland",
  "RO": "Romania",
  "SR": "Serbia", // Use "SR" for Serbia (to avoid conflict with modern RS - Republic of Serbia)
  "MO": "Montenegro", // Use "MO" for Montenegro
  "BH": "Bosnia-Herzegovina", // Use "BH" for Bosnia-Herzegovina
  "IT": "Italy",
  "AH": "Austria Hungary", // Use "AH" for Austria-Hungary
  "BU": "Bulgaria", // Use "BU" for Bulgaria to avoid conflict with modern BG
  "GR": "Greece",
  "MT": "Malta",
  "SN": "Sweden–Norway", // Use "SN" for Sweden–Norway union
  "DK": "Denmark", // Use "DN" for Denmark in old map
  "GE": "Germany", // No conflict with modern Germany
  "RE": "Russian Empire", // Use "RE" for Russian Empire
  "OT": "Ottoman Empire" // Use "OT" for Ottoman Empire
}; */

// Old European regions
/* public oldEuropeanRegions = {
  "North Europe": ["IS", "SN", "DK"], // Sweden-Norway, Denmark, Iceland
  "Eastern Europe": ["RO", "SR", "MO", "BH", "BU", "RE"], // Romania, Serbia, Montenegro, Bosnia-Herzegovina, Bulgaria, Russian Empire
  "Southern Europe": ["ES", "PT", "IT", "GR", "MT", "OT"], // Spain, Portugal, Italy, Greece, Malta
  "Western Europe": ["LU", "BE", "NL", "FR", "CH", "UK"], // Luxembourg, Belgium, Netherlands, France, Switzerland, United Kingdom of Great Britain and Ireland
  "Central Europe": ["AH", "GE"], // Austria-Hungary, Germany
  "Others": [],// Ottoman Empire,
  "\\N" :["\\N"]
}; */

public oldEuropeanRegions = {
  "North Europe": ["DK",  "SN" ,"UK"],
  "Eastern Europe": [ "BG","RE","RO" ],
  "Southern Europe": ["BH","GR", "IT","MO", "PT", "MT","RS","ES","OT"],
  "Western Europe": ["BE", "FR","LU",  "NL" ],
  "Central Europe": ["AH", "DE", "CH"],
  "Others": [
    'AF', 'AG', 'AN', 'AR', 'AU', 'BA', 'BFR', 'BO', 'BR', 'BRJ', 'CA', 'CBE', 'CC', 'CD', 'CEY', 'CL',
     'CR', 'CU', 'CW',  'CZ', 'DO', 'DZ', 'EC', 'EG', 'FRI', 'GI', 'GT', 'GY', 'HK', 'ID', 'IE', 'IJ', 
     'IN', 'JM', 'JP', 'JUK', 'KH', 'KH',  'LU', 'M?ori', 'MA', 'MC', 'MCH', 'ME', 'MFR', 'MU', 'MX', 
     'MY', 'NA', 'NEI', 'NL', 'NSW', 'NZ', 'NZ', 'PE', 'PER',  'PF', 'PH', 'PR', 'PY', 'QLD', 'RAT', 
     'SA', 'SE', 'SG', 'SV', 'SY', 'TH', 'TN', 'TR', 'TV', 'US', 'UY', 'VE', 'VI',  'VIC', 'VN', 'WA', 'ZA'

    ],
    "\\N": ["\\N"]

};






public getOldCountrycode(fullName: string): string | undefined {
  for (const [code, name] of Object.entries(this.oldCountryMap)) {
    if (name.toLowerCase() === fullName.toLowerCase()) {
      return code;
    }
  }
  return undefined; // Return undefined if the country name is not found
}

public getOldCountryColor(countryName: string | undefined, opacity: number = 1): string {
  // Explicitly handle the case where the region or country is \N
  if (countryName === "\\N") {
      let capuccinoColor = d3.color(this.capuccinoColorPalette[0]);
      if (capuccinoColor) {
          capuccinoColor.opacity = opacity;
          return capuccinoColor.toString();
      }
      return d3.interpolateGreys(0.5); // Fallback
  }

  // If countryName is undefined, return a default color
  if (countryName === undefined) {
      return d3.interpolateGreys(0.5); // Default color for undefined countries
  }

  // Iterate through the regions and find the matching country
  for (const [region, countries] of Object.entries(this.oldEuropeanRegions)) {
      const countryArray = countries as string[];  // Cast countries to string[]
      const index = countryArray.indexOf(countryName);
      if (index !== -1) {
          const colorScale = this.getOldRegionColorScale(region);
          const t = index / (countryArray.length - 1); // Calculate interpolation factor
          let color = d3.color(colorScale(t));
          if (color) {
              color.opacity = opacity;
              return color.toString();
          }
      }
  }

  // Fallback color if no match is found
  let defaultColor = d3.color("#C3C3C3");
  if (defaultColor) {
      defaultColor.opacity = opacity;
      return defaultColor.toString();
  }
  return d3.interpolateGreys(0.5); // Fallback
}


//3
public cyanOldColorPalette: string[] = [


 // "#28918b",
  "#41a9a3",
  "#59c2bb",
  "#70dcd4",
];


//3
public blueOldColorPalette: string[] = [


  "#1575c2",
  "#75caf1",
  "#9ce6ff"


];



//9
public purpleOldColorPalette: string[] = [


 "#471377",
  "#7A21D4",
  "#8725EB",
  "#9338F1",
  "#9D4EF3",
  "#A764F6",
  "#B27AF8",
  "#BD90FA", 
  "#C7A6FC",
  "#D2BCFE",

];



//4
public pinkOldColorPalette: string[] = [

  "#EA2BB7", // Dark pink
  "#F050C5",
  "#F474D3",
  "#FAAAE8",


];








  
  /*
  getArtistById(id: string): Observable<any> {
    return this.http.get<any>(`${this.dataUrl}/${id}`);
  }
  */



}


