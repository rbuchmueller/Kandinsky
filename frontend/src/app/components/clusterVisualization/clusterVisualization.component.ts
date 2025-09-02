import { Component, OnInit, ViewChild, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as d3 from 'd3';
import { first, last, Subscription } from 'rxjs';
import { SelectionService } from '../../services/selection.service';
import { DecisionService } from '../../services/decision.service';
import { ArtistService } from '../../services/artist.service';
import { Artist, ArtistNode, ClusterNode } from '../../models/artist';
import exhibited_with from '../../models/exhibited_with';
import { GenerativeAIService } from '../../services/generativeAI.service';
import { NotificationComponent } from '../notification/notification.component';
import Fuse from 'fuse.js';

interface SearchedArtist {
  id: number;
  name: string;
  artworks: number;
}

interface InterCommunityEdge extends d3.SimulationLinkDatum<ClusterNode> {
  source: number | ClusterNode;
  target: number | ClusterNode;
  sharedExhibitionMinArtworks: number;
}


@Component({
  selector: 'app-clusterVisualization',
  templateUrl: './clusterVisualization.component.html',
  styleUrls: ['./clusterVisualization.component.css']
})
export class ClusterVisualizationComponent implements OnInit, OnChanges, OnDestroy {

    @ViewChild('matrix', { static: true }) private chartContainer!: ElementRef;
    aiResponse: string = ''; // Store the AI response
    aiSmallTitle: string = ''; // Store the AI small title

    //search bar
    public searchedArtist: SearchedArtist | null = null;
    public allSearchbarArtists: Map<number, { name: string; artworks: number }> = new Map();
    public notInCurrentRange: boolean = false;
    public searchQuery: string = '';
    public filteredArtists: { id: number; name: string; artworks: number }[] = [];
    private fuse: Fuse<{ id: number; name: string; artworks: number }>;


private previousOnHoverCountry: string | null = null;
private previousOnHoverArtists: Set<number> | null = null;
    public allArtists: Artist[] = [];



    public isLoading: boolean = true;
    private firstK: number = -1;
    private isIniatialized: boolean = false;
    public aiLoading:boolean = false;
  
    private svg: any;
    private contentWidth: number = 0;
    private contentHeight: number = 0;
    private margin = {
      top: 0.5,
      right: 0.5,
      bottom: 1.5,
      left: 0.5
    };
  
    private marginSwitched = {
      top: 3,
      right: 0.5,
      bottom: 1.5,
      left: 0.5
    };
  
    private arrowYBoundary: number = 0;
  
    private innerRadius: number = 0;
    private clusters: Artist[][] = [];
    private intraCommunityEdges: exhibited_with[][] = [];
    private interCommunityEdges: InterCommunityEdge[] = [];
    private singleInterCommunityEdges: exhibited_with[][] = [];
    private clusterNodes: ClusterNode[] = [];
    private artistClusterMap: Map<number, ClusterNode> = new Map<number, ClusterNode>();
    private artistNodes: { [clusterId: number]: ArtistNode[] } = {};
    selectedClusterNode: ClusterNode | null = null;
    private g: any; // Group for zooming

    private previouslyConnectedClusterNodeIds =new Set<number>();

    private previouslyConnectedNodeIds =new Set<number>()

    private previouslyLowOpacity:boolean=false;

    isPulsing = false;



    private paddingRatio: number = 0.05; // 5% padding
    private previousOnHover: number | null = null;
    private previouslySelected: boolean= false;
    private allCountriesByCategory: { [key: string]: string[] } = {
      nationality: [],
      birthcountry: [],
      deathcountry: [],
      mostexhibited: []
    };
    private allOldCountriesByCategory: { [key: string]: string[] } = {
      birthcountry: [],
      deathcountry: [],
      mostexhibited: []
    };

    private modernMap:boolean = true;
    
  
  
    private subscriptions: Subscription = new Subscription();
  
    private minClusterRadius = 200; // Minimum radius for each cluster
  
    private edgeColorScale = d3.scaleSequential(d3.interpolateGreys).domain([0, 1]);
  
    private degreesMap: { [clusterId: number]: Map<number, number> } = {};
    private totalExhibitionsMap: { [clusterId: number]: Map<number, number> } = {};
    private totalExhibitedArtworksMap: { [clusterId: number]: Map<number, number> } = {};
    private differentTechniquesMap: { [clusterId: number]: Map<number, number> } = {};
  

    private cellHeight: number = 0;
    private cellWidth: number = 0;
    
    private regionOrder: string[] = ["North Europe", "Eastern Europe","Southern Europe", "Western Europe", "Others","\\N"];

    private regionOldOrder: string[] = ["North Europe", "Eastern Europe", "Central Europe","Southern Europe", "Western Europe", "Others","\\N"];
  
    private selectedNode: [SVGCircleElement, Artist] | null = null;
    private selectedCluster: any = null;
    private isNodeClick: boolean = false;

    public selectedNodes: Array<[SVGCircleElement, string]> = []; // To store multiple selected nodes
    private selectedEdges: Map<string, { edge: any, artistIds: number[] }> = new Map();
    private connectedNodeIds: Set<number> = new Set();


  
    private clusterSimulation: d3.Simulation<ClusterNode, undefined> | null = d3.forceSimulation<ClusterNode>();
    
  
    public aiTitle =''
  
    private countryIndexMap = new Map<string, number>();
  
    private clusterCountryCentroids: { [clusterId: number]: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } } = {};
    private simulations: { [clusterId: number]: d3.Simulation<ArtistNode, undefined> }  = {};
    private simulationsN: { [clusterId: number]: d3.Simulation<ArtistNode, undefined> }  = {};
    private simulationsB: { [clusterId: number]: d3.Simulation<ArtistNode, undefined> }  = {};
    private simulationsD: { [clusterId: number]: d3.Simulation<ArtistNode, undefined> }  = {};
    private simulationsM: { [clusterId: number]: d3.Simulation<ArtistNode, undefined> }  = {};
    private countryCentroids: { [category: string]: { [clusterId: number]: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } } } = {};
    private OldCountryCentroids: { [category: string]: { [clusterId: number]: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } } } = {};

  
  
  

    private currentSelection: {
  type: 'artist' | 'cluster' | 'none';
  artistNode?: ArtistNode;
  clusterNode?: ClusterNode;
} = { type: 'none' };

  
  
  
  
    constructor(
      private selectionService: SelectionService,
      private decisionService: DecisionService,
      private artistService: ArtistService,
      private generativeAIService: GenerativeAIService
    ) {
      this.fuse = new Fuse([], {
        keys: ['name'],
        threshold: 0.3, // Adjust threshold for error tolerance
      });
      //this.handleNodeClick = this.handleNodeClick.bind(this);
    }
  
    ngOnInit(): void {
      //default data
      this.createChart();
  
      this.subscriptions.add(this.decisionService.currentSize.subscribe(size => {
        this.updateNetworkOnSunburstChange(this.decisionService.getDecisionSunburst());
      }));
      
  
      this.subscriptions.add(this.decisionService.currentK.subscribe(k => {
        this.updateCluster(k);
      }));
      this.subscriptions.add(this.decisionService.currentSearchedArtistId.subscribe((id:string|null) => this.highlightArtistNode(id)));
  
      this.subscriptions.add(this.decisionService.currentSunburst.subscribe(category => {
        this.updateNetworkOnSunburstChange(category) // Redraw the matrix with the filtered row
        this.updateMap(category);
      }));

      this.subscriptions.add(this.selectionService.currentSelectModern.subscribe(modern => {
        this.modernMap=modern;
        const category = this.decisionService.getDecisionSunburst();
        this.updateNetworkOnSunburstChange(category);
        this.updateMap(category);

      }));

      this.subscriptions.add(this.selectionService.currentHoveredCountry.subscribe(country => {
        this.hoverOnCountry(country);
      }));
      this.subscriptions.add(this.selectionService.currentHoveredOldCountry.subscribe(country => {
        this.hoverOnCountry(country);
      }));

      this.subscriptions.add(this.selectionService.currentHoveredArtist.subscribe(artistId => {
        this.hoverOnArtist(artistId);
      }));
      
      this.subscriptions.add(this.decisionService.currentRanking.subscribe(ranking => {  
        this.updateClusterPosition(ranking);
        this.updateRankingArrow(ranking);
      }));
      window.addEventListener('resize', this.onResize.bind(this));

     
    }


  startPulsing() {
    // Start pulsing
    this.isPulsing = true;

    // Stop pulsing after 5 seconds
    setTimeout(() => {
      this.isPulsing = false;
    }, 5000); // 5000 milliseconds = 5 seconds
  }


    clearSearch() {
      this.searchQuery = '';
      this.filteredArtists = [];
      this.notInCurrentRange = false;
      this.searchedArtist = null;
    }
    
    
    onArtistSearch() {
      if (this.searchQuery.trim() === '') {
        this.filteredArtists = [];
        this.notInCurrentRange = false;
        this.highlightArtistNode(null);
        return;
      }
    
      // Perform fuzzy search
      const results = this.fuse.search(this.searchQuery);
      this.filteredArtists = results
      .map((result) => result.item)
      .sort((a, b) => b.artworks - a.artworks);  // Sorting by artworks
      
      //console.log('Filtered Artists:', this.filteredArtists); // Check if results are populated
    }
    
    selectArtist(artist: { id: number; name: string; artworks: number }) {
      this.searchedArtist = artist;
      this.searchQuery = artist.name;
      this.filteredArtists = [];
      
      // Convert the Map to an array and then find the artist
      const artistInRange = Array.from(this.allArtists.values()).find((a) => a.firstname.toString() + ' ' + a.lastname.toString() === artist.name.toString());
    
      if (artistInRange) {
        this.notInCurrentRange = false;
        this.highlightArtistNode(artist.id.toString());
      } else {
        this.notInCurrentRange = true;
      }
    }
    

    
  

  

    private initializeRankingArrow(): void {
      if (this.g.select(".ranking-arrow-group").empty()) {
          this.g.append("g")
              .attr("class", "ranking-arrow-group")
              .attr("transform", `translate(${this.contentWidth / 2}, -10)`); // Adjust as needed
      }
  }
  


  private updateRankingArrow(ranking: string): void {
    if(this.clusters.length === 1) return;
    let leftLabel = '';
    let rightLabel = '';

    // Use a switch statement to handle different ranking cases
    switch (ranking) {
        case 'exhibitions':
        case 'artworks':
            leftLabel = 'High';
            rightLabel = 'Low';
            break;
        case 'techniques':
            leftLabel = 'Most';
            rightLabel = 'Least';
            break;
        case 'birthyear':
        case 'deathyear':
            leftLabel = 'Earliest';
            rightLabel = 'Latest';
            break;
        default:
            leftLabel = 'Left';
            rightLabel = 'Right';
    }
if(!this.g) return;

    // Select the existing arrow group in the fixedElements group
    const arrowGroup = this.g.select(".ranking-arrow-group");

    // Clear any existing content in the group
    arrowGroup.selectAll("*").remove();

    // Draw the left text (initially invisible)
    const leftText = arrowGroup.append("text")
        .attr("x", -this.contentWidth / 2 + this.contentWidth / 100) // Initial estimate
        .attr("y", this.contentHeight / 100 * 4.2)
        .attr("text-anchor", "center")
        .style("font-weight", "600")
        .style("font-size", "0.85vw")
        .style("fill", "#e5aeff")  // Matching pink color
        .style("visibility", "hidden") // Initially hide
        .text(leftLabel);

    // Draw the right text (initially invisible)
    const rightText = arrowGroup.append("text")
        .attr("x", this.contentWidth / 2 - this.contentWidth / 100*2) // Initial estimate
        .attr("y", this.contentHeight / 100 * 4.2)
        .attr("text-anchor", "center")
        .style("font-weight", "600")
        .style("font-size", "0.85vw")
        .style("fill", "#e5aeff")  // Matching pink color
        .style("visibility", "hidden") // Initially hide
        .text(rightLabel);

    // Measure text widths
    const leftTextWidth = leftText.node()?.getBBox().width || 0;
    const rightTextWidth = rightText.node()?.getBBox().width || 0;

    // Adjust text positions based on measured widths
    leftText
        .attr("x", -this.contentWidth / 2 + leftTextWidth / 2 - this.contentWidth / 100) // Adjust based on width
        .style("visibility", "visible"); // Make it visible after adjustment

    rightText
        .attr("x", this.contentWidth / 2 - rightTextWidth / 2 - this.contentWidth / 100*2)
        .style("visibility", "visible"); // Make it visible after adjustment

    // Adjust the arrow line to fit between the adjusted text positions
    arrowGroup.append("line")
        .attr("x1", -this.contentWidth / 2 + leftTextWidth + this.contentWidth / 100 * 3) // Start right after left text ends
        .attr("x2", this.contentWidth / 2 - rightTextWidth - this.contentWidth / 100 * 3) // End right before right text starts
        .attr("y1", this.contentHeight / 100 * 3.2)
        .attr("y2", this.contentHeight / 100 * 3.2)
        .attr("stroke", "#e5aeff") // Pink color
        .attr("stroke-width", this.contentWidth / 200) // Adjust stroke-width for scaling
        .attr("stroke-dasharray", `${this.contentWidth / 200},${this.contentWidth / 200}`); // Make dash size proportional

    // Draw arrowhead adjusted to the new end of the line
    arrowGroup.append("path")
        .attr("d", d3.line()([
            [this.contentWidth / 2 - rightTextWidth - this.contentWidth / 100 * 3, this.contentHeight / 100 * 3.2 - this.contentWidth / 200],
            [this.contentWidth / 2 - rightTextWidth - this.contentWidth / 100 * 2, this.contentHeight / 100 * 3.2],
            [this.contentWidth / 2 - rightTextWidth - this.contentWidth / 100 * 3, this.contentHeight / 100 * 3.2 + this.contentWidth / 200]
        ]))
        .attr("fill", "#e5aeff") // Pink color
        .classed("arrowhead-path", true); // Add a specific class to the arrowhead

        this.arrowYBoundary = this.contentHeight / 100 * 3.2; // Save the y-boundary

}



  
  
    private updateClusterPosition(ranking: string): void {
      if (!this.svg) return;
      if(this.clusters.length ===1) return;
      // Determine the scale based on the ranking
      let xScale;

  
      switch (ranking) {
        case 'exhibitions':
            const minTotalExhibitions = d3.min(this.clusterNodes, d => d.totalExhibitions) || 0;
            const minExhibitionNode = this.clusterNodes.find(d => d.totalExhibitions === minTotalExhibitions);
            const maxTotalExhibitions = d3.max(this.clusterNodes, d => d.totalExhibitions) || 0;
            const maxExhibitionNode = this.clusterNodes.find(d => d.totalExhibitions === maxTotalExhibitions);
            const leftExhibitionRange = maxExhibitionNode ? maxExhibitionNode.outerRadius: this.cellWidth / 2;
            const rightExhibitionRange = minExhibitionNode ? minExhibitionNode.outerRadius : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalExhibitions, minTotalExhibitions])
                .range([leftExhibitionRange, this.contentWidth - rightExhibitionRange]);
            break;

        case 'techniques':
            const minTotalTechniques = d3.min(this.clusterNodes, d => d.totalTechniques) || 0;
            const minTechniqueNode = this.clusterNodes.find(d => d.totalTechniques === minTotalTechniques);
            const maxTotalTechniques = d3.max(this.clusterNodes, d => d.totalTechniques) || 0;
            const maxTechniqueNode = this.clusterNodes.find(d => d.totalTechniques === maxTotalTechniques);
            const leftTechniqueRange = maxTechniqueNode ? maxTechniqueNode.outerRadius : this.cellWidth / 2;
            const rightTechniqueRange = minTechniqueNode ? minTechniqueNode.outerRadius : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalTechniques, minTotalTechniques])
                .range([leftTechniqueRange, this.contentWidth - rightTechniqueRange]);
            break;

        case 'artworks':
            const minTotalArtworks = d3.min(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
            const minArtworkNode = this.clusterNodes.find(d => d.totalExhibitedArtworks === minTotalArtworks);
            const maxTotalArtworks = d3.max(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
            const maxArtworkNode = this.clusterNodes.find(d => d.totalExhibitedArtworks === maxTotalArtworks);
            const leftArtworkRange = maxArtworkNode ? maxArtworkNode.outerRadius: this.cellWidth / 2;
            const rightArtworkRange = minArtworkNode ? minArtworkNode.outerRadius : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalArtworks, minTotalArtworks])
                .range([leftArtworkRange, this.contentWidth - rightArtworkRange]);
            break;

        case 'birthyear':
            const minBirthYear = d3.min(this.clusterNodes, d => d.meanBirthYear) || 1900;
            const minBirthYearNode = this.clusterNodes.find(d => d.meanBirthYear === minBirthYear);
            const maxBirthYear = d3.max(this.clusterNodes, d => d.meanBirthYear) || 1950;
            const maxBirthYearNode = this.clusterNodes.find(d => d.meanBirthYear === maxBirthYear);
            const leftBirthYearRange = maxBirthYearNode ? maxBirthYearNode.outerRadius : this.cellWidth / 2;
            const rightBirthYearRange = minBirthYearNode ? minBirthYearNode.outerRadius : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minBirthYear, maxBirthYear])
                .range([leftBirthYearRange, this.contentWidth - rightBirthYearRange]);
            break;

        case 'deathyear':
            const minDeathYear = d3.min(this.clusterNodes, d => d.meanDeathYear) || 1850;
            const minDeathYearNode = this.clusterNodes.find(d => d.meanDeathYear === minDeathYear);
            const maxDeathYear = d3.max(this.clusterNodes, d => d.meanDeathYear) || 1900;
            const maxDeathYearNode = this.clusterNodes.find(d => d.meanDeathYear === maxDeathYear);
            const leftDeathYearRange = maxDeathYearNode ? maxDeathYearNode.outerRadius : this.cellWidth / 2;
            const rightDeathYearRange = minDeathYearNode ? minDeathYearNode.outerRadius : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minDeathYear, maxDeathYear])
                .range([leftDeathYearRange, this.contentWidth - rightDeathYearRange]);
            break;

        case 'time':
            const minAvgDate = d3.min(this.clusterNodes, d => d.meanAvgDate.getTime()) || new Date(1850, 0, 1).getTime();
            const minTimeNode = this.clusterNodes.find(d => d.meanAvgDate.getTime() === minAvgDate);
            const maxAvgDate = d3.max(this.clusterNodes, d => d.meanAvgDate.getTime()) || new Date(1950, 0, 1).getTime();
            const maxTimeNode = this.clusterNodes.find(d => d.meanAvgDate.getTime() === maxAvgDate);
            const leftTimeRange = maxTimeNode ? maxTimeNode.outerRadius : this.cellWidth / 2;
            const rightTimeRange = minTimeNode ? minTimeNode.outerRadius  : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minAvgDate, maxAvgDate])
                .range([leftTimeRange, this.contentWidth - rightTimeRange]);
            break;

        default:
          const minTotalArtworks2 = d3.min(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
          const minArtworkNode2 = this.clusterNodes.find(d => d.totalExhibitedArtworks === minTotalArtworks2);
          const maxTotalArtworks2 = d3.max(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
          const maxArtworkNode2 = this.clusterNodes.find(d => d.totalExhibitedArtworks === maxTotalArtworks2);
          const leftArtworkRange2 = maxArtworkNode2 ? maxArtworkNode2.outerRadius: this.cellWidth / 2;
          const rightArtworkRange2 = minArtworkNode2 ? minArtworkNode2.outerRadius : this.cellWidth / 2;

          xScale = d3.scaleLinear()
              .domain([maxTotalArtworks2, minTotalArtworks2])
              .range([leftArtworkRange2, this.contentWidth - rightArtworkRange2]);
       
            break;
    }

  
      // Create an array of clusterIds ordered by their position in the xScale
      const orderedClusterIds = this.clusterNodes
          .map(clusterNode => ({
              clusterId: clusterNode.clusterId,
              xPosition: xScale(ranking === 'exhibitions' ? clusterNode.totalExhibitions :
                                ranking === 'artworks' ? clusterNode.totalExhibitedArtworks :
                                ranking === 'techniques' ? clusterNode.totalTechniques :
                                ranking === 'birthyear' ? clusterNode.meanBirthYear :
                                ranking === 'deathyear' ? clusterNode.meanDeathYear :
                                ranking === 'time' ? clusterNode.meanAvgDate.getTime() :
                                clusterNode.totalExhibitedArtworks) // Default to artworks
          }))
          .sort((a, b) => a.xPosition - b.xPosition) // Sort by xPosition
          .map(item => item.clusterId); // Extract only the ordered clusterIds
  
  
          this.decisionService.changeRankingOrder(orderedClusterIds);
          // Update the force simulation with the new xScale
      const simulation = this.clusterSimulation;
      if (simulation) {
          simulation
              .force('x', d3.forceX().x((d: any) => {
                  switch (ranking) {
                      case 'exhibitions': return xScale(d.totalExhibitions);
                      case 'artworks': return xScale(d.totalExhibitedArtworks);
                      case 'techniques': return xScale(d.totalTechniques);
                      case 'birthyear': return xScale(d.meanBirthYear);
                      case 'deathyear': return xScale(d.meanDeathYear);
                      case 'time': return xScale(d.meanAvgDate.getTime());
                      default: return xScale(d.totalExhibitedArtworks);
                  }
              }))
              .alpha(1)
              .restart();
  
          if (this.clusterNodes) {
              // Transition the clusters to their new positions
              this.g.selectAll(".cluster")
                  .data(this.clusterNodes)
                  .transition()
                  .duration(2000)
                  .attr("transform", (d: ClusterNode) => {
                      switch (ranking) {
                          case 'exhibitions': return `translate(${xScale(d.totalExhibitions)}, ${this.contentHeight / 2})`;
                          case 'techniques': return `translate(${xScale(d.totalTechniques)}, ${this.contentHeight / 2})`;
                          case 'artworks': return `translate(${xScale(d.totalExhibitedArtworks)}, ${this.contentHeight / 2})`;
                          case 'birthyear': return `translate(${xScale(d.meanBirthYear)}, ${this.contentHeight / 2})`;
                          case 'deathyear': return `translate(${xScale(d.meanDeathYear)}, ${this.contentHeight / 2})`;
                          case 'time': return `translate(${xScale(d.meanAvgDate.getTime())}, ${this.contentHeight / 2})`;
                          default: return `translate(${xScale(d.totalExhibitedArtworks)}, ${this.contentHeight / 2})`;
                      }
                  });
          }
  
          this.clusterSimulation = simulation;
      }
  }
  


  private hoverOnArtist(artistId: number | null) {
    if (!this.svg) return;

    if (artistId) {
        this.previousOnHover = artistId;
        
        // Check if the current circle's stroke is black
        const currentCircle = this.g.selectAll('.artist-node')
            .filter((d: any) => d.artist.id === artistId)
            .node() as SVGCircleElement;

        if (currentCircle) {
            const opacity = d3.select(currentCircle).style('opacity');
            
            this.previouslyLowOpacity = opacity === '0.2';
        }

        const clusterId = this.artistClusterMap.get(artistId)?.clusterId;
        //console.log(clusterId);

        if (clusterId !== undefined) {
            const width = 0.07 * this.clusterNodes[clusterId].innerRadius / 100;
            // Reduce opacity of all clusters
            if(!this.selectedClusterNode){
            this.g.selectAll('.cluster').style('opacity', '0.2');
             // Set opacity of the selected cluster to 1
             this.g.selectAll(`.cluster-${clusterId}`).style('opacity', '1');
            }
           

            this.g.selectAll('.artist-node').filter((d: any) => d.cluster === clusterId && d.artist.id !== artistId).style('opacity', '0.9');
            this.g.selectAll('.artist-node').filter((d: any) => d.cluster !== clusterId).style('opacity', '0.2');
            this.g.selectAll('.artist-node').filter((d: any) => d.artist.id === artistId).style('opacity', '1')
                .style("stroke-width", `${width}vw`)
                .style("stroke", "grey");
            
        }

    } else {

        // Extract the IDs of all currently selected nodes
        const selectedNodeIds = this.selectedNodes.map(([node]) => {
            const artistNodeData = d3.select(node as SVGCircleElement).datum() as ArtistNode;
            return artistNodeData.artist.id;
        });
        
        
        // Reset all elements to full opacity
        if (this.selectedClusterNode || this.selectedNodes.length > 0) {
          
            //console.log('selected cluster', this.selectedClusterNode);

            // Set full opacity for the selected cluster and reset opacity for other clusters
            this.svg.selectAll('.cluster')
                .filter((d: any) => d.clusterId === this.selectedClusterNode?.clusterId)
                .style("opacity", 1);

            

                this.g.selectAll('.artist-node')
                .filter((d: any) => d.artist.cluster === this.selectedClusterNode?.clusterId)
                .style('opacity', '1');
                
                let lastSelectedNode = null;
                lastSelectedNode= this.selectedNode ? this.selectedNode[1].id : null;
                if(this.selectedNodes.length > 0){
                  const artistNodeData = d3.select(this.selectedNodes[this.selectedNodes.length - 1][0] as SVGCircleElement).datum() as ArtistNode;
                  lastSelectedNode =  artistNodeData.id 
                }
            

               
                if (this.previouslyConnectedClusterNodeIds && this.previouslyConnectedClusterNodeIds.size > 0 && lastSelectedNode) {
                  // Now handle the case for previously connected nodes
                  this.g.selectAll('.artist-node')
                      .filter((d: any) => !this.previouslyConnectedClusterNodeIds.has(d.id) && d.id !== lastSelectedNode && d.artist.cluster === this.selectedClusterNode?.clusterId)
                      .style('opacity', 0.2); // Adjust opacity
              }
              


        } else {
            // Reset all clusters and nodes to full opacity
            this.g.selectAll('.cluster, .artist-node').style("opacity", 1);
        }

        // Set stroke to black for all nodes that are in the selectedNodeIds array
        this.g.selectAll('.artist-node')
            .style("stroke", (d: any) => selectedNodeIds.includes(d.artist.id) ? "black" : "none");

            if (this.previouslyConnectedNodeIds && this.previouslyConnectedNodeIds.size > 0) {
              //console.log('node ids', this.previouslyConnectedNodeIds);
              
              // Now handle the case for previously connected nodes
              this.g.selectAll('.artist-node')
                  .filter((d: any) => this.previouslyConnectedNodeIds.has(d.id))
                  .style('opacity', 0.8) // Adjust opacity
                  .style("stroke", "grey") // Set stroke to grey
                  .style("stroke-width", `${0.07 * this.innerRadius / 100}vw`); // Adjust stroke width if needed
          }
         

         
            

        this.previousOnHover = null;
    }
}


  
    

    private hoverOnCountry(country: string | null) {
      const category = this.decisionService.getDecisionSunburst();
  
      if(!this.svg)
        return;
      if (country) {
        this.previousOnHoverCountry = country;
        

          // Highlight paths matching the hovered country
          this.svg.selectAll('path:not(.arrowhead-path)')
          .style("opacity", (d: any) => {
            if (!d || !d.country) return 0.2; // Check if 'd' and 'd.country' exist
            return d.country === country ? 1 : 0.2;
        });
          // Identify artist nodes belonging to the hovered country and gather their IDs
          const artistIdsWithOpacity1 = new Set<number>();
          this.svg.selectAll('.artist-node')
              .style("opacity", (d: any) => {
                  const match = this.getArtistCountryBasedOnCategory(d.artist, category) === country;
                  if (match) artistIdsWithOpacity1.add(d.artist.id);
                  return match ? 1 : 0.4;
              });

              this.previousOnHoverArtists=artistIdsWithOpacity1;
  
          // Adjust edge opacity based on whether their source or target belongs to the selected country
          this.svg.selectAll('.artist-edge')
              .style("opacity", (d: any) =>
                  artistIdsWithOpacity1.has(d.source.id) || artistIdsWithOpacity1.has(d.target.id) ? 1 : 0
              );
      } else if(this.selectedNodes || this.selectedClusterNode) {

        this.svg.selectAll('path:not(.arrowhead-path)')
        .filter((d: any) => d.country === this.previousOnHoverCountry)
        .style("opacity", 0.2);
  
        let lastSelectedNode = null;
        let lastSelectedNodeCluster = null;
        lastSelectedNode= this.selectedNode ? this.selectedNode[1].id : null;
        if(this.selectedNodes.length > 0){
          const artistNodeData = d3.select(this.selectedNodes[this.selectedNodes.length - 1][0] as SVGCircleElement).datum() as ArtistNode;
          lastSelectedNode =  artistNodeData.id 
          lastSelectedNodeCluster = artistNodeData.artist.cluster;
        }
        const artistIdsWithOpacity1 = this.previousOnHoverArtists;
        if(artistIdsWithOpacity1 &&lastSelectedNode){
        this.svg.selectAll('.artist-node')
        .filter((d: any) => artistIdsWithOpacity1.has(d.artist.id))
        .style("opacity", 0.2);
          
            this.previousOnHoverArtists=artistIdsWithOpacity1;
  
            
        // Adjust edge opacity based on whether their source or target belongs to the selected country
        this.svg.selectAll('.artist-edge')
        .filter((d: any) => (artistIdsWithOpacity1.has(d.source.id) || artistIdsWithOpacity1.has(d.target.id))&& !(d.source.id === lastSelectedNode || d.target.id === lastSelectedNode))
        .style("opacity", 0);
        }
       
        // Extract the IDs of all currently selected nodes
        const selectedNodeIds = this.selectedNodes.map(([node]) => {
          const artistNodeData = d3.select(node as SVGCircleElement).datum() as ArtistNode;
          return artistNodeData.artist.id;
      });
      if (selectedNodeIds.length === 0 && this.selectedNode) {
        const nodeId = this.selectedNode[1].id;
selectedNodeIds.push(nodeId);
      }

     
         
    
      
      // Reset all elements to full opacity
      if (this.selectedClusterNode) {
        
          //console.log('selected cluster', this.selectedClusterNode);

          // Set full opacity for the selected cluster and reset opacity for other clusters
          this.svg.selectAll('.cluster')
              .filter((d: any) => d.clusterId === this.selectedClusterNode?.clusterId)
              .style("opacity", 1);

          

              this.g.selectAll('.artist-node')
              .filter((d: any) => d.artist.cluster === this.selectedClusterNode?.clusterId)
              .style('opacity', '1');
              
              
          

             
              if (this.previouslyConnectedClusterNodeIds && this.previouslyConnectedClusterNodeIds.size > 0 && lastSelectedNode && lastSelectedNodeCluster) {
                // Now handle the case for previously connected nodes
               // console.log('HALLO')
                this.g.selectAll('.artist-node')
                    .filter((d: any) => !this.previouslyConnectedClusterNodeIds.has(d.id) && d.id !== lastSelectedNode && d.artist.cluster === this.selectedClusterNode?.clusterId)
                    .style('opacity', 0.2); // Adjust opacity
                   
                    this.svg.selectAll(`.cluster-${lastSelectedNodeCluster} path`).style("opacity", 1);

            }



            

      } 

      // Set stroke to black for all nodes that are in the selectedNodeIds array
      this.g.selectAll('.artist-node')
          .style("stroke", (d: any) => selectedNodeIds.includes(d.artist.id) ? "black" : "none");

          if (this.previouslyConnectedNodeIds && this.previouslyConnectedNodeIds.size > 0) {
            //console.log('node ids', this.previouslyConnectedNodeIds);
            
            // Now handle the case for previously connected nodes
            this.g.selectAll('.artist-node')
                .filter((d: any) => this.previouslyConnectedNodeIds.has(d.id))
                .style('opacity', 0.8) // Adjust opacity
                .style("stroke", "grey") // Set stroke to grey
                .style("stroke-width", `${0.07 * this.innerRadius / 100}vw`); // Adjust stroke width if needed
        }else{

       

        this.svg.selectAll('path:not(.arrowhead-path), .artist-node, .artist-edge').style("opacity", 1);
        }
        this.previousOnHoverCountry = null;
        this.previousOnHoverArtists =null;


      }
      
     
  }
  
  
    private updateMap(category: string): void {
      const countries: string[] = [];
  
      let artistsToProcess;
      if(this.selectedNode){
        artistsToProcess = [this.selectedNode[1]];
      } else if(this.selectedNodes && this.selectedNodes.length > 0 ){
        artistsToProcess=this.selectedNodes.map(([node, _]) => (d3.select(node).datum() as ArtistNode).artist)
      }else if(this.selectedClusterNode){
        artistsToProcess = this.selectedClusterNode.artists;
      }else{
        artistsToProcess = this.allArtists;
      }
  
  
      if (this.modernMap) {
          // Process artists based on modernMap
          switch (category) {
              case 'nationality':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.nationality && !countries.includes(artist.nationality)) {
                          countries.push(artist.nationality);
                      }
                  });
                  break;
  
              case 'birthcountry':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.birthcountry && !countries.includes(artist.birthcountry)) {
                          countries.push(artist.birthcountry);
                      }
                  });
                  break;
  
              case 'deathcountry':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.deathcountry && !countries.includes(artist.deathcountry)) {
                          countries.push(artist.deathcountry);
                      }
                  });
                  break;
  
              case 'mostexhibited':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.most_exhibited_in && !countries.includes(artist.most_exhibited_in)) {
                          countries.push(artist.most_exhibited_in);
                      }
                  });
                  break;
  
              default:
                  console.warn('Unknown category:', category);
                  break;
          }
          this.selectionService.selectCountries(countries);
      } else {
          // Process artists based on old map categories
          switch (category) {
              case 'birthcountry':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.oldBirthCountry && !countries.includes(artist.oldBirthCountry)) {
                          countries.push(artist.oldBirthCountry);
                      }
                  });
                  break;
  
              case 'deathcountry':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.oldDeathCountry && !countries.includes(artist.oldDeathCountry)) {
                          countries.push(artist.oldDeathCountry);
                      }
                  });
                  break;
  
              case 'mostexhibited':
                  artistsToProcess.forEach((artist:Artist) => {
                      if (artist.mostExhibitedInOldCountry && !countries.includes(artist.mostExhibitedInOldCountry)) {
                          countries.push(artist.mostExhibitedInOldCountry);
                      }
                  });
                  break;
  
              default:
                  console.warn('Unknown category:', category);
                  break;
          }
          this.selectionService.selectOldCountries(countries);
      }
  }
  
  
      // Method to close the notification
  closeNotification(): void {
    this.aiResponse = ''; // Clear the message when close is clicked
    this.aiTitle=''
  }

    private updateNetworkOnSunburstChange(newCategory: string): void {
      console.log('HALLO')
      // Loop through all clusters
      this.clusters.forEach((cluster, clusterIndex) => {
        const clusterNode = this.clusterNodes[clusterIndex];
       
        // Get the stored artist nodes and country centroids for the current cluster
        const artistNodes = this.artistNodes[clusterIndex];
     let countryCentroids;
        if(this.modernMap){
          countryCentroids= this.countryCentroids[newCategory][clusterIndex];
        }else{
          countryCentroids= this.OldCountryCentroids[newCategory][clusterIndex];
        }

        
    
        
        // If artistNodes are available, proceed with updating the positions
        if (artistNodes && countryCentroids) {
          // Update the positions of artist nodes and edges
          this.updateArtistPositionsAndEdges(clusterIndex, artistNodes, countryCentroids);
          //this.updateArtistPositionsAndEdges(clusterIndex, artistNodes, countryCentroids);
        }
      });
    }

     private updatePosition(type: string, id:number, countryData:any,degreeMap: Map<number, number>, metricMap: Map<number, number>, cluster: ClusterNode): { x: number, y: number } {
      const degree = degreeMap.get(id) || 0;
 
     
      const radialScale = this.setupRadialScale(cluster.innerRadius);
      const radial = radialScale(degree);

  
      const angle = countryData.middleAngle;
      const x = 0 + radial * Math.sin(angle);
      const y = 0 - radial * Math.cos(angle);
  
      return {
        x: x,
        y: y};
    }
  
    
    
    private updateArtistPositionsAndEdges(clusterIndex: number, artistNodes: any[], countryCentroids: { [country: string]: any }): void {
      // Update the country centroids if necessary
      this.updateCountries(clusterIndex, countryCentroids);
  
      // Calculate metrics for sizing nodes
      const size = this.decisionService.getDecisionSize();
      const metricMap = this.calculateNormalizedMaps(size)[clusterIndex];
  
      // Update artist node positions, sizes, and colors
      artistNodes.forEach((artistNode: any) => {
          const country = this.getArtistCountry(artistNode.artist);
          const newPos = this.updatePosition(
              this.decisionService.getDecisionSunburst(),
              artistNode.artist.id,
              countryCentroids[country],
              this.degreesMap[clusterIndex],
              metricMap,
              this.clusterNodes[clusterIndex]
          );
          artistNode.x = newPos.x;
          artistNode.y = newPos.y;
          artistNode.radius = this.calculateRadiusForNode(
              metricMap.get(artistNode.id) || 0,
              this.clusterNodes[clusterIndex].innerRadius,
              this.clusterNodes[clusterIndex].artists.length
          );
      });
  
      // Reheat the simulation and apply updated positions
      const simulation = this.simulations[clusterIndex];
      if (simulation) {
          // Recalculate collision sizes based on new node sizes
          const sizes: any = {};
          artistNodes.forEach((artistNode: any) => {
              sizes[artistNode.id] = artistNode.radius;
          });
  
          // Update the simulation with the new collision force based on updated node sizes
          simulation
              .force("collision", d3.forceCollide((d: any) => {
                  return this.calculateCollisionRadius(sizes[d.id] || 0);
              }))
              .nodes(artistNodes); // Update nodes with new positions
  
          // Speed up the initial movement by reheating the simulation
          simulation
              .alpha(1) // Set alpha to 1 to quickly reheat the simulation
              .alphaDecay(0.1) // Slightly slower decay to allow the simulation to "cool down" more slowly
              .restart();
  
          // Allow the simulation to run for a few ticks manually
          for (let i = 0; i < 100; i++) {
              simulation.tick();
          }
  
          // Stop the simulation after the initial force layout stabilizes
          simulation.stop();
  
          // Apply a smooth transition after the simulation finishes
          this.g.selectAll(".artist-node")
              .filter((d: any) => d.artist.cluster === clusterIndex)
              .transition() // Apply transition after simulation
              .duration(2000) // Set duration for the transition
              .attr('cx', (d: any) => d.x)
              .attr('cy', (d: any) => d.y)
              .attr('r', (d: any) => d.radius)
              .style('fill', (d: any) => {
                  const country = this.getArtistCountry(d.artist);
                  if(this.modernMap){
                    return this.artistService.getCountryColor(country, 1); // Update node color

                  }else{
                    return this.artistService.getOldCountryColor(country, 1); // Update node color

                  }
              });
  
          // Apply transitions to the edges after simulation as well
          d3.selectAll(`.artist-edge-${clusterIndex}`)
              .transition() // Apply transition for edges
              .duration(2000) // Set duration for the transition
              .attr('x1', (d: any) => d.source.x)
              .attr('y1', (d: any) => d.source.y)
              .attr('x2', (d: any) => d.target.x)
              .attr('y2', (d: any) => d.target.y);
      }
  }
  

  
  
  // Helper function to get the country based on the current decision
  private getArtistCountry(artist: Artist): string {
    if(this.modernMap){
      switch (this.decisionService.getDecisionSunburst()) {
          case 'nationality':
              return artist.nationality;
          case 'birthcountry':
              return artist.birthcountry;
          case 'deathcountry':
              return artist.deathcountry;
          case 'mostexhibited':
              return artist.most_exhibited_in;
          default:
              return artist.nationality;
      }}
      else{
        switch (this.decisionService.getDecisionSunburst()) {
       
    case 'birthcountry':
        return artist.oldBirthCountry;
    case 'deathcountry':
        return artist.oldDeathCountry;
    case 'mostexhibited':
        return artist.mostExhibitedInOldCountry;
    default:
        return artist.oldBirthCountry;

        }}
  }
  
    

    private updateCountries(clusterIndex: number, countryCentroids: { [country: string]: any }): void {
      // Select the correct cluster group
      const clusterGroup = d3.select(`.cluster-${clusterIndex}`); // Corrected the selector
    
      const tooltip = d3.select("div#tooltip");
    
      const showTooltip = (event: any, d: any) => {
        const countryCode = d.country;
        const fullCountryName = this.modernMap? this.artistService.countryMap[countryCode]:this.artistService.oldCountryMap[countryCode];
      
        tooltip.style("display", "block")
            .style("left", `${event.pageX + 5}px`)
            .style("top", `${event.pageY + 5}px`)
            .style("color", "black")
            .html(`${fullCountryName}<br/>`);
      };

    
      
    
      const hideTooltip = () => {
        tooltip.style("display", "none");
      };
    
      const arcGenerator = d3.arc<any>()
        .innerRadius(this.clusterNodes[clusterIndex].innerRadius)
        .outerRadius(this.clusterNodes[clusterIndex].outerRadius); // Assuming you have radius values for each cluster
    
      const paths = clusterGroup.selectAll("path")
        .data(Object.values(countryCentroids)) // Corrected to use countryCentroids data
        .join("path") // Using join instead of enter to prevent re-adding elements
        .attr("d", arcGenerator)
        .attr("fill", (d: any) => d.color)
        .style('stroke', 'none')
        .on("mouseover", showTooltip)
        .on("mousemove", showTooltip)
        .on('mouseout', hideTooltip)
        .on('click', (event: MouseEvent, d: any) => {
          if (event.ctrlKey) {
            event.stopPropagation(); // Prevent the click event from propagating to the cluster group
    
            const selectedArtists:Artist[] = [];
              // Find all artists belonging to the selected country
              this.clusters[clusterIndex].forEach(artist => {
                const category = this.decisionService.getDecisionSunburst();
                const country = this.getArtistCountryBasedOnCategory(artist,category) 
                if(country === d.country){
                  selectedArtists.push(artist);
                }
              });
              
              // Iterate over each artist and call `selectMultipleNodes`
              selectedArtists.forEach(artist => {
                  // Find the SVG circle element associated with the artist node
                  const circle = this.g.selectAll('.artist-node')
                      .filter((nodeData: any) => nodeData.artist.id === artist.id)
                      .node() as SVGCircleElement;
    
                      
          // Ensure defs and filter are only created once
          let defs = this.svg.select('defs');
          if (defs.empty()) {
            defs = this.svg.append('defs');
          }
        
          let filter = defs.select('#shadow');
          if (filter.empty()) {
            filter = defs.append('filter')
              .attr('id', 'shadow')
              .attr('x', '-50%')
              .attr('y', '-50%')
              .attr('width', '200%')
              .attr('height', '200%');
        
            filter.append('feDropShadow')
              .attr('dx', 0)
              .attr('dy', 0)
              .attr('flood-color', 'black')
              .attr('flood-opacity', 1);
        
            let feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode');
            feMerge.append('feMergeNode')
              .attr('in', 'SourceGraphic');
          }
        
    
                  // Make sure that the circle element exists
                  if (circle) {
                      const artistNodeData = d3.select(circle).datum() as ArtistNode;
                      this.handleMultiNodeSelection(artistNodeData, circle, filter, false);
                  }
              });
          }
      });
    
      const textsize = 0.5 * Math.min(this.cellHeight, this.cellWidth) / 10;
    
      clusterGroup.selectAll("text")
        .data(Object.values(countryCentroids)) // Same as above, using the countryCentroids data
        .join("text")
        .attr("transform", (d: any) => `translate(${arcGenerator.centroid(d)})`)
        .attr("text-anchor", "middle")
        .text((d: any) => d.country)
        .style("font-size", `${textsize}px`)
        .style("font-weight", "bold")
        .style("fill", "white")
        .on("mouseover", showTooltip)
        .on("mousemove", showTooltip)
        .on('mouseout', hideTooltip)
        .on('click', (event: MouseEvent, d: any) => {
          if (event.ctrlKey) {
            event.stopPropagation(); // Prevent the click event from propagating to the cluster group
    
            const selectedArtists:Artist[] = [];
              // Find all artists belonging to the selected country
              this.clusters[clusterIndex].forEach(artist => {
                const category = this.decisionService.getDecisionSunburst();
                const country = this.getArtistCountryBasedOnCategory(artist,category) 
                if(country === d.country){
                  selectedArtists.push(artist);
                }
              });
             
              // Iterate over each artist and call `selectMultipleNodes`
              selectedArtists.forEach(artist => {
                  // Find the SVG circle element associated with the artist node
                  const circle = this.g.selectAll('.artist-node')
                      .filter((nodeData: any) => nodeData.artist.id === artist.id)
                      .node() as SVGCircleElement;
    
                      
          // Ensure defs and filter are only created once
          let defs = this.svg.select('defs');
          if (defs.empty()) {
            defs = this.svg.append('defs');
          }
        
          let filter = defs.select('#shadow');
          if (filter.empty()) {
            filter = defs.append('filter')
              .attr('id', 'shadow')
              .attr('x', '-50%')
              .attr('y', '-50%')
              .attr('width', '200%')
              .attr('height', '200%');
        
            filter.append('feDropShadow')
              .attr('dx', 0)
              .attr('dy', 0)
              .attr('flood-color', 'black')
              .attr('flood-opacity', 1);
        
            let feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode');
            feMerge.append('feMergeNode')
              .attr('in', 'SourceGraphic');
          }
        
    
                  // Make sure that the circle element exists
                  if (circle) {
                      const artistNodeData = d3.select(circle).datum() as ArtistNode;
                      this.handleMultiNodeSelection(artistNodeData, circle, filter, false);
                  }
              });
          }
      });
    }
    private calculateNewPositionForTransition(artist: Artist, countryCentroids: any): { x: number, y: number } {
      let countryData: any;
    
      // Determine which country centroid to use based on the current category
      switch (this.decisionService.getDecisionSunburst()) {
        case 'nationality':
          countryData = countryCentroids[artist.nationality];
          break;
        case 'birthcountry':
          countryData = countryCentroids[artist.birthcountry];
          break;
        case 'deathcountry':
          countryData = countryCentroids[artist.deathcountry];
          break;
        case 'mostexhibited':
          countryData = countryCentroids[artist.most_exhibited_in];
          break;
      }
    
      const angle = countryData.middleAngle;
      const radialScale = this.setupRadialScale(this.clusterNodes[artist.cluster].innerRadius); // Assuming clusterNodes is available
      const radial = radialScale(1); // Adjust this scale as needed
    
      const x = radial * Math.sin(angle);
      const y = -radial * Math.cos(angle);
    
      return { x, y };
    }
    
 
    
    
    ngOnChanges(): void {
      this.visualizeData();
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
      this.visualizeData();
    }
  
    public getTitle(): string {
      return `Displaying ${this.allArtists.length} artists and ${this.clusters.length} clusters`;
    }
  
  private updateNodeSize(metric: string) {
    this.visualizeData();
  }
  
    
  
  
  
  
  
  
  private resetNode() {
    if (this.selectedNode) {
      const previousNode = this.selectedNode[0];
      const previousArtist = this.selectedNode[1];
const category = this.decisionService.getDecisionSunburst();
  const color = this.getArtistColorBasedOnCategory(previousArtist, category);
  
      ////console.log("Resetting node:", previousNode, "to color:", previousColor);
  
      // Use d3 to select the previous node and remove the filter
      d3.select(previousNode)
        .style("fill", color)
        .style("filter", "none"); // Explicitly set filter to "none"
  
      // Retrieve the bound data using D3's datum function
      const previousArtistNodeData = d3.select(previousNode).datum() as ArtistNode;
      const previousArtistNodeId = previousArtistNodeData.id;
  
      this.selectionService.selectArtists(null);
    }
  
    // Reset styles for all artist nodes and edges across categories
    const threshold = 0.4;
    this.g.selectAll(".artist-edge")
      .style('stroke', (d: any) => d.sharedExhibitionMinArtworks >= threshold ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none');
      
    this.g.selectAll(".artist-node").style('opacity', '1').style('filter', 'none');
  
    this.selectedNode = null;
    this.selectionService.selectCluster(this.allArtists);
    this.selectionService.selectClusterEdges([]);
    this.selectionService.selectFocusArtist(null);
    // Ensure no countries are selected when resetting node selection
    const category = this.decisionService.getDecisionSunburst();  
    if(this.modernMap){
      this.selectionService.selectCountries(this.allCountriesByCategory[category]);

    }else{
      this.selectionService.selectOldCountries(this.allOldCountriesByCategory[category]);
    }
  }
  
  
  private updateClusterSelection(clusterNode: ClusterNode | null): void {
   


    // Deselect the current cluster if clusterNode is null
    if (!clusterNode) {
        this.selectedClusterNode = null;
        this.selectionService.selectArtists(null);
        this.selectionService.selectCluster(this.allArtists);
        this.selectionService.selectClusterEdges([]);
        this.selectionService.selectExhibitions(null);
        this.selectionService.selectFocusedCluster(null);

        const category = this.decisionService.getDecisionSunburst();
        if (this.modernMap) {
            this.selectionService.selectCountries(this.allCountriesByCategory[category]);
        } else {
            this.selectionService.selectOldCountries(this.allOldCountriesByCategory[category]);
        }

        // Restore opacity of all clusters
        this.g.selectAll('.cluster').style('opacity', '1');
        this.g.selectAll('.artist-node').style('opacity', '1');
        // Reset the stroke color and opacity for all artist edges
    this.g.selectAll(".artist-edge")
    .style('stroke', (d: any) =>
        d.sharedExhibitionMinArtworks >= 0.4 ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none'
    )
    .style('opacity', 1);

        this.g.selectAll('path:not(.arrowhead-path)').style('opacity', '1');
        return;
    }

    // If a clusterNode is provided, select it
    this.selectedClusterNode = clusterNode;

    const selectedArtists = clusterNode.artists;
    const selectedEdges = this.intraCommunityEdges[clusterNode.clusterId];
    this.selectionService.selectArtists(selectedArtists);
    this.selectionService.selectCluster(selectedArtists);
    this.selectionService.selectClusterEdges(selectedEdges);
    this.selectionService.selectFocusedCluster(selectedArtists);

    const countries: string[] = [];
    const category = this.decisionService.getDecisionSunburst();

    if (this.modernMap) {
        selectedArtists.forEach(artist => {
            switch (category) {
                case 'nationality':
                    if (!countries.includes(artist.nationality)) countries.push(artist.nationality);
                    break;
                case 'birthcountry':
                    if (!countries.includes(artist.birthcountry)) countries.push(artist.birthcountry);
                    break;
                case 'deathcountry':
                    if (!countries.includes(artist.deathcountry)) countries.push(artist.deathcountry);
                    break;
                case 'mostexhibited':
                    if (!countries.includes(artist.most_exhibited_in)) countries.push(artist.most_exhibited_in);
                    break;
            }
        });
        this.selectionService.selectCountries(countries);
    } else {
        selectedArtists.forEach(artist => {
            switch (category) {
                case 'birthcountry':
                    if (!countries.includes(artist.oldBirthCountry)) countries.push(artist.oldBirthCountry);
                    break;
                case 'deathcountry':
                    if (!countries.includes(artist.oldDeathCountry)) countries.push(artist.oldDeathCountry);
                    break;
                case 'mostexhibited':
                    if (!countries.includes(artist.mostExhibitedInOldCountry)) countries.push(artist.mostExhibitedInOldCountry);
                    break;
            }
        });
        this.selectionService.selectOldCountries(countries);
    }


}

    
private onClusterClick(clusterNode: ClusterNode): void {
  event?.stopPropagation();
  this.startPulsing();
  // Check if a node was selected prior to this cluster click
  if (this.selectedNodes.length >0) {
      // If Ctrl is pressed but the click is outside any node, reset the selection
      let defs = this.svg.select('defs');
      if (defs.empty()) {
        defs = this.svg.append('defs');
      }

      let filter = defs.select('#shadow');
      if (filter.empty()) {
        filter = defs.append('filter')
          .attr('id', 'shadow')
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');
      
        filter.append('feDropShadow')
          .attr('dx', 0)
          .attr('dy', 0)
          .attr('flood-color', 'black')
          .attr('flood-opacity', 1);
      
        let feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode')
          .attr('in', 'SourceGraphic');
      }

      const allNodes = [...this.selectedNodes];
      // Reset selection for all selected nodes
      allNodes.forEach((node) => {
        const circle = node[0] as SVGCircleElement;
        if (circle) {
          const artistNodeData = d3.select(circle).datum() as ArtistNode;
          this.handleMultiNodeSelection(artistNodeData, circle, filter,false);
        }
      });
      return;
    
  }

  // If the same cluster is clicked again, deselect it
  if (this.selectedClusterNode && this.selectedClusterNode.clusterId === clusterNode.clusterId) {
      this.updateClusterSelection(null);
          // Reduce opacity of all clusters
   // console.log('update')
    this.g.selectAll('.cluster').style('opacity', '1');
    // Set opacity of selected cluster to 1
  } else {
    this.updateClusterSelection(null);
      // Copy the list of artist names to the clipboard
      const artistNames = clusterNode.artists.map(artist => `${artist.firstname} ${artist.lastname}`).join('\n');
      navigator.clipboard.writeText(artistNames);

      // Update the cluster selection
      this.updateClusterSelection(clusterNode);
      this.g.selectAll('.cluster').style('opacity', '0.2');
      // Set opacity of selected cluster to 1
      this.g.selectAll(`.cluster-${clusterNode.clusterId}`).style('opacity', '1');

  }
}




  

    private   updateCluster(k: number) {
      if(this.firstK === -1){
        this.firstK = this.firstK + 1;
        return;
      }
    
      const range = this.decisionService.getDecisionRange();
  
      if(range.length !== 0){
  
         // Remove the existing SVG element
      d3.select("figure#network").select("svg").remove();
        this.isLoading = true;
        this.artistService.clusterAmountArtists(range, k).subscribe((data) => {
          this.decisionService.changeInterCommunityEdges(data[2])
          this.decisionService.changeClusters(data[0]);
        const clusters = data[0];
        this.selectionService.selectAllClusters(clusters);
        const intraCommunityEdges = data[1] as exhibited_with[][];
        const interCommunityEdges = data[2] as exhibited_with[];
        this.singleInterCommunityEdges = data[3] as exhibited_with[][];

        this.loadNewData(clusters, intraCommunityEdges, interCommunityEdges);
  
      }, error => {
        console.error('There was an error', error);
        alert('An error occurred: ' + error.message + '. Please reload the website.');

        this.isLoading = false;
      });
        
      
      }
    }
    // Call this function after updating `allArtists`
private updateFuseCollection(allArtists: Artist[]): void {
  const allArtistArray = allArtists.map(artist => ({
    id: artist.id,
    name: artist.firstname + ' ' + artist.lastname,
    artworks: artist.total_exhibited_artworks,
  }));
  // Reset the fuse collection with the updated artist data
  this.fuse.setCollection(allArtistArray);
}
  
    private loadNewData(clusters: Artist[][], intraCommunityEdges: exhibited_with[][], interCommunityEdges: exhibited_with[]|InterCommunityEdge[]){
      // Remove the existing SVG element
      
      this.clusters = clusters;
      clusters.forEach((cluster, clusterIndex) => {
       if(cluster.length === 0){
        console.log('ACHTUNG, CLUSTER EMPTY')
      }
    });
  
      this.intraCommunityEdges = intraCommunityEdges;
      if (Array.isArray(interCommunityEdges) && interCommunityEdges.length > 0) {
        if (interCommunityEdges[0] instanceof exhibited_with) {
          this.interCommunityEdges = (interCommunityEdges as exhibited_with[]).map(edge => ({
            source: edge.startId,
            target: edge.endId,
            sharedExhibitionMinArtworks: edge.sharedExhibitionMinArtworks,
          }));
        }}
        this.decisionService.changeLoadingBackendK(false);
      let allArtists:Artist[]= [];
      this.clusters.forEach((cluster, clusterIndex) => {
        allArtists.push(...cluster);
    
      });
      this.artistClusterMap.clear(); // Clear the map before reinitializing
      this.selectedCluster = allArtists;
      this.allArtists = allArtists;
      this.selectionService.selectArtists(null);
      this.selectionService.selectAllArtists(this.allArtists);
       // Update the searchbar artists using the updated artist array

      
     /*  const biggestCluster = this.clusters.reduce((max, cluster) => cluster.length > max.length ? cluster : max, this.clusters[0]);
      const biggestClusterId = this.clusters.findIndex(cluster => cluster === biggestCluster);
      const biggestClusterEdges = this.intraCommunityEdges[biggestClusterId]
      this.biggestClusterId = biggestClusterId;
      this.selectionService.selectFocusCluster([[biggestCluster], [biggestClusterEdges]]); */
  
      const category = this.decisionService.getDecisionSunburst();  
      if(this.modernMap){
      this.selectionService.selectCountries(this.allCountriesByCategory[category]);
      }else{
        this.selectionService.selectOldCountries(this.allOldCountriesByCategory[category]);
      }
      
   
  
      // Calculate degrees for each cluster
      this.calculateNodeDegreesForClusters();
  
  this.visualizeData();

  
    }
  
  
    private updateNetwork(): void {
      if (!this.chartContainer) return;
      const value=this.decisionService.getDecisionSunburst();
      this.loadNewData(this.clusters,this.intraCommunityEdges,this.interCommunityEdges)
    }
    
    private highlightArtistNode(id: string | null) {
      if(!this.svg)
        return;
      if (id === null) {
        this.g.selectAll(".artist-node").style('filter', '');
        return;
      }
    
      const selectedCircle = this.g.selectAll(".artist-node").filter((d: any) => d.artist.id.toString() === id).node() as SVGCircleElement;
      if (!selectedCircle) {
        //console.log('No circle found for artist id:', id);
        return; // If no node is found, exit the function
      }
    
      const selectedNodeData = d3.select(selectedCircle).datum() as ArtistNode;
      const simulatedEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      });
    
      //console.log('selectedNodeData:',selectedNodeData)
      //console.log('selected event:',simulatedEvent)
      this.handleNodeClick(selectedNodeData, simulatedEvent);
    }
  
  
  
    private handleNodeClick(artistNode: ArtistNode, event: MouseEvent): void {
      event.stopPropagation(); // Stop the click event from propagating to the cluster

      // Ensure defs and filter are only created once
      let defs = this.svg.select('defs');
      if (defs.empty()) {
        defs = this.svg.append('defs');
      }
    
      let filter = defs.select('#shadow');
      if (filter.empty()) {
        filter = defs.append('filter')
          .attr('id', 'shadow')
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');
    
        filter.append('feDropShadow')
          .attr('dx', 0)
          .attr('dy', 0)
          .attr('flood-color', 'black')
          .attr('flood-opacity', 1);
    
        let feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode')
          .attr('in', 'SourceGraphic');
      }
    
     this.currentSelection= { type: 'artist', artistNode };
    
      const circle = d3.selectAll(".artist-node")
        .filter((d: any) => d.id === artistNode.id)
        .node() as SVGCircleElement;
    
      // Check if Ctrl or Cmd key is pressed for multi-selection
      const isCtrlPressed = event.ctrlKey || event.metaKey;
    
      // If Ctrl/Cmd is not pressed, reset previously selected nodes
      if (isCtrlPressed) {
        this.handleMultiNodeSelection(artistNode, circle,filter, false);
      } else {
        this.handleMultiNodeSelection(artistNode, circle,filter, true);
      }
    }


    
    private handleMultiNodeSelection(artistNode: ArtistNode, circle: SVGCircleElement, filter: any, single: boolean): void {
     // console.log('clicked', this.selectedNodes);
  
      // Access the bound data for the circle
      const clusterNode = this.artistClusterMap.get(artistNode.id);

  if(single && this.selectedNodes.length ===1){
    const firstSelectedCircle = this.selectedNodes[0][0] as SVGCircleElement;
    const firstSelectedNode = d3.select(firstSelectedCircle).datum() as ArtistNode;
    if(firstSelectedCircle === circle){
   // Reset the style of the deselected node
   this.resetStyleOfNode(circle, artistNode.artist);
         
   this.g.selectAll(`.artist-edge-${clusterNode?.clusterId}`)
   .style('stroke', (d: any) =>
       d.sharedExhibitionMinArtworks >= 0.4 ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none'
   )
   .style('opacity', 1);
   this.resetOfOtherNodeStyles(artistNode.id);
this.selectedEdges.clear();
      this.previouslyConnectedNodeIds.clear();
      this.previouslyConnectedClusterNodeIds.clear();
      this.selectedEdges.clear();
      this.selectedNodes = [];


      if (clusterNode) {
        this.selectedClusterNode = clusterNode;
        this.updateClusterSelection(clusterNode);
    } else {
        this.updateClusterSelection(null);
    }
        // Select the cluster without updating the selectionService
      
       
        return; // Exit the function

    }else{
        this.previouslyConnectedNodeIds.clear();
      this.previouslyConnectedClusterNodeIds.clear();
    }
    
  }
      // Test if a node of a different cluster was clicked, reset if different cluster
      if (this.selectedNodes.length > 0) {
          const firstSelectedCircle = this.selectedNodes[0][0] as SVGCircleElement;
          const firstSelectedNode = d3.select(firstSelectedCircle).datum() as ArtistNode;
  
          if (clusterNode?.clusterId !== firstSelectedNode.artist.cluster) {
            this.selectedEdges.clear();
            this.previouslyConnectedNodeIds.clear();
            this.resetMultiNodeSelection();
              if (clusterNode) {
                  this.selectedClusterNode = clusterNode;
                  this.updateClusterSelection(clusterNode);
              } else {
                  this.updateClusterSelection(null);
              }
              this.selectedNodes = []; // Reset the array to empty

  
             
          }
          if(single){
            
            const allNodes = [...this.selectedNodes];
            // Reset selection for all selected nodes
            allNodes.forEach((node) => {
              const circle = node[0] as SVGCircleElement;
              if (circle) {
                const artistNodeData = d3.select(circle).datum() as ArtistNode;
                this.handleMultiNodeSelection(artistNodeData, circle, filter,false);
              }
            });
    
          }
          
      }
  
      // Check if the node is already in the selection
      const nodeIndex = this.selectedNodes.findIndex(node => node[0] === circle);
  
      if (nodeIndex !== -1) {
        //  console.log('Node is already selected, removing:', artistNode.id);

          
  
          // Remove the node from the selectedNodes array
          this.selectedNodes.splice(nodeIndex, 1);
          if(single){
            this.selectedNodes = [];
            this.selectedEdges.clear();
            this.previouslyConnectedNodeIds.clear();
            this.previouslyConnectedClusterNodeIds.clear();
          }
          this.previouslyConnectedNodeIds.clear();

           // Remove edges associated with this node from `this.selectedEdges`
    const selectedNodeId = artistNode.id;
          this.selectedEdges.forEach((edgeData, key) => {
            if (edgeData.artistIds.includes(selectedNodeId)) {
                // Remove the artistId from the edge's artistIds array
                edgeData.artistIds = edgeData.artistIds.filter(id => id !== selectedNodeId);
                
                // If no artistIds are left for this edge, remove it from the map
                if (edgeData.artistIds.length === 0) {
                    this.selectedEdges.delete(key);
                }
            }
        });
  
          // Reset the style of the deselected node
          this.resetStyleOfNode(circle, artistNode.artist);
         
          this.g.selectAll(`.artist-edge-${clusterNode?.clusterId}`)
          .style('stroke', (d: any) =>
              d.sharedExhibitionMinArtworks >= 0.4 ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none'
          )
          .style('opacity', 1);
          this.resetOfOtherNodeStyles(selectedNodeId);

  
          // Check if this was the last selected node
          if (this.selectedNodes.length === 0) {
            this.selectedEdges.clear();
            this.previouslyConnectedNodeIds.clear();
            this.previouslyConnectedClusterNodeIds.clear();

            if (clusterNode) {
              this.selectedClusterNode = clusterNode;
              this.updateClusterSelection(clusterNode);
          } else {
              this.updateClusterSelection(null);
          }
              // Select the cluster without updating the selectionService
            
             
              return; // Exit the function
          }
  
          // If not the last node, continue updating the selectionService
          const selectedArtists = this.selectedNodes.map(([node, color]) => {
              const artistNodeData = d3.select(node).datum() as ArtistNode; // Get the bound data for each node
              return artistNodeData.artist; // Return the artist object
          });
  
          // Pass the array of selected artists to the selectionService
          this.selectionService.selectArtists(selectedArtists);
  
          // Handle countries update
          const countries: string[] = [];
          const category = this.decisionService.getDecisionSunburst();
          if (this.modernMap) {
              this.updateSelectedCountries(selectedArtists, category, countries, true);
              this.selectionService.selectCountries(countries);
          } else {
              this.updateSelectedCountries(selectedArtists, category, countries, false);
              this.selectionService.selectOldCountries(countries);
          }

   
          return; // Exit the function since we've handled the removal
        }
  
      // Add the node to the selection
      this.selectMultipleNodes(artistNode, circle);
      this.applyStyleToNode(circle, artistNode, filter);
  
      // Dynamically adjust the shadow based on the radius of the selected node
      const radius = parseFloat(d3.select(circle).attr('r')); // Get the radius of the node
      filter.select('feDropShadow')
          .attr('stdDeviation', Math.max(0.5, radius / 3)); // Adjust stdDeviation relative to the node size
  
      // Apply the filter to the selected node
      d3.select(circle).style("filter", "url(#shadow)");
  }

  private resetOfOtherNodeStyles(artistId:number){
    const clusterId = this.artistClusterMap.get(artistId)?.clusterId;
    this.g.selectAll(`.artist-node`)
    .filter((d: any) =>  d.artist.cluster !== clusterId)
      .style('opacity', '0.2')
    .style('stroke', 'none')
    .style('filter', 'none');
    this.g.selectAll(`.artist-node`)
    .filter((d: any) => d.artist.cluster === clusterId)
      .style('opacity', '1')
   ;

  }
  
  // Helper function to update countries
  private updateSelectedCountries(selectedArtists: Artist[], category: string, countries: string[], modernMap: boolean) {
      if (modernMap) {
          switch (category) {
              case 'nationality':
                  selectedArtists.forEach(artist => {
                      if (artist.nationality && !countries.includes(artist.nationality)) {
                          countries.push(artist.nationality);
                      }
                  });
                  break;
              case 'birthcountry':
                  selectedArtists.forEach(artist => {
                      if (artist.birthcountry && !countries.includes(artist.birthcountry)) {
                          countries.push(artist.birthcountry);
                      }
                  });
                  break;
              case 'deathcountry':
                  selectedArtists.forEach(artist => {
                      if (artist.deathcountry && !countries.includes(artist.deathcountry)) {
                          countries.push(artist.deathcountry);
                      }
                  });
                  break;
              case 'mostexhibited':
                  selectedArtists.forEach(artist => {
                      if (artist.most_exhibited_in && !countries.includes(artist.most_exhibited_in)) {
                          countries.push(artist.most_exhibited_in);
                      }
                  });
                  break;
              default:
                  console.warn('Unknown category:', category);
                  break;
          }
      } else {
          switch (category) {
              case 'birthcountry':
                  selectedArtists.forEach(artist => {
                      if (artist.oldBirthCountry && !countries.includes(artist.oldBirthCountry)) {
                          countries.push(artist.oldBirthCountry);
                      }
                  });
                  break;
              case 'deathcountry':
                  selectedArtists.forEach(artist => {
                      if (artist.oldDeathCountry && !countries.includes(artist.oldDeathCountry)) {
                          countries.push(artist.oldDeathCountry);
                      }
                  });
                  break;
              case 'mostexhibited':
                  selectedArtists.forEach(artist => {
                      if (artist.mostExhibitedInOldCountry && !countries.includes(artist.mostExhibitedInOldCountry)) {
                          countries.push(artist.mostExhibitedInOldCountry);
                      }
                  });
                  break;
              default:
                  console.warn('Unknown category:', category);
                  break;
          }
      }
  }
  
  
    

    private applyStyleToNode(circle: SVGCircleElement, artistNode: ArtistNode, filter: any) {

      const artist:Artist = artistNode.artist;

      // Dynamically adjust the shadow based on the radius of the selected node
      const radius = parseFloat(d3.select(circle).attr('r')); // Get the radius of the node
      filter.select('feDropShadow')
        .attr('stdDeviation', Math.max(0.5, radius / 3)); // Adjust stdDeviation relative to the node size
      // Apply the filter to the selected node
      d3.select(circle).style("filter", "url(#shadow)");


      const width = 0.07 * this.innerRadius / 100;
      circle.style.filter = 'url(#shadow)';
      circle.style.strokeWidth= `${width}vw`;
      circle.style.stroke =  'black';
    };

 



    private handleSingleNodeSelection(artistNode: ArtistNode, circle: SVGCircleElement, filter:any) {
      // If a node without Ctrl is clicked, focus is only on that node
        if (this.selectedNodes.length !== 0) {
        this.resetNodeSelection();
        this.resetMultiNodeSelection();

        this.selectedNodes = [];
      }
  
      //If the same circle got selected
      if (this.selectedNode && this.selectedNode[0] === circle) {
        // Reset styles for all artist nodes and edges across categories
    const threshold = 0.4; // Threshold for deciding which edges are visible
    const clusterNode = this.artistClusterMap.get(artistNode.id);
    if(clusterNode){
       // Reset the stroke color and opacity for all artist edges
       this.g.selectAll(`.artist-edge-${clusterNode.clusterId}`)  
           .style('stroke', (d: any) =>
               d.sharedExhibitionMinArtworks >= threshold ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none'
           )
           .style('opacity', 1);

           this.g.selectAll('.artist-node')
           .filter((d: any) => d.artist.cluster === clusterNode.clusterId)
           .style('opacity', '1')
           .style('stroke', 'none')

           this.g.selectAll('.artist-node')
           .filter((d: any) => d.artist.cluster !== clusterNode.clusterId)
           .style('opacity', '0.2')
           .style('stroke', 'none')

   this.updateClusterSelection(clusterNode);
          }
          this.resetNodeSelection();


        

        
      //If a different node is selected
        } else {
          this.resetNodeSelection(); // Reset any previously selected node
    
          const clusterNode = this.artistClusterMap.get(artistNode.id);
          if (clusterNode) {
            this.highlightInterClusterConnections(artistNode.id, clusterNode?.clusterId);
          }

          this.applyStyleToNode(circle,artistNode, filter);
          this.selectNode(artistNode, circle);
    
        }
      }

      
    private selectMultipleNodes(artistNode: ArtistNode, circle: SVGCircleElement) {
      
      const clusterIndex = this.artistClusterMap.get(artistNode.id)?.clusterId;

      this.startPulsing();

      // Make the button visible by selecting it based on its class
      if (clusterIndex !== undefined) {
        this.svg.select(`.ai-button-${clusterIndex}`)
          .style('visibility', 'visible');
      }
  

      if (this.selectedNode && this.selectedNode[0]) {
        const d3Node = d3.select(this.selectedNode[0]); // Convert to a D3 selection
        const artistNodeData = d3Node.datum() as ArtistNode; // Use datum() on the D3 selection
        this.handleNodeClick(artistNodeData, new MouseEvent('click')); // Simulate a click event
    }
  
   // Otherwise, add the node to the selection
   this.selectedNodes.push([circle, circle.style.fill]);

    
    
      const originalColor = d3.color(circle.style.fill) as d3.RGBColor;
    
    
      const selectedNodeId = artistNode.id;

      const clusterNode = this.artistClusterMap.get(artistNode.id);
      if (clusterNode) {
        this.highlightInterClusterConnections(artistNode.id, clusterNode?.clusterId);
      }

    
         // Identify connected nodes
         this.g.selectAll(".artist-edge").each((d: any) => {
          if (d.source.id === selectedNodeId) {
              this.connectedNodeIds.add(d.target.id);
          } else if (d.target.id === selectedNodeId) {
              this.connectedNodeIds.add(d.source.id);
          }
      });

      //console.log('connected ids', this.connectedNodeIds)

      
          const clusterId = this.artistClusterMap.get(artistNode.id)?.clusterId;
    const category = this.decisionService.getDecisionSunburst();

          if (clusterId !== undefined) {
        

              const connectedNodeIds: Set<number> = new Set<number>();
  
    // Identify connected nodes
    this.g.selectAll(".artist-edge").each((d: any) => {
        if (d.source.id === selectedNodeId) {
            connectedNodeIds.add(d.target.id);
        } else if (d.target.id === selectedNodeId) {
            connectedNodeIds.add(d.source.id);
        }
    });
this.previouslyConnectedClusterNodeIds = connectedNodeIds;
          this.g.selectAll(`.artist-node-${clusterId}`)
              .filter((d: any) => d.id === artistNode.id || connectedNodeIds.has(d.id))
              .style('opacity', '1');
              this.g.selectAll(`.artist-node-${clusterId}`)
              .filter((d: any) =>! connectedNodeIds.has(d.id) && !(d.id === artistNode.id))
              .style('opacity', '0.2');

                  const newEdges: any[] = [];

    // Inside your selectMultipleNodes or equivalent function
this.g.selectAll(".artist-edge")
.filter((d: any) => d.source.id === selectedNodeId || d.target.id === selectedNodeId)
.each((edge: any) => {
    const key = `${Math.min(edge.source.id, edge.target.id)}-${Math.max(edge.source.id, edge.target.id)}`;
    if (this.selectedEdges.has(key)) {
        // If the edge is already in the map, add the artist ID to the array
        const edgeData = this.selectedEdges.get(key);
        if (!edgeData!.artistIds.includes(selectedNodeId)) {
            edgeData!.artistIds.push(selectedNodeId);
        }

        // Change color to reflect the combined selection
        //this.changeColorEdge(edge, edgeData!.artistIds);
    } else {
        // If the edge is new, add it to the map with the current artist ID
        this.selectedEdges.set(key, { edge, artistIds: [selectedNodeId] });

        newEdges.push(edge);
    }
  });
      
    // Now apply the edgeColorScale to newEdges
    
// Now apply the edgeColorScale to newEdges
this.selectedEdges.forEach((edgeData) => {
  this.g.selectAll(`.artist-edge-${clusterId}`)
  .filter((d: any) => {
    return (d.source.id === edgeData.edge.source.id && d.target.id === edgeData.edge.target.id) || 
           (d.source.id === edgeData.edge.target.id && d.target.id === edgeData.edge.source.id);
  })
      .style("opacity", "1");
});
if (newEdges.length > 0) {
  // Create the edgeColorScale once for all new edges
  let artistColor = this.getArtistColorBasedOnCategory(artistNode.artist, category);
  artistColor = d3.rgb(artistColor).darker(0.5).toString();

  const sharedExhibitionMinArtworksValues: number[] = [];
  this.g.selectAll(`.artist-edge-${clusterId}`).each((d: any) => {
      sharedExhibitionMinArtworksValues.push(d.sharedExhibitionMinArtworks);
  });

  const minArtworks = d3.min(sharedExhibitionMinArtworksValues) ?? 0;
  const maxArtworks = d3.max(sharedExhibitionMinArtworksValues) ?? 1;
  const edgeColorScale = this.createEdgeColorScale(artistColor, minArtworks, maxArtworks);


 // console.log('selected', this.selectedEdges)


 
  // Apply the color scale to each of the new edges
  newEdges.forEach((edge: any) => {
    // Select the specific edge element using both source and target ids
    this.g.selectAll(`.artist-edge-${clusterId}`)
      .filter((d: any) => {
        return (d.source.id === edge.source.id && d.target.id === edge.target.id) || 
               (d.source.id === edge.target.id && d.target.id === edge.source.id);
      })
      .style('stroke', (d: any) => edgeColorScale(d.sharedExhibitionMinArtworks))
      .style("opacity", "1");
  });
}

// Cast `datum()` to `ArtistNode`
const selectedNodeIds = new Set(this.selectedNodes.map(([node, color]) => {
  const artistNodeData = d3.select(node).datum() as ArtistNode; // Cast to ArtistNode
  return artistNodeData.id;
}));

   // Update edge visibility based on selected nodes
   this.g.selectAll(`.artist-edge-${clusterId}`)
   .style("opacity", (d: any) => {
     // Check if both nodes of the edge are in the selected nodes
     if ( d.source.id === selectedNodeId || d.target.id === selectedNodeId) {//selectedNodeIds.has(d.source.id) && selectedNodeIds.has(d.target.id) ||
       return '1'; // Set opacity to 1 if both nodes are selected
     } else {
       return '0'; // Set opacity to 0 otherwise
     }
   });

    
      const clusterNode = this.artistClusterMap.get(artistNode.id);
      if (clusterNode) {
          this.focusHandler(clusterNode);
          this.selectionService.selectFocusedCluster(clusterNode.artists);
      }
          
         // Extract the artist information from each selected node
        const selectedArtists = this.selectedNodes.map(([node, color]) => {
          const artistNodeData = d3.select(node).datum() as ArtistNode; // Get the bound data for each node
          return artistNodeData.artist; // Return the artist object
       });

      // Pass the array of selected artists to the selectionService
      this.selectionService.selectArtists(selectedArtists);

      const artist = artistNode.artist;
      const countries: string[] = [];

// Loop through selectedArtists and populate countries array based on the selected category
if(this.modernMap){
  switch (category) {
      case 'nationality':
          selectedArtists.forEach(artist => {
              if (artist.nationality && !countries.includes(artist.nationality)) {
                  countries.push(artist.nationality);
              }
          });
          break;

      case 'birthcountry':
          selectedArtists.forEach(artist => {
              if (artist.birthcountry && !countries.includes(artist.birthcountry)) {
                  countries.push(artist.birthcountry);
              }
          });
          break;

      case 'deathcountry':
          selectedArtists.forEach(artist => {
              if (artist.deathcountry && !countries.includes(artist.deathcountry)) {
                  countries.push(artist.deathcountry);
              }
          });
          break;

      case 'mostexhibited':
          selectedArtists.forEach(artist => {
              if (artist.most_exhibited_in && !countries.includes(artist.most_exhibited_in)) {
                  countries.push(artist.most_exhibited_in);
              }
          });
          break;

      default:
          console.warn('Unknown category:', category);
          break;
      }
      this.selectionService.selectCountries(countries);
    }else{
        switch (category) {
      
          case 'birthcountry':
              selectedArtists.forEach(artist => {
                  if (artist.oldBirthCountry && !countries.includes(artist.oldBirthCountry)) {
                      countries.push(artist.oldBirthCountry);
                  }
              });
              break;

          case 'deathcountry':
              selectedArtists.forEach(artist => {
                  if (artist.oldDeathCountry && !countries.includes(artist.oldDeathCountry)) {
                      countries.push(artist.oldDeathCountry);
                  }
              });
              break;

          case 'mostexhibited':
              selectedArtists.forEach(artist => {
                  if (artist.mostExhibitedInOldCountry && !countries.includes(artist.mostExhibitedInOldCountry)) {
                      countries.push(artist.mostExhibitedInOldCountry);
                  }
              });
              break;

          default:
              console.warn('Unknown category:', category);
              break;

      }
      this.selectionService.selectOldCountries(countries);

    }
      // Pass the populated countries array to the selectionService

    
      // Copy artist's name to clipboard
      navigator.clipboard.writeText(`${artist.firstname} ${artist.lastname}`);
    
      const clusterNode2 = this.artistClusterMap.get(artistNode.id);
      if (clusterNode2) {
          const selectedClusterArtists = clusterNode2.artists;
          const selectedClusterEdges = this.intraCommunityEdges[clusterNode2.clusterId];
          this.selectionService.selectCluster(selectedClusterArtists);
          this.selectionService.selectClusterEdges(selectedClusterEdges);
      }
     
      }}
      
      private highlightInterClusterConnections(artistId: number, clusterId: number): void {
         // Reset the opacity of all artist nodes and edges before applying the highlight logic
 
        // Now proceed with your existing logic
        const connectedNodeIds = new Set<number>();
        const unconnectedNodeIds = new Set<number>();
    
        // Identify connected and unconnected nodes
        const clusterEdges = this.singleInterCommunityEdges[clusterId];
        clusterEdges.forEach(edge => {
            if (edge.startId === artistId) {
                connectedNodeIds.add(edge.endId);
            } else if (edge.endId === artistId) {
                connectedNodeIds.add(edge.startId);
            }
        });
    
        // Populate unconnectedNodeIds excluding nodes in the same cluster
        this.g.selectAll(".artist-node").each((d: any) => {
            if (!connectedNodeIds.has(d.id) && d.artist.cluster !== clusterId) {
                unconnectedNodeIds.add(d.id);
            }
        });
    
        this.previouslyConnectedNodeIds = connectedNodeIds;

        const connectedOpacity = 0.8;
        const unconnectedOpacity = 0.2;
    
        // Loop over each cluster to adjust the stroke width for the artist nodes
        Object.keys(this.clusterNodes).forEach((clusterKey: string) => {
            const cluster = this.clusterNodes[+clusterKey]; // Retrieve the cluster object
            const clusterInnerRadius = cluster.innerRadius;
            const strokeWidth = 0.07 * clusterInnerRadius / 100;
    
            // Apply styles for connected nodes in this cluster
            this.g.selectAll(`.artist-node-${clusterKey}`)
                .filter((d: any) => connectedNodeIds.has(d.id))
                .style('opacity', connectedOpacity)
                .style("stroke-width", `${strokeWidth}vw`)
                .style("stroke", "grey");
    
           
        });
    
        // Lower opacity for unconnected nodes that are not in the same cluster
        this.g.selectAll(".artist-node")
            .filter((d: any) => unconnectedNodeIds.has(d.id))
            .style('opacity', unconnectedOpacity);
    
        // Adjust the edges' opacity and paths
        this.g.selectAll(".artist-edge")
            .filter((d: any) => 
                (d.source.cluster === clusterId && d.target.cluster === clusterId)
            )
            .style('opacity', 1);
    
        this.g.selectAll(".artist-edge")
            .filter((d: any) => 
                !(d.source.cluster === clusterId && d.target.cluster === clusterId)
            )
            .style('opacity', 0.05);
    
            this.g.selectAll(`path:not(.arrowhead-path)`)
            .style('opacity', unconnectedOpacity);
    
        // Set opacity to 1 for paths in the selected cluster
        this.g.selectAll(`.cluster-${clusterId} path`).style('opacity', '1');
    }
    
  
  private resetStyleOfNode(circle: SVGCircleElement, artist: Artist) {
         
      // Reset the stroke width and stroke color of the previously selected node
      d3.select(circle)
        .style("stroke-width", "0px") // Remove any border/stroke
        .style("stroke", "none");     // Ensure no stroke color is applied
        
      const category = this.decisionService.getDecisionSunburst();
      const color = this.getArtistColorBasedOnCategory(artist, category);
      // Reset the fill color and remove any filters applied to the node
      d3.select(circle)
        .style("fill", color)  // Restore the original color
        .style("filter", "none");      // Remove any shadow or other filter effects
  }

  private resetMultiNodeSelection(): void {

    // Reset styles for all artist nodes and edges across categories
    const threshold = 0.4; // Threshold for deciding which edges are visible

    // Reset the stroke color and opacity for all artist edges
    this.g.selectAll(".artist-edge")
        .style('stroke', (d: any) =>
            d.sharedExhibitionMinArtworks >= threshold ? this.edgeColorScale(d.sharedExhibitionMinArtworks) : 'none'
        )
        .style('opacity', 1);

    this.g.selectAll(".artist-node")
        .style('opacity', '1')
        .style('filter', 'none')
        .style("stroke-width", "0px")
        .style("stroke", "none");

        this.previouslyConnectedNodeIds.clear();
        this.previouslyConnectedClusterNodeIds.clear();
    // Clear the selectedNode variable as no node is selected now
    this.selectedNode = null;
    
}
  private resetNodeSelection(): void {
    // Check if there's a previously selected node
    if (this.selectedNode) {
        const previousNode = this.selectedNode[0];
        const previousArtist = this.selectedNode[1];
        this.resetStyleOfNode(previousNode, previousArtist);
    } else{
      // If no node was selected previously, clear the selected artists
      this.updateClusterSelection(null);
  }
    
  

    this.previouslyConnectedNodeIds.clear();
    this.previouslyConnectedClusterNodeIds.clear();
    // Clear the selectedNode variable as no node is selected now
    this.selectedNode = null;
    
}

  

  
  private selectNode(artistNode: ArtistNode, circle: SVGCircleElement) {
    // Reset previously selected node and restore all edges and nodes to default styles
    if (this.selectedNode) {
        const previousNode = this.selectedNode[0];
const previousArtist = this.selectedNode[1];
const category = this.decisionService.getDecisionSunburst();
  const color = this.getArtistColorBasedOnCategory(previousArtist, category);  
        //console.log("Previous node:", previousNode, "Previous color:", previousColor);
  
        // Restore the previously selected node's style
        d3.select(previousNode)
            .style("fill", color)
            .style("filter", "none");
  
        // Restore all edges to their original styles and visibility
        this.g.selectAll(".artist-edge")
            .style('stroke', (d: any) => this.edgeColorScale(d.sharedExhibitionMinArtworks))
            .style('opacity', '1');
  
  
        // Restore all nodes' opacity to 1
        this.g.selectAll(".artist-node").style('opacity', '1');
  
    }
  
    // Set the selected node
    this.selectedNode = [circle, artistNode.artist];
    d3.select(circle).style("filter", "url(#shadow)");
  
  
    const originalColor = d3.color(circle.style.fill) as d3.RGBColor;
  
  
    const selectedNodeId = artistNode.id;
    const connectedNodeIds: Set<number> = new Set<number>();
  
    // Identify connected nodes
    this.g.selectAll(".artist-edge").each((d: any) => {
        if (d.source.id === selectedNodeId) {
            connectedNodeIds.add(d.target.id);
        } else if (d.target.id === selectedNodeId) {
            connectedNodeIds.add(d.source.id);
        }
    });


    this.previouslyConnectedClusterNodeIds = connectedNodeIds;

      const category = this.decisionService.getDecisionSunburst();

      const clusterId = this.artistClusterMap.get(artistNode.id)?.clusterId;

      if (clusterId !== undefined) {
          const clusterNode = this.clusters[clusterId];
         let artistColor = this.getArtistColorBasedOnCategory(artistNode.artist, category);
          artistColor = d3.rgb(artistColor).darker(0.5).toString()

          const sharedExhibitionMinArtworksValues: number[] = [];

          this.g.selectAll(`.artist-edge-${clusterId}`)
          .filter((d: any) => d.source.id === artistNode.id || d.target.id === artistNode.id)
          .each((d: any) => {
            sharedExhibitionMinArtworksValues.push(d.sharedExhibitionMinArtworks); // Collect values for further processing
          });

          const minArtworks = d3.min(sharedExhibitionMinArtworksValues) ?? 0;
          const maxArtworks = d3.max(sharedExhibitionMinArtworksValues) ?? 1;
          const edgeColorScale = this.createEdgeColorScale(artistColor, minArtworks, maxArtworks);

          // Update edges connected to the selected node with the scaled color
          this.g.selectAll(`.artist-edge-${clusterId}`)
              .style('stroke', (d: any) => {
                  if (d.source.id === artistNode.id || d.target.id === artistNode.id) {
                      return edgeColorScale(d.sharedExhibitionMinArtworks);
                  } else {
                      return this.edgeColorScale(d.sharedExhibitionMinArtworks);
                  }
              })
              .style('opacity', (d: any) => {
                  return (d.source.id === artistNode.id || d.target.id === artistNode.id) ? '1' : '0';
              });

          // Reduce opacity for nodes not connected to the selected node
          this.g.selectAll(`.artist-node-${clusterId}`)
              .filter((d: any) => d.id !== artistNode.id && !connectedNodeIds.has(d.id))
              .style('opacity', '0.2');
      }

    const clusterNode = this.artistClusterMap.get(artistNode.id);
    if (clusterNode) {
        this.focusHandler(clusterNode);
        this.selectionService.selectFocusedCluster(clusterNode.artists);
    }
  
    this.selectionService.selectFocusArtist(artistNode.artist);
    this.selectionService.selectArtists([artistNode.artist]);
  
    const artist = artistNode.artist;
 
    if(this.modernMap){

    this.selectionService.selectCountries([this.getArtistCountry(artist)]);
    }else{
      this.selectionService.selectOldCountries([this.getArtistCountry(artist)]);
    }
  
    // Copy artist's name to clipboard
    navigator.clipboard.writeText(`${artist.firstname} ${artist.lastname}`);
  
    const clusterNode2 = this.artistClusterMap.get(artistNode.id);
    if (clusterNode2) {
        const selectedClusterArtists = clusterNode2.artists;
        const selectedClusterEdges = this.intraCommunityEdges[clusterNode2.clusterId];
        this.selectionService.selectCluster(selectedClusterArtists);
        this.selectionService.selectClusterEdges(selectedClusterEdges);
    }
      // Highlight the same node in other clusters/categories
      this.highlightSameNodeInOtherClusters(artistNode.id);
    }
    
    private highlightSameNodeInOtherClusters(artistId: number): void {
      const width = 0.07 * this.innerRadius / 100;
      this.g.selectAll(".artist-node").filter((d: any) => d.artist.id === artistId)
        .each((d: any, i: number, nodes: any) => {
          const circle = nodes[i] as SVGCircleElement;
          circle.style.filter = 'url(#shadow)';
          circle.style.strokeWidth= `${width}vw`;
          circle.style.stroke =  'black';
        })
    
        
      }
    
  
  private getArtistColorBasedOnCategory(artist: Artist, category: string): string {
    let countryCode: string;
    let originalColor;

    if(this.modernMap){
    switch (category) {
        case 'nationality':
            countryCode = artist.nationality;
            break;
        case 'birthcountry':
            countryCode = artist.birthcountry;
            break;
        case 'deathcountry':
            countryCode = artist.deathcountry;
            break;
        case 'mostexhibited':
            countryCode = artist.most_exhibited_in;
            break;
        default:
            countryCode = artist.nationality;
            break;
    }
    originalColor = this.artistService.getCountryColor(countryCode, 1)
  }
  else{
    switch (category) {
     
      case 'birthcountry':
          countryCode = artist.oldBirthCountry;
          break;
      case 'deathcountry':
          countryCode = artist.oldBirthCountry;
          break;
      case 'mostexhibited':
          countryCode = artist.mostExhibitedInOldCountry;
          break;
      default:
          countryCode = artist.oldBirthCountry;
          break;
  }
  originalColor = this.artistService.getOldCountryColor(countryCode, 1)

  }

    return originalColor;  // Corrected: call toString()
  }
  private getArtistCountryBasedOnCategory(artist: Artist, category: string): string {
    let countryCode: string;
  

    if(this.modernMap){
    switch (category) {
        case 'nationality':
            countryCode = artist.nationality;
            break;
        case 'birthcountry':
            countryCode = artist.birthcountry;
            break;
        case 'deathcountry':
            countryCode = artist.deathcountry;
            break;
        case 'mostexhibited':
            countryCode = artist.most_exhibited_in;
            break;
        default:
            countryCode = artist.nationality;
            break;
    }
  }
  else{
    switch (category) {
     
      case 'birthcountry':
          countryCode = artist.oldBirthCountry;
          break;
      case 'deathcountry':
          countryCode = artist.oldBirthCountry;
          break;
      case 'mostexhibited':
          countryCode = artist.mostExhibitedInOldCountry;
          break;
      default:
          countryCode = artist.oldBirthCountry;
          break;
  }

  }

    return countryCode;  // Corrected: call toString()
  }

  private createEdgeColorScale(baseColor: string, minArtworks: number, maxArtworks: number): d3.ScaleLinear<string, number> {
    const baseColorRGB = d3.rgb(baseColor);
    
    // Generate a lighter color with more noticeable contrast
    const lighterColor = baseColorRGB.brighter(1); // Increase the brightness level (2) for more contrast
    const darkerColor = baseColorRGB.darker(4); // Darken the base color for the max value

    // Adjust the opacity of the lighter color if needed
    lighterColor.opacity = 0.2; // Set to 30% opacity for more visibility

    // Check if min and max artworks are the same
    if (minArtworks === maxArtworks) {
        return d3.scaleLinear<string, number>()
            .domain([0, 1])
            .range([baseColor, baseColor]);
    } else {
        // Create a color scale with intermediate colors
        return d3.scaleLinear<string, number>()
            .domain([minArtworks,maxArtworks])
            .range([lighterColor.toString(), darkerColor.toString()]);
    }
}

   private focusHandler(clusterNode:ClusterNode){
     
      const selectedArtists = clusterNode.artists;
      const selectedEdges = this.intraCommunityEdges[clusterNode.clusterId];
  
    
        // Set the new cluster node as selected and change its border
  
        const width= 0.5*clusterNode.innerRadius/100;
        this.selectedClusterNode = clusterNode;
         
    
        // Select the new cluster node
        this.selectionService.selectCluster(selectedArtists);
        this.selectionService.selectClusterEdges(selectedEdges);
     
        
      
    }






    private createChart(): void {
      this.artistService.getAllArtists().subscribe(
        (array) => {
         // Assuming turnIntoMap returns a Map object
this.allSearchbarArtists = this.artistService.turnIntoMap(array);

// Convert Map to an array using Array.from
const allArtistArray = Array.from(this.allSearchbarArtists.entries()).map(([id, value]) => ({
  id,
  ...value,
}));

// Update Fuse.js collection
this.fuse.setCollection(allArtistArray);
     
        },
        (error) => {
          console.error('Error fetching default data:', error);
          alert('An error occurred: ' + error.message + '. Please reload the website.');

        }
      );
      
      // Fetch data from backend
      this.artistService.clusterAmountArtists([200, 2217], 7)
        .subscribe(data => {
      
          this.clusters = data[0];
          //console.log('hallo', this.clusters[0][0])
          this.decisionService.changeInterCommunityEdges(data[2])
          this.decisionService.changeClusters(data[0]);
  
          this.singleInterCommunityEdges = data[3] as exhibited_with[][];
          
          this.selectionService.selectAllClusters(this.clusters);
      
          this.intraCommunityEdges = data[1] as exhibited_with[][];
          const interCommunityEdgesRaw = data[2] as exhibited_with[];
          //console.log('edges',data[3])
      
          this.interCommunityEdges = interCommunityEdgesRaw.map(edge => ({
            source: edge.startId,
            target: edge.endId,
            sharedExhibitionMinArtworks: edge.sharedExhibitionMinArtworks
          }));
  
          let allArtists:Artist[]= [];
          this.clusters.forEach((cluster, clusterIndex) => {
            allArtists.push(...cluster);
          });
          this.selectedCluster = allArtists;
          this.allArtists = allArtists;
          this.selectionService.selectAllArtists(allArtists);


         
    
  
          // Calculate degrees for each cluster
          this.calculateNodeDegreesForClusters();
  
         this.visualizeData();
        }, error => {
          console.error('There was an error', error);
          alert('An error occurred: ' + error.message + '. Please reload the website.');

          this.isLoading = false;
        });
     
    }
  
  
    private visualizeData(): void {
      this.isLoading = true;
      this.createSvg();
      this.drawClusters();
      this.saveCountryCentroidsOnInitialization();
      this.saveOldCountryCentroidsOnInitialization();
      const category = this.decisionService.getDecisionSunburst();  
      this.selectionService.selectCountries(this.allCountriesByCategory[category]);
     // console.log('all old', this.allOldCountriesByCategory)
      this.selectionService.selectOldCountries(this.allOldCountriesByCategory[category]);
      this.updateNetworkOnSunburstChange(category)
      this.updateMap(category);
 
    }
  

    private saveOldCountryCentroidsOnInitialization(): void {
      const categories = ['birthcountry', 'deathcountry', 'mostexhibited'];
    
      // Iterate through each category and cluster
      categories.forEach((category) => {
        const allCountriesSet = new Set<string>(); // Use a Set to avoid duplicates

         // Initialize this.OldCountryCentroids[category] if it hasn't been already
         if (!this.OldCountryCentroids[category]) {
          this.OldCountryCentroids[category] = {};
      }
    
        this.clusters.forEach((cluster, clusterIndex) => {
          const clusterNode = this.clusterNodes[clusterIndex]; // Get ClusterNode for this cluster
          if (clusterNode) {
            // Generate country centroids for this category and cluster
            const countryCentroids = this.createOldCountryCentroids(clusterNode.artists, category, clusterNode);
    
            //console.log('country centroids', countryCentroids)
            // Ensure the category is initialized in countryCentroids object
            if (!this.countryCentroids[category]) {
              this.countryCentroids[category] = {};
            }
    
            // Add countries from each artist to the Set
            clusterNode.artists.forEach(artist => {
              switch (category) {
                case 'birthcountry':
                  if (artist.oldBirthCountry) allCountriesSet.add(artist.oldBirthCountry);
                  break;
                case 'deathcountry':
                  if (artist.oldDeathCountry) allCountriesSet.add(artist.oldDeathCountry);
                  break;
                case 'mostexhibited':
                  if (artist.mostExhibitedInOldCountry) allCountriesSet.add(artist.mostExhibitedInOldCountry);
                  break;
              }
            });
    
            // Store the centroids for this cluster in the respective category
            this.OldCountryCentroids[category][clusterIndex] = countryCentroids;
          }
        });
    
        // Convert the Set to an array and store it in allCountriesByCategory
        this.allOldCountriesByCategory[category] = Array.from(allCountriesSet);
      });
    }

    private saveCountryCentroidsOnInitialization(): void {
      const categories = ['nationality', 'birthcountry', 'deathcountry', 'mostexhibited'];
    
      // Iterate through each category and cluster
      categories.forEach((category) => {
        const allCountriesSet = new Set<string>(); // Use a Set to avoid duplicates
    
        this.clusters.forEach((cluster, clusterIndex) => {
          const clusterNode = this.clusterNodes[clusterIndex]; // Get ClusterNode for this cluster
          if (clusterNode) {
            // Generate country centroids for this category and cluster
            const countryCentroids = this.createCountryCentroids(clusterNode.artists, category, clusterNode);
    
            // Ensure the category is initialized in countryCentroids object
            if (!this.countryCentroids[category]) {
              this.countryCentroids[category] = {};
            }
    
            // Add countries from each artist to the Set
            clusterNode.artists.forEach(artist => {
              switch (category) {
                case 'nationality':
                  if (artist.nationality) allCountriesSet.add(artist.nationality);
                  break;
                case 'birthcountry':
                  if (artist.birthcountry) allCountriesSet.add(artist.birthcountry);
                  break;
                case 'deathcountry':
                  if (artist.deathcountry) allCountriesSet.add(artist.deathcountry);
                  break;
                case 'mostexhibited':
                  if (artist.most_exhibited_in) allCountriesSet.add(artist.most_exhibited_in);
                  break;
              }
            });
    
            // Store the centroids for this cluster in the respective category
            this.countryCentroids[category][clusterIndex] = countryCentroids;
          }
        });
    
        // Convert the Set to an array and store it in allCountriesByCategory
        this.allCountriesByCategory[category] = Array.from(allCountriesSet);
      });
    }
    
    private createCountryCentroids(artists: Artist[], category: string, clusterNode: ClusterNode): { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } {
    
      const countryMap = new Map<string, Artist[]>();
    let sortedArtists: Artist[] = [];
  
    // Populate the country map based on the value parameter
    switch (category) {
        case 'nationality':
            sortedArtists = this.prepareData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.nationality)) {
                    countryMap.set(artist.nationality, []);
                }
                countryMap.get(artist.nationality)!.push(artist);
            });
            break;
        case 'birthcountry':
            sortedArtists = this.prepareData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.birthcountry)) {
                    countryMap.set(artist.birthcountry, []);
                }
                countryMap.get(artist.birthcountry)!.push(artist);
            });
            break;
        case 'deathcountry':
            sortedArtists = this.prepareData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.deathcountry)) {
                    countryMap.set(artist.deathcountry, []);
                }
                countryMap.get(artist.deathcountry)!.push(artist);
            });
            break;
        case 'mostexhibited':
            sortedArtists = this.prepareData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.most_exhibited_in)) {
                    countryMap.set(artist.most_exhibited_in, []);
                }
                countryMap.get(artist.most_exhibited_in)!.push(artist);
            });
            break;
    }
      const countries = Array.from(countryMap.keys());
      const totalArtists = artists.length;
      const minimumAngle = Math.PI / 18;
    
      let totalAngleAvailable = 2 * Math.PI;
      const dynamicAngles = new Map<string, number>();
    
      countryMap.forEach((artists, country) => {
        dynamicAngles.set(country, minimumAngle);
        totalAngleAvailable -= minimumAngle;
      });
    
      countryMap.forEach((artists, country) => {
        const proportion = artists.length / totalArtists;
        const extraAngle = proportion * totalAngleAvailable;
        const currentAngle = dynamicAngles.get(country) || 0;
        dynamicAngles.set(country, currentAngle + extraAngle);
      });
    
      let currentAngle = 0;
      const data: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } = {};
      countries.forEach((country) => {
        const angle = dynamicAngles.get(country) as number;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const middleAngle = (startAngle + endAngle) / 2;
        currentAngle = endAngle;
        data[country] = {
          country,
          startAngle,
          endAngle,
          middleAngle,
          color: this.artistService.getCountryColor(country, 1)
        };
      });
    
      return data;
    }
    
    private createOldCountryCentroids(artists: Artist[], category: string, clusterNode: ClusterNode): { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } {
    
      const countryMap = new Map<string, Artist[]>();
    let sortedArtists: Artist[] = [];
  
    // Populate the country map based on the value parameter
    switch (category) {
       
        case 'birthcountry':
            sortedArtists = this.prepareOldData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.oldBirthCountry)) {
                    countryMap.set(artist.oldBirthCountry, []);
                }
                countryMap.get(artist.oldBirthCountry)!.push(artist);
            });
            break;
        case 'deathcountry':
            sortedArtists = this.prepareOldData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.oldDeathCountry)) {
                    countryMap.set(artist.oldDeathCountry, []);
                }
                countryMap.get(artist.oldDeathCountry)!.push(artist);
            });
            break;
        case 'mostexhibited':
            sortedArtists = this.prepareOldData(clusterNode.artists, category);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.mostExhibitedInOldCountry)) {
                    countryMap.set(artist.mostExhibitedInOldCountry, []);
                }
                countryMap.get(artist.mostExhibitedInOldCountry)!.push(artist);
            });
            break;
    }
      const countries = Array.from(countryMap.keys());
      const totalArtists = artists.length;
      const minimumAngle = Math.PI / 18;
    
      let totalAngleAvailable = 2 * Math.PI;
      const dynamicAngles = new Map<string, number>();
    
      countryMap.forEach((artists, country) => {
        dynamicAngles.set(country, minimumAngle);
        totalAngleAvailable -= minimumAngle;
      });
    
      countryMap.forEach((artists, country) => {
        const proportion = artists.length / totalArtists;
        const extraAngle = proportion * totalAngleAvailable;
        const currentAngle = dynamicAngles.get(country) || 0;
        dynamicAngles.set(country, currentAngle + extraAngle);
      });
    
      let currentAngle = 0;
      const data: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } = {};
      countries.forEach((country) => {
        const angle = dynamicAngles.get(country) as number;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const middleAngle = (startAngle + endAngle) / 2;
        currentAngle = endAngle;
        data[country] = {
          country,
          startAngle,
          endAngle,
          middleAngle,
          color: this.artistService.getOldCountryColor(country, 1)
        };
      });
    
      return data;
    }
    private createSvg(): void {
      // Remove any existing SVG elements
      d3.select(this.chartContainer.nativeElement).select(".matrix-svg-container").select("svg").remove();
      
      const element = this.chartContainer.nativeElement.querySelector('.matrix-svg-container');
      const k = this.decisionService.getK();
     
      let margin = {
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
      
      // Define the zoom behavior with limited scale extent
      const zoom = d3.zoom()
        .scaleExtent([1, 10]) // Only allow zooming in, starting from default scale (1)
        .on("zoom", (event) => {
          this.g.attr("transform", event.transform);
        });
      
      this.svg.call(zoom);
    
      // Add double-click event to reset zoom to the original state
      this.svg.on("click", (event: MouseEvent) => {
        const clickedElement = d3.select(event.target as Element);
        const isNodeClick = clickedElement.classed("artist-node");
        const isClusterClick = clickedElement.classed("cluster"); // Replace with the class name used for clusters
        const isEdgeClick = clickedElement.classed("artist-edge"); // Replace with the class name used for artist edges
        const isPathClick = clickedElement.classed("path"); // Replace with the class name used for paths
      
         // Check if Shift key is pressed when clicking
         if (event.shiftKey) {
          this.svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        }

      
        // Check if Ctrl key is pressed when clicking outside of nodes
        if (event.ctrlKey) {
    
          if (!isNodeClick && this.selectedNodes.length > 0) {
            // If Ctrl is pressed but the click is outside any node, reset the selection
            let defs = this.svg.select('defs');
            if (defs.empty()) {
              defs = this.svg.append('defs');
            }
    
            let filter = defs.select('#shadow');
            if (filter.empty()) {
              filter = defs.append('filter')
                .attr('id', 'shadow')
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');
            
              filter.append('feDropShadow')
                .attr('dx', 0)
                .attr('dy', 0)
                .attr('flood-color', 'black')
                .attr('flood-opacity', 1);
            
              let feMerge = filter.append('feMerge');
              feMerge.append('feMergeNode');
              feMerge.append('feMergeNode')
                .attr('in', 'SourceGraphic');
            }
    
            const allNodes = [...this.selectedNodes];
            // Reset selection for all selected nodes
            allNodes.forEach((node) => {
              const circle = node[0] as SVGCircleElement;
              if (circle) {
                const artistNodeData = d3.select(circle).datum() as ArtistNode;
                this.handleMultiNodeSelection(artistNodeData, circle, filter,false);
              }
            });
          }

        }

        else if (!isNodeClick && !isClusterClick && !isEdgeClick && !isPathClick) {
          if(this.selectedNodes.length>0){
              // If Ctrl is pressed but the click is outside any node, reset the selection
              let defs = this.svg.select('defs');
              if (defs.empty()) {
                defs = this.svg.append('defs');
              }
      
              let filter = defs.select('#shadow');
              if (filter.empty()) {
                filter = defs.append('filter')
                  .attr('id', 'shadow')
                  .attr('x', '-50%')
                  .attr('y', '-50%')
                  .attr('width', '200%')
                  .attr('height', '200%');
              
                filter.append('feDropShadow')
                  .attr('dx', 0)
                  .attr('dy', 0)
                  .attr('flood-color', 'black')
                  .attr('flood-opacity', 1);
              
                let feMerge = filter.append('feMerge');
                feMerge.append('feMergeNode');
                feMerge.append('feMergeNode')
                  .attr('in', 'SourceGraphic');
              }
      
              const allNodes = [...this.selectedNodes];
              // Reset selection for all selected nodes
              allNodes.forEach((node) => {
                const circle = node[0] as SVGCircleElement;
                if (circle) {
                  const artistNodeData = d3.select(circle).datum() as ArtistNode;
                  this.handleMultiNodeSelection(artistNodeData, circle, filter,false);
                }
              });
            
         

          }
          if(this.selectedClusterNode){
            
            this.onClusterClick(this.selectedClusterNode);
          }}

       



      });
    }
    
    
    
    
    private drawClusters(): void {
      const k = this.decisionService.getK();
      this.clusterNodes = [];
    
      // Get the current sunburst decision
      const currentSunburst = this.decisionService.getDecisionSunburst();

          // Determine the number of rows based on the number of clusters
    const rows = Math.ceil(k / 10);
    const clustersPerRow = Math.min(10, k);

    // Calculate the width and height for cells based on rows
    const cellWidth = this.contentWidth / clustersPerRow;
    const cellHeight = this.contentHeight / rows;
    const xData = d3.range(1, k + 1).map(String);
    const yData = [currentSunburst];
    
/*      
    
      const cellWidth = this.contentWidth / k;
      const cellHeight = this.contentHeight; */
  
      this.cellWidth = cellWidth;
      this.cellHeight = cellHeight;
    
      const xScale = d3.scaleBand()
        .domain(xData)
        .range([0, this.contentWidth])
        .padding(0.1);
    
      const yScale = d3.scaleBand()
        .domain(yData)
        .range([0, this.contentHeight])
        .padding(0.1);
        
  
    
        this.initializeRankingArrow();
          
      const ranking = this.decisionService.getDecisionRanking();


      this.updateRankingArrow(ranking);
      // Create a Promise array to ensure clusters are drawn before applying the force simulation
      const drawPromises = this.clusters.map((cluster, i) => {
        return new Promise<void>((resolve) => {
            this.drawCluster(i, cellWidth, cellHeight);
            
            // Use requestAnimationFrame to ensure the drawing is complete before resolving
            requestAnimationFrame(() => {
                resolve(); // Resolve after ensuring the drawing is complete
            });
        });
    });
   
     // Wait for all drawCluster calls to complete
     Promise.all(drawPromises).then(() => {
      // Add a short delay to ensure DOM is fully updated
      setTimeout(() => {
        if(this.clusters.length>1){
          this.applyForceSimulation();
        }else{
          const singleClusterNode = this.clusterNodes[0];
          singleClusterNode.x = this.contentWidth / 2;
          singleClusterNode.y = this.contentHeight / 2;
          singleClusterNode.vx = 0; // No velocity to ensure no movement
          singleClusterNode.vy = 0; // No velocity to ensure no movement
  
          // Update the position in the DOM
          d3.select(`.cluster-${singleClusterNode.clusterId}`)
            .attr('transform', `translate(${singleClusterNode.x}, ${singleClusterNode.y})`);
        }
          this.isLoading = false;
       
      }, 1000); // 100 milliseconds delay
      

  
    
  });
  }
  

    

  
  
  
    private ticked(): void {

      // Update the cluster positions


      this.g.selectAll(".cluster")
      .data(this.clusterNodes)
      .attr("transform", (d: ClusterNode) => {
          if (typeof d.x !== 'undefined' && !isNaN(d.x) && typeof d.y !== 'undefined' && !isNaN(d.y)) {
              // Check if the cluster is above the boundary and push it down if necessary
            
              return `translate(${d.x}, ${d.y})`;
          }
          if ((d.y -  d.outerRadius) < this.arrowYBoundary) {
            d.y = d.outerRadius; // Push the cluster down below the boundary
        }
          return `translate(0, ${this.contentHeight / 2})`; // Default positioning if NaN
      });
  
      // Update positions of artist nodes within clusters
      this.g.selectAll(".artist-node")
        .attr("cx", (d: ArtistNode) => d.x)
        .attr("cy", (d: ArtistNode) => d.y);
    
      // Update positions of artist edges within clusters
      this.g.selectAll(".artist-edge")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
    }


// Apply transitions after the simulation ends

    
    private applyForceSimulation(): void {
      const height = this.contentHeight;
     // console.log('clusters', this.clusterNodes)
      

     
      const nodes = this.clusterNodes;
      nodes.forEach(node => {
        if (typeof node.x === 'undefined' || isNaN(node.x)) {
            node.x = Math.random() * this.contentWidth; // Random initial x position
        }
        if (typeof node.y === 'undefined' || isNaN(node.y)) {
            node.y = this.contentHeight / 2; // Set y to center height if undefined
        }
        if (isNaN(node.x) || isNaN(node.y)) {
            node.x = 0;
            node.y=0;
           // console.log('NaN detected in applyForceSimulation initialization:', node);
        }
    });
    
    this.clusterNodes = nodes;
  
      // Get the current ranking from the decision service
      const ranking = this.decisionService.getDecisionRanking();



          // Initialize the x and y positions for each node if undefined
  
  
      // Define the xScale based on the current ranking
      let xScale;
      switch (ranking) {
        case 'exhibitions':
            const minTotalExhibitions = d3.min(this.clusterNodes, d => d.totalExhibitions) || 0;
            const minExhibitionNode = this.clusterNodes.find(d => d.totalExhibitions === minTotalExhibitions);
            const maxTotalExhibitions = d3.max(this.clusterNodes, d => d.totalExhibitions) || 0;
            const maxExhibitionNode = this.clusterNodes.find(d => d.totalExhibitions === maxTotalExhibitions);
            const leftExhibitionRange = maxExhibitionNode ? maxExhibitionNode.outerRadius*1.2: this.cellWidth / 2;
            const rightExhibitionRange = minExhibitionNode ? minExhibitionNode.outerRadius*1.2 : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalExhibitions, minTotalExhibitions])
                .range([leftExhibitionRange, this.contentWidth - rightExhibitionRange]);
            break;

        case 'techniques':
            const minTotalTechniques = d3.min(this.clusterNodes, d => d.totalTechniques) || 0;
            const minTechniqueNode = this.clusterNodes.find(d => d.totalTechniques === minTotalTechniques);
            const maxTotalTechniques = d3.max(this.clusterNodes, d => d.totalTechniques) || 0;
            const maxTechniqueNode = this.clusterNodes.find(d => d.totalTechniques === maxTotalTechniques);
            const leftTechniqueRange = maxTechniqueNode ? maxTechniqueNode.outerRadius*1.2 : this.cellWidth / 2;
            const rightTechniqueRange = minTechniqueNode ? minTechniqueNode.outerRadius*1.2 : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalTechniques, minTotalTechniques])
                .range([leftTechniqueRange, this.contentWidth - rightTechniqueRange]);
            break;

        case 'artworks':
            const minTotalArtworks = d3.min(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
            const minArtworkNode = this.clusterNodes.find(d => d.totalExhibitedArtworks === minTotalArtworks);
            const maxTotalArtworks = d3.max(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
            const maxArtworkNode = this.clusterNodes.find(d => d.totalExhibitedArtworks === maxTotalArtworks);
            const leftArtworkRange = maxArtworkNode ? maxArtworkNode.outerRadius*1.2: this.cellWidth / 2;
            const rightArtworkRange = minArtworkNode ? minArtworkNode.outerRadius*1.2 : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([maxTotalArtworks, minTotalArtworks])
                .range([leftArtworkRange, this.contentWidth - rightArtworkRange]);
            break;

        case 'birthyear':
            const minBirthYear = d3.min(this.clusterNodes, d => d.meanBirthYear) || 1900;
            const minBirthYearNode = this.clusterNodes.find(d => d.meanBirthYear === minBirthYear);
            const maxBirthYear = d3.max(this.clusterNodes, d => d.meanBirthYear) || 1950;
            const maxBirthYearNode = this.clusterNodes.find(d => d.meanBirthYear === maxBirthYear);
            const leftBirthYearRange = maxBirthYearNode ? maxBirthYearNode.outerRadius*1.2 : this.cellWidth / 2;
            const rightBirthYearRange = minBirthYearNode ? minBirthYearNode.outerRadius*1.2 : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minBirthYear, maxBirthYear])
                .range([leftBirthYearRange, this.contentWidth - rightBirthYearRange]);
            break;

        case 'deathyear':
            const minDeathYear = d3.min(this.clusterNodes, d => d.meanDeathYear) || 1850;
            const minDeathYearNode = this.clusterNodes.find(d => d.meanDeathYear === minDeathYear);
            const maxDeathYear = d3.max(this.clusterNodes, d => d.meanDeathYear) || 1900;
            const maxDeathYearNode = this.clusterNodes.find(d => d.meanDeathYear === maxDeathYear);
            const leftDeathYearRange = maxDeathYearNode ? maxDeathYearNode.outerRadius*1.2 : this.cellWidth / 2;
            const rightDeathYearRange = minDeathYearNode ? minDeathYearNode.outerRadius*1.2 : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minDeathYear, maxDeathYear])
                .range([leftDeathYearRange, this.contentWidth - rightDeathYearRange]);
            break;

        case 'time':
            const minAvgDate = d3.min(this.clusterNodes, d => d.meanAvgDate.getTime()) || new Date(1850, 0, 1).getTime();
            const minTimeNode = this.clusterNodes.find(d => d.meanAvgDate.getTime() === minAvgDate);
            const maxAvgDate = d3.max(this.clusterNodes, d => d.meanAvgDate.getTime()) || new Date(1950, 0, 1).getTime();
            const maxTimeNode = this.clusterNodes.find(d => d.meanAvgDate.getTime() === maxAvgDate);
            const leftTimeRange = maxTimeNode ? maxTimeNode.outerRadius*1.2 : this.cellWidth / 2;
            const rightTimeRange = minTimeNode ? minTimeNode.outerRadius*1.2  : this.cellWidth / 2;

            xScale = d3.scaleLinear()
                .domain([minAvgDate, maxAvgDate])
                .range([leftTimeRange, this.contentWidth - rightTimeRange]);
            break;

        default:
          const minTotalArtworks2 = d3.min(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
          const minArtworkNode2 = this.clusterNodes.find(d => d.totalExhibitedArtworks === minTotalArtworks2);
          const maxTotalArtworks2 = d3.max(this.clusterNodes, d => d.totalExhibitedArtworks) || 0;
          const maxArtworkNode2 = this.clusterNodes.find(d => d.totalExhibitedArtworks === maxTotalArtworks2);
          const leftArtworkRange2 = maxArtworkNode2 ? maxArtworkNode2.outerRadius: this.cellWidth / 2;
          const rightArtworkRange2 = minArtworkNode2 ? minArtworkNode2.outerRadius : this.cellWidth / 2;

          xScale = d3.scaleLinear()
              .domain([maxTotalArtworks2, minTotalArtworks2])
              .range([leftArtworkRange2, this.contentWidth - rightArtworkRange2]);
       
            break;
    }

    this.clusterNodes.forEach(clusterNode => {
      const xValue = ranking === 'exhibitions' ? clusterNode.totalExhibitions :
                     ranking === 'artworks' ? clusterNode.totalExhibitedArtworks :
                     ranking === 'techniques' ? clusterNode.totalTechniques :
                     ranking === 'birthyear' ? clusterNode.meanBirthYear :
                     ranking === 'deathyear' ? clusterNode.meanDeathYear :
                     ranking === 'time' ? clusterNode.meanAvgDate :
                     0;
    
      // Ensure xValue is valid and calculate its position using xScale
      clusterNode.x = xScale(xValue);
      
      // Assign y position to the middle of the height
      clusterNode.y = height / 2;
    });
    
    

   
      // Set up the force simulation with the nodes
      this.clusterSimulation = d3.forceSimulation<ClusterNode>(nodes)
          .force('charge', d3.forceManyBody().strength(5))
          .force("collision", d3.forceCollide<ClusterNode>().radius(d => d.outerRadius))
          .force('x', d3.forceX().x((d: any) => {
            const xValue = ranking === 'exhibitions' ? d.totalExhibitions :
                           ranking === 'artworks' ? d.totalExhibitedArtworks :
                           ranking === 'techniques' ? d.totalTechniques :
                           ranking === 'birthyear' ? d.meanBirthYear :
                           ranking === 'deathyear' ? d.meanDeathYear :
                           ranking === 'time' ? d.meanAvgDate :
                           0;
            return isNaN(xValue) ? 0 : xScale(xValue); // Handle NaN by defaulting to 0 or any suitable value
        }))
          .force('y', d3.forceY().y(() => height / 2))
          .alpha(1) // Ensure high alpha for the initial simulation
          .alphaDecay(0.02) // Slower decay for smoother movement
          .on("tick", () => this.ticked())
          // Restart the simulation after setting up the forces
  
      // Create an array of clusterIds ordered by their position in the xScale
      const orderedClusterIds = this.clusterNodes
          .map(clusterNode => ({
              clusterId: clusterNode.clusterId,
              xPosition: xScale(ranking === 'exhibitions' ? clusterNode.totalExhibitions :
                                ranking === 'artworks' ? clusterNode.totalExhibitedArtworks :
                                ranking === 'techniques' ? clusterNode.totalTechniques :
                                ranking === 'birthyear' ? clusterNode.meanBirthYear :
                                ranking === 'deathyear' ? clusterNode.meanDeathYear :
                                ranking === 'time' ? clusterNode.meanAvgDate :
                                clusterNode.totalExhibitedArtworks) // Default to artworks
          }))
          .sort((a, b) => a.xPosition - b.xPosition) // Sort by xPosition
          .map(item => item.clusterId); // Extract only the ordered clusterIds
  
          this.decisionService.changeRankingOrder(orderedClusterIds);
        }
  
  

/*   .force('x', d3.forceX().x(function(d) {
    return xScale(d.value);
  }))
 */
        
    

  private drawCluster(x: number, cellWidth: number, cellHeight: number): void {
    const clusterIndex = x;
    const cluster = this.clusters[clusterIndex];
    if (!cluster) return;
  
    const cellSize = Math.min(cellWidth, cellHeight, this.contentWidth / 5); // Limit cell size when there are few clusters
    const paddedCellSize = cellSize; // Reduce cell size by padding ratio
 
    // Find the maximum cluster size
    const maxClusterSize = d3.max(this.clusters, cluster => cluster.length) || 0;
let   [outerRadius, innerRadius] :number[]=[] ;
const amount = this.clusters.length
let size=0;
if(amount<6){
switch(amount){
  case 1:
      size = Math.min(this.contentHeight,this.contentWidth)/2;
      [outerRadius, innerRadius] = [size,size - size / 5]   ;
      break;
  case 2:
      size = Math.min(this.contentHeight,this.contentWidth)/3;
      [outerRadius, innerRadius] = [size,size - size / 5]   ;
      break;
  case 3:
      size = Math.min(this.contentHeight,this.contentWidth)/4;
      [outerRadius, innerRadius] = [size,size - size / 5]   ;
      break;
  case 4:
      size = Math.min(this.contentHeight,this.contentWidth)/5;
      [outerRadius, innerRadius] = [size,size - size / 5]   ;
      break;
  case 5:
      size = Math.min(this.contentHeight,this.contentWidth)/6;
      [outerRadius, innerRadius] = [size,size - size / 5]   ;
      break;
  }
}else{
      [outerRadius, innerRadius]  = this.createSunburstProperties(cluster.length, maxClusterSize, paddedCellSize, this.clusters.length);
    }
    this.innerRadius = innerRadius; 
  
    // Use a single reduce function to calculate the average birth year and other properties
    const metrics = cluster.reduce((acc, artist) => {
        acc.totalBirthYear += artist.birthyear;
        acc.totalExhibitedArtworks += artist.total_exhibited_artworks;
        acc.totalExhibitions += artist.total_exhibitions;
        acc.totalDeathYear += artist.deathyear;
        acc.totalAvgDate += new Date(artist.overall_avg_date).getTime(); // Convert to timestamp
        
        // Add artist's distinct techniques to the Set to ensure uniqueness
        artist.distinct_techniques.forEach(technique => acc.uniqueTechniques.add(technique));
        
        acc.count += 1;
        return acc;
    }, {
        totalAvgDate: 0,
        totalBirthYear: 0,
        totalExhibitedArtworks: 0,
        totalExhibitions: 0,
        uniqueTechniques: new Set<string>(), // Use a Set to track unique techniques
        totalDeathYear: 0,
        count: 0
    });
  
    // Calculate the average birth year
    const avgBirthYear = metrics.count > 0 ? metrics.totalBirthYear / metrics.count : 1910;
    const avgDeathYear = metrics.count > 0 ? metrics.totalDeathYear / metrics.count : 1910;

    // Calculate the average date
    const avgDateTimestamp = metrics.count > 0 ? metrics.totalAvgDate / metrics.count : new Date(1910, 0, 1).getTime();
    const avgDate = new Date(avgDateTimestamp); // Convert back to Date object

   // console.log('clusterindex', clusterIndex);
  
    // Create the clusterNode with the calculated values
    const clusterNode: ClusterNode = {
        clusterId: clusterIndex,
        artists: cluster,
        outerRadius: outerRadius,
        innerRadius: innerRadius,
        x: this.contentWidth/2,
        y: this.contentHeight/2, 
        vx: 0,
         vy:  0, // Initialize x and y positions and velocities
        meanAvgDate: new Date(),  // Adjust this if you have a value to calculate for meanAvgDate
        meanBirthYear: avgBirthYear, // Set the calculated average birth year as a Date object
        meanDeathYear: avgDeathYear,
        totalExhibitedArtworks: metrics.totalExhibitedArtworks,
        totalExhibitions: metrics.totalExhibitions,
        totalTechniques: metrics.uniqueTechniques.size // Get the count of distinct techniques
    };

    this.clusterNodes[clusterIndex] = clusterNode;
  
    const category = this.decisionService.getDecisionSunburst();
    const clusterGroup = this.createClusterGroup(clusterNode, category, cellWidth, cellHeight);
  
    // Append the clusterGroup to this.svg
    this.g.append(() => clusterGroup);  // Add the cluster to the main SVG
}

  




    
    private drawVerticalSeparators(xScale: d3.ScaleBand<string>, xData: string[]): void {
      xData.forEach((d, i) => {
          if (i > 0) { // Skip the first index to avoid a line at the start
              const x = xScale(d)! -4;
              this.g.append("line")
                .attr("x1", x)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", this.contentHeight)
                .attr("stroke", "#e5aeff") // Light gray color
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4,4") // Dashed line
                .attr("opacity", 0.7); // Adjust opacity
          }
      });
  }
  
  
  
/*   private drawCells(xScale: d3.ScaleBand<string>, yScale: d3.ScaleBand<string>, xData: string[], yData: string[], cellWidth: number, cellHeight: number): void {
    const cells = this.g.selectAll("g.cell")
      .data( xData.flatMap(x => yData.map(y => ({ x, y }))))
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", (d: any) => `translate(${xScale(String(d.x))!-5},${yScale(d.y)!-5})`);
  
    cells.each((d: any, i: number, nodes: any) => {
      this.drawClusterInCell(d3.select(nodes[i]), d.x, d.y, cellWidth, cellHeight);
     // this.addButtonToCell(d3.select(nodes[i]), d.x, d.y, cellWidth, cellHeight);
    });
  }
   */

  
  /* 
    showTooltip(event: MouseEvent): void {
      const tooltip = d3.select("div#tooltip");
      tooltip.style("display", "block")
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY + 5}px`)
          .style("color", "black")
          .html(`Get suggestion of reasoning of connections between those artists on click by an AI.<br/>`);
    }
    
    hideTooltip(): void {
      const tooltip = d3.select("div#tooltip");
      tooltip.style("display", "none");
    } */
      handleButtonClick(): void {
        this.aiLoading = true;
    
        if (this.selectedNodes && this.selectedNodes.length === 1) {
            // Single selected node logic
            const selectedArtist = this.getSelectedArtists()[0]; // Get the single selected artist
            const category = this.decisionService.getDecisionSunburst();
    
            // Extract data for the selected artist
            const nationality = this.artistService.countryMap[selectedArtist.nationality];
            const birthcountry = this.modernMap
                ? this.artistService.countryMap[selectedArtist.birthcountry]
                : this.artistService.oldCountryMap[selectedArtist.oldBirthCountry];
            const deathcountry = this.modernMap
                ? this.artistService.countryMap[selectedArtist.deathcountry]
                : this.artistService.oldCountryMap[selectedArtist.oldDeathCountry];
            const mostexhibited = this.modernMap
                ? this.artistService.countryMap[selectedArtist.most_exhibited_in]
                : this.artistService.oldCountryMap[selectedArtist.mostExhibitedInOldCountry];
    
            const clusterNode = this.artistClusterMap.get(selectedArtist.id);
    
            let joinedNames = '';
            if (clusterNode) {
                const artists = this.clusters[clusterNode.clusterId];
                const formattedNames = artists.map(name => `"${name.firstname} ${name.lastname}"`);
                joinedNames = formattedNames.length > 1
                    ? formattedNames.slice(0, -1).join(", ") + " or " + formattedNames[formattedNames.length - 1]
                    : formattedNames[0];
            }
            let prompt = '';

    
            switch (category) {
              case 'nationality':
                  prompt = `In 60 words, explore how ${selectedArtist.firstname} ${selectedArtist.lastname}'s nationality (${nationality}) influenced their artistic journey and connections with other artists such as ${joinedNames}. 
                  Focus on how cultural background and national identity shaped key collaborations and stylistic influences. Only use the artists' last names in your answer.`;
                  this.aiTitle = `AI Insight: You chose the category "Nationality" and the artist ${selectedArtist.firstname} ${selectedArtist.lastname}`;
                  this.aiSmallTitle = `The Impact of Their Nationality (${nationality}) on Their Art and Collaborations`;
                  break;
      
              case 'birthcountry':
                  prompt = `In 60 words, examine how growing up in ${birthcountry} shaped ${selectedArtist.firstname} ${selectedArtist.lastname}'s early artistic development and relationships with other artists such as ${joinedNames}. 
                  Highlight early influences, movements, or regional connections that shaped their style. Only use the artists' last names in your answer.`;
                  this.aiTitle = `AI Insight: You chose the category "Country of Birth" and the artist ${selectedArtist.firstname} ${selectedArtist.lastname}`;
                  this.aiSmallTitle = `Impact of Their Birth Country (${birthcountry}) on Their Early Career and Connections`;
      
                  break;
      
              case 'deathcountry':
                  prompt = `In 60 words, analyze how ${selectedArtist.firstname} ${selectedArtist.lastname}'s later years in ${deathcountry} influenced their final works and connections with artists such as ${joinedNames}. 
                  Explore any late-career collaborations or influences during this period. Only use the artists' last names in your answer.`;
                  this.aiTitle = `AI Insight: You chose the category "Country of Death" and the artist ${selectedArtist.firstname} ${selectedArtist.lastname}`;
                  this.aiSmallTitle = `Impact of Their Death Country (${deathcountry}) on Their Late Career and Connections`;
      
                  break;
      
              case 'mostexhibited':
                prompt = `In 60 words, discuss why ${selectedArtist.firstname} ${selectedArtist.lastname}'s works were most exhibited in ${mostexhibited}, and how connections with other artists, including ${joinedNames}, may have contributed to this focus. 
                Explore key exhibitions, collaborations, or regional influences. Only use the artists' last names in your answer.`;  
                  this.aiTitle = `AI Insight: You chose the category "Most Exhibited Country" and the artist ${selectedArtist.firstname} ${selectedArtist.lastname}`;
                  this.aiSmallTitle = `Why Their Art Was Most Exhibited in ${mostexhibited}`;
      
                  break;
      
              default:
                  console.warn('Unknown category:', category);
                  break;
          }
     
    
            if (prompt) {
                this.generateAIResponse(prompt);
            }
        } else if (this.selectedNodes && this.selectedNodes.length > 1) {
            // Multiple selected nodes logic
            const selectedArtists = this.getSelectedArtists();
            const category = this.decisionService.getDecisionSunburst();
            const prompt = this.generatePrompt(selectedArtists, category);
    
            if (prompt) {
                this.generateAIResponse(prompt);
            }
        } else if (this.selectedClusterNode) {
            // Cluster selected logic
            const clusterArtists = this.selectedClusterNode.artists;
            const category = this.decisionService.getDecisionSunburst();
            const prompt = this.generatePromptForCluster(clusterArtists, category);
    
            if (prompt) {
                this.generateAIResponse(prompt);
            }
        }
    }
    
      // Function to get selected artists from the nodes
      getSelectedArtists(): Artist[] {
        return this.selectedNodes.map(([node]) => {
          const artistNodeData = d3.select(node).datum() as ArtistNode;
          return artistNodeData.artist;
        });
      }
      
      // Function to generate a prompt based on selected artists and category
      generatePrompt(selectedArtists: Artist[], category: string): string {
        const artistNames = selectedArtists.map(artist => `${artist.firstname} ${artist.lastname}`);
        const formattedNames = this.formatArtistNames(artistNames);
        let prompt = '';
      
        switch (category) {
          case 'nationality':
            prompt = this.createNationalityPrompt(selectedArtists, formattedNames);
            break;
          case 'birthcountry':
            prompt = this.createBirthCountryPrompt(selectedArtists, formattedNames);
            break;
          case 'deathcountry':
            prompt = this.createDeathCountryPrompt(selectedArtists, formattedNames);
            break;
          case 'mostexhibited':
            prompt = this.createExhibitedCountryPrompt(selectedArtists, formattedNames);
            break;
          default:
            console.warn('Unknown category:', category);
            break;
        }
      
        return prompt;
      }
      
      // Function to generate a prompt for the entire cluster
      generatePromptForCluster(clusterArtists: Artist[], category: string): string {
        const artistNames = clusterArtists.map(artist => `${artist.firstname} ${artist.lastname}`);
        const formattedNames = this.formatArtistNames(artistNames);
        let prompt = '';
      
        switch (category) {
          case 'nationality':
            prompt = this.createNationalityPrompt(clusterArtists, formattedNames);
            break;
          case 'birthcountry':
            prompt = this.createBirthCountryPrompt(clusterArtists, formattedNames);
            break;
          case 'deathcountry':
            prompt = this.createDeathCountryPrompt(clusterArtists, formattedNames);
            break;
          case 'mostexhibited':
            prompt = this.createExhibitedCountryPrompt(clusterArtists, formattedNames);
            break;
          default:
            console.warn('Unknown category:', category);
            break;
        }
      
        return prompt;
      }
      
      // Format artist names into a readable string
      formatArtistNames(artistNames: string[]): string {
        return artistNames.length > 1
          ? artistNames.slice(0, -1).join(", ") + " and " + artistNames[artistNames.length - 1]
          : artistNames[0];
      }
      
      // Functions to generate prompts based on the selected category (examples below)
      createNationalityPrompt(selectedArtists: Artist[], formattedNames: string): string {
        const nationalityInfo = selectedArtists
          .map(artist => `${artist.firstname} ${artist.lastname} (Nationality: ${this.artistService.countryMap[artist.nationality]})`)
          .join(", ");
        
        this.aiTitle = `AI Insight: You chose the category "Nationality" and the artists ${formattedNames}`;
        this.aiSmallTitle = `How Nationality Shaped Their Connections`;
        
        return `In 60 words, detail any known meetings, collaborations, or influences between the following artists: ${nationalityInfo}. Focus on how their national backgrounds might have led to shared exhibitions, joint projects, or mutual influences. If no direct connections exist, explore similarities in their artistic movements, styles, or influences. Only use the artists' last names in your answer.`;
      }
      
      createBirthCountryPrompt(selectedArtists: Artist[], formattedNames: string): string {
        const birthCountryInfo = selectedArtists
          .map(artist => `${artist.firstname} ${artist.lastname} (Born in: ${this.modernMap ? this.artistService.countryMap[artist.birthcountry] : this.artistService.oldCountryMap[artist.oldBirthCountry]})`)
          .join(", ");
        
        this.aiTitle = `AI Insight: You chose the category "Country of Birth" and the artists ${formattedNames}`;
        this.aiSmallTitle = `Artistic Connections in Their Early Years`;
        
        return `In 60 words, describe any meetings, collaborations, or influences among the following artists: ${birthCountryInfo}. Focus on their early life and artistic careers. Highlight specific instances contributing to shared exhibitions, joint projects, or mutual influences. If no direct connections exist, explore similarities in their artistic movements, styles, or early influences. Only use the artists' last names in your answer.`;
      }
      
      createDeathCountryPrompt(selectedArtists: Artist[], formattedNames: string): string {
        const deathCountryInfo = selectedArtists
          .map(artist => `${artist.firstname} ${artist.lastname} (Died in: ${this.modernMap ? this.artistService.countryMap[artist.deathcountry] : this.artistService.oldCountryMap[artist.oldDeathCountry]})`)
          .join(", ");
        
        this.aiTitle = `AI Insight: You chose the category "Country of Death" and the artists ${formattedNames}`;
        this.aiSmallTitle = `Artistic Connections in Their Final Years`;
        
        return `In 60 words, describe any meetings, collaborations, or influences among the following artists: ${deathCountryInfo}. Focus on their later and final years in life and their artistic careers. Highlight specific instances contributing to shared exhibitions, joint projects, or mutual influences. If no direct connections exist, explore similarities in their artistic movements, styles, or influences during this period. Only use the artists' last names in your answer.`;
      }
      
      createExhibitedCountryPrompt(selectedArtists: Artist[], formattedNames: string): string {
        const exhibitedInfo = selectedArtists
          .map(artist => `${artist.firstname} ${artist.lastname} (Most exhibited in: ${this.modernMap ? this.artistService.countryMap[artist.most_exhibited_in] : this.artistService.oldCountryMap[artist.mostExhibitedInOldCountry]})`)
          .join(", ");
        
        this.aiTitle = `AI Insight: You chose the category "Most Exhibited Country" and the artists ${formattedNames}`;
        this.aiSmallTitle = `Their Prominence in Their Most Exhibited Countries Explained`;
        
        return `In 60 words, analyze why the following artists were most exhibited in these countries: ${exhibitedInfo}. Focus on the reasons for their prominence in these regions, similarities among the artists, and any known group exhibitions or collaborative projects that may have occurred. Highlight how their artistic styles or backgrounds contributed to their popularity in these locations. Only use the artists' last names in your answer.`;
      }
      
      // Function to call the AI service and handle the response
      generateAIResponse(prompt: string): void {
        this.generativeAIService.generateAIResponse(prompt).subscribe(
          response => {
            this.aiResponse = response.content;
            this.aiLoading = false;
          },
          error => {
            this.aiLoading = false;
            alert('Error generating AI response: ' + error.message + '. Please try again.');
            console.error("Error generating AI response:", error);
          }
        );
      }
      
    
