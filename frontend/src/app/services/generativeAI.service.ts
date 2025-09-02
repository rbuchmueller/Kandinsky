import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GenerativeAIService {

  private dataUrl = 'http://localhost:3000';  // Ensure this is the correct URL for your backend

  constructor(private http: HttpClient) { }

  // Method to generate AI response by sending a POST request with the prompt
  generateAIResponse(prompt: string): Observable<any> {
    const body = { prompt };  // Create a JSON object with the prompt
    return this.http.post<any>(this.dataUrl + '/ai/', body).pipe(shareReplay());
  }
}
