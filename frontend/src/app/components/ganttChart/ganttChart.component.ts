import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Artist } from '../../models/artist';
import { SelectionService } from '../../services/selection.service';
import { Subscription } from 'rxjs';
import { ExhibitionService } from '../../services/exhibition.service';
import { Exhibition } from '../../models/exhibition';
import { ArtistService } from '../../services/artist.service';

@Component({
  selector: 'app-ganttChart',
  templateUrl: './ganttChart.component.html',
  styleUrls: ['./ganttChart.component.css']
})
export class GanttChartComponent implements OnInit, OnChanges, OnDestroy {
    @ViewChild('gantt', { static: true }) private ganttContainer!: ElementRef;
    @ViewChild('legend', { static: true }) private legendContainer!: ElementRef;
    private subscriptions: Subscription = new Subscription();

    private exhibitions: Exhibition[]|null = null;
    private fullOpacityExhibitions: Set<string> = new Set();
    isLoading: boolean = true;
    noExhibitions = true;
    public selectedArtist: Artist | null = null;
    private svg: any;
    private contentWidth: number = 0;
    private contentHeight: number = 0;
    private legendGroup: any;
    public year:number|null = null;
    private modernMap:boolean = true;

    public startYear: number | null = null;
    public startMonth: string | null = null;
    public endYear: number | null = null;
    public endMonth: string | null = null;

    // Margins in vw and vh
    private margin = {
      top: 6.5,
      right: 1.5,
      bottom: 1,
      left: 1.5
    };

    constructor(private selectionService: SelectionService,
                private exhibitionService: ExhibitionService,
                private artistService: ArtistService) { }

