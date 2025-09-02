import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';  // Import HttpClientModule

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DecisionsComponent } from './components/decisions/decisions.component';
import { ArtistService } from './services/artist.service';
import { BarchartComponent } from './components/barchart/barchart.component';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { MapComponent } from './components/map/map.component';
import { SmallMultiplesComponent } from './components/smallMultiples/smallMultiples.component';
import { ExhibitionBarchartComponent } from './components/exhibitionBarchart/exhibitionBarchart.component';
import { GanttChartComponent } from './components/ganttChart/ganttChart.component';
import { ArtistGanttChartComponent } from './components/artistGanttChart/artistGanttChart.component';
import { ScatterplotComponent } from './components/scatterplot/scatterplot.component';
import { NetworkComponent } from './components/network/network.component';
import { ClusterVisualizationComponent } from './components/clusterVisualization/clusterVisualization.component';
import { NotificationComponent } from './components/notification/notification.component';
@NgModule({
  declarations: [
    AppComponent,
    DecisionsComponent,
    BarchartComponent,
    MapComponent,
    SmallMultiplesComponent,
    ExhibitionBarchartComponent,
    GanttChartComponent,
    ArtistGanttChartComponent,
    ScatterplotComponent,
    NetworkComponent,
    ClusterVisualizationComponent,
    NotificationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgxSliderModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
