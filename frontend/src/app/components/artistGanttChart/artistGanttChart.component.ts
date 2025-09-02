import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Artist } from '../../models/artist';
import { SelectionService } from '../../services/selection.service';
import { Subscription } from 'rxjs';
import { DecisionService } from '../../services/decision.service';
import { ArtistService } from '../../services/artist.service';
import { format } from 'd3-format';

@Component({
  selector: 'app-artistGanttChart',
  templateUrl: './artistGanttChart.component.html',
  styleUrls: ['./artistGanttChart.component.css']
})
export class ArtistGanttChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('artistGantt', { static: true }) private ganttContainer!: ElementRef;
  private subscriptions: Subscription = new Subscription();

  allArtists: Artist[] | null = null;
  selectedArtists: Artist[] | null = null;
  isLoading: boolean = true;
  private svg: any;
  private contentWidth: number = 0;
  private contentHeight: number = 0;
  private legendGroup: any;
  private modernMap: boolean = true;

  // Margins in vw and vh
  private margin = {
    top: 4.5,
    right: 1.5,
    bottom: 1,
    left: 1
  };

  constructor(
    private selectionService: SelectionService,
    private decisionService: DecisionService,
    private artistService: ArtistService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.selectionService.currentAllArtists.subscribe((artists: Artist[] | null) => {
        this.allArtists = artists || [];
        //this.addTestArtists();
        this.tryInitialize();
      })
    );

    this.subscriptions.add(
      this.selectionService.currentArtists.subscribe((artists: Artist[] | null) => {
        this.selectedArtists = artists;
        this.tryInitialize();
      })
    );
    this.subscriptions.add(
      this.selectionService.currentSelectModern.subscribe((modern:boolean) => {
        this.modernMap=modern;
        this.tryInitialize();
      })
    );

    this.subscriptions.add(
      this.decisionService.currentRankingOrder.subscribe(() => {
        this.tryInitialize();
      }));


    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnChanges(): void {
    this.tryInitialize();
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
    if (!this.ganttContainer) return;
    this.tryInitialize();
  }

  private tryInitialize(): void {
    const artists = this.selectedArtists && this.selectedArtists.length > 0 ? this.selectedArtists : this.allArtists;

    if (!artists || artists.length === 0) {
      this.isLoading = false;
      if (this.svg) {
        d3.select(this.ganttContainer.nativeElement).select("figure.artist-gantt-svg-container").select("svg").remove();
      }
      return;
    } else {
      this.createChart(artists);
    }
  }

  private createChart(artists: Artist[]): void {
    this.createSvg(artists);
    this.drawTimeline(artists);
    this.isLoading = false;
  }

  private createSvg(artists: Artist[]): void {
    d3.select(this.ganttContainer.nativeElement).select("figure.artist-gantt-svg-container").select("svg").remove();
  
    const element = this.ganttContainer.nativeElement.querySelector('figure.artist-gantt-svg-container');
    let margin = {
      top: this.margin.top * window.innerHeight / 100,
      right: this.margin.right * window.innerWidth / 100,
      bottom: this.margin.bottom * window.innerWidth / 100,
      left: this.margin.left * window.innerWidth / 100
    };
    
    const cluster = this.selectionService.getFocusedCluster() || [];
  
    const numArtists = artists.length < cluster.length ? cluster.length : artists.length;
    const barHeight = 0.8 *window.innerHeight / 100;
    const extraSpace = 0.5 * window.innerWidth / 100;
  
    // Group the artists by cluster
    const groupedByCluster = d3.group(artists, artist => artist.cluster + 1);
    const numClusters = groupedByCluster.size;
  
    // Calculate the required height
    const calculatedHeight = (numArtists * barHeight) + (numClusters * extraSpace) + margin.top + margin.bottom;
    const height =  calculatedHeight;

    const containerHeight = element.clientHeight;
    if (height > containerHeight) {
        //console.log('SVG height exceeds container height, scrollbar will appear');
    } else {
        //console.log('SVG fits within the container height, no scrollbar needed');
        margin.right = this.margin.left * window.innerWidth / 100;
    }


  
    const width = element.offsetWidth - margin.left - margin.right;

  
    this.svg = d3.select(element).append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    this.contentWidth = width;
    this.contentHeight = height - margin.top - margin.bottom;
  
    // Create a group element for the legend
    this.legendGroup = this.svg.append('g')
      .attr('class', 'legend-group');
  }

  private drawTimeline(artists: Artist[]): void {
    if (!artists || this.decisionService.getRankingOrder().length === 0) {
      return;
    }
  
    const allArtists = this.allArtists || [];
    const maxBarHeight = 0.8 * window.innerHeight / 100;
  
    // Map of all artists by ID for easy lookup
    const allArtistsMap = new Map<number, Artist>();
    allArtists.forEach(artist => allArtistsMap.set(artist.id, artist));
  
    // Determine the selected cluster (artists are from the same cluster)
    const selectedArtist = this.selectedArtists && this.selectedArtists.length > 0 ? this.selectedArtists[0] : null;
    const selectedCluster = selectedArtist ? selectedArtist.cluster + 1 : null;
  
    // Filter and map artists for timeline data, including the full cluster if available
    const timelineData = selectedCluster
      ? allArtists.filter(artist => artist.cluster + 1 === selectedCluster).map(artist => ({
          name: artist.firstname + ' ' + artist.lastname,
          start: artist.birthyear !== -1 ? new Date(artist.birthyear, 0).getTime() : null,
          end: artist.deathyear !== -1 ? new Date(artist.deathyear, 0).getTime() : null,
          duration: artist.birthyear !== -1 && artist.deathyear !== -1 ? new Date(artist.deathyear, 0).getTime() - new Date(artist.birthyear, 0).getTime() : null,
          birthCountry: artist.birthcountry,
          deathCountry: artist.deathcountry,
          oldBirthCountry: artist.oldBirthCountry,
          oldDeathCountry: artist.oldDeathCountry,
          birthyear: artist.birthyear,
          deathyear: artist.deathyear,
          birthplace: artist.birthplace,
          deathplace: artist.deathplace,
          clusterIndex: artist.cluster,
          id: artist.id
        }))
      : artists.filter(artist => artist.birthyear !== -1 || artist.deathyear !== -1).map(artist => ({
          name: artist.firstname + ' ' + artist.lastname,
          start: artist.birthyear !== -1 ? new Date(artist.birthyear, 0).getTime() : null,
          end: artist.deathyear !== -1 ? new Date(artist.deathyear, 0).getTime() : null,
          duration: artist.birthyear !== -1 && artist.deathyear !== -1 ? new Date(artist.deathyear, 0).getTime() - new Date(artist.birthyear, 0).getTime() : null,
          birthCountry: artist.birthcountry,
          deathCountry: artist.deathcountry,
          oldBirthCountry: artist.oldBirthCountry,
          oldDeathCountry: artist.oldDeathCountry,
          birthyear: artist.birthyear,
          deathyear: artist.deathyear,
          birthplace: artist.birthplace,
          deathplace: artist.deathplace,
          clusterIndex: artist.cluster,
          id: artist.id
        }));
  
    const groupedByCluster = d3.group(timelineData, d => d.clusterIndex);
    const orderedClusterIds = this.decisionService.getRankingOrder(); // Get the ordered cluster IDs from your decision service

const sortedClusters = Array.from(groupedByCluster.entries())
.sort((a, b) => orderedClusterIds.indexOf(a[0]) - orderedClusterIds.indexOf(b[0]))
.map(([clusterIndex]) => clusterIndex);

  
      const paddingPercentage = 0.05; // 5% padding on both ends

      const minDate = d3.min(timelineData, d => d.start ? new Date(d.start) : new Date(d.end!))!;
      const maxDate = d3.max(timelineData, d => d.end ? new Date(d.end) : new Date(d.start!))!;
      
      // Add padding to the domain of the xScale
      const paddedMinDate = new Date(minDate.getTime() - (maxDate.getTime() - minDate.getTime()) * paddingPercentage);
      const paddedMaxDate = new Date(maxDate.getTime() + (maxDate.getTime() - minDate.getTime()) * paddingPercentage);
      
      const xScale = d3.scaleTime()
        .domain([paddedMinDate, paddedMaxDate]) // Use padded domain
        .range([0, this.contentWidth])
        .nice();

      
    const yScale = d3.scaleBand()
      .domain(timelineData.map((d, i) => i.toString()))
      .range([0, this.contentHeight])
      .padding(0.1)
      .round(true);
  
    const barHeight = 0.8 * window.innerHeight / 100;
  
    const colorScale = d3.scaleSequential(d3.interpolatePlasma)
      .domain([0, 1]);
  
    let yOffset = 0;
    const extraSpace = 0.5 * window.innerWidth / 100;
    const halfExtraSpace = extraSpace / 2;
  
    sortedClusters.forEach(cluster => {
      const clusterArtists = groupedByCluster.get(cluster)!;
      yOffset += (clusterArtists.length * barHeight) + extraSpace;
    });
  
    const xAxis = d3.axisTop(xScale).tickSize(-yOffset);
  
    this.svg.append('g')
      .call(xAxis)
      .attr('transform', `translate(0,0)`)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(65)")
      .style("font-size", "0.6vw");
  
    this.svg.selectAll('.tick line')
      .filter((d: any, i: any, nodes: any) => i !== 0 && i !== nodes.length - 1) // Exclude first and last tick
      .attr('stroke', 'lightgray')
      .attr('opacity', 0.6)
      .attr('stroke-dasharray', '3');


      let height=0;
        sortedClusters.forEach((cluster) => {
          const clusterArtists = groupedByCluster.get(cluster)!;
          height += halfExtraSpace;
          height += clusterArtists.length * barHeight;
          height += halfExtraSpace;
        });

        const year1905 = new Date(1905, 0); // January 1, 1905
        const x1905 = xScale(year1905);
    
        // Append a vertical line to the SVG
        this.svg.append('line')
            .attr('x1', x1905)
            .attr('x2', x1905)
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', 'lightgray') // Set the color of the line
            .attr('stroke-width', 2)
  
    yOffset = 0;
    const defs = this.svg.append('defs');
  
    sortedClusters.forEach((cluster, index) => {
      let clusterArtists = groupedByCluster.get(cluster)!.sort((a, b) => d3.ascending(a.birthyear, b.birthyear));
  
      yOffset += halfExtraSpace;
  

  
      clusterArtists.forEach((artist, index) => {
        const gradientId = `gradient-${artist.id}`;
        const birthColor = this.modernMap?this.artistService.getCountryColor(artist.birthCountry): this.artistService.getOldCountryColor(artist.oldBirthCountry);
        const deathColor = this.modernMap?this.artistService.getCountryColor(artist.deathCountry): this.artistService.getOldCountryColor(artist.oldDeathCountry);
  
        const gradient = defs.append('linearGradient')
          .attr('id', gradientId)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');
  
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', birthColor);
  
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', deathColor);
  
        const tooltip = d3.select("div#tooltip");
  
        const showTooltip = (event: any, d: any) => {

          this.selectionService.hoverOnArtist(artist.id);




          const birthyear = artist.birthyear !== -1 ? artist.birthyear : 'unknown';
          const deathyear = artist.deathyear !== -1 ? artist.deathyear : 'unknown';
          const age = artist.birthyear !== -1 && artist.deathyear !== -1 ? artist.deathyear - artist.birthyear : 'unknown';
  
          const tooltipNode = tooltip.node() as HTMLElement;
          const tooltipWidth = tooltipNode.offsetWidth;
  
          if(this.modernMap){
          tooltip.style("display", "block")
            .style("left", `${event.pageX - 2- tooltipWidth}px`)
            .style("top", `${event.pageY + 2}px`)
            .style("color", "black")
            .html(`${artist.name}<br/>Born: ${birthyear} in ${artist.birthplace} (${artist.birthCountry})<br/>Died: ${deathyear} in ${artist.deathplace} (${artist.deathCountry})<br/>Age: ${age}`);
        }
      else{    tooltip.style("display", "block")
        .style("left", `${event.pageX - 2- tooltipWidth}px`)
        .style("top", `${event.pageY + 2}px`)
        .style("color", "black")
        .html(`${artist.name}<br/>Born: ${birthyear} in ${artist.birthplace} (${artist.oldBirthCountry})<br/>Died: ${deathyear} in ${artist.deathplace} (${artist.oldDeathCountry})<br/>Age: ${age}`);
    };

      }
  
        const hideTooltip = () => {
          this.selectionService.hoverOnArtist(null);
          tooltip.style("display", "none");
        };
  
        const click = (event: any, d: any) => {
          this.decisionService.changeSearchedArtistId(artist.id.toString());
        };
  
        // Adjust opacity and stroke width based on whether the artist is selected
        const opacity = this.selectedArtists && this.selectedArtists.length > 0
          ? this.selectedArtists.some(selArtist => selArtist.id === artist.id) ? 1 : 0.3
          : 1;
        const strokeWidth = this.selectedArtists && this.selectedArtists.length > 0
          ? this.selectedArtists.some(selArtist => selArtist.id === artist.id) ? 0.1 : 0.2
          : 0.2;
  
        if (artist.start && artist.end) {
          const barWidth = xScale(artist.end) - xScale(artist.start);
  
          // Add the rectangle (bar)
          this.svg.append('rect')
            .attr('class', 'bar')
            .attr('x', xScale(artist.start))
            .attr('y', yOffset)
            .attr('width', barWidth === 0 ? 1 : barWidth)
            .attr('height', barHeight)
            .attr('fill', `url(#${gradientId})`)
            .attr('opacity', opacity)
            .attr('stroke', 'black')
            .attr('stroke-width', strokeWidth)
            .on("mouseover", showTooltip)
            .on("mousemove", showTooltip)
            .on("mouseout", hideTooltip)
            .on("click", click)
            .style('cursor', 'pointer');  // Add this line to change the cursor

  
          // Add birth and death country labels
          this.svg.append('text')
            .attr('x', xScale(artist.start) - 1)
            .attr('y', yOffset + barHeight / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .attr('fill', birthColor)
            .style('font-size', '0.38vw')
            .attr('opacity', opacity)
            .text(this.modernMap?artist.birthCountry:artist.oldBirthCountry);
  
          this.svg.append('text')
            .attr('x', xScale(artist.end) + 1)
            .attr('y', yOffset + barHeight / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .attr('fill', deathColor)
            .style('font-size', '0.38vw')
            .attr('opacity', opacity)
            .text(this.modernMap?artist.deathCountry:artist.oldDeathCountry);
        } else if (artist.start || artist.end) {
          const date = artist.start ? artist.start : artist.end!;
  
          this.svg.append('circle')
            .attr('class', 'bar')
            .attr('cx', xScale(date))
            .attr('cy', yOffset + barHeight / 2)
            .attr('r', barHeight / 2)
            .attr('fill', birthColor)
            .attr('opacity', opacity)
            .attr('stroke', 'black')
            .attr('stroke-width', strokeWidth)
            .on("mouseover", showTooltip)
            .on("mousemove", showTooltip)
            .on("mouseout", hideTooltip)
            .on("click", click)
            .style('cursor', 'pointer');  // Add this line to change the cursor

        }
  
        yOffset += barHeight;
      });
  
      yOffset += halfExtraSpace;
    });
  
    this.svg.append('line')
      .attr('x1', 0)
      .attr('x2', this.contentWidth)
      .attr('y1', yOffset)
      .attr('y2', yOffset)
      .attr('stroke', 'gray')
      .attr('stroke-width', 1);
  }
  


  
  
  
/*    private addTestArtists(): void {
    if (this.allArtists) {
      this.allArtists.push(
        new Artist({
          id: 9998,
          firstname: 'Test',
          lastname: 'ArtistBirth',
          birthyear: 1900,
          birthplace: 'TestPlace',
          deathyear: -1,
          deathplace: 'TestPlace',
          nationality: 'TestNationality',
          sex: 'N/A',
          artist: 'Test Artist',
          techniques: ['Painting'],
          amount_techniques: 1,
          distinct_techniques: ['Painting'],
          techniques_freq: new Map([['Painting', 1]]),
          europeanRegionNationality: 'TestRegion',
          most_exhibited_in: 'TestCountry',
          europeanRegionMostExhibited: 'TestRegion',
          most_exhibited_in_amount: 1,
          total_exhibited_artworks: 1,
          deathcountry: 'TestCountry',
          europeanRegionDeath: 'TestRegion',
          birthcountry: 'TestCountry',
          europeanRegionBirth: 'TestRegion',
          total_exhibitions: 1,
          cluster: 1,
          overall_avg_date: '2000-01-01',
          avg_start_date: '2000-01-01',
          avg_end_date: '2000-01-01',
          avg_duration: 1,
          participated_in_exhibition: [1]
        }),
        new Artist({
          id: 9999,
          firstname: 'Test',
          lastname: 'ArtistDeath',
          birthyear: -1,
          birthplace: 'TestPlace',
          deathyear: 2000,
          deathplace: 'TestPlace',
          nationality: 'TestNationality',
          sex: 'N/A',
          artist: 'Test Artist',
          techniques: ['Painting'],
          amount_techniques: 1,
          distinct_techniques: ['Painting'],
          techniques_freq: new Map([['Painting', 1]]),
          europeanRegionNationality: 'TestRegion',
          most_exhibited_in: 'TestCountry',
          europeanRegionMostExhibited: 'TestRegion',
          most_exhibited_in_amount: 1,
          total_exhibited_artworks: 1,
          deathcountry: 'TestCountry',
          europeanRegionDeath: 'TestRegion',
          birthcountry: 'TestCountry',
          europeanRegionBirth: 'TestRegion',
          total_exhibitions: 1,
          cluster: 1,
          overall_avg_date: '2000-01-01',
          avg_start_date: '2000-01-01',
          avg_end_date: '2000-01-01',
          avg_duration: 1,
          participated_in_exhibition: [1]
        })
      );
    }
  }  */
  }