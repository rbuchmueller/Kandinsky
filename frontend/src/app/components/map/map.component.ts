import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { SelectionService } from '../../services/selection.service';
import { ArtistService } from '../../services/artist.service';
import { DecisionService } from '../../services/decision.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  private svg: any;
  private g: any;
  private width: number = 0;
  private height: number = 0;
  private subscription: Subscription = new Subscription();
  private countryBorders: any;

  private modernEuropeanCountries: string[] = [
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
    "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland",
    "Ireland", "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco",
    "Montenegro", "Netherlands", "Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia",
    "San Marino", "Republic of Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine", "England", "Kosovo"
  ];

  private oldEuropeanCountries: string[] = [
    'Luxembourg', 'Spain', 'United Kingdom of Great Britain and Ireland', 'Iceland', 'Belgium', 'Portugal',
    'Netherlands', 'France', 'Switzerland', 'Romania', 'Serbia', 'Montenegro', 'Bosnia-Herzegovina', 'Italy',
    'Austria Hungary', 'Bulgaria', 'Greece', 'Malta', 'Sweden–Norway', 'Denmark', 'Germany', 'Russian Empire', 'Ottoman Empire'
  ];

  private countryMap: { [key: string]: string } = this.artistService.countryMap;

  private oldCountryMap: { [key: string]: string } = this.artistService.oldCountryMap;
  
  public isModernMap: boolean = true; // Flag to toggle between modern and old maps
  public isNationalityMode: boolean = false; // Flag to indicate if the sunburst is set to nationality


  @ViewChild('mapContainer', { static: true }) private mapContainer!: ElementRef;

  constructor(private http: HttpClient,
     private selectionService: SelectionService, 
    private artistService: ArtistService,
  private decisionService:DecisionService) {
    this.handleCountryClick = this.handleCountryClick.bind(this);
  }

  ngOnInit(): void {
    this.setWidthHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(200))
      .subscribe(() => this.onResize());

    this.selectionService.currentCountries.subscribe(selectedCountries => {
    
      this.updateCountryColors(selectedCountries);
    });
    this.selectionService.currentOldCountries.subscribe(selectedCountries => {
      if(!this.isModernMap && selectedCountries.length>0)
      this.updateOldCountryColors(selectedCountries);
    });
    this.decisionService.currentSunburst.subscribe(value => {
      this.isNationalityMode = value === 'nationality';
      
      // Automatically switch to modern map if nationality is selected while old map is active
      if (value === 'nationality') {
        if (!this.isModernMap) {
          this.isModernMap = true; // Switch to modern map
          this.selectionService.switchSelectModern(true); // Update the selection service

          // Redraw the map to reflect the change
          this.svg.selectAll('*').remove(); // Clear the current map
          this.createSvg(); // Recreate the SVG
          this.drawMap(); // Redraw the map
          this.createLegend();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.createSvg();
    this.drawMap();
    this.createLegend();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setWidthHeight(): void {
    const element = this.mapContainer.nativeElement;
    this.width = element.offsetWidth;
    this.height = element.offsetHeight;
  }

  private createSvg(): void {
    this.setWidthHeight();
    const element = this.mapContainer.nativeElement;

    this.svg = d3.select(element)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 960 600`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .classed('svg-content-responsive', true);

    this.g = this.svg.append('g');

    this.svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0, 10])
      .on('zoom', (event) => this.g.attr('transform', event.transform)));
  }

  private drawMap(): void {
    const geoJsonUrl = this.isModernMap 
      ? 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson' 
      : 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1900.geojson';
  
    const countriesList = this.isModernMap ? this.modernEuropeanCountries : this.oldEuropeanCountries;
  
    this.subscription.add(
      this.http.get(geoJsonUrl).subscribe((data: any) => {
        const filteredData = {
          ...data,
          features: data.features.filter((feature: any) =>
            countriesList.includes(feature.properties.name || feature.properties.NAME)
          )
        };
  
        const projection = d3.geoMercator()
        .center([20, 36])
        .scale(880)
        .translate([this.width / 2 +390, this.height /2 +570]);
  
        const path = d3.geoPath().projection(projection);
        this.countryBorders = this.g.selectAll('path')
          .data(filteredData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', (d: any) => {
          //   console.log('try', d.properties.NAME)
             if(!this.isModernMap){
                //console.log('old', this.artistService.getOldCountrycode(d.properties.NAME))
                //console.log('old', this.artistService.getOldCountryColor(this.artistService.getOldCountrycode(d.properties.NAME), 1))
              }
           return  this.isModernMap ? this.artistService.getCountryColor(this.artistService.getCountrycode(d.properties.name), 1):
          this.artistService.getOldCountryColor(this.artistService.getOldCountrycode(d.properties.NAME), 1)})

          .attr('stroke', 'black')
          .on('click', (event: MouseEvent, d: any) => this.handleCountryClick(d.properties.name, event))
          .on('mouseover', (event: MouseEvent, d: any) => {
            
            const [x, y] = d3.pointer(event, window.document.body);

            if(this.isModernMap){
              d3.select('#tooltip')
              .style('display', 'block')
              .style('left', `${x + 10}px`)
              .style('top', `${y + 10}px`)
              .html(`${d.properties.name} (${this.getKeyByValue(d.properties.name)})`);
            }else{
              d3.select('#tooltip')
              .style('display', 'block')
              .style('left', `${x + 10}px`)
              .style('top', `${y + 10}px`)
              .html(`${d.properties.NAME} (${this.getOldKeyByValue(d.properties.NAME)})`);
            }
     
            if(this.isModernMap){
              const country = this.getKeyByValue(d.properties.name);
              this.selectionService.hoverOnCountry(country||null);
            }else{
              const country = this.getOldKeyByValue(d.properties.NAME);
              this.selectionService.hoverOnOldCountry(country||null)
            }
          })
          .on('mouseout', () => {
            d3.select('#tooltip').style('display', 'none');

            if(this.isModernMap){
              this.selectionService.hoverOnCountry(null);
            }else{
              this.selectionService.hoverOnOldCountry(null)
            }
          });
  
        // Ensure selected countries are updated after the map is fully rendered
        if(this.isModernMap){
          const selectedCountries = this.selectionService.getSelectedCountries();
        this.updateCountryColors(selectedCountries);
        }
        else{
          const selectedOldCountries = this.selectionService.getOldCountries();
          //console.log('selectedOldCountries', selectedOldCountries)
          this.updateOldCountryColors(selectedOldCountries);
        
        }
      })
    );
  
  }
  

  private handleCountryClick(country: string, event: MouseEvent): void {
    const countryOnMap = event.currentTarget as SVGPathElement;
    // Handle country click event logic
  }

  private getKeyByValue(value: string): string | undefined {
    return Object.keys(this.countryMap).find(key => this.countryMap[key] === value);
  }


  private getOldKeyByValue(value: string): string | undefined {
    return Object.keys(this.oldCountryMap).find(key => this.oldCountryMap[key] === value);
  }
 

  private updateCountryColors(selectedCountries: string[]): void {
    if (!this.countryBorders) return;

    this.countryBorders
        .attr('fill', (d: any) => {
            const countryCode = Object.keys(this.countryMap).find(key => this.countryMap[key] === d.properties.name);
            const base = this.artistService.getCountryColor(countryCode, 1);
            const unselected = 'white';
            return (countryCode && selectedCountries.includes(countryCode)) ? base : unselected;
        })
        .style('pointer-events', (d: any) => {
            const countryCode = Object.keys(this.countryMap).find(key => this.countryMap[key] === d.properties.name);
            return (countryCode && selectedCountries.includes(countryCode)) ? 'auto' : 'none';
        });
}

  private updateOldCountryColors(selectedCountries: string[]): void {
    if (!this.countryBorders) return;

    this.countryBorders
        .attr('fill', (d: any) => {
            const countryCode = Object.keys(this.oldCountryMap).find(key => this.oldCountryMap[key] === d.properties.NAME);
            const base = this.artistService.getOldCountryColor(countryCode, 1);
            const unselected = 'white';
            return (countryCode && selectedCountries.includes(countryCode)) ? base : unselected;
        })
        .style('pointer-events', (d: any) => {
            const countryCode = Object.keys(this.oldCountryMap).find(key => this.oldCountryMap[key] === d.properties.NAME);
            return (countryCode && selectedCountries.includes(countryCode)) ? 'auto' : 'none';
        });
}


  private createLegend(): void {
    // Define legend data based on the map type
    const legendData = this.isModernMap
        ? [
            { region: "North Europe", colorScale: this.artistService.getRegionColorScale("North Europe") },
            { region: "Eastern Europe", colorScale: this.artistService.getRegionColorScale("Eastern Europe") },
            { region: "Southern Europe", colorScale: this.artistService.getRegionColorScale("Southern Europe") },
            { region: "Western Europe", colorScale: this.artistService.getRegionColorScale("Western Europe") }
        ]
        : [
            { region: "North Europe", colorScale: this.artistService.getOldRegionColorScale("North Europe") },
            { region: "Eastern Europe", colorScale: this.artistService.getOldRegionColorScale("Eastern Europe") },
            { region: "Southern Europe", colorScale: this.artistService.getOldRegionColorScale("Southern Europe") },
            { region: "Western Europe", colorScale: this.artistService.getOldRegionColorScale("Western Europe") },
            { region: "Central Europe", colorScale: this.artistService.getOldRegionColorScale("Central Europe") } // Added Central Europe
        ];

    const legendWidth = 350;
    const legendHeight = legendData.length * 40 + 10;
    const margin = 20;

    const svgWidth = this.svg.attr('width');
    const svgHeight = this.svg.attr('height');

    const legendX = svgWidth - legendWidth - margin;
    const legendY = svgHeight - legendHeight - margin;

    const legend = this.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('fill', '#fff')
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('rx', 10)
        .attr('ry', 10);

    const legendItems = legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d: any, i: number) => `translate(10, ${i * 40 + 10})`);

    const defs = this.svg.append('defs');
    legendData.forEach(d => {
        const gradientId = `gradient-${d.region.replace(/\s+/g, '-')}`;
        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        for (let j = 0; j <= 10; j++) {
            gradient.append('stop')
                .attr('offset', `${j * 10}%`)
                .attr('stop-color', d.colorScale(j / 10));
        }
    });

    legendItems.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 100)
        .attr('height', 30)
        .attr('fill', (d: any) => `url(#gradient-${d.region.replace(/\s+/g, '-')})`);

    const textElements = legendItems.append('text')
        .attr('x', 110)
        .attr('y', 15)
        .attr('dy', '.35em')
        .text((d: any) => d.region)
        .style('fill', '#2a0052')
        .style('font-family', 'Roboto, sans-serif')
        .style('font-weight', 'bold');

    const longestText = legendData.reduce((max, d) => d.region.length > max.length ? d.region : max, "");
    const textElement = this.svg.append('text')
        .attr('x', -9999)
        .attr('y', -9999)
        .text(longestText)
        .style('fill', '#2a0052')
        .style('font-family', 'Roboto, sans-serif')
        .style('font-weight', 'bold');

    const availableWidth = legendWidth - 150;
    let newFontSize = 30;
    const minFontSize = 8;
    textElement.style('font-size', `${newFontSize}px`);
    let textLength = textElement.node()!.getComputedTextLength();

    while (textLength > availableWidth && newFontSize > minFontSize) {
        newFontSize -= 1;
        textElement.style('font-size', `${newFontSize}px`);
        textLength = textElement.node()!.getComputedTextLength();
    }

    textElement.remove();
    textElements.style('font-size', `${newFontSize}px`);
}


  public toggleMap(event: Event): void {
    if (this.isNationalityMode) return; // Prevent toggling if nationality mode is active

    const input = event.target as HTMLInputElement;
    this.isModernMap = !this.isModernMap;  // Update the flag based on checkbox state
    this.selectionService.switchSelectModern(this.isModernMap);
  
    this.svg.selectAll('*').remove(); // Clear the current map
    this.createSvg(); // Recreate the SVG
    this.drawMap(); // Redraw the map
    this.createLegend();
  }
 
  public showToggleTooltip(event: MouseEvent): void {
    if (!this.isNationalityMode) return; // Show tooltip only if the button is disabled
    
    const [x, y] = d3.pointer(event, window.document.body);
  
    // Show the tooltip with the message
    d3.select('#tooltip')
      .style('display', 'block')
      .style('left', `${x + 10}px`)
      .style('top', `${y + 10}px`)
      .html('Map of 1900 not available for nationality');
  }
  
  public hideTooltip(): void {
    d3.select('#tooltip').style('display', 'none');
  }
  
  @HostListener('window:resize')
  onResize(): void {
    this.setWidthHeight();
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);
  }
}
