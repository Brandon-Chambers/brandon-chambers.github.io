const { useState, useEffect, useCallback, useMemo } = React;

const BATCH_SIZE = 50;

// Hardcoded colors for search terms
const SEARCH_COLORS = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Turquoise
    '#34495e', // Dark gray
    '#e67e22'  // Carrot
];

// Helper function to lighten a hex color
const lightenColor = (hex, percent) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    const p = percent / 100;

    r = Math.round(r + (255 - r) * p);
    g = Math.round(g + (255 - g) * p);
    b = Math.round(b + (255 - b) * p);

    const toHex = c => ('00' + c.toString(16)).slice(-2);

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};


function useGameData() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('./processed_games.json?v=jul_23');
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
                if (matchesAllSubstrings(game.title, searchTerms[i].term)) {
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

function SearchInput({ searchTerms, onSearchChange, onColorChange, onAddSearchTerm, onRemoveSearchTerm }) {
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
                        placeholder={`Search term ${index + 1}...`}
                        value={searchItem.term}
                        onChange={(e) => onSearchChange(index, e.target.value)}
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

function GameDetails({ game, color }) {
    const detailBackgroundColor = lightenColor(color, 85); // 85% lighter

    return (
        <div
            className="game-details-dropdown"
            style={{
                backgroundColor: detailBackgroundColor,
                padding: '12px',
                marginTop: '-10px',
                marginBottom: '6px',
                borderRadius: '3px',
                color: '#333',
            }}
        >
            <div style={{ marginBottom: '4px' }}>
                <strong>Developer:</strong> {game.developer || 'Unknown'}
            </div>
            <div style={{ marginBottom: '8px' }}>
                <strong>Publisher:</strong> {game.publisher || 'Unknown'}
            </div>
            <div>
                <strong>Platforms:</strong>
                <div style={{ marginTop: '4px' }}>
                    {getSortedConsoles(game.array_of_consoles).length > 0
                        ? getSortedConsoles(game.array_of_consoles).join(', ')
                        : 'Unknown'
                    }
                </div>
            </div>
        </div>
    );
}

function GameBar({ game, index, widthPercentage }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const handleClick = () => setIsExpanded(prev => !prev);
    const backgroundColor = lightenColor(game.searchColor, 85);
    
    return (
        <React.Fragment>
            <div 
                key={index} 
                className="game-bar"
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
            >
                <div className="bar-container" style={{ backgroundColor: backgroundColor }}>
                    <div
                        className="bar-fill"
                        style={{ 
                            width: `${widthPercentage}%`,
                            backgroundColor: game.searchColor
                        }}
                    />
                    <div className="game-title-inside">
                        {game.title}
                    </div>
                    <div className="bar-text">
                        {formatSales(game.sales)}
                    </div>
                </div>
            </div>
            {isExpanded && <GameDetails game={game} color={game.searchColor} />}
        </React.Fragment>
    );
}

function ChartContent({ visibleGames, maxSales }) {
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

    const visibleGames = useMemo(() => 
        filteredGames.slice(0, visibleCount), 
        [filteredGames, visibleCount]
    );

    const maxSales = useMemo(() => 
        filteredGames.length > 0 ? Math.max(...filteredGames.map(g => g.sales)) : 1,
        [filteredGames]
    );

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
            />
            
            <ChartContent 
                visibleGames={visibleGames}
                maxSales={maxSales}
            />
        </div>
    );
}

ReactDOM.render(<GameSalesChart />, document.getElementById('root'));