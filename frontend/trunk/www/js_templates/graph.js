<script>

function MeasurementGraph(container, legend_container, options){

    this.container        = container;
    this.legend_container = legend_container;
    this.options          = options;
    this.graph            = null;
    this.panel            = null;
    this.updating         = null;
    this.POLL_INTERVAL    = 10000;

    var round = function(value){
	return Math.round(value*100)/100;
    }

    this.convertToSI = function(value){
	if (value == 0 || value == null){
	    return "0";
	}
	if (value < 1){
	    return round(value * 1000) + " m";
	}
	if (value >= 1000*1000*1000){
	    return round(value / (1000*1000*1000)) + " G";
	}
	if (value >= 1000*1000){
	    return round(value / (1000*1000)) + " M";
	}
	if (value >= 1000){
	    return round(value / (1000)) + " k";
	}
	return round(value);
    };

    this.GRAPH_CONFIG = {lines: {
	                          show: true, 
				  lineWidth: 2,
				  fill: false
	                 },
			 grid: {
	                          hoverable: true,
				  backgroundColor: "white",
				  borderWidth: 1
			 },
			 xaxis: {
	                          mode: "time",
				  ticks: 7
			 },
			 yaxis: {
	                          tickFormatter: this.convertToSI,
				  min: 0
			 },
			 legend: {
	                          container: legend_container,
				  noColumns: 3
			 },
			 crosshair:{
	                          mode: "x",
				  color: "#999900"
			 }
    };

    this._getPanelCoordinates = function(){
	var region = YAHOO.util.Dom.getRegion(this.container);

	return [region.right - (region.width / 2) - 120, // subtract half the panel width
		region.top + (region.height / 2) - 40  // subtract half-ish the panel height
		];
    };

    this._showLoading = function(){

	if (this.panel) this.panel.destroy();

	this.panel = new YAHOO.widget.Panel("wait",
                                            { width:"240px",
					      close:false,
					      draggable:false,
					      zindex:4,
					      visible:false,
					      xy: this._getPanelCoordinates()
					    }
					    );

	this.panel.setHeader("Loading...");
	this.panel.setBody("<center><img src='media/loading.gif'></center>");

	this.panel.render(container);
	this.panel.show();
    };

    this._showBuilding = function(){

	if (this.panel) this.panel.destroy();

	this.panel = new YAHOO.widget.Panel("build",
                                            { width:"240px",
					      close:false,
					      draggable:false,
					      zindex:4,
					      visible:false,
					      xy: this._getPanelCoordinates()
					    }
					    );

	this.panel.setHeader("Building...");
	this.panel.setBody("<center>Data collection for this circuit is building, one moment...</center>");

	this.panel.render(container);
	this.panel.show();
    }

    this._hideLoading = function(){
	if (this.panel){
	    this.panel.destroy();
	    this.panel = null;
	}
    };

    this._showError = function(){ 

	if (this.panel) this.panel.destroy();

	this.panel = new YAHOO.widget.Panel("error",
                                            { width:"240px",
					      close:true,
					      draggable:false,
					      zindex:4,
					      visible:false,
					      xy: this._getPanelCoordinates()
					    }
					    );

	this.panel.setHeader("Error in Traffic Data");
	this.panel.setBody("There was an error fetching traffic data. If this problem persists, please contact your system administrator.");

	this.panel.render(container);
	this.panel.show();

    };
    
    this._renderGraph = function(request, response){

	if (response && response.meta.in_progress == 1){
	    this._showBuilding();

	    this.updating = setTimeout(function(self){
		    return function(){
			self.render(true);
		    }
		}(this), 3000);

	    return;
	}

	var results = response.results;

	if (! results || results.length == 0){
	    this._showError();
	    return;
	}

	var shown_data = [];

	for (var i = 0; i < results.length; i++){

	    var name   = results[i].name;

	    var data = results[i].data;

	    var setup = {data: data,
			 control: "time",
			 label: name,
			 name: name
	    };

	    if (name == "Ping (ms)"){
                this.GRAPH_CONFIG["y2axis"] = {};
                this.GRAPH_CONFIG["y2axis"]["tickFormatter"] = this.convertToSI;
                this.GRAPH_CONFIG["y2axis"]["min"] = 50;
                this.GRAPH_CONFIG["y2axis"]["max"] = 125;
		setup["yaxis"] = 2;
		setup["color"] = "#b83b93";
	    }

	    if (name == "Input (bps)"){
		setup["lines"] = {fill: .6};
		setup["color"] = "#00FF00";
	    }

	    if (name == "Output (bps)"){
		setup["color"] = "#0000FF";
	    }

	    shown_data.push(setup);

	}

	this.graph = new YAHOO.widget.Flot(this.container,
					   shown_data,
					   this.GRAPH_CONFIG
					   );
	
	this._hideLoading();

	this.updating = setTimeout(function(self){
		return function(){
		    self.options.start += (self.POLL_INTERVAL / 1000);
		    self.options.end   += (self.POLL_INTERVAL / 1000);
		    self.render(true);
		}
	    }(this), this.POLL_INTERVAL);

    };
    
    this.render = function(skip_show){

	if (this.updating){
	    clearTimeout(this.updating);
	}

	if (! skip_show){
	    this._showLoading();
	}

	var ds = new YAHOO.util.DataSource("services/measurement.cgi?action=get_circuit_data&circuit_id="+this.options.circuit_id+"&start="+parseInt(this.options.start)+"&end="+parseInt(this.options.end));
	ds.responseType = YAHOO.util.DataSource.TYPE_JSON;

	ds.responseSchema = {
	    resultsList: "results",
	    fields: [{key: "name"},
	             {key: "data"}
		     ],
	    metaFields: {
		"in_progress": "in_progress",
		"error": "error"
	    }
	};

	ds.sendRequest("", {success: this._renderGraph,
		            failure: function(req, resp){
		               this._hideLoading();
			       this._showError();

			       this.updating = setTimeout(function(self){
				       return function(){
					   this.render(true);
				       }
				   }(this), 5000);
		           },
		           scope: this
	    });
		
    };

    
    this.render();

    return this;
}

</script>