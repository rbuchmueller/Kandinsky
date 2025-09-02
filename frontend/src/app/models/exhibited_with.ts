class exhibited_with {
    startId: number;
    endId: number;
    sharedExhibitions: number;
    sharedExhibitionMinArtworks: number;
  
    constructor(startId:number, endId:number, sharedExhibitions:number, sharedExhibitionMinArtworks
      :number) {
      this.startId = startId;
      this.endId =endId;
      this.sharedExhibitions = sharedExhibitions;
      this.sharedExhibitionMinArtworks = sharedExhibitionMinArtworks;
      ;
    }
  }
  
  export default exhibited_with;