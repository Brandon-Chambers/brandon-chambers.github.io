const { useState, useEffect } = React;

const BATCH_SIZE = 50;

function GameSalesChart() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

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

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
            ) {
                setVisibleCount(prev => {
                    const next = prev + BATCH_SIZE;
                    return next >= filteredGames.length ? filteredGames.length : next;
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [searchQuery, games]);

    const formatSales = (sales) => {
        if (sales >= 1000000) return `${(sales / 1000000).toFixed(1)}M`;
        if (sales >= 1000) return `${(sales / 1000).toFixed(1)}K`;
        return sales.toString();
    };

    const handleSearch = () => {
        setSearchQuery(searchTerm);
        setVisibleCount(BATCH_SIZE);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const filteredGames = games.filter(game =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const visibleGames = filteredGames.slice(0, visibleCount);
    const maxSales = filteredGames.length > 0 ? Math.max(...filteredGames.map(g => g.sales)) : 1;

    if (loading) {
        return (
            <div className="container">
                <div className="loading">Loading game sales data...</div>
            </div>
        );
    }

    return (
        <div className="container" style={{ position: 'relative' }}>
            {/* Attribution */}
            <div style={{ fontStyle: 'italic', marginBottom: '10px', fontSize: '0.9em' }}>
                Data from VGChartz, with data cleaning and validation performed personally.
            </div>

            {/* Floating Connect Prompt */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                backgroundColor: '#f0f0f0',
                padding: '10px 15px',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.15)',
                zIndex: 1000
            }}>
                <a href="https://brandon-chambers.github.io/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#333' }}>
                    🔗 Connect with me
                </a>
            </div>

            <h1>Best Selling Video Games</h1>
            {error && <div className="error">{error}</div>}

            <div className="search-div">
                <input className="search-input"
                    type="text"
                    placeholder="Search by game title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            <div className="chart-container">
                {visibleGames.map((game, index) => {
                    const widthPercentage = (game.sales / maxSales) * 100;
                    return (
                        <div key={index} className="game-bar">
                            <div className="game-info">
                                <div className="game-title">{game.title}</div>
                            </div>
                            <div className="bar-container">
                                <div
                                    className={`bar-fill`}
                                    style={{ width: `${widthPercentage}%` }}
                                ></div>
                                <div className="bar-text">{formatSales(game.sales)} Copies</div>
                            </div>
                        </div>
                    );
                })}
                {visibleGames.length === 0 && (
                    <div className="no-results">No games match your search.</div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<GameSalesChart />, document.getElementById('root'));
