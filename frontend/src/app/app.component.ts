import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { DecisionService } from './services/decision.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'artvis';

  private subscriptions: Subscription = new Subscription();
  public value1: string ='birthcountry';
  public value2: string = 'deathcountry'
  public value3: string = 'mostexhibited'

  private allValues: string[] = ['nationality', 'birthcountry', 'deathcountry', 'mostexhibited'];

  constructor(private decisionService: DecisionService) {}

  ngOnInit(): void {
    this.subscriptions.add(this.decisionService.currentSunburst.subscribe(currentValue => {
      const otherValues = this.allValues.filter(value => value !== currentValue);
      [this.value1, this.value2, this.value3] = otherValues;
    }));
    
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
//https://observablehq.com/@d3/color-schemes