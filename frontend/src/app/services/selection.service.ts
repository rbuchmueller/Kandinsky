// selection.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, count } from 'rxjs';
import { Artist } from '../models/artist'; // Import the appropriate model
import exhibited_with from '../models/exhibited_with';
import { Exhibition } from '../models/exhibition';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  constructor() {}

  private allArtists = new BehaviorSubject<Artist[]|null>(null);
  private selectedArtists  = new BehaviorSubject<Artist[]|null>(null);
  private selectedCluster = new BehaviorSubject<Artist[]>([]);
  private selectedCountries = new BehaviorSubject<string[]>([]);
  private selectedNode = new BehaviorSubject<Artist|null>(null);
  private selectedClusterEdges = new BehaviorSubject<exhibited_with[]>([]);
  private selectedFocusArtist = new BehaviorSubject<Artist|null>(null);
  private selectedExhibitions = new BehaviorSubject<Exhibition[][]|null>(null);
  private dateRangeSource = new BehaviorSubject<{ startYear: number | null, startMonth: string | null, endYear: number | null, endMonth: string | null } | null>(null);
  private allClusters = new BehaviorSubject<Artist[][]|null>(null);
  private focusedCluster = new BehaviorSubject<Artist[]|null>(null);
  private selectModern = new BehaviorSubject<boolean>(true);
  private selectedOldCountries = new BehaviorSubject<string[]>([]);
  private hoveredCountry = new BehaviorSubject<string|null>(null);
  private hoveredOldCountry = new BehaviorSubject<string|null>(null);
  private hoveredArtist = new BehaviorSubject<number|null>(null);

  currentArtists = this.selectedArtists.asObservable();
  currentCluster = this.selectedCluster.asObservable();
  currentAllArtists = this.allArtists.asObservable();
  currentAllClusters = this.allClusters.asObservable();
  currentFocusArtist = this.selectedFocusArtist.asObservable();
  currentCountries = this.selectedCountries.asObservable();
  currentNode = this.selectedNode.asObservable();
  currentClusterEdges= this.selectedClusterEdges.asObservable();
  currentExhibitions = this.selectedExhibitions.asObservable(); //first array selected, second array not selected
  currentSelectedDateRange = this.dateRangeSource.asObservable();
  currentFocusedCluster = this.focusedCluster.asObservable();
  currentSelectModern = this.selectModern.asObservable();
currentOldCountries = this.selectedOldCountries.asObservable();
currentHoveredCountry = this.hoveredCountry.asObservable();
currentHoveredOldCountry = this.hoveredOldCountry.asObservable();
currentHoveredArtist = this.hoveredArtist.asObservable();


hoverOnCountry(country:string|null){
  this.hoveredCountry.next(country);
}
hoverOnArtist(artistId:number|null){
  this.hoveredArtist.next(artistId);
}
hoverOnOldCountry(country:string|null){
  this.hoveredOldCountry.next(country);
}
switchSelectModern(modern:boolean){
  this.selectModern.next(modern);
}
  selectFocusedCluster(cluster:Artist[]|null){
    //console.log('focused', cluster)
    this.focusedCluster.next(cluster);
  }
  selectDateRange(startYear: number | null, startMonth: string | null, endYear: number | null, endMonth: string | null): void {
    this.dateRangeSource.next({ startYear, startMonth, endYear, endMonth });
  }
  selectExhibitions(exhibitions:Exhibition[][]|null){
    //console.log(exhibitions)
    this.selectedExhibitions.next(exhibitions);
  }
  selectArtists(artists:Artist[]|null) {
    //console.log('selected artists', artists?.length)
    this.selectedArtists.next(artists);
  }
  selectAllClusters(clusters:Artist[][]|null){
    this.allClusters.next(clusters);
  }

  selectAllArtists(artists:Artist[]|null){
    this.allArtists.next(artists);
  }

  selectFocusArtist(artist:Artist|null){
    this.selectedFocusArtist.next(artist);
  }
 

  selectCluster(cluster:Artist[]){
    //console.log('selected cluster', cluster.length)
    this.selectedCluster.next(cluster);
  }


  selectCountries(countries:string[]){
    this.selectedCountries.next(countries);
  }
  selectOldCountries(countries: string[]) {
    this.selectedOldCountries.next(countries);
  }
  

  selectNode(node:Artist|null){
    this.selectedNode.next(node);
  }
  selectClusterEdges(edges:exhibited_with[]){
    //console.log('selected cluster edges', edges.length)
    this.selectedClusterEdges.next(edges);
  }

  getOldCountries(){
    return this.selectedOldCountries.value;
  }

  getSelectModern(){
    return this.selectModern.value;
  }
  getFocusedCluster(){
    return this.focusedCluster.value;
  }

  getFocusArtist(){
    return this.selectedFocusArtist.value;
  }

  getClusterEdges(){
    return this.selectedClusterEdges.value;
  }

getHoveredCountry(){

  return this.hoveredCountry.value;

}
getHoveredOldCountry(){
  return this.hoveredOldCountry.value;
}



getSelectedCountries(){
  return this.selectedCountries.value;
}
  getNode(){
    return this.selectedNode.value;
  }
 getSelectedDateRange(){
   return this.dateRangeSource.value;
 }
  getCurrentArtists(){
    return this.selectedArtists.value;
  }
}
