import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs'
import { Artist } from '../models/artist';
import exhibited_with from '../models/exhibited_with';

@Injectable({
  providedIn: 'root'
})
export class DecisionService {
  private rankingSource = new BehaviorSubject<string>('artworks');
  private sunburstSource = new BehaviorSubject<string>('birthcountry');
  private orderSource = new BehaviorSubject<string>('');
  private sizeSource = new BehaviorSubject<string>('Amount of Exhibitions');
  private thicknessSource = new BehaviorSubject<string>('');
  private rangeSource = new BehaviorSubject<number[]>([200,2217]); // Default range
  private kSource = new BehaviorSubject<number>(7); 
  private searchedArtistId = new BehaviorSubject<string| null>(null);
  private loadingBackendRange = new BehaviorSubject<boolean>(false);
  private loadingBackendK = new BehaviorSubject<boolean>(false);
  private clusters = new BehaviorSubject<Artist[][]|null>(null);
  private interCommunityEdges = new BehaviorSubject<exhibited_with[]|null>(null);
  private rankingOrder = new BehaviorSubject<number[]>([]);

  currentRanking = this.rankingSource.asObservable();
  currentSunburst = this.sunburstSource.asObservable();
  currentOrder = this.orderSource.asObservable();
  currentSize = this.sizeSource.asObservable();
  currentThickness = this.thicknessSource.asObservable();
  currentRange = this.rangeSource.asObservable();
  currentK = this.kSource.asObservable();
  currentClusters = this.clusters.asObservable();
  currentSearchedArtistId = this.searchedArtistId.asObservable();
  currentLoadingBackendRange = this.loadingBackendRange.asObservable();
  currentLoadingBackendK = this.loadingBackendK.asObservable();
  currentInterCommunityEdges = this.interCommunityEdges.asObservable();
  currentRankingOrder = this.rankingOrder.asObservable();

  changeRankingOrder(order: number[]) {
    this.rankingOrder.next(order);
  }


  changeInterCommunityEdges(edges: exhibited_with[] | null) {
    this.interCommunityEdges.next(edges);
  }
  changeClusters(clusters: Artist[][] | null) {
    this.clusters.next(clusters);
  }
  changeLoadingBackendRange(loading: boolean) {
    this.loadingBackendRange.next(loading);
  }
  changeLoadingBackendK(loading: boolean) {
    this.loadingBackendK.next(loading);
  }

  changeDecisionRanking(ranking: string) {
    this.rankingSource.next(ranking);
  }
  changeDecisionSunburst(sunburst: string) {
    this.sunburstSource.next(sunburst);
  }
  changeDecisionOrder(order: string) {
    this.orderSource.next(order);
  }
  changeSearchedArtistId(id: string | null) {
    this.searchedArtistId.next(id);
  }

  changeDecisionSize(size: string) {
    this.sizeSource.next(size);
  }

  changeDecisionThickness(thickness: string) {
    this.thicknessSource.next(thickness);
  }

 
  changeDecisionRange(range: number[]) {
    this.rangeSource.next(range);
  }
  changeK(k: number) {
    this.kSource.next(k);
  }
  getInterCommunityEdges():exhibited_with[]|null{
    return this.interCommunityEdges.getValue();
  }

  getDecisionSunburst(): string {
    return this.sunburstSource.getValue();
  }
  getDecisionOrder(): string {
    return this.orderSource.getValue();
  }
  getDecisionSize(): string {
    return this.sizeSource.getValue();
  }
  getDecisionThickness(): string {
    return this.thicknessSource.getValue();
  }
  getDecisionRange(): number[] {
    return this.rangeSource.getValue();
  }
  getK(): number {
    return this.kSource.getValue();
  }

  getDecisionRanking(): string {
    return this.rankingSource.getValue();
  }

  getRankingOrder(): number[] {
    return this.rankingOrder.getValue();
  }

  
}
