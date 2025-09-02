import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { SelectionService } from '../../services/selection.service';
import { DecisionService } from '../../services/decision.service';
import { Artist,  ClusterNode } from '../../models/artist';
import exhibited_with from '../../models/exhibited_with';

interface InterCommunityEdge extends d3.SimulationLinkDatum<ClusterNode> {
  source: number | ClusterNode;
  target: number | ClusterNode;
  sharedExhibitionMinArtworks: number;
}

@Component({
  selector: 'app-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.css']
})


export class NetworkComponent implements OnInit, OnDestroy {
  @ViewChild('network', { static: true }) private networkContainer!: ElementRef;
  public isLoading: boolean = true;

  private svg: any;
  private contentWidth: number = 0;
  private interCommunityEdges: exhibited_with[] = [];
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
          const interCommunityEdges = this.decisionService.getInterCommunityEdges();
          if(interCommunityEdges){
            this.interCommunityEdges = interCommunityEdges;
            this.visualizeData();
          }
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
    if (!this.networkContainer) return;
    this.visualizeData();
  }

  private visualizeData(): void {
    this.isLoading = true;
    this.createSvg();
    this.visualizeClusterNetwork();
    this.isLoading = false;
  }

  private visualizeClusterNetwork(): void {
// Create simple node representation instead of ClusterNode
const nodes = this.clusters.map((cluster, index) => ({
  id: index,
  size: cluster.length, // Size can still represent the number of artists in the cluster
  x: Math.random() * this.contentWidth, // Initial x position
  y: Math.random() * this.contentHeight // Initial y position
}));

// Convert exhibited_with edges into simple links
const links = this.interCommunityEdges.map(edge => ({
  source: edge.startId,
  target: edge.endId,
  sharedExhibitionMinArtworks: edge.sharedExhibitionMinArtworks,
}));



// Add links (edges)
const link = this.g.selectAll('line')
  .data(links)
  .enter()
  .append('line')
  .attr('stroke-width', (d:any) => Math.sqrt(d.sharedExhibitionMinArtworks)/5) // Edge thickness based on shared exhibitions
  .attr('stroke', 'lightgray')

// Add nodes (circles) with basic node structure
const node = this.g.selectAll('circle')
  .data(nodes)
  .enter()
  .append('circle')
  .attr('r', (d: any) => d.size*2) // Node size proportional to cluster size
  .attr('fill', '#69b3a2')
  .on('click', (event:any, d:any) => {
    //console.log('Node clicked:', d.id);
  });


// Set up the simulation with basic nodes
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id((d: any) => d.id).distance(d => 200/d.sharedExhibitionMinArtworks)) // Distance proportional to shared exhibitions
  .force('collision', d3.forceCollide().radius((d: any) => d.size * 8)) // Prevent overlap
  .on('tick', () => {
    // Update link positions
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);
  
    // Update node positions
    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);
  });

  }
  

  private createSvg(): void {
    // Remove any existing SVG elements

    d3.select(this.networkContainer.nativeElement).select('.network-svg-container svg').remove();
    const element = this.networkContainer.nativeElement.querySelector('.network-svg-container');

    
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
      .scaleExtent([0.3, 10])
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });
    
    this.svg.call(zoom);
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
