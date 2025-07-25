const { useState, useEffect, useCallback, useMemo } = React;

const BATCH_SIZE = 50;
const TOOLTIP_DIMENSIONS = { width: 300, height: 150 };
const TOOLTIP_OFFSET = 15;

// Hardcoded colors for search terms
const SEARCH_COLORS = [
    '#75b9e7', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Turquoise
    '#34495e', // Dark gray
    '#e67e22'  // Carrot
];

function useGameData() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('./processed_games.json?v=jul_25');
                if (!response.ok) throw new Error('Failed to load games data');
                const data = await response.json();
                setGames(data.sort((a, b) => b.sales - a.sales));
            } catch (err) {
                console.warn('Failed to load JSON file, using fallback data:', err);
                setError('Could not Load Games Data');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { games, loading, error };
}

function useGameSearch(games) {
    const [searchTerms, setSearchTerms] = useState([{ term: '', color: SEARCH_COLORS[0] }]);

    const matchesAllSubstrings = useCallback((title, query) => {
        if (!query.trim()) return false;
        
        const titleLower = title.toLowerCase();
        const substrings = query.toLowerCase().trim().split(/\s+/);
        
        return substrings.every(substring => titleLower.includes(substring));
    }, []);

    const filteredGamesWithColors = useMemo(() => {
        const results = [];
        
        games.forEach(game => {
            for (let i = 0; i < searchTerms.length; i++) {
                if (matchesAllSubstrings(game.title + " " + game.publisher + " " + game.developer, searchTerms[i].term)) {
                    results.push({
                        ...game,
                        searchColor: searchTerms[i].color
                    });
                    break; // Only match first search term that hits
                }
            }
        });
        
        // If no search terms have content, return all games with default color
        const hasActiveSearch = searchTerms.some(item => item.term.trim());
        if (!hasActiveSearch) {
            return games.map(game => ({ ...game, searchColor: '#3498db' }));
        }
        
        return results;
    }, [games, searchTerms, matchesAllSubstrings]);

    const addSearchTerm = useCallback(() => {
        setSearchTerms(prev => [...prev, { 
            term: '', 
            color: SEARCH_COLORS[prev.length % SEARCH_COLORS.length] 
        }]);
    }, []);

    const removeSearchTerm = useCallback(() => {
        setSearchTerms(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const updateSearchTerm = useCallback((index, value) => {
        setSearchTerms(prev => prev.map((item, i) => 
            i === index ? { ...item, term: value } : item
        ));
    }, []);

    const updateSearchColor = useCallback((index, color) => {
        setSearchTerms(prev => prev.map((item, i) => 
            i === index ? { ...item, color } : item
        ));
    }, []);

    return {
        searchTerms,
        filteredGames: filteredGamesWithColors,
        addSearchTerm,
        removeSearchTerm,
        updateSearchTerm,
        updateSearchColor
    };
}

function useInfiniteScroll(filteredGames) {
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
                setVisibleCount(prev => {
                    const next = prev + BATCH_SIZE;
                    return next >= filteredGames.length ? filteredGames.length : next;
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [filteredGames.length]);

    // Reset visible count when filtered games change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [filteredGames]);

    return visibleCount;
}

function useTooltip() {
    const [tooltip, setTooltip] = useState({ 
        visible: false, 
        x: 0, 
        y: 0, 
        game: null 
    });

    const calculateTooltipPosition = useCallback((clientX, clientY) => {
        let adjustedX = clientX + TOOLTIP_OFFSET;
        let adjustedY = clientY;
        
        // Adjust if tooltip would go off right edge
        if (adjustedX + TOOLTIP_DIMENSIONS.width > window.innerWidth) {
            adjustedX = clientX - TOOLTIP_DIMENSIONS.width - TOOLTIP_OFFSET;
        }
        
        // Adjust if tooltip would go off bottom edge
        if (adjustedY + TOOLTIP_DIMENSIONS.height > window.innerHeight) {
            adjustedY = clientY - TOOLTIP_DIMENSIONS.height;
        }
        
        return { x: adjustedX, y: adjustedY };
    }, []);

    const showTooltip = useCallback((event, game) => {
        const { x, y } = calculateTooltipPosition(event.clientX, event.clientY);
        setTooltip({
            visible: true,
            x,
            y,
            game
        });
    }, [calculateTooltipPosition]);

    const updateTooltipPosition = useCallback((event) => {
        if (tooltip.visible) {
            const { x, y } = calculateTooltipPosition(event.clientX, event.clientY);
            setTooltip(prev => ({ ...prev, x, y }));
        }
    }, [tooltip.visible, calculateTooltipPosition]);

    const hideTooltip = useCallback(() => {
        setTooltip({ visible: false, x: 0, y: 0, game: null });
    }, []);

    return {
        tooltip,
        showTooltip,
        updateTooltipPosition,
        hideTooltip
    };
}

const formatSales = (sales) => {
    if (sales >= 1000000) return `${(sales / 1000000).toFixed(1)}M`;
    if (sales >= 1000) return `${(sales / 1000).toFixed(1)}K`;
    return sales.toString();
};

const getSortedConsoles = (consoles) => {
    if (!consoles) return [];
    return consoles
        .filter(console => console !== null && console !== undefined && console.trim() !== '')
        .sort();
};

function ChartHeader() {
    return (
        <>
            <div style={{ fontStyle: 'italic', marginBottom: '10px', fontSize: '0.9em' }}>
                Data from VGChartz, with data cleaning and validation performed personally.
            </div>

            <div className="connect-me">
                <a 
                    href="https://brandon-chambers.github.io/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ textDecoration: 'none', color: '#333' }}
                >
                    🔗 Connect with me
                </a>
            </div>

            <h1>Best Selling Video Games</h1>
        </>
    );
}

function SearchInput({ searchTerms, onSearchChange, onColorChange, onAddSearchTerm, onRemoveSearchTerm, onClearTooltip }) {
    return (
        <div className="search-div">
            {searchTerms.map((searchItem, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                        type="color"
                        value={searchItem.color}
                        onChange={(e) => onColorChange(index, e.target.value)}
                        style={{
                            width: '30px',
                            height: '30px',
                            marginRight: '8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    />
                    <input 
                        className="search-input"
                        type="text"
                        placeholder={`Search term...`}
                        value={searchItem.term}
                        onChange={(e) => {
                            onSearchChange(index, e.target.value);
                            onClearTooltip();
                        }}
                        style={{ flex: 1, maxWidth: '150px' }}
                    />
                </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                    onClick={onAddSearchTerm}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    +
                </button>
                {searchTerms.length > 1 && (
                    <button 
                        onClick={onRemoveSearchTerm}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        -
                    </button>
                )}
            </div>
        </div>
    );
}

function GameBar({ 
    game, 
    index, 
    widthPercentage, 
    onMouseEnter, 
    onMouseLeave, 
    onMouseMove 
}) {
    return (
        <div 
            key={index} 
            className="game-bar"
            onMouseEnter={(e) => onMouseEnter(e, game)}
            onMouseLeave={onMouseLeave}
            onMouseMove={onMouseMove}
            style={{ cursor: 'pointer' }}
        >
            <div className="bar-container">
                <div
                    className="bar-fill"
                    style={{ 
                        width: `${widthPercentage}%`,
                        backgroundColor: game.searchColor
                    }}
                />
                <div 
                    className="game-title-inside"
                >
                    {game.title}
                </div>
                <div 
                    className="bar-text" 
                >
                    {formatSales(game.sales)}
                </div>
            </div>
        </div>
    );
}

function Tooltip({ tooltip }) {
    if (!tooltip.visible || !tooltip.game) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                backgroundColor: '#2c3e50',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                fontSize: '14px',
                pointerEvents: 'none',
                border: '1px solid #34495e',
                maxWidth: `${TOOLTIP_DIMENSIONS.width}px`,
                minWidth: '250px'
            }}
        >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
                {tooltip.game.title}
            </div>
            <div style={{ marginBottom: '4px' }}>
                <strong>Sales:</strong> {formatSales(tooltip.game.sales)}
            </div>
            <div style={{ marginBottom: '4px' }}>
                <strong>Developer:</strong> {tooltip.game.developer || 'Unknown'}
            </div>
            <div style={{ marginBottom: '8px' }}>
                <strong>Publisher:</strong> {tooltip.game.publisher || 'Unknown'}
            </div>
            <div>
                <strong>Platforms:</strong>
                <div style={{ marginTop: '4px', lineHeight: '1.4' }}>
                    {getSortedConsoles(tooltip.game.array_of_consoles).length > 0 
                        ? getSortedConsoles(tooltip.game.array_of_consoles).join(', ')
                        : 'Unknown'
                    }
                </div>
            </div>
        </div>
    );
}

function ChartContent({ visibleGames, maxSales, tooltipHandlers }) {
    if (visibleGames.length === 0) {
        return <div className="no-results">No games match your search.</div>;
    }

    return (
        <div className="chart-container">
            {visibleGames.map((game, index) => {
                const widthPercentage = (game.sales / maxSales) * 100;
                return (
                    <GameBar
                        key={index}
                        game={game}
                        index={index}
                        widthPercentage={widthPercentage}
                        onMouseEnter={tooltipHandlers.showTooltip}
                        onMouseLeave={tooltipHandlers.hideTooltip}
                        onMouseMove={tooltipHandlers.updateTooltipPosition}
                    />
                );
            })}
        </div>
    );
}

function GameSalesChart() {
    const { games, loading, error } = useGameData();
    const { searchTerms, filteredGames, addSearchTerm, removeSearchTerm, updateSearchTerm, updateSearchColor } = useGameSearch(games);
    const visibleCount = useInfiniteScroll(filteredGames);
    const { tooltip, showTooltip, updateTooltipPosition, hideTooltip } = useTooltip();

    const visibleGames = useMemo(() => 
        filteredGames.slice(0, visibleCount), 
        [filteredGames, visibleCount]
    );

    const maxSales = useMemo(() => 
        filteredGames.length > 0 ? Math.max(...filteredGames.map(g => g.sales)) : 1,
        [filteredGames]
    );

    const tooltipHandlers = useMemo(() => ({
        showTooltip,
        updateTooltipPosition,
        hideTooltip
    }), [showTooltip, updateTooltipPosition, hideTooltip]);

    if (loading) {
        return (
            <div className="container">
                <div className="loading">Loading game sales data...</div>
            </div>
        );
    }

    return (
        <div 
            className="container" 
            style={{ 
                position: 'relative',
                maxWidth: '764px', // 4 inches at 96 DPI
                margin: '0 auto',
                padding: '20px'
            }}
        >
            <ChartHeader />
            
            {error && <div className="error">{error}</div>}
            
            <SearchInput 
                searchTerms={searchTerms}
                onSearchChange={updateSearchTerm}
                onColorChange={updateSearchColor}
                onAddSearchTerm={addSearchTerm}
                onRemoveSearchTerm={removeSearchTerm}
                onClearTooltip={hideTooltip}
            />
            
            <ChartContent 
                visibleGames={visibleGames}
                maxSales={maxSales}
                tooltipHandlers={tooltipHandlers}
            />
            
            <Tooltip tooltip={tooltip} />
        </div>
    );
}

ReactDOM.render(<GameSalesChart />, document.getElementById('root'));