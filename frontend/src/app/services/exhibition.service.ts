import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Exhibition } from '../models/exhibition';
@Injectable({
  providedIn: 'root'
})

export class ExhibitionService {
  private dataUrl = 'http://localhost:3000'




  constructor(private http: HttpClient) { }


  getAllExhibitions(): Observable<any[]> {
    return this.http.get<any[]>(this.dataUrl + '/exhibition/').pipe(shareReplay());
  }
}
