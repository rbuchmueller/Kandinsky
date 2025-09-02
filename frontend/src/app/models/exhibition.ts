import * as d3 from 'd3';

interface ExhibitionData {
  id: number;
  start_date: string;
  end_date: string;
  name: string;
  took_place_in_country: string;
  type: string;
  duration: number;
  exhibited_artists:number;
  europeanRegion: string;
  city: string;
  took_place_in_old_country: string;
  oldEuropeanRegion:string;

  }


  class Exhibition{
   
    id:number;
    start_date:Date;
    end_date: Date;
    name: string;
    took_place_in_country: string;
    type: string;
    duration: number;
    exhibited_artists:number;
    europeanRegion:string;
    city: string;
    took_place_in_old_country: string;
    oldEuropeanRegion:string;
    constructor(data: ExhibitionData) {
      this.id = data.id;
      this.start_date = new Date(data.start_date);
      this.end_date = new Date(data.end_date);
      this.name = data.name;
      this.took_place_in_country = data.took_place_in_country;
      this.type = data.type;
      this.duration = data.duration;
      this.exhibited_artists = data.exhibited_artists;
      this.europeanRegion = data.europeanRegion;
      this.city = data.city;
      this.took_place_in_old_country =data.took_place_in_old_country;
      this.oldEuropeanRegion= data.oldEuropeanRegion;
    }

  
   
  
}
  

  
  export { Exhibition, ExhibitionData};