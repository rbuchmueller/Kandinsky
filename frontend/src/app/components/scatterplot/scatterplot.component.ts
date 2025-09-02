import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { SelectionService } from '../../services/selection.service';
import { DecisionService } from '../../services/decision.service';
import { Artist } from '../../models/artist';


@Component({
  selector: 'app-scatterplot',
  templateUrl: './scatterplot.component.html',
  styleUrls: ['./scatterplot.component.css']
})




export class ScatterplotComponent implements OnInit, OnDestroy {
  @ViewChild('scatterplot', { static: true }) private scatterplotContainer!: ElementRef;
  public isLoading: boolean = true;

  private svg: any;
  private contentWidth: number = 0;
  private contentHeight: number = 0;
  private margin = {
    top: 1.5,
    right: 1.5,
    bottom: 1.5,
    left: 3
  };
  
  private g: any; // Group for zooming
  private clusters: Artist[][] = []; // Changed to Artist[][]
  private subscriptions: Subscription = new Subscription();

  constructor(
    private decisionService: DecisionService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.decisionService.currentClusters.subscribe(clusters => {
        if (clusters) {
          this.clusters = clusters;
          this.updateChart();
        } else {
          this.isLoading = true;
        }
      })
    );
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.scatterplotContainer) return;
    this.visualizeData();
  }

  private visualizeData(): void {
    this.isLoading = true;
    this.createSvg();
    this.createScatterPlot();
    this.isLoading = false;
  }

  private createSvg(): void {
    // Remove any existing SVG elements
    d3.select(this.scatterplotContainer.nativeElement).select('.scatterplot-svg-container svg').remove();
    const element = this.scatterplotContainer.nativeElement.querySelector('.scatterplot-svg-container');

    
    let margin;
    margin = {
      top: this.margin.top * window.innerHeight / 100,
      right: this.margin.right * window.innerWidth / 100,
      bottom: this.margin.bottom * window.innerWidth / 100,
      left: this.margin.left * window.innerWidth / 100
    };
 
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;
    
    this.svg = d3.select(element).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${element.offsetWidth} ${element.offsetHeight}`);
    
    this.g = this.svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    this.contentWidth = width;
    this.contentHeight = height;
    this.contentWidth = width;
    this.contentHeight = height;

    // Add zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });
    
    this.svg.call(zoom);
  }

  private createScatterPlot(): void {
    // Compute the cluster data (meanBirthDate, totalExhibitedArtworks)
    const clusterData = this.clusters.map((cluster, index) => this.calculateClusterMetrics(cluster, index));

    // Create scales based on data
    const { xScale, yScale } = this.createScatterPlotScales(clusterData);

    // Add Axes
    this.createXAxis(xScale);
    this.createYAxis(yScale);

    // Create the scatterplot points
    this.drawScatterPlotPoints(clusterData, xScale, yScale);
  }

  private createScatterPlotScales(clusterData: { meanBirthDate: Date, totalExhibitedArtworks: number }[]) {
    const birthDates = clusterData.map(d => d.meanBirthDate);
    const exhibitedArtworks = clusterData.map(d => d.totalExhibitedArtworks);

    const xScale = d3.scaleTime()
      .domain(d3.extent(birthDates) as [Date, Date])
      .range([0, this.contentWidth])
      .nice()

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(exhibitedArtworks) as number])
      .range([this.contentHeight, 0])
      .nice()

    return { xScale, yScale };
  }

  private createXAxis(xScale: d3.ScaleTime<number, number>): void {
    const xAxis = d3.axisBottom(xScale);

    this.g.append('g')
      .attr('transform', `translate(0, ${this.contentHeight})`)
      .call(xAxis);
  }

  private createYAxis(yScale: d3.ScaleLinear<number, number>): void {
    const yAxis = d3.axisLeft(yScale);

    this.g.append('g')
      .call(yAxis);
  }

  private drawScatterPlotPoints(clusterData: { meanBirthDate: Date, totalExhibitedArtworks: number, identifier: number }[], xScale: d3.ScaleTime<number, number>, yScale: d3.ScaleLinear<number, number>): void {
    this.g.selectAll('.point')
      .data(clusterData)
      .enter().append('circle')
      .attr('class', 'point')
      .attr('cx', (d: any) => xScale(d.meanBirthDate))
      .attr('cy', (d: any) => yScale(d.totalExhibitedArtworks))
      .attr('r', 5)
      .attr('fill', 'grey')
      .attr('data-identifier', (d: any) => d.identifier) // Add the identifier as a data attribute

      .on('click', (event: any, d: any) => console.log('Cluster clicked:', d, d.identifier));
  }

  // Place the calculateClusterMetrics function here:
  private calculateClusterMetrics(artists: Artist[], identifier: number): { meanBirthDate: Date, totalExhibitedArtworks: number, identifier: number } {
    let totalExhibitedArtworks = 0;
    let weightedSumBirthDate = 0;
    let totalWeight = 0;

    artists.forEach(artist => {
      const birthDate = new Date(artist.birthyear, 0, 1).getTime(); // Convert birthyear to Date object for January 1st of that year

      // Sum total exhibited artworks
      totalExhibitedArtworks += artist.total_exhibited_artworks;

      // Calculate weighted sum of birth dates based on total exhibited artworks as weight
      weightedSumBirthDate += birthDate * artist.total_exhibited_artworks;

      // Total weight is the sum of all artworks exhibited
      totalWeight += artist.total_exhibited_artworks;
    });

    // If total weight is zero, default to a date (e.g., 1910)
    const meanBirthDateTimestamp = totalWeight ? weightedSumBirthDate / totalWeight : new Date(1910, 0, 1).getTime();

    // Convert back to Date object
    const meanBirthDate = new Date(meanBirthDateTimestamp);
    identifier = identifier+1;

  return { meanBirthDate, totalExhibitedArtworks, identifier};
  
  }

  private normalizeDynamically(values: Map<number, number>): Map<number, number> {
    const maxValue = Math.max(...Array.from(values.values()));
    const minValue = Math.min(...Array.from(values.values()));

    if (maxValue - minValue === 0) {
      // Avoid division by zero
      return new Map(values);
    }

    // Define thresholds or criteria for choosing normalization method
    if (maxValue > 1000) {
      return this.normalizeLogarithmically(values);
    } else if (maxValue / minValue > 10) {
      return this.normalizeSqrt(values);
    } else {
      return this.normalizeLinear(values);
    }
  }

  private normalizeLinear(values: Map<number, number>): Map<number, number> {
    const maxValue = Math.max(...values.values());
    const minValue = Math.min(...values.values());
    const range = maxValue - minValue;
    const normalized = new Map<number, number>();
    values.forEach((value, id) => {
      normalized.set(id, (value - minValue) / range);
    });
    return normalized;
  }

  private normalizeLogarithmically(values: Map<number, number>): Map<number, number> {
    const logMaxValue = Math.log1p(Math.max(...values.values()));
    const logMinValue = Math.log1p(Math.min(...values.values()));
    const range = logMaxValue - logMinValue;
    const normalized = new Map<number, number>();
    values.forEach((value, id) => {
      normalized.set(id, (Math.log1p(value) - logMinValue) / range);
    });
    return normalized;
  }

  private normalizeSqrt(values: Map<number, number>): Map<number, number> {
    const sqrtMaxValue = Math.sqrt(Math.max(...values.values()));
    const sqrtMinValue = Math.sqrt(Math.min(...values.values()));
    const range = sqrtMaxValue - sqrtMinValue;
    const normalized = new Map<number, number>();
    values.forEach((value, id) => {
      normalized.set(id, (Math.sqrt(value) - sqrtMinValue) / range);
    });
    return normalized;
  }
}
