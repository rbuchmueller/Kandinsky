import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Artist } from '../../models/artist';
import { SelectionService } from '../../services/selection.service';
import { Subscription } from 'rxjs';
import { ExhibitionService } from '../../services/exhibition.service';
import { Exhibition } from '../../models/exhibition';

interface YearData {
  year: number;
  totalExhibitions: number;
  regions: {
    [key: string]: {
      selected: number;
      unselected: number;
    };
  };
}

interface MonthData {
  year: number;
  month: number;
  totalExhibitions: number;
  regions: {
    [key: string]: {
      selected: number;
      unselected: number;
    };
  };
}


@Component({
  selector: 'app-exhibitionBarchart',
  templateUrl: './exhibitionBarchart.component.html',
  styleUrls: ['./exhibitionBarchart.component.css']
})
export class ExhibitionBarchartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('exhibition', { static: true }) private exhibitionContainer!: ElementRef;
  @ViewChild('tooltip', { static: true }) private tooltip!: ElementRef;
  private subscriptions: Subscription = new Subscription();
  private legendOrder: string[] = ["North Europe", "Eastern Europe", "Southern Europe", "Western Europe", "Others", "\\N"];
  private oldLegendOrder: string[] = ["North Europe", "Eastern Europe", "Central Europe","Southern Europe", "Western Europe", "Others", "\\N"];

  allExhibitions: Exhibition[] = [];
  exhibitions: Exhibition[] = [];
  nonSelectedExhibitions: Exhibition[] = [];
  selectedExhibitions: Exhibition[] = [];
  clusterExhibitions: Exhibition[] = [];
  selectedCluster: Artist[] |null = [];
  allArtists: Artist[] = [];
  selectedArtists: Artist[] | null = [];
  isLoading: boolean = true;
  private selectedYear:number|null = null;
  private svg: any;
  private contentWidth: number = 0;
  private contentHeight: number = 0;
  private regionKeys: string[] = ["North Europe", "Eastern Europe", "Southern Europe", "Western Europe", "Others", "\\N"];
  private exhibitionMap: Map<string, Exhibition> = new Map();
  private previouslySelectedYear: number | null = null;

  private selectedMonths: { year: number, month: number }[] = [];

  private xScale: any;

  private brushSelection: [number, number] | null = null;

  private modernMap: boolean = true;


  private margin = {
    top: 1.75,
    right:  1.5,
    bottom:  1,
    left:  1.5
  };

  constructor(private selectionService: SelectionService,
              private exhibitionService: ExhibitionService) { }

  ngOnInit(): void {
    this.exhibitionService.getAllExhibitions().subscribe((exhibitions) => {
      this.allExhibitions = exhibitions;
      const exhibitionMap = new Map<string, Exhibition>();
      this.allExhibitions.forEach(exhibition => exhibitionMap.set(exhibition.id.toString(), exhibition));
      this.exhibitionMap = exhibitionMap;
      this.tryInitialize();
    });

    this.subscriptions.add(
      this.selectionService.currentAllArtists.subscribe((artists: Artist[] | null) => {
        this.allArtists = artists || [];
        this.selectionService.selectExhibitions(null);
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
      this.selectionService.currentFocusedCluster.subscribe((cluster: Artist[] | null) => {
        this.selectedCluster = cluster;
        this.tryInitialize();
      })
    );

    this.subscriptions.add(
      this.selectionService.currentSelectModern.subscribe((modernMap: boolean) => {
        this.modernMap = modernMap;
        this.createChart();
  
        // Reapply brush selection after changing the selected artists
        if (this.brushSelection) {
          this.svg.select('.brush')
            .call(d3.brushX().move, this.brushSelection);  // Reapply the brush selection
    
          // Simulate the brushed behavior to re-select exhibitions
          this.brushed({ selection: this.brushSelection });
        }
    
        //this.clickOnSelectedYear();
        this.isLoading = false;
      })
    );

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
    if (!this.exhibitionContainer) return;
    this.tryInitialize();
  }

  private tryInitialize(): void {
    if (this.allArtists.length === 0 || this.allExhibitions.length === 0) {
      this.isLoading = true;
      return;
    } else {
      this.retrieveWantedExhibitions();
      this.createChart();
  
      // Reapply brush selection after changing the selected artists
      if (this.brushSelection) {
        this.svg.select('.brush')
          .call(d3.brushX().move, this.brushSelection);  // Reapply the brush selection
  
        // Simulate the brushed behavior to re-select exhibitions
        this.brushed({ selection: this.brushSelection });
      }
       // Create title and legend container at the top
    const titleContainer = this.svg.append('g')
    .attr('class', 'title-container')
    .attr('transform', `translate(0, 0)`); // Position at the top


  // Append legend next to the title
  this.createLegend(titleContainer);
  
      //this.clickOnSelectedYear();
      this.isLoading = false;
    }
  }
  
  
  private clickOnSelectedYear(): void {
    if (this.previouslySelectedYear !== null) {
      this.handleYearSelectionWithoutClick(this.previouslySelectedYear);
    }
  }

  private handleYearSelectionWithoutClick(year: number): void {
  
      let exhibitionsByYear: Exhibition[][] = [];
      this.updateBarOpacity(year);
      if (this.selectedArtists && this.selectedArtists.length === 1) {
       
        // If only one artist is selected, include cluster exhibitions
        const selectedExhibitionsByYear = this.selectedExhibitions.filter(exhibition => {
          const startYear = new Date(exhibition.start_date).getFullYear();
          const endYear = new Date(exhibition.end_date).getFullYear();
          return year >= startYear && year <= endYear;
        });
  
        const selectedExhibitionIds = new Set(selectedExhibitionsByYear.map(exhibition => exhibition.id));
  
        const clusterExhibitionsByYear = this.clusterExhibitions.filter(exhibition => {
          const startYear = new Date(exhibition.start_date).getFullYear();
          const endYear = new Date(exhibition.end_date).getFullYear();
          return year >= startYear && year <= endYear && !selectedExhibitionIds.has(exhibition.id);
        });
  
        exhibitionsByYear = [selectedExhibitionsByYear, clusterExhibitionsByYear];
      } else {
        // If multiple artists are selected, only include selected exhibitions
        const exhibitions = this.selectedExhibitions.filter(exhibition => {
          const startYear = new Date(exhibition.start_date).getFullYear();
          const endYear = new Date(exhibition.end_date).getFullYear();
          return year >= startYear && year <= endYear;
        });
        exhibitionsByYear = [exhibitions, []];
      }
  
      this.selectionService.selectExhibitions(exhibitionsByYear);
    
  }
  
/*   private clickOnSelectedYear(): void {
    if (this.previouslySelectedYear !== null) {
      const bar = this.svg.selectAll('rect')
        .filter((d: any) =>{ if(d.data){//console.log(d.data.year,  typeof d.data.year)
          //console.log(this.previouslySelectedYear, typeof this.previouslySelectedYear)
        d.data.year === this.previouslySelectedYear}})
        .node();
  
      if (bar) {
        bar.dispatchEvent(new MouseEvent('click'));
      }
    }
  } */

    private resetBarOpacity(): void {
      this.svg.selectAll('rect')
        .attr('opacity', 1); // Reset all bars to full opacity
    }
    
    private updateBarOpacity(selectedYear: number): void {
      this.svg.selectAll('rect')
        .attr('opacity', (d: any) => {
          if(d.data === undefined) return 1;
          const year = d.data.year;
          return (year === selectedYear) ? 1 : 0.2; // Highlight selected year and dim others
        });
    }

    private handleYearSelection(year: number): void {
    
      if (this.previouslySelectedYear === year) {
        // Deselect the year if it's the same as the previously selected year
        this.previouslySelectedYear = null;
        this.selectedYear = null;
        this.selectionService.selectExhibitions([[], []]);
        this.resetBarOpacity();
      } else {
        this.previouslySelectedYear = year;
        this.selectedYear = year;
        this.updateBarOpacity(year);
    
        let exhibitionsByYear: Exhibition[][] = [];
    
        if (this.selectedArtists && this.selectedArtists.length === 1) {
          // If only one artist is selected, include cluster exhibitions
          const selectedExhibitionsByYear = this.selectedExhibitions.filter(exhibition => {
            const startYear = new Date(exhibition.start_date).getFullYear();
            const endYear = new Date(exhibition.end_date).getFullYear();
            return year >= startYear && year <= endYear;
          });
    
          const selectedExhibitionIds = new Set(selectedExhibitionsByYear.map(exhibition => exhibition.id));
    
          const clusterExhibitionsByYear = this.clusterExhibitions.filter(exhibition => {
            const startYear = new Date(exhibition.start_date).getFullYear();
            const endYear = new Date(exhibition.end_date).getFullYear();
            return year >= startYear && year <= endYear && !selectedExhibitionIds.has(exhibition.id);
          });
    
          exhibitionsByYear = [selectedExhibitionsByYear, clusterExhibitionsByYear];
        } else {
          // If multiple artists are selected, only include selected exhibitions
          const exhibitions = this.selectedExhibitions.filter(exhibition => {
            const startYear = new Date(exhibition.start_date).getFullYear();
            const endYear = new Date(exhibition.end_date).getFullYear();
            return year >= startYear && year <= endYear;
          });
          exhibitionsByYear = [exhibitions, []];
        }
    
        this.selectionService.selectExhibitions(exhibitionsByYear);
      }
    }
    
  
    private retrieveWantedExhibitions(): void {
      this.exhibitions = [];
      this.selectedExhibitions = [];
      this.nonSelectedExhibitions = [];
      this.clusterExhibitions = [];
    
      // Collect all exhibitions for all artists
      const allExhibitionIds = new Set<string>(
        this.allArtists.flatMap(artist => artist.participated_in_exhibition.map(id => id.toString()))
      );
    
      // Add all exhibitions to the exhibitions array
      this.exhibitionMap.forEach((exhibition, id) => {
        if (allExhibitionIds.has(id)) {
          this.exhibitions.push(exhibition);
        }
      });
    
      if (this.selectedArtists && this.selectedArtists.length > 0) {
        const selectedExhibitionIds = new Set<string>();
    
        // Gather exhibitions for all selected artists, ensuring no duplicates
        this.selectedArtists.forEach(artist => {
          artist.participated_in_exhibition.forEach(id => {
            selectedExhibitionIds.add(id.toString()); // Accumulate unique exhibition IDs
          });
        });
    
        // Cluster exhibitions are always included, regardless of the number of selected artists
        if (this.selectedCluster) {
          const clusterArtists = this.selectedCluster;
    
          // Collect all exhibitions of the artists in the same cluster
          const clusterExhibitionIds = new Set<string>(
            clusterArtists.flatMap(artist => artist.participated_in_exhibition.map(id => id.toString()))
          );
    
          // Populate cluster exhibitions, ensuring no duplicates with selectedExhibitions
          this.exhibitionMap.forEach((exhibition, id) => {
            if (clusterExhibitionIds.has(id)) {
              this.clusterExhibitions.push(exhibition);
            }
          });
        }
    
        // Divide exhibitions into selected and non-selected, ensuring no duplicates
        this.clusterExhibitions.forEach(exhibition => {
          if (selectedExhibitionIds.has(exhibition.id.toString())) {
            // Only add to selected if it's not already in selectedExhibitionIds
            this.selectedExhibitions.push(exhibition);
          } else {
            // Non-selected if it's in the cluster but not in selected artists' exhibitions
            this.nonSelectedExhibitions.push(exhibition);
          }
        });
    
        // Now populate selected exhibitions, ensuring uniqueness
        this.exhibitionMap.forEach((exhibition, id) => {
          if (selectedExhibitionIds.has(id) && !this.selectedExhibitions.some(e => e.id === exhibition.id)) {
            this.selectedExhibitions.push(exhibition);
          }
        });
      } else {
        // If no specific artists are selected, show all exhibitions
        this.selectedExhibitions = this.exhibitions;
        this.nonSelectedExhibitions = [];
      }
    }
    
    
    
    

  private createChart(): void {
    this.createSvg();
    this.drawBinnedChart();
  
    // Reapply the brush selection if it exists
    if (this.brushSelection) {
      this.svg.select('.brush')
        .call(d3.brushX().move, this.brushSelection);  // Reapply the brush selection
  
      // Simulate the brushed behavior to re-select exhibitions
      this.brushed({ selection: this.brushSelection });
    }
  }
  
  
  
  private createSvg(): void {
    d3.select(this.exhibitionContainer.nativeElement).select("figure.exhibition-svg-container").select("svg").remove();
  
    const element = this.exhibitionContainer.nativeElement.querySelector('figure.exhibition-svg-container');
    const margin = {
      top: this.margin.top * window.innerHeight / 100,
      right: this.margin.right * window.innerWidth / 100,
      bottom: this.margin.bottom * window.innerWidth / 100,
      left: this.margin.left * window.innerWidth / 100
    };
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;
  
    this.svg = d3.select(element).append('svg')
      .attr('width', element.offsetWidth)
      .attr('height', element.offsetHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    this.contentWidth = width;
    this.contentHeight = height;
  
   
  }
  
  private createLegend(container: any): void {
    const colorMap: { [key: string]: string } = {
      "North Europe": "#67D0C0",
      "Eastern Europe": "#59A3EE",
      "Southern Europe": "#AF73E8",
      "Western Europe": "#F06ACD",
      "Others": "#FFDA75",
      "\\N": "#c9ada7"
    };
  

    const oldColorMap: { [key: string]: string } = {
      "North Europe": "#67D0C0",
      "Eastern Europe": "#59A3EE",
      "Central Europe": "#a6db77",
      "Southern Europe": "#AF73E8",
      "Western Europe": "#F06ACD",
      "Others": "#FFDA75",
      "\\N": "#c9ada7"
    };

    const size = 0.9 * window.innerWidth / 100;
    const fontSize = 0.7 * window.innerWidth / 100;  // Adjust this multiplier as needed for desired text size
  
    // Function to calculate dynamic spacing based on text length
    const calculateSpacing = (text: string) => {
      return text.length * (fontSize * 0.6) + 10; // Base spacing + dynamic based on text length
    };
  
    // Calculate the total legend width dynamically based on item lengths
    const legendWidth = this.modernMap?
     this.legendOrder.reduce((acc, legendItem) => acc + size + calculateSpacing(legendItem), 0)
     : this.oldLegendOrder.reduce((acc, legendItem) => acc + size + calculateSpacing(legendItem), 0);
    
    // Get the container width (you can use contentWidth if it's set)
    const containerWidth = this.contentWidth; 
  
    // Calculate the translation to center the legend
    const translateX = (containerWidth - legendWidth) / 2;
  
    // Append legend container and center it
    const legend = container.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${translateX}, -10)`);  // Center horizontally
  
    // Create a legend group for each item and position them inline
    let xPosition = 0;
    if(this.modernMap){
    this.legendOrder.forEach((legendItem, index) => {
      const group = legend.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${xPosition}, 0)`);
  
      // Append rectangle for the legend color
      group.append('rect')
        .attr('width', size)
        .attr('height', size)
        .attr('fill', colorMap[legendItem as keyof typeof colorMap])
        .attr('y', 5); // Adjust vertical positioning if necessary
  
      // Append text next to the rectangle
      group.append('text')
        .attr('x', size + 4)
        .attr('y', size / 2 + 5) // Adjust to vertically align with rectangle
        .attr('dy', '.35em')
        .style('font-size', `${fontSize}px`)
        .text(legendItem);
  
      // Calculate the spacing based on the text length
      const spacing = calculateSpacing(legendItem);
      
      // Update xPosition for the next legend item
      xPosition += size + spacing;
    });
  }else{
    this.oldLegendOrder.forEach((legendItem, index) => {
      const group = legend.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${xPosition}, 0)`);
  
      // Append rectangle for the legend color
      group.append('rect')
        .attr('width', size)
        .attr('height', size)
        .attr('fill', oldColorMap[legendItem as keyof typeof oldColorMap])
        .attr('y', 5); // Adjust vertical positioning if necessary
  
      // Append text next to the rectangle
      group.append('text')
        .attr('x', size + 4)
        .attr('y', size / 2 + 5) // Adjust to vertically align with rectangle
        .attr('dy', '.35em')
        .style('font-size', `${fontSize}px`)
        .text(legendItem);
  
      // Calculate the spacing based on the text length
      const spacing = calculateSpacing(legendItem);
      
      // Update xPosition for the next legend item
      xPosition += size + spacing;
    });

  }
  }
  
  
  
  private drawBinnedChart(): void {
    const monthData = this.getMonthlyExhibitionData(this.selectedExhibitions, this.nonSelectedExhibitions);
  
    // Dynamically calculate the region order based on total exhibitions
    // Check if a cluster is selected, and if so, use the cluster's exhibitions for sorting
    let sortedRegionKeys:string[];
    if(this.modernMap){
    sortedRegionKeys = (this.selectedCluster && this.selectedCluster.length > 0 && this.selectedArtists && this.selectedArtists.length === 1)
    ? this.getSortedRegionKeys(this.clusterExhibitions) // Use cluster's exhibitions
    : this.getSortedRegionKeys(this.selectedExhibitions); // Fall back to the artist's exhibitions
    }else{
     sortedRegionKeys = (this.selectedCluster && this.selectedCluster.length > 0 && this.selectedArtists && this.selectedArtists.length === 1)
      ? this.getOldSortedRegionKeys(this.clusterExhibitions) // Use cluster's exhibitions
      : this.getOldSortedRegionKeys(this.selectedExhibitions); // Fall back to the artist's exhibitions

    }

 

    // Create xScale based on unique years
    const years = Array.from(new Set(monthData.map(d => d.year.toString())));
    const xScale = d3.scaleBand()
      .domain(years)
      .range([0, this.contentWidth])
      //.padding(0.01);
  
    this.xScale = xScale;
  
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(monthData, d => d.totalExhibitions)!])
      .nice()
      .range([this.contentHeight, 15]);
  
    const colorMap: { [key: string]: string } = {
      "North Europe": "#67D0C0",
      "Eastern Europe": "#59A3EE",
      "Southern Europe": "#AF73E8",
      "Western Europe": "#F06ACD",
      "Others": "#FFDA75",
      "\\N": "#c9ada7"
    };

    const oldColorMap: { [key: string]: string } = {
      "North Europe": "#67D0C0",
      "Eastern Europe": "#59A3EE",
      "Central Europe": "#a6db77",
      "Southern Europe": "#AF73E8",
      "Western Europe": "#F06ACD",
      "Others": "#FFDA75",
      "\\N": "#c9ada7"
    };
  
    // Create stack layout
    const stack = d3.stack()
      .keys(sortedRegionKeys.flatMap(region => [`${region}-selected`, `${region}-unselected`]));
  
    const stackedData = stack(monthData.map(d => {
      const data: any = { year: d.year, month: d.month };
      sortedRegionKeys.forEach(region => {
        data[`${region}-selected`] = d.regions[region].selected;
        data[`${region}-unselected`] = d.regions[region].unselected;
      });
      return data;
    }));
  
    // Create horizontal gridlines and filter out the top one
    this.svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-this.contentWidth)
        .tickFormat('' as any)
      )
      .selectAll('.tick line')
      .attr('stroke', 'lightgray')
      .attr('stroke-dasharray', '3')
      .attr('opacity', 0.6)
      .attr('display', 'block');
  
    this.svg.selectAll('.domain').remove();
  
    // Group the data by year to draw multiple bars for each month under the same year

    this.svg.append('g')
      .selectAll('g')
      .data(stackedData)
      .enter().append('g')
      .attr('fill', (d: any) => {
        const region = d.key.split('-')[0];
        return this.modernMap ? colorMap[region]: oldColorMap[region];
      })
      .attr('stroke', (d: any) => {
        const region = d.key.split('-')[0];
        // Use the correct color map based on the value of modernMap
        const color = this.modernMap ? colorMap[region] : oldColorMap[region];
        return d3.color(color)?.darker(1);
      })      .attr('stroke-width', 0.8)
      .attr('opacity', (d: any) => d.key.includes('unselected') ? 0.2 : 1)
      .selectAll('rect')
      .data((d: any) => d)
      .enter().append('rect')
      .attr('x', (d: any) => {
        // Calculate the x position for the bar using both year and month
        const year = d.data.year.toString();
        const monthIndex = d.data.month - 1; // 0-based index for months
        return xScale(year)! + monthIndex * (xScale.bandwidth() / 12);
      })
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth() / 12)  // Divide bandwidth by 12 to represent each month
      .on('click', (event: any, d: any) => this.handleYearSelection(d.data.year));
  
    // Append x-axis with years


   // Append x-axis with years
this.svg.append('g')
.attr('class', 'x-axis')
.attr('transform', `translate(0,${this.contentHeight})`)
.call(d3.axisBottom(xScale).tickSize(0)) // Remove tick lines
.selectAll('.tick text')
.style('font-size', '0.7vw')
.attr('dy', '0.7vw'); // Adjust dy to give more space (increase this value for more space)
// Set font size to 0.7vw

    // Append y-axis
    // Append y-axis
    this.svg.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale)
      .ticks(Math.min(10, d3.max(monthData, d => d.totalExhibitions)!)) // Limit to 10 ticks, adjust as needed
      .tickFormat(d3.format('d')) // Ensure only integers are displayed
    );


    // Add vertical lines to separate years
    this.svg.append('g')
        .selectAll('.year-separator')
        .data(years)
        .enter()
        .append('line')
        .attr('class', 'year-separator')
        .attr('x1', (d: string) => xScale(d)! + xScale.bandwidth())
        .attr('x2', (d: string) => xScale(d)! + xScale.bandwidth())
        .attr('y1', yScale(0))
        .attr('y2', yScale(yScale.domain()[1])) // Set the line's end point to match the y-axis height
        .attr('stroke', 'lightgray')
        .attr('opacity', 0.75)
        .attr('display', 'block');

        
  
    // Add a brush to the chart after drawing the bars
    this.addBrush();
  }
  

private addBrush(): void {
  const brush = d3.brushX()
  .extent([[0, 15], [this.contentWidth, this.contentHeight]]) // Define the extent of the brush
  .on('brush', this.brushed.bind(this))  // Call the brushed function while dragging

    .on('end', this.brushed.bind(this));  // Call the brushed function when selection ends

  this.svg.append('g')
    .attr('class', 'brush')
    .call(brush);
}

private brushed(event: any): void {
  const selection = event.selection;

  // If there's no selection (i.e., the user clears the brush), reset the exhibitions
  if (!selection) {
    this.brushSelection = null;  // Clear the stored selection
    this.selectedMonths = [];  // Clear selected months
    this.selectionService.selectExhibitions(null);  // Reset exhibitions selection

    // Reset the selected date range in the selection service
    this.selectionService.selectDateRange(null, null, null, null);
    return;  // Exit the function
  }

  this.brushSelection = selection;  // Store the brush selection
  const [x0, x1] = selection;

  // Clear the previous selected months
  this.selectedMonths = [];

  let startMonth: string | null = null;
  let startYear: number | null = null;
  let endMonth: string | null = null;
  let endYear: number | null = null;

  // Array to map month numbers to month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Select all the rectangles (bars) and check if they are within the brush selection
  this.svg.selectAll('rect').each((d: any, i: number, nodes: any) => {
    const bar = d3.select(nodes[i]);

    // Only process if the element is a 'rect' and has valid data
    if (bar.node().tagName === 'rect' && d && d.data) {
      // Calculate the x position of the bar based on its data
      const xPosition = parseFloat(bar.attr('x'));

      // If the bar's x position is within the brush selection, add its corresponding month
      if (xPosition >= x0 && xPosition <= x1 && d.data.year && d.data.month) {
        this.selectedMonths.push({ year: d.data.year, month: d.data.month }); // Add the month corresponding to the bar

        // Set startMonth and startYear for the first selected month
        if (startMonth === null && startYear === null) {
          startMonth = monthNames[d.data.month - 1]; // Convert month number to month name
          startYear = d.data.year;
        }

        // Continuously update endMonth and endYear until the last selected month
        endMonth = monthNames[d.data.month - 1]; // Convert month number to month name
        endYear = d.data.year;
      }
    }
  });

  // Update the selection service with the selected date range
  if (startMonth !== null && startYear !== null && endMonth !== null && endYear !== null) {
    this.selectionService.selectDateRange(startYear, startMonth, endYear, endMonth);
  }

  // Handle selected exhibitions based on the selected months
  if (this.selectedMonths.length > 0) {
    this.filterExhibitionsByMonths(this.selectedMonths);
  }
}





private filterExhibitionsByMonths(selectedMonths: { year: number, month: number }[]): void {
  const exhibitionsBySelectedMonths: Exhibition[][] = [];

  // Filter the exhibitions based on the selected months
  const selectedExhibitionsByMonths = this.selectedExhibitions.filter(exhibition => {
    const startDate = new Date(exhibition.start_date);
    const endDate = new Date(exhibition.end_date);

    return selectedMonths.some(month => {
      const monthStart = new Date(month.year, month.month - 1, 1);
      const monthEnd = new Date(month.year, month.month, 0);  // Last day of the month
      return startDate <= monthEnd && endDate >= monthStart;
    });
  });

  const selectedExhibitionIds = new Set(selectedExhibitionsByMonths.map(exhibition => exhibition.id));

  const clusterExhibitionsByMonths = this.clusterExhibitions.filter(exhibition => {
    const startDate = new Date(exhibition.start_date);
    const endDate = new Date(exhibition.end_date);

    return selectedMonths.some(month => {
      const monthStart = new Date(month.year, month.month - 1, 1);
      const monthEnd = new Date(month.year, month.month, 0);  // Last day of the month
      return startDate <= monthEnd && endDate >= monthStart;
    }) && !selectedExhibitionIds.has(exhibition.id);
  });

  exhibitionsBySelectedMonths.push(selectedExhibitionsByMonths, clusterExhibitionsByMonths);

  // Pass the selected exhibitions to the selection service
  this.selectionService.selectExhibitions(exhibitionsBySelectedMonths);
}

private getSortedRegionKeys(exhibitions: Exhibition[]): string[] {
  const regionTotals: { [key: string]: number } = {};

  // Accumulate the total number of exhibitions for each region
  exhibitions.forEach(exhibition => {
    const region = exhibition.europeanRegion; // Default to "Others" if undefined
    regionTotals[region] = (regionTotals[region] || 0) + 1;
  });

  // Sort regions by total exhibitions in descending order (largest to smallest)
  return Object.keys(regionTotals).sort((a, b) => regionTotals[b] - regionTotals[a]);
}

private getOldSortedRegionKeys(exhibitions: Exhibition[]): string[] {
  const regionTotals: { [key: string]: number } = {};

  // Accumulate the total number of exhibitions for each region
  exhibitions.forEach(exhibition => {
    const region = exhibition.oldEuropeanRegion; // Default to "Others" if undefined
    regionTotals[region] = (regionTotals[region] || 0) + 1;
  });

  // Sort regions by total exhibitions in descending order (largest to smallest)
  return Object.keys(regionTotals).sort((a, b) => regionTotals[b] - regionTotals[a]);
}


  private hasExhibitionValue(year: number): boolean {
    
    return this.selectedExhibitions.some(exhibition => {
      const startYear = new Date(exhibition.start_date).getFullYear();
      const endYear = new Date(exhibition.end_date).getFullYear();
      return year >= startYear && year <= endYear;
    });
  }
  
  private filterExhibitionsByYear(year: number): Exhibition[] {
    return this.exhibitions.filter(exhibition => {
      const startYear = new Date(exhibition.start_date).getFullYear();
      const endYear = new Date(exhibition.end_date).getFullYear();
      return year >= startYear && year <= endYear;
    });
  }


  

  

  private getMonthlyExhibitionData(selectedExhibitions: Exhibition[], unselectedExhibitions: Exhibition[]): MonthData[] {
    const monthData: { [month: string]: { [region: string]: { selected: number; unselected: number } } } = {};
  
    const processExhibitions = (exhibitions: Exhibition[], isSelected: boolean) => {
      exhibitions.forEach(exhibition => {
        const region :string= this.modernMap 
          ? (exhibition.europeanRegion || "Others") 
          : (exhibition.oldEuropeanRegion || "Others"); // Use oldEuropeanRegion if modernMap is false
          
        const startDate = new Date(exhibition.start_date);
        const endDate = new Date(exhibition.end_date);

        // Loop through each month between the start and end dates
        const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        for (let d = startMonth; d <= endMonth; d.setMonth(d.getMonth() + 1)) {
          const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`; // E.g., "2023-5" for May 2023

          if (!monthData[monthKey]) {
            // Initialize regions
            monthData[monthKey] = this.modernMap
              ? {
                  "North Europe": { selected: 0, unselected: 0 },
                  "Eastern Europe": { selected: 0, unselected: 0 },
                  "Southern Europe": { selected: 0, unselected: 0 },
                  "Western Europe": { selected: 0, unselected: 0 },
                  "Others": { selected: 0, unselected: 0 },
                  "\\N": { selected: 0, unselected: 0 }
                }
              : {
                  "North Europe": { selected: 0, unselected: 0 },
                  "Eastern Europe": { selected: 0, unselected: 0 },
                  "Central Europe": { selected: 0, unselected: 0 },
                  "Southern Europe": { selected: 0, unselected: 0 },
                  "Western Europe": { selected: 0, unselected: 0 },
                  "Others": { selected: 0, unselected: 0 },
                  "\\N": { selected: 0, unselected: 0 }
                };
          }

          if (isSelected) {
            monthData[monthKey][region].selected++;
          } else {
            monthData[monthKey][region].unselected++;
          }
        }
      });
    };

    processExhibitions(selectedExhibitions, true);
    processExhibitions(unselectedExhibitions, false);

    // Transform the processed data into an array of MonthData
    return Object.keys(monthData).map(monthKey => {
      const regions = monthData[monthKey];
      const [year, month] = monthKey.split('-').map(Number);
      return {
        year: year,
        month: month,
        totalExhibitions: Object.values(regions).reduce((sum, value) => sum + value.selected + value.unselected, 0),
        regions
      };
    }).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  }

  
  
}