    ngOnInit(): void {
      this.subscriptions.add(
        this.selectionService.currentExhibitions.subscribe((exhibitions) => {
          if (exhibitions) {
            // Separate exhibitions into those that should be full opacity and those with less opacity
            const [fullOpacityExhibitions, lessOpacityExhibitions] = exhibitions;
            if (lessOpacityExhibitions.length === 0) {
              this.selectedArtist = null;
              // If the second array is empty, draw all exhibitions with full opacity
              this.exhibitions = fullOpacityExhibitions;
              this.fullOpacityExhibitions = new Set(fullOpacityExhibitions.map(e => e.id.toString()));
            } else {
              // Combine the two arrays and handle opacity in drawTimeline
              const currentArtist = this.selectionService.getCurrentArtists();
              if(currentArtist){
                this.selectedArtist = currentArtist[0];
              }
              this.exhibitions = [...fullOpacityExhibitions, ...lessOpacityExhibitions];
              this.fullOpacityExhibitions = new Set(fullOpacityExhibitions.map(e => e.id.toString()));
            }
    
            this.tryInitialize();
          }
          else{
            this.exhibitions = null;
            this.tryInitialize();
          }
        })
      );
      this.subscriptions.add(this.selectionService.currentSelectedDateRange.subscribe((dateRange) => {
        if (dateRange) {
          this.startYear = dateRange.startYear;
          this.startMonth = dateRange.startMonth;
          this.endYear = dateRange.endYear;
          this.endMonth = dateRange.endMonth;
        } else {
          this.startYear = null;
          this.startMonth = null;
          this.endYear = null;
          this.endMonth = null;
        }
      }));

      this.subscriptions.add(this.selectionService.currentSelectModern.subscribe((modernMap) => {
        this.modernMap = modernMap;
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
      if (!this.exhibitions || this.exhibitions.length === 0) {
        this.noExhibitions = true;
        this.isLoading = false;
        if (this.svg) {
          d3.select(this.ganttContainer.nativeElement).select("figure.gantt-svg-container").select("svg").remove();
          d3.select(this.legendContainer.nativeElement).select("svg").remove(); // Remove existing legend

        }
        return;
      } else {
        this.noExhibitions = false;
        this.createChart();
      }
    }

    private createChart(): void {
      this.createSvg();
      this.drawTimeline();
      this.isLoading = false;
    }

    private createSvg(): void {
      const exhibitions: Exhibition[] | null = this.exhibitions;
      if (exhibitions === null) {
          return;
      }
  
      d3.select(this.ganttContainer.nativeElement).select("figure.gantt-svg-container").select("svg").remove();
      d3.select(this.legendContainer.nativeElement).select("svg").remove(); // Remove existing legend

      const element = this.ganttContainer.nativeElement.querySelector('figure.gantt-svg-container');
      const margin = {
          top: this.margin.top * window.innerHeight / 100,
          right: this.margin.right * window.innerWidth / 100,
          bottom: this.margin.bottom * window.innerWidth / 100,
          left: this.margin.left * window.innerWidth / 100
      };
      const width = element.offsetWidth - margin.left - margin.right;
  
      const numExhibitions = exhibitions.length;
      const numCountries = new Set(exhibitions.map(exhibition => exhibition.took_place_in_country)).size;
      const barHeight = 0.8 *window.innerHeight / 100;
      const extraSpace = 0.5 * window.innerWidth / 100;
      const calculatedHeight = (numExhibitions * barHeight) + (numCountries * extraSpace) + margin.top + margin.bottom;
  
      const height = Math.max(element.offsetHeight, calculatedHeight);
  
      this.svg = d3.select(element).append('svg')
          .attr('width', element.offsetWidth)
          .attr('height', height)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
  
      this.contentWidth = width;
      this.contentHeight = height - margin.top - margin.bottom;

      // Create a group element for the legend
      this.legendGroup = d3.select(this.legendContainer.nativeElement).append('svg')
        .attr('width', element.offsetWidth)
        .attr('height', '2.5vw' ) // Adjust height as needed
        .append('g');
    }
  
    private drawTimeline(): void {
      const exhibitions: Exhibition[] | null = this.exhibitions;
      if (exhibitions === null) {
        return;
      }
    
      const maxBarHeight = 0.8 * window.innerHeight / 100;
    
      const timelineData = exhibitions.map(exhibition => ({
        id: exhibition.id,
        name: exhibition.name,
        start: new Date(exhibition.start_date).getTime(),
        startDate: exhibition.start_date,
        endDate: exhibition.end_date,
        end: new Date(exhibition.end_date).getTime(),
        duration: new Date(exhibition.end_date).getTime() - new Date(exhibition.start_date).getTime(),
        amountParticipants: exhibition.exhibited_artists,
        country: exhibition.took_place_in_country,
        city: exhibition.city,
        normalizedParticipants: 0,
        oldCountry: exhibition.took_place_in_old_country
      }));
    
      const normalizedParticipants = this.normalizeLogarithmically(timelineData.map(d => d.amountParticipants));
      const amountParticipants = timelineData.map(d => d.amountParticipants);


      const min = Math.min(...amountParticipants);
      const max = Math.max(...amountParticipants);

      const legendDomain = [min,this.denormalizeLogarithmically(0.2, min, max),this.denormalizeLogarithmically(0.4, min, max), this.denormalizeLogarithmically(0.6, min, max), this.denormalizeLogarithmically(0.8, min, max),max];
    
      timelineData.forEach((d, i) => {
        d.normalizedParticipants = normalizedParticipants[i];
      });
    
      const groupedByCountry = this.modernMap?d3.group(timelineData, d => d.country):d3.group(timelineData, d => d.oldCountry);
      const sortedCountries = Array.from(groupedByCountry.entries())
        .sort(([, a], [, b]) => d3.descending(a.length, b.length))
        .map(([country]) => country);
    
      const xScale = d3.scaleTime()
        .domain([d3.min(timelineData, d => d.start)!, d3.max(timelineData, d => d.end)!])
        .range([0, this.contentWidth])
        .nice();
    
      const yScale = d3.scaleBand()
        .domain(timelineData.map((d, i) => i.toString()))
        .range([0, this.contentHeight])
        .padding(0.1)
        .round(true);
    
      const barHeight = Math.min(yScale.bandwidth(), maxBarHeight);
    
      const colorScale = d3.scaleSequential(d3.interpolateGreys)
        .domain([1, 0]);
    
      let yOffset = 0;
      const extraSpace = 0.5 * window.innerWidth / 100;
      sortedCountries.forEach((country) => {
        const exhibitions = groupedByCountry.get(country)!;
        yOffset += (exhibitions.length * barHeight) + extraSpace;
      });
    
      const xAxis = d3.axisTop(xScale).tickSize(-yOffset);
    
      const xAxisGroup = this.svg.append('g')
        .call(xAxis)
        .attr('transform', `translate(0,0)`)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(65)")
        .style("font-size", "0.5vw");
    
      this.svg.selectAll('.tick line')
        .attr('stroke', 'gray');
    
      yOffset = 0;
      sortedCountries.forEach((country, index) => {
        const exhibitions = groupedByCountry.get(country)!;
        exhibitions.sort((a, b) => d3.ascending(a.start, b.start));
    
        const countryColor = this.modernMap?this.artistService.getCountryColor(country, 0.1):this.artistService.getOldCountryColor(country, 0.1);
    
        this.svg.append('rect')
          .attr('x', 0)
          .attr('y', yOffset)
          .attr('width', this.contentWidth)
          .attr('height', exhibitions.length * barHeight)
          .attr('fill', countryColor);
    
        this.svg.append('text')
          .attr('class', 'label')
          .attr('x', -10)
          .attr('y', yOffset + (exhibitions.length * barHeight / 2))
          .attr('dy', '.35em')
          .attr('text-anchor', 'end')
          .attr('fill', this.modernMap?this.artistService.getCountryColor(country):this.artistService.getOldCountryColor(country))
          .style('font-size', '0.5vw')
          .text(country);
    
        exhibitions.forEach(exhibition => {
          const opacity = this.fullOpacityExhibitions.has(exhibition.id.toString()) ? 1 : 0.4;
          const strokeWidth = this.fullOpacityExhibitions.has(exhibition.id.toString()) ? 0.85 : 0.15;
          const singleDay = exhibition.start === exhibition.end;
    
          const tooltip = d3.select("div#tooltip");
    
          const handleMouseOver = (event: any, d: any) => {
            tooltip.style('display', 'block');
          };
    
          const handleMouseMove = (event: any, d: any) => {
            const tooltipNode = tooltip.node() as HTMLElement;
            const tooltipHeight = tooltipNode.offsetHeight;
            const tooltipWidth = tooltipNode.offsetWidth;
    
            const duration = Math.floor(exhibition.duration / (1000 * 60 * 60 * 24)) + 1;
    
            if(this.modernMap){
            tooltip.style("display", "block")
              .style("left", `${event.pageX - 2 - tooltipWidth}px`)
              .style("top", `${event.pageY - 2 - tooltipHeight}px`)
              .style("color", "black")
              .html(`Name: ${exhibition.name}<br/> Duration: ${duration} <br/>in ${exhibition.city} (${exhibition.country}) with ${exhibition.amountParticipants} participants`);
            }else{
              tooltip.style("display", "block")
              .style("left", `${event.pageX - 2 - tooltipWidth}px`)
              .style("top", `${event.pageY - 2 - tooltipHeight}px`)
              .style("color", "black")
              .html(`Name: ${exhibition.name}<br/> Duration: ${duration} <br/>in ${exhibition.city} (${exhibition.oldCountry}) with ${exhibition.amountParticipants} participants`);
            }
          };
    //              .html(`Name: ${exhibition.name}<br/>Start: ${removeTimeFromDateString(exhibition.startDate.toString())} <br/>End: ${removeTimeFromDateString(exhibition.endDate.toString())} <br/> Duration: ${duration} <br/>in ${exhibition.city} (${exhibition.country}) with ${exhibition.amountParticipants} participants`);

          const removeTimeFromDateString = (dateString: string) => {
            const parts = dateString.split(' ');
            return parts.slice(0, 3).join(' ');
          };
    
          const handleMouseOut = (event: any, d: any) => {
            tooltip.style('display', 'none');
          };

          const handleMouseClick = (event: any, d: any) => {
            navigator.clipboard.writeText(exhibition.name);

          }
    
          if (singleDay) {
            this.svg.append('circle')
              .attr('class', 'bar')
              .attr('cx', xScale(exhibition.start))
              .attr('cy', yOffset + barHeight / 2)
              .attr('r', barHeight / 2)
              .attr('fill', timelineData.length !== 1 ? colorScale(exhibition.normalizedParticipants) : colorScale(1))
              .attr('opacity', opacity)
              .attr('stroke', 'black')
              .attr('stroke-width', strokeWidth)
              .on('mouseover', handleMouseOver)
              .on('mousemove', handleMouseMove)
              .on('mouseout', handleMouseOut);
          } else {
            this.svg.append('rect')
              .attr('class', 'bar')
              .attr('x', xScale(exhibition.start))
              .attr('y', yOffset)
              .attr('width', xScale(exhibition.end) - xScale(exhibition.start) === 0 ? 1 : xScale(exhibition.end) - xScale(exhibition.start))
              .attr('height', barHeight)
              .attr('fill', timelineData.length !== 1 ? colorScale(exhibition.normalizedParticipants) : colorScale(1))
              .attr('opacity', opacity)
              .attr('stroke', 'black')
              .attr('stroke-width', strokeWidth)
              .on('mouseover', handleMouseOver)
              .on('mousemove', handleMouseMove)
              .on('mouseout', handleMouseOut)
              .on('click', handleMouseClick);
          }
          yOffset += barHeight;
        });
    
        yOffset += extraSpace;
      });


      this.svg.append('line')
      .attr('x1', 0)
      .attr('x2', this.contentWidth)
      .attr('y1', yOffset)
      .attr('y2', yOffset)
      .attr('stroke', 'gray')
      .attr('stroke-width', 1);
  
    
    /*   this.svg.append('line')
        .attr('x1', 0)
        .attr('x2', this.contentWidth)
        .attr('y1', yOffset)
        .attr('y2', yOffset)
        .attr('stroke', 'gray')
        .attr('stroke-width', 1); */

        this.svg.selectAll('.tick line')
        .filter((d:any, i:any, nodes:any) => i !== 0 && i !== nodes.length - 1) // Exclude first and last tick
        .attr('stroke', 'lightgray')
        .attr('opacity', 0.6)
        .attr('stroke-dasharray', '3');
        
    
      const legendHeight = 0.5 * window.innerWidth / 100;
      const legendWidth = this.contentWidth / 4 * 3;
      const legendContainerWidth = this.legendContainer.nativeElement.offsetWidth;
      const legendX = (legendContainerWidth - legendWidth) / 2;
      const legendY = 1 * window.innerWidth / 100;
    
      const legend = this.legendGroup
        .attr('transform', `translate(${legendX}, ${legendY})`);
        
    
      const defs = this.legendGroup.append('defs');
      const linearGradient = defs.append('linearGradient')
        .attr('id', 'linear-gradient-grey')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
    
     // Reverse the stops from 1 to 0
  const stops = d3.range(1, -0.01, -0.01).map((t: number) => ({
    offset: `${(1 - t) * 100}%`,
    color: d3.interpolateGreys(t)
  }));
      linearGradient.selectAll('stop')
        .data(stops)
        .enter().append('stop')
        .attr('offset', (d: { offset: string; color: string }) => d.offset)
        .attr('stop-color', (d: { offset: string; color: string }) => d.color);
    
      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#linear-gradient-grey)');
    
      legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -0.5 * window.innerWidth / 100)
        .attr('text-anchor', 'middle')
        .style('font-size', '0.5vw')
        .attr('fill', '#2a0052')
        .text('Scale: Number of Participants');
    
     // Create the normalized scale
  const normalizedScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(normalizedScale)
    .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1])
    .tickFormat((d, i) => legendDomain[i] as unknown as string); // Use type assertion
    const legendAxisGroup = legend.append('g')
    .attr('transform', `translate(0, ${legendHeight})`)
    .call(legendAxis);
  
  // Style the tick text
  legendAxisGroup.selectAll('text')
    .style('font-size', '0.5vw');
    }
    
    private denormalizeLogarithmically(normalizedValue: number, minValue: number, maxValue: number): number {
      const logMinValue = Math.log1p(minValue);
      const logMaxValue = Math.log1p(maxValue);
      const range = logMaxValue - logMinValue;
    
      const originalLogValue = normalizedValue * range + logMinValue;
      const originalValue = Math.expm1(originalLogValue);
    
      return Math.round(originalValue);    }
  
    
    private normalizeLogarithmically(values: number[]): number[] {
      const logMaxValue = Math.log1p(Math.max(...values));
      const logMinValue = Math.log1p(Math.min(...values));
      const range = logMaxValue - logMinValue;
      return values.map(value => (Math.log1p(value) - logMinValue) / range); // Normalize by dividing by the max degree
    }
}