/*     private drawClusterInCell(cell: any, x: string | number, y: string | number, cellWidth: number, cellHeight: number): void {
      const clusterIndex = Number(x) - 1;
      const cluster = this.clusters[clusterIndex];
      if (!cluster) return;
  
      const cellSize = Math.min(cellWidth, cellHeight);
      const paddedCellSize = cellSize * (1 - this.paddingRatio); // Reduce cell size by padding ratio
      const [outerRadius, innerRadius] = this.createSunburstProperties(cluster.length, this.clusters[0].length, paddedCellSize);
      this.innerRadius = innerRadius; 
         // Calculate totalExhibitedArtworks for the cluster


      const clusterNode: ClusterNode = {
          clusterId: clusterIndex,
          artists: cluster,
          outerRadius: outerRadius,
          innerRadius: innerRadius,
          x: 0,
          y: 0,
          meanAvgDate: new Date(),
          meanBirthDate: new Date(),
          totalExhibitedArtworks: 0
      };
  
      const clusterGroup = this.createClusterGroup(clusterNode, y as string, cellWidth, cellHeight);
  
      d3.select(clusterGroup).datum(clusterNode);
  
      
      cell.node().appendChild(clusterGroup);
  } */
  
    
  private createClusterGroup(clusterNode: ClusterNode, value: string, cellWidth: number, cellHeight: number): SVGGElement {
    this.cellWidth=cellWidth
    this.cellHeight=cellHeight
    const arcGenerator = d3.arc<any>()
        .innerRadius(clusterNode.innerRadius)
        .outerRadius(clusterNode.outerRadius);
  
    const countryMap = new Map<string, Artist[]>();
    let sortedArtists: Artist[] = [];
  
    // Populate the country map based on the value parameter
    switch (value) {
        case 'nationality':
            sortedArtists = this.prepareData(clusterNode.artists, value);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.nationality)) {
                    countryMap.set(artist.nationality, []);
                }
                countryMap.get(artist.nationality)!.push(artist);
            });
            break;
        case 'birthcountry':
            sortedArtists = this.prepareData(clusterNode.artists, value);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.birthcountry)) {
                    countryMap.set(artist.birthcountry, []);
                }
                countryMap.get(artist.birthcountry)!.push(artist);
            });
            break;
        case 'deathcountry':
            sortedArtists = this.prepareData(clusterNode.artists, value);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.deathcountry)) {
                    countryMap.set(artist.deathcountry, []);
                }
                countryMap.get(artist.deathcountry)!.push(artist);
            });
            break;
        case 'mostexhibited':
            sortedArtists = this.prepareData(clusterNode.artists, value);
            sortedArtists.forEach(artist => {
                if (!countryMap.has(artist.most_exhibited_in)) {
                    countryMap.set(artist.most_exhibited_in, []);
                }
                countryMap.get(artist.most_exhibited_in)!.push(artist);
            });
            break;
    }
  
    const countries = Array.from(countryMap.keys());
    const totalArtists = clusterNode.artists.length;
    const minimumAngle = Math.PI / 18;
  
    let totalAngleAvailable = 2 * Math.PI;
    const dynamicAngles = new Map<string, number>();
  
    countryMap.forEach((artists, country) => {
        dynamicAngles.set(country, minimumAngle);
        totalAngleAvailable -= minimumAngle;
    });
  
    countryMap.forEach((artists, country) => {
        const proportion = artists.length / totalArtists;
        const extraAngle = proportion * totalAngleAvailable;
        const currentAngle = dynamicAngles.get(country) || 0;
        dynamicAngles.set(country, currentAngle + extraAngle);
    });
  
    let currentAngle = 0;
    const data = countries.map((country) => {
        const angle = dynamicAngles.get(country) as number;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const middleAngle = (startAngle + endAngle) / 2;
        currentAngle = endAngle;
        return {
            country,
            startAngle,
            endAngle,
            middleAngle,
            innerRadius: clusterNode.innerRadius,
            outerRadius: clusterNode.outerRadius,
            color: this.artistService.getCountryColor(country, 1)
        };
    });
  
    const clusterGroup = d3.create("svg:g")
    .attr("class", `cluster cluster-${clusterNode.clusterId} cluster-${value}`)
    .on('click', () => this.onClusterClick(clusterNode))
    .style('cursor', 'pointer')  // Add this line to change the cursor
    .attr("transform", `translate(${cellWidth / 2}, ${cellHeight / 2})`);
  
  const tooltip = d3.select("div#tooltip");
  
  const showTooltip = (event: any, d: any) => {
    const countryCode = d.country;
    const fullCountryName = this.modernMap? this.artistService.countryMap[countryCode]:this.artistService.oldCountryMap[countryCode];
  
    tooltip.style("display", "block")
        .style("left", `${event.pageX + 5}px`)
        .style("top", `${event.pageY + 5}px`)
        .style("color", "black")
        .html(`${fullCountryName}<br/>`);
  };
  
  const hideTooltip = () => {
    tooltip.style("display", "none");
  };
  
  const paths = clusterGroup.selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("d", arcGenerator)
    .attr("fill", (d: any) => d.color)
    .style('stroke', 'none')
    .on("mouseover", showTooltip)
    .on("mousemove", showTooltip)
    .on('mouseout', hideTooltip)
    .on('click', (event: MouseEvent, d: any) => {
      if (event.ctrlKey) {
        event.stopPropagation(); // Prevent the click event from propagating to the cluster group

          // Find all artists belonging to the selected country
          const selectedArtists = countryMap.get(d.country) || [];
          
          // Iterate over each artist and call `selectMultipleNodes`
          selectedArtists.forEach(artist => {
              // Find the SVG circle element associated with the artist node
              const circle = this.g.selectAll('.artist-node')
                  .filter((nodeData: any) => nodeData.artist.id === artist.id)
                  .node() as SVGCircleElement;

                  
      // Ensure defs and filter are only created once
      let defs = this.svg.select('defs');
      if (defs.empty()) {
        defs = this.svg.append('defs');
      }
    
      let filter = defs.select('#shadow');
      if (filter.empty()) {
        filter = defs.append('filter')
          .attr('id', 'shadow')
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');
    
        filter.append('feDropShadow')
          .attr('dx', 0)
          .attr('dy', 0)
          .attr('flood-color', 'black')
          .attr('flood-opacity', 1);
    
        let feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode')
          .attr('in', 'SourceGraphic');
      }
    

              // Make sure that the circle element exists
              if (circle) {
                  const artistNodeData = d3.select(circle).datum() as ArtistNode;
                  this.handleMultiNodeSelection(artistNodeData, circle, filter, false);
              }
          });
      }
  });
  
  // [Optional: Store paths in clusterNode for later access]
  const innerRadius= clusterNode.innerRadius;
  const textsize = innerRadius/7.5;
  
  clusterGroup.selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("transform", (d: any) => `translate(${arcGenerator.centroid(d)})`)
    .attr("text-anchor", "middle")
    .text((d: any) => d.country)
    .style("font-size", `${textsize}px`)
    .style("font-weight", "bold")
    .style("fill", "white")
    .on("mouseover", showTooltip)
    .on("mousemove", showTooltip)
    .on('mouseout', hideTooltip)
    .on('click', (event: MouseEvent, d: any) => {
      if (event.ctrlKey) {
        event.stopPropagation(); // Prevent the click event from propagating to the cluster group

          // Find all artists belonging to the selected country
          const selectedArtists = countryMap.get(d.country) || [];
          
          // Iterate over each artist and call `selectMultipleNodes`
          selectedArtists.forEach(artist => {
              // Find the SVG circle element associated with the artist node
              const circle = this.g.selectAll('.artist-node')
                  .filter((nodeData: any) => nodeData.artist.id === artist.id)
                  .node() as SVGCircleElement;

                  
      // Ensure defs and filter are only created once
      let defs = this.svg.select('defs');
      if (defs.empty()) {
        defs = this.svg.append('defs');
      }
    
      let filter = defs.select('#shadow');
      if (filter.empty()) {
        filter = defs.append('filter')
          .attr('id', 'shadow')
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');
    
        filter.append('feDropShadow')
          .attr('dx', 0)
          .attr('dy', 0)
          .attr('flood-color', 'black')
          .attr('flood-opacity', 1);
    
        let feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode')
          .attr('in', 'SourceGraphic');
      }
    

              // Make sure that the circle element exists
              if (circle) {
                  const artistNodeData = d3.select(circle).datum() as ArtistNode;
                  this.handleMultiNodeSelection(artistNodeData, circle, filter, false);
              }
          });
      }
  });
  
  
  let countryCentroids: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } } = {};
  data.forEach(d => {
    countryCentroids[d.country] = {
        startAngle: d.startAngle,
        endAngle: d.endAngle,
        middleAngle: d.middleAngle,
        color: d.color,
        country: d.country
    };
  });
  
  if (!this.countryCentroids[value]) {
    this.countryCentroids[value] = {};
  }
  this.countryCentroids[value][clusterNode.clusterId] = countryCentroids;
  
  this.createArtistNetwork(value, clusterGroup, clusterNode, countryCentroids);
      // Adding the text label to display the clusterIndex


  
  return clusterGroup.node() as SVGGElement;
  }
  
  
  
  
  
  
    
    
  private createArtistNetwork(value: string, clusterGroup: any, cluster: ClusterNode, countryCentroids: { [country: string]: { startAngle: number, endAngle: number, middleAngle: number, color: string | number, country: string } }): void {
    const artists = cluster.artists;
    const relationships = this.intraCommunityEdges[cluster.clusterId];
    const size = this.decisionService.getDecisionSize();
  
    const metricMap = this.calculateNormalizedMaps(size)[cluster.clusterId];
    const degreeMap = this.degreesMap[cluster.clusterId] || new Map<number, number>();

    const centerX = 0;
    const centerY = 0;
  
    let artistNodes: any[] = this.createArtistNodes(artists, countryCentroids, degreeMap, metricMap, cluster, centerX, centerY, value);
  
    const getNodeIndexById = (id: number) => artistNodes.findIndex((node: any) => node.id === id);
  
    const sharedExhibitionMinArtworksValues = relationships.map((relationship: any) => relationship.sharedExhibitionMinArtworks);
    const normalizedSharedExhibitionMinArtworks = this.normalizeSqrt(new Map(sharedExhibitionMinArtworksValues.map((value, index) => [index, value])));
    const threshold = 0.4;  // Threshold for visibility
    const formattedRelationships = relationships.map((relationship: any, index: number) => {
        const sourceIndex = getNodeIndexById(relationship.startId);
        const targetIndex = getNodeIndexById(relationship.endId);
        return {
            source: artistNodes[sourceIndex],
            target: artistNodes[targetIndex],
            sharedExhibitions: relationship.sharedExhibitions,
            sharedExhibitionMinArtworks: normalizedSharedExhibitionMinArtworks.get(index) || 0
        };
    });
  
    formattedRelationships.sort((a, b) => a.sharedExhibitionMinArtworks - b.sharedExhibitionMinArtworks);
  
    const width = 0.0025 * window.innerWidth / 100;
    const maxNodeSize = d3.max(artistNodes, (d: any) => d.radius);
  
    const edgeWidth = maxNodeSize / 100 * 0.6;
  
    //console.log('size' ,this.intraCommunityEdges[cluster.clusterId].length)
    const edges = clusterGroup.selectAll(".artist-edge")
        .data(formattedRelationships)
        .enter()
        .append("line")
        .attr("class", `artist-edge artist-edge-${cluster.clusterId}`)
        .style('stroke', (d: any) => {
            if (d.sharedExhibitionMinArtworks < threshold &&this.intraCommunityEdges[cluster.clusterId].length > 2) {
                return 'white';
            }
            const clusterId = cluster.clusterId;
           
            return this.intraCommunityEdges[clusterId].length <= 2 ? 'black' : this.edgeColorScale(d.sharedExhibitionMinArtworks);
        })
        .style('stroke-width', `${edgeWidth}vw`)  // Ensure the edgeWidth is a string with 'vh'
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.target.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
  
    const circles = clusterGroup.selectAll(".artist-node")
        .data(artistNodes)
        .enter()
        .append("circle")
        .attr("class", `artist-node artist-node-${cluster.clusterId}`)
        .attr('r', (d: any) => d.radius)
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
        .style('fill', (d: any) => d.color)
        .on('mouseover', function (this: SVGCircleElement, event: MouseEvent, d: any) {
            const element = d3.select(this);
            const [x, y] = d3.pointer(event, window.document.body);
            d3.select('#tooltip')
                .style('display', 'block')
                .style('left', `${x + 10}px`)
                .style('top', `${y + 10}px`)
                .html(`${d.artist.firstname} ${d.artist.lastname}<br/>`);
        })
        .on('mouseout', function () {
            d3.select('#tooltip').style('display', 'none');
        })
        .on('click', (event: MouseEvent, d: any) => this.handleNodeClick(d, event))
                    .style('cursor', 'pointer');  // Add this line to change the cursor

  
    const sizes = this.getNodeSize(clusterGroup);
    const padding = cluster.innerRadius / 100 * 0.05;
    const centralNode = artistNodes.reduce((maxNode, node) => {
      // Get the degree for the current node, defaulting to -Infinity if not present
      const currentDegree = degreeMap.get(node.artist.id) ?? -Infinity;
  
      // Get the degree for the current maxNode, defaulting to -Infinity if not present
      const maxDegree = degreeMap.get(maxNode.artist.id) ?? -Infinity;
  
      // Choose the node with the higher degree
      return currentDegree > maxDegree ? node : maxNode;
  }, artistNodes.length > 0 ? artistNodes[0] : null); // Fallback to null if artistNodes is empty

  // Handle the case where centralNode might be null
if (!centralNode) {
  console.warn('No central node could be determined: artistNodes is empty or degreeMap is missing entries.');
  // Apply a sensible fallback, e.g., picking the first artist node or returning early
}
  
    // Initialize the force simulation
    const simulation = d3.forceSimulation(artistNodes)
        .force("collision", d3.forceCollide((d: any) => {
            if (d.id === centralNode.id) {
                return 0;
            }
            return this.calculateCollisionRadius(sizes[d.id] || 0);
        }))
        .force("radial", d3.forceRadial((d:ArtistNode)=> {
            const radialScale = this.setupRadialScale(cluster.innerRadius);
            const degree = degreeMap.get(d.artist.id) || 0;
            return radialScale(degree);
        }, centerX, centerY).strength(0.5)) // Adjust the strength as needed
        .force("repelFromCenter", this.repelFromCenterForce(artistNodes, centralNode, sizes[centralNode.id],cluster.innerRadius))
        .force("boundary", this.boundaryForce(artistNodes, cluster.innerRadius - padding))
        .on("tick", () => {
          artistNodes.forEach(node => {
            this.constrainAngularMovement(node, countryCentroids[node.countryData.country]);
        });
     /*    circles.transition()
        .duration(2000) */
        circles
                .attr('cx', (d: any) => d.x)
                .attr('cy', (d: any) => d.y);
          /*   edges.transition()
            .duration(2000) */
            edges
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);
        });
  
    // Store the artistNodes and the simulation
  
    this.artistNodes[cluster.clusterId] = artistNodes;

    //console.log('artistnodes', this.artistNodes)
    this.simulations[cluster.clusterId] = simulation;
  
    switch (value) {
        case 'nationality':
          this.simulationsN[cluster.clusterId] = simulation;
            break;
        case 'birthcountry':
          this.simulationsB[cluster.clusterId] = simulation;
            break;
        case 'deathcountry':
          this.simulationsD[cluster.clusterId] = simulation;
            break;
        case 'mostexhibited':
          this.simulationsM[cluster.clusterId] = simulation;
            break;
    }
  
  }
  
  
  
  
  
  
    
  private constrainAngularMovement(node: any, countryData: any) {
    const angle = node.angle;
    const radialDistance = Math.sqrt(node.x * node.x + node.y * node.y);
    const radialMax = countryData.outerRadius;
  
    // Constrain radial movement
    if (radialDistance > radialMax) {
        node.x = radialMax * Math.cos(angle);
        node.y = radialMax * Math.sin(angle);
    }
  
    // Constrain angular movement
    if (angle < countryData.startAngle) {
        node.x = radialMax * Math.cos(countryData.startAngle);
        node.y = radialMax * Math.sin(countryData.startAngle);
    } else if (angle > countryData.endAngle) {
        node.x = radialMax * Math.cos(countryData.endAngle);
        node.y = radialMax * Math.sin(countryData.endAngle);
    }
  }

  private prepareData(artists: Artist[], value: string): Artist[] {
    const regionMap = new Map<string, any[]>();
    this.regionOrder.forEach(region => {
      regionMap.set(region, []);
    });

    if (value === 'nationality') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionNationality);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    } else if (value === 'birthcountry') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionBirth);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    } else if (value === 'deathcountry') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionDeath);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    } else if (value === 'mostexhibited') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionMostExhibited);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    }

    // Sort artists by country name within each region
  regionMap.forEach((regionArtists, region) => {
    regionArtists.sort((a, b) => {
      // Determine the country name to sort by based on the value
      let countryA = '';
      let countryB = '';
     if(value ==='nationality'){
      countryA = a.nationality || ''; // Adjust the property name as necessary
      countryB = b.nationality || '';
     }
      else if (value === 'birthcountry') {
        countryA = a.birthcountry || ''; // Adjust the property name as necessary
        countryB = b.birthcountry || '';
      } else if (value === 'deathcountry') {
        countryA = a.deathcountry || ''; // Adjust the property name as necessary
        countryB = b.deathcountry || '';
      } else if (value === 'mostexhibited') {
        countryA = a.mostExhibitedInCountry || ''; // Adjust the property name as necessary
        countryB = b.mostExhibitedInCountry || '';
      }

      return countryA.localeCompare(countryB);
    });
  });

    const sortedArtists = Array.from(regionMap.entries())
      .filter(([region, artists]) => artists.length > 0)
      .flatMap(([region, artists]) => artists);

    return sortedArtists;
  }
  
  private prepareOldData(artists: Artist[], value: string): Artist[] {
    const regionMap = new Map<string, Artist[]>();
    this.regionOldOrder.forEach(region => {
      regionMap.set(region, []);
    });
  
    // Group artists based on the specified value
    if (value === 'birthcountry') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionOldBirth);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    } else if (value === 'deathcountry') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionOldDeath);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    } else if (value === 'mostexhibited') {
      artists.forEach(artist => {
        let regionArtists = regionMap.get(artist.europeanRegionMostExhibitedInOldCountry);
        if (regionArtists) {
          regionArtists.push(artist);
        }
      });
    }
  
    // Sort artists by country name within each region
    regionMap.forEach((regionArtists, region) => {
      regionArtists.sort((a, b) => {
        // Determine the country name to sort by based on the value
        let countryA = '';
        let countryB = '';
  
        if (value === 'birthcountry') {
          countryA = a.oldBirthCountry || ''; // Adjust the property name as necessary
          countryB = b.oldBirthCountry || '';
        } else if (value === 'deathcountry') {
          countryA = a.oldDeathCountry || ''; // Adjust the property name as necessary
          countryB = b.oldDeathCountry || '';
        } else if (value === 'mostexhibited') {
          countryA = a.mostExhibitedInOldCountry || ''; // Adjust the property name as necessary
          countryB = b.mostExhibitedInOldCountry || '';
        }
  
        return countryA.localeCompare(countryB);
      });
    });
  
    // Flatten the sorted map into a single array
    const sortedArtists = Array.from(regionMap.entries())
      .filter(([region, artists]) => artists.length > 0)
      .flatMap(([region, artists]) => artists);
  
    return sortedArtists;
  }
  private createSunburstProperties(clusterSize: number, maxSize: number, cellSize: number, totalClusters: number): [number, number] {
    const minRadius = cellSize *0.2; // Minimum radius scaled with padding
    const maxRadius = cellSize * 0.6; // Max radius should be within half of cellSize

    // Calculate outerRadius based on cluster size relative to maxSize, constrained by maxRadius
    const outerRadius = Math.min(maxRadius, minRadius + ((maxRadius - minRadius) * (clusterSize / maxSize)));
    
    const innerRadius = outerRadius - outerRadius / 5; // Maintain the proportionate thickness

    return [outerRadius, innerRadius];
}



  
    
  
    private createColorScale(countries: string[]): d3.ScaleSequential<string, number> {
      const colorScale = d3.scaleSequential(d3.interpolateWarm)
        .domain([0, countries.length - 1]);
  
      return colorScale;
    }
  
    private calculateNormalizedMaps(metric: string): { [clusterId: number]: Map<number, number> } {
      const normalizedMaps: { [clusterId: number]: Map<number, number> } = {};
    
      this.clusters.forEach((cluster, clusterId) => {
          let metricMap = new Map<number, number>();
    
          if (metric === 'Amount of Exhibitions') {
              cluster.forEach((artist: Artist) => {
                  metricMap.set(artist.id, artist.total_exhibitions);
              });
          } else if (metric === 'Amount of different techniques') {
              cluster.forEach((artist: Artist) => {
                  metricMap.set(artist.id, artist.amount_techniques);
              });
          } else if (metric === 'Amount of exhibited Artworks') {
              cluster.forEach((artist: Artist) => {
                  metricMap.set(artist.id, artist.total_exhibited_artworks);
              });
          } else if (metric === 'default: Importance (Degree)') {
              this.calculateNodeDegreesForClusters();
              metricMap = this.degreesMap[clusterId];
          }
  
          // Decide normalization method dynamically
          if(metric === 'default: Importance (Degree)' ){
              const normalizedMap = this.normalizeLinear(metricMap);
              normalizedMaps[clusterId] = normalizedMap;
          }else{
          const normalizedMap = this.normalizeDynamically(metricMap);
          normalizedMaps[clusterId] = normalizedMap;
          }
      });
    
      return normalizedMaps;
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
        normalized.set(id, (Math.sqrt(value) - sqrtMinValue) / range); // Normalize by dividing by the max degree
      });
      return normalized;
    }
  
  
    private calculateNodeDegreesForClusters(): void {
      this.intraCommunityEdges.forEach((relationships, clusterId) => {
        const degreeMap = new Map<number, number>();
        relationships.forEach(rel => {
          degreeMap.set(rel.startId, (degreeMap.get(rel.startId) || 0) + 1);
          degreeMap.set(rel.endId, (degreeMap.get(rel.endId) || 0) + 1);
        });
       // console.log(degreeMap, clusterId)
        const normalizedDegrees = this.normalizeLinear(degreeMap);
        this.degreesMap[clusterId] = normalizedDegrees;
      });
    }
  
    private getNodeSize(clusterGroup: any): number[] {
      const circles = clusterGroup.selectAll('.artist-node');
      const sizes: number[] = [];
      circles.each(function (this: any, d: any) {
        const radius = parseFloat(d3.select(this).attr('r'));
        sizes[d.id] = radius;
      });
      return sizes;
    }
  
    private calculateCollisionRadius(size: number): number {
      const baseRadius = size;
      const padding = 1.5;
      return baseRadius + padding;
    }
  
    private repelFromCenterForce(artistNodes: any[], centralNode: any, radius: number, innerRadius:number): (alpha: number) => void {
      return function (alpha: number) {
        centralNode.x = 0;
        centralNode.y = 0;
        artistNodes.forEach((d: any) => {
          if (d !== centralNode && d.y !== undefined && d.x !== undefined && centralNode.x !== undefined && centralNode.y !== undefined) {
            const dx = d.x - centralNode.x;
            const dy = d.y - centralNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
         const minDistance = radius  + d.radius + innerRadius/100*2;
            if (distance < minDistance) {
              const angle = Math.atan2(dy, dx);
              d.x = centralNode.x + Math.cos(angle) * minDistance ;
              d.y = centralNode.y + Math.sin(angle) * minDistance ;
            }
          }
        });
      };
    }
  
  
  
    private boundaryForce(artistNodes: any[], innerRadius: number): (alpha: number) => void {
      const padding = window.innerWidth / 100 * 0.05;
      return function (alpha: number) {
        artistNodes.forEach((d: any) => {
          const distance = Math.sqrt(d.x * d.x + d.y * d.y);
          const maxDistance = innerRadius - padding - d.radius;
          if (distance > maxDistance) {
            const scalingFactor = maxDistance / distance;
            d.x *= scalingFactor;
            d.y *= scalingFactor;
          }
        });
      };
    }
  
    private createArtistNodes(artists: Artist[], countryCentroids: any, degreeMap: Map<number, number>, metricMap: Map<number, number>, cluster: ClusterNode, centerX: number, centerY: number, value: string): any[] {
      return artists.map((artist: Artist) => {
        let countryData: any;
        switch (value) {
          case 'nationality':
            countryData = countryCentroids[artist.nationality];
            break;
          case 'birthcountry':
            countryData = countryCentroids[artist.birthcountry];
            break;
          case 'deathcountry':
            countryData = countryCentroids[artist.deathcountry];
            break;
          case 'mostexhibited':
            countryData = countryCentroids[artist.most_exhibited_in];
            break;
        }
        const newPos = this.calculateNewPosition(value, artist, countryData, degreeMap, metricMap, cluster, centerX, centerY);
         // Update the artistClusterMap
      this.artistClusterMap.set(artist.id, cluster);
  
        return {
          id: artist.id,
          artist: artist,
          x: newPos.x,
          y: newPos.y,
          vx: 0,
          vy: 0,
          angle: countryData.middleAngle,
          radius: newPos.radius,
          color: newPos.color,
          countryData: countryData
        };
      });
    }
  
    private calculateNewPosition(type: string, artist: Artist, countryData: any, degreeMap: Map<number, number>, metricMap: Map<number, number>, cluster: ClusterNode, centerX: number, centerY: number): { x: number, y: number, radius: number, color: string | number } {
      const degree = degreeMap.get(artist.id) || 0;
     
      const radialScale = this.setupRadialScale(cluster.innerRadius);
      const radial = radialScale(degree);
      const nodeRadius = metricMap.get(artist.id) || 0;
      const angle = countryData.middleAngle;
  
      const x = centerX + radial * Math.sin(angle);
      const y = centerY - radial * Math.cos(angle);
  
      return {
        x: x,
        y: y,
        radius: this.calculateRadiusForNode(nodeRadius, cluster.innerRadius, cluster.artists.length),
        color: this.artistService.getCountryColor(countryData.country, 1)
      };
    }
  
    private setupRadialScale(innerRadius: number): d3.ScaleLinear<number, number> {
      const padding = innerRadius/100*0.05;
      return d3.scaleLinear()
        .domain([0, 1])
        .range([innerRadius - padding, 0.0000001]);
    }
  
    private calculateRadiusForNode(value: number, innerRadius: number, amount: number): number {
      const minRadius = 6 * innerRadius / 10 / amount;
      const maxRadius = 20 * innerRadius / 10 / amount;
      
      const lowerBoundMin = 2 * innerRadius / 100; // Define a lower bound for the minimum radius
      const upperBoundMin = 5 * innerRadius / 100; // Define an upper bound for the minimum radius
      const lowerBoundMax = 8 * innerRadius / 100; // Define a lower bound for the maximum radius
      const upperBoundMax = 15 * innerRadius / 100; // Define an upper bound for the maximum radius
  
      //console.log('sizes', minRadius, maxRadius, lowerBoundMax, upperBoundMax, lowerBoundMin, upperBoundMin);
  
      let calculatedMinRadius = 0;
      if (minRadius > upperBoundMin) {
          calculatedMinRadius = upperBoundMin;
      } else if (minRadius < lowerBoundMin) {
          calculatedMinRadius = lowerBoundMin;
      } else {
          calculatedMinRadius = minRadius;
      }
  
      let calculatedMaxRadius = 0;
      if (maxRadius > upperBoundMax) {
          calculatedMaxRadius = upperBoundMax;
      } else if (maxRadius < lowerBoundMax) {
          calculatedMaxRadius = lowerBoundMax;
      } else {
          calculatedMaxRadius = maxRadius;
      }
  
      // Ensure calculatedMaxRadius is always greater than or equal to calculatedMinRadius
      if (calculatedMaxRadius < calculatedMinRadius) {
          calculatedMaxRadius = calculatedMinRadius;
      }
  
      const calculatedRadius = calculatedMinRadius + (calculatedMaxRadius - calculatedMinRadius) * value;
      return calculatedRadius;
  }
  
  
  }
  