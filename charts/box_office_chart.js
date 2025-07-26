let YEAR_TO_ITS_MOVIES = null;
let currentRenderToken = null; // Track current render operation
    
$( document ).ready( function () { 

    attachTooltipEvents(); // Event Delegation, easier than adding thousands of events.
    fetchMovieDataAndBuild();

    $("#select_which").on("change", build_bar_chart_of_movie_data);

} );


async function fetchMovieDataAndBuild() {
    try {
        const response = await fetch('./movies_with_franchises.json');
        if (!response.ok) {
            throw new Error('Network error');
        }
        const data = await response.json();
        
        YEAR_TO_ITS_MOVIES = new Map();
        
        for (const datum of data) {
            if (!YEAR_TO_ITS_MOVIES.has(datum.released)) {
                YEAR_TO_ITS_MOVIES.set(datum.released, []);
            }
            YEAR_TO_ITS_MOVIES.get(datum.released).push(datum);
        }
        
        build_bar_chart_of_movie_data();
    }
    catch (error) {
        console.error('Error loading JSON:', error);
    }
}

async function build_bar_chart_of_movie_data() {
    if (!YEAR_TO_ITS_MOVIES) {
        return;
    }
    
    // Create a new render token and cancel any existing render
    const renderToken = Symbol('render');
    currentRenderToken = renderToken;
    
    const selectedValue = $("#select_which").val();
    const $chartContainer = $("<div>").addClass("chart-container");
    
    // Clear existing content immediately
    $("#root").empty().append($chartContainer);
    
    // Check if we should still continue
    if (currentRenderToken !== renderToken) {
        return;
    }
    
    // Calculate highest_total based on filtered movies
    const highest_total = calculateHighestTotal(selectedValue);
    
    // Create years array for processing
    const years = [];
    for (let year = 2024; year >= 1977; year--) {
        years.push(year);
    }
    
    // Process rows in batches asynchronously
    const completed = await processRowsInBatches(years, $chartContainer, selectedValue, highest_total, renderToken);
    
    // Only add axis if this render wasn't cancelled
    if (completed && currentRenderToken === renderToken) {
        await addAxisToChart($chartContainer, highest_total);
    }
    
    attachTooltipEvents();
}

function calculateHighestTotal(selectedValue) {
    let highest_total = 0;
    for (let year = 2025; year >= 1977; year--) {
        const movies = YEAR_TO_ITS_MOVIES.get(year.toString());
        const movies_to_check = filterMovies(movies, selectedValue);
        const year_total = movies_to_check.reduce((sum, movie) => sum + movie.box_office, 0);
        if (year_total > highest_total) {
            highest_total = year_total;
        }
    }
    return highest_total;
}

async function processRowsInBatches(years, $chartContainer, selectedValue, highest_total, renderToken) {
    const batchSize = 5; // Process 5 rows at a time
    
    for (let i = 0; i < years.length; i += batchSize) {
        // Check if this render was cancelled
        if (currentRenderToken !== renderToken) {
            return false; // Render was cancelled
        }
        
        const batch = years.slice(i, i + batchSize);
        
        // Process batch synchronously
        for (const year of batch) {
            createYearRow(year, $chartContainer, selectedValue, highest_total);
        }
        
        // Yield control to browser after each batch
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return true; // Render completed successfully
}

function createYearRow(year, $chartContainer, selectedValue, highest_total) {
    const $row = $("<div>").addClass("chart-row");
    const $yearLabel = $("<div>").addClass("year-label").text(year);
    const $barContainer = $("<div>").addClass("bar-container");

    $chartContainer.append($row);
    $row.append($yearLabel, $barContainer);

    const movies = YEAR_TO_ITS_MOVIES.get(year.toString());
    const movies_to_render = filterMovies(movies, selectedValue);

    movies_to_render.forEach((movie, index) => {
    
        const parity = index % 2;
        const parity_class = parity ? "" : "odd";
        
        const movie_width = (movie.box_office / highest_total) * 100;
        const $movieBar = $("<div>").addClass("movie-bar").addClass(parity_class).css({"width": movie_width + "%"});

        if ( movie.franchise )
        {
            $movieBar.addClass( "franchise" );
            $movieBar.addClass( movie.franchise );
        }

        $movieBar.attr("movie_title", movie.movie);
        $movieBar.attr("box_office", movie.box_office);

        $barContainer.append($movieBar);
    });
}

let hover_timeout;
let $tooltip;


function attachTooltipEvents() {
    
    $(".chart-container").on('mouseenter', '.movie-bar', function(e) { 
        hover_timeout = setTimeout(() => {
            
            if ($tooltip) {
                $tooltip.remove();
                $tooltip = null;
            }
            
            $tooltip = $("<div>").addClass("tooltip").html(
                "<strong>" + $(this).attr("movie_title") + "</strong><br> $" + ( parseInt($(this).attr("box_office") ) .toLocaleString() )
            );
            const bar_offset = $(this).offset();
            $tooltip.css({
                "left": bar_offset.left + "px",
                "top": (bar_offset.top - 60) + "px"
            });
            $("body").append($tooltip);
        }, 250);
    });
    
    $(".chart-container").on('mouseleave', '.movie-bar', function(e) { 
        clearTimeout(hover_timeout);
        if ($tooltip) {
            $tooltip.remove();
            $tooltip = null;
        }
    });
}

async function addAxisToChart($chartContainer, highest_total) {
    
    const $axisContainer = $("<div>").addClass("axis-container");
    const $tickMarks = $("<div>").addClass("tick-marks");
    
    $chartContainer.append($axisContainer);
    $axisContainer.append($("<div>").addClass("year-label"), $tickMarks);
        
    // Calculate tick positions and labels
    const maxBillions = highest_total / 1000000000;
    const tickInterval = 1;
    const tickCount = Math.floor(maxBillions / tickInterval) + 1;
    
    for (let i = 0; i < tickCount; i++) {
        const value = i * tickInterval;
        const position = (value / maxBillions) * 100;
        
        const tick_class = i % 5 === 0 ? "bold-tick" : "tick";
        const tick_label_class = i % 5 === 0 ? "bold-tick-label" : "tick-label";
        
        const $tick = $("<div>").addClass(tick_class).css({
            "left": position + "%"
        });
        
        const $tickLabel = $("<div>").addClass(tick_label_class).css({
            "left": position + "%"
        }).text(value.toFixed(0));
        
        $tickMarks.append($tick);
        $tickMarks.append($tickLabel);
    }
    
    const $axisTitle = $("<div>").addClass("axis-title").text("Box Office Revenue (Billions USD)");
    $chartContainer.append($axisTitle);
}

function franchiseFirst(a, b) {
    const hasFranchiseA = a.franchise !== null;
    const hasFranchiseB = b.franchise !== null;

    if (hasFranchiseA && !hasFranchiseB) return -1;
    if (!hasFranchiseA && hasFranchiseB) return 1;
    return 0; // keep relative order if both have/don't have franchise
}

function mcuFirst(a, b) {
    const rank = (movie) => {
        if (movie.franchise === 'mcu') return 0;
        return 1;
    };

    return rank(a) - rank(b);
}


function filterMovies(movies, selectedValue) {
    if (!movies) return [];
    
    if (selectedValue === "All")        return movies;
    if (selectedValue === "5")          return movies.slice(0, 5);
    if (selectedValue === "10")         return movies.slice(0, 10);
    if (selectedValue === "-5")         return movies.slice(5);
    if (selectedValue === "-10")        return movies.slice(10);
    if (selectedValue === "FF" )        return movies.toSorted( franchiseFirst );
    if (selectedValue === "MCU_FIRST" ) return movies.toSorted( mcuFirst )
    if (selectedValue === "MCU_ONLY" )  return movies.filter( (m) => m.franchise == 'mcu' );

    
    return movies;
}