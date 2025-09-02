import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { Artist } from '../../models/artist';
import { SelectionService } from '../../services/selection.service';
import { Subscription } from 'rxjs';
import { DecisionService } from '../../services/decision.service';
import { ArtistService } from '../../services/artist.service';

@Component({
  selector: 'app-barchart',
  templateUrl: './barchart.component.html',
  styleUrls: ['./barchart.component.css']
})
export class BarchartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('barChart', { static: true }) private chartContainer!: ElementRef;

  private subscriptions: Subscription = new Subscription();


  
  allArtists: Artist[] = [];
  selectedArtists: Artist[] | null = [];
  nonselectedArtists: Artist[] = [];
  selectedCluster: Artist[]|null= [];
  isLoading: boolean = true;
  private svg: any;
  private contentWidth: number = 0;
  private contentHeight: number = 0;

  // Margins in vw and vh
  private margin = {
    top: 1,
    right: 1.2,
    bottom: 5,
    left: 2.5
  };

  private techniquesHierarchy = [
    { parent: "Drawing", sub: "drawing" },
    { parent: "Drawing", sub: "drawing: chalk" },
    { parent: "Drawing", sub: "drawing: charcoal" },
    { parent: "Drawing", sub: "drawing: pen and ink" },
    { parent: "Painting", sub: "painting" },
    { parent: "Painting", sub: "painting: aquarelle" },
    { parent: "Painting", sub: "painting: gouache" },
    { parent: "Painting", sub: "painting: oil" },
    { parent: "Painting", sub: "painting: tempera" },
    { parent: "Mural Painting", sub: "mural painting" },
    { parent: "Mural Painting", sub: "mural painting: fresco" },
    { parent: "Other", sub: "pastel" },
    { parent: "Other", sub: "mixed media" },
    { parent: "Other", sub: "monotype" },
    { parent: "Other", sub: "other medium" }
  ];
  
  

  // Define the order of techniques
  private techniquesOrder: string[] = [
    "drawing",
    "drawing: chalk",
    "drawing: charcoal",
    "drawing: pen and ink",
    "painting",
    "painting: aquarelle",
    "painting: gouache",
    "painting: oil",
    "painting: tempera",
    "mural painting",
    "mural painting: fresco",
    "pastel",
    "mixed media",
    "monotype",
    "other medium"
  ];



  constructor(private selectionService: SelectionService,
    private decisionService: DecisionService,
    private artistService: ArtistService
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.selectionService.currentAllArtists.subscribe((artists: Artist[] | null) => {
        this.allArtists = artists || [];
        this.tryInitialize();
      })
    );

    this.subscriptions.add(
      this.selectionService.currentArtists.subscribe((artists: Artist[] | null) => {
        this.selectedArtists = artists;
        this.tryInitialize();
      })
    );
    this.selectionService.currentFocusedCluster.subscribe((cluster: Artist[]| null) => {
      this.selectedCluster = cluster;
      this.tryInitialize();
    });

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
    if (!this.chartContainer) return;
    this.tryInitialize();

   
  }

  tryInitialize(): void {
    if(this.allArtists.length === 0){
      this.isLoading = true;
      return;
    }else{
      this.createChart();
    }
    
  };

  private createChart(): void {
    this.createSvg();
    this.drawBars();
    this.isLoading = false;
  }

  private createSvg(): void {
     // Remove any existing SVG elements
     d3.select(this.chartContainer.nativeElement).select("figure.svg-container").select("svg").remove();

     const element = this.chartContainer.nativeElement.querySelector('figure.svg-container');
    const margin = {
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
      .attr('viewBox', `0 0 ${element.offsetWidth} ${element.offsetHeight}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.contentWidth = width;
    this.contentHeight = height;


  }
// Helper method to combine the techniques of multiple selected artists
private accumulateTechniqueDistribution(artists: Artist[]): Map<string, number> {
  const accumulatedDistribution = new Map<string, number>();
  artists.forEach((artist) => {
    artist.techniques.forEach((technique) => {
      accumulatedDistribution.set(technique, (accumulatedDistribution.get(technique) || 0) + 1);
    });
  });
  return accumulatedDistribution;
}

  private drawBars(): void {
    if (!this.allArtists.length) return;

    const tooltip = d3.select("div#tooltip");
    

    const showTooltip = (event: any, data: any) => {
      let tooltipText = '';
    
      // Check if both nonselectedArtists and selectedArtists exist
      if (data.nonselectedArtists && data.selectedArtists) {
          tooltipText = `${data.selectedArtists}/${data.nonselectedArtists + data.selectedArtists} artworks`;
      } 
      // If only nonselectedArtists exists
      else if (data.nonselectedArtists) {
          tooltipText = `${data.nonselectedArtists} artworks`;
      } 
      // If only selectedArtists exists
      else {
          tooltipText = `${data.selectedArtists} artworks`;
      }
  
      tooltip.style("display", "block")
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY + 5}px`)
          .style("color", "black")
          .html(tooltipText);
    };

    const hideTooltip = () => {
        tooltip.style("display", "none");
    };
  
    const selectedArtists = this.selectedArtists || [];
  
    if (selectedArtists && selectedArtists.length === 0) {
      this.nonselectedArtists = this.allArtists;
    } else {
      if (this.selectedArtists?.length === this.selectedCluster?.length) {
        this.nonselectedArtists = [];
      } else {
        if (this.selectedCluster) {
          this.nonselectedArtists = this.selectedCluster.filter(artist => !selectedArtists.find(a => a.id === artist.id));
        }
      }
    }
  
    // Combine techniques of selected artists if there are multiple selected artists
    let selectedTechniqueDistribution: Map<string, number>;
    if (selectedArtists && selectedArtists.length > 1 && this.selectedCluster && selectedArtists.length < this.selectedCluster.length) {
      selectedTechniqueDistribution = this.accumulateTechniqueDistribution(selectedArtists);
    } else {
      selectedTechniqueDistribution = this.calculateTechniqueDistribution(selectedArtists);
    }
  
    const nonselectedTechniqueDistribution = this.calculateTechniqueDistribution(this.nonselectedArtists);
    const combinedData = this.prepareStackedData(nonselectedTechniqueDistribution, selectedTechniqueDistribution);
  
  

    // Filter techniques order to include only those present in the data
    const presentTechniques = this.techniquesOrder.filter(technique =>
      combinedData.some(data => data.technique === technique && (data.nonselectedArtists > 0 || data.selectedArtists > 0))
    );
  
    // Group techniques by their parent category
    const groupedTechniques = d3.group(presentTechniques, technique => this.techniquesHierarchy.find(d => d.sub === technique)?.parent);
  
    const groupPadding = 0.05; // Adjust this value for padding between groups
    const barPadding = 0.05; // Adjust this value for padding between bars within a group
  
    // Calculate the total number of bars (including padding between groups)
    let totalBars = 0;
    groupedTechniques.forEach((techniques, parent) => {
      totalBars += techniques.length;
    });
    const groupCount = groupedTechniques.size;
    const totalWidth = this.contentWidth;
    const totalPaddingWidth = (groupCount - 1) * groupPadding * totalWidth;
    const barWidth = (totalWidth - totalPaddingWidth) / totalBars;
  

    



    let currentXPosition = 0;
    const techniquePositions: { technique: string; x: number }[] = [];
  
    groupedTechniques.forEach((techniques, parent) => {
      techniques.forEach((technique) => {
        techniquePositions.push({ technique, x: currentXPosition });
        currentXPosition += barWidth + (barWidth * barPadding);
      });
      currentXPosition += groupPadding * totalWidth; // Add padding after each group
    });
  
    // Create a custom x-scale based on calculated positions
    const xScale = d3.scaleOrdinal<string, number>()
      .domain(techniquePositions.map(d => d.technique))
      .range(techniquePositions.map(d => d.x));
  
    // Define y-scale
    const maxTechniqueValue = d3.max(combinedData, d => d.nonselectedArtists + d.selectedArtists) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, maxTechniqueValue])
      .range([this.contentHeight, 0])
      .nice();
  
 


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
  


    // Stack data for the bars
    const stack = d3.stack()
      .keys(['nonselectedArtists', 'selectedArtists']);
  
    const stackedData = stack(combinedData);
  
    // Draw bars for each technique
    this.svg.append("g")
      .selectAll("g")
      .data(stackedData)
      .enter().append("g")
      .selectAll("rect")
      .data((d: any) => d)
      .enter().append("rect")
      .attr("x", (d: any) => {
        const techniquePosition = techniquePositions.find(pos => pos.technique === d.data.technique);
        return techniquePosition ? techniquePosition.x : 0;
      })
      .attr("y", (d: any) => yScale(d[1]))
      .attr("height", (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr("width", barWidth)
      .attr("stroke", "black")
      .attr("stroke-width", 0.2)
      .attr("opacity", (d: any, i: number, nodes: any) => {
        const seriesIndex = nodes[i].parentNode.__data__.key;
        return seriesIndex === 'nonselectedArtists' && selectedArtists.length > 0 ? 0.2 : 1;
      })

      .attr("fill", 'grey')
      .on('mouseover', (event:any, d:any) => {
        //console.log(d)
        if (d.data) {
            showTooltip(event, d.data);
        }
    })
      .on('mousemove',  (event:any, d:any) => {
        //console.log(d)
        if (d.data) {
            showTooltip(event, d.data);
        }
    })
      .on('mouseout', hideTooltip);


    


      
    // Draw y-axis
    const yAxis = this.svg.append("g")
    .call(d3.axisLeft(yScale));

    yAxis.selectAll("text")
    .style('color', 'black')
      .style("font-size", "0.6vw"); // Adjust the size as needed


      
// Draw x-axis with individual technique labels
const xAxis = this.svg.append("g")
.attr("transform", `translate(${barWidth/2},${this.contentHeight})`)
.call(d3.axisBottom(xScale)
  .tickSizeOuter(0)  // This removes the outer ticks
  .tickFormat((d: string) => d));

  
// Adjust label alignment and rotation
xAxis.selectAll("text")
.attr("transform", "translate(-10,0)rotate(-45)") // Adjust rotation and position
.style("text-anchor", "end")
    .style("font-weight", '700')
    .style("font-size", "0.6vw")
    .style("opacity", (d: string) => selectedArtists.length > 0 ? (this.isTechniqueSelected(d, selectedArtists) ? '1' : '0.4') : '1')

    .style("color", 'black')
    .style("font-weight", (d: string) => selectedArtists.length > 0 ? (this.isTechniqueSelected(d, selectedArtists) ? 'bold' : '700') : '700')
    .on('mouseover', (event:any, technique:any) => {
      const data = combinedData.find(d => d.technique === technique);
      if (data) {
        
          const isGrey = d3.select(event.target).style("opacity") === "0.4"; // or check color if you prefer
         if(!isGrey){
          showTooltip(event, data);
         }
      }
  })
  .on('mouseout', hideTooltip);





// Adjust opacity based on data
xAxis.style("opacity", (d: string) => !this.hasTechniqueValue(d, combinedData) ? 1 : 0.3);
      // Draw a manual horizontal line where the x-axis should be
      this.svg.append("line")
      .attr("x1", 0)  // Start at the leftmost edge (after the left margin)
      .attr("y1", this.contentHeight)  // Position at the bottom of the chart (y-axis height)
      .attr("x2", this.contentWidth+barWidth)  // End at the rightmost edge (before the right margin)
      .attr("y2", this.contentHeight)  // Keep it horizontal by maintaining the same y-coordinate
      .attr("stroke", "black")  // Set the color of the line
      .attr("stroke-width", 1);  // Set the thickness of the line
  
  }
  
  
  
  private isTechniqueSelected(technique: string, selectedArtists: Artist[]): boolean {
    return selectedArtists.some(artist => artist.techniques.includes(technique));
  }

  private hasTechniqueValue(technique: string, combinedData: any[]): boolean {
    const dataEntry = combinedData.find(d => d.technique === technique);
    return dataEntry ? (dataEntry.nonselectedArtists > 0 || dataEntry.selectedArtists > 0) : false;
  }
  
  private calculateTechniqueDistribution(artists: Artist[]): Map<string, number> {
    const techniqueDistribution = new Map<string, number>();
    artists.forEach((artist) => {
      artist.techniques.forEach((technique) => {
        techniqueDistribution.set(technique, (techniqueDistribution.get(technique) || 0) + 1);
      });
    });
    return techniqueDistribution;
  }
  
  private prepareStackedData(nonselectedTechniqueDistribution: Map<string, number>, selectedTechniqueDistribution: Map<string, number>): any[] {
    const combinedData: any[] = [];
  
    this.techniquesOrder.forEach(technique => {
      const nonselectedCount = nonselectedTechniqueDistribution.get(technique) || 0;
      const selectedCount = selectedTechniqueDistribution.get(technique) || 0;
      combinedData.push({
        technique,
        nonselectedArtists: nonselectedCount,
        selectedArtists: selectedCount
      });
    });
  
    return combinedData;
  }
}
