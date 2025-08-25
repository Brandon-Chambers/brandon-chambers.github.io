var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _GameMap_ground_array, _GameMap_wall_array, _GameMap_entity_array, _GameMap_flooring_array, _Pathfinding_instances, _Pathfinding_passability_array, _Pathfinding_getIndex, _ItemCache_all_items;
class SpriteHandler {
    constructor(image) {
        this.img = image;
        this.offSetX = TILE_SIZE - this.img.width;
        this.offSetY = TILE_SIZE - this.img.height;
    }
    render_sprite(xTile, yTile) {
        const xPos = xTile * TILE_SIZE + this.offSetX;
        const yPos = yTile * TILE_SIZE + this.offSetY;
        ctx.drawImage(this.img, xPos - CAMERA_X, yPos - CAMERA_Y);
    }
}
// Define the image paths to load
const IMAGE_PATHS = {
    "dorf": "sprites/dorf_clear.png",
    "rock": "sprites/rock.png",
    "bag": "sprites/bag.png",
    "tree": "sprites/tree.png",
    "log": "sprites/log.png",
    "potato_seed": "sprites/potato_seed.png",
    "potato_grown": "sprites/potato_grown.png",
    "potato": "sprites/potato.png",
    "egg": "sprites/egg.png",
    "berry_bush_empty": "sprites/berry_bush_empty.png",
    "berry_bush_full": "sprites/berry_bush_full.png",
    "fruit": "sprites/fruits.png",
    "cow": "sprites/cow.png",
    "chicken": "sprites/chicken.png",
    "dirt": "sprites/dirt.png",
    "dirt2": "sprites/dirt2.png",
    "dirt3": "sprites/dirt3.png",
    "stone": "sprites/stone_ground.png",
    "cliff": "sprites/cliff.png",
    "still": "sprites/still.png",
    "grog": "sprites/grog.png",
};
// Create a record to store loaded images
const LOADED_IMAGES = {};
// Create a record to store sprite handlers
const ALL_LOADED_SPRITES = {};
// Function to load all images
function loadAllImagesAndLaunch() {
    const loadPromises = [];
    // Create load promises for each image
    Object.entries(IMAGE_PATHS).forEach(([key, path]) => {
        const img = new Image();
        const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                LOADED_IMAGES[key] = img;
                resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
        });
        img.src = path;
        loadPromises.push(loadPromise);
    });
    // Return a promise that resolves when all images are loaded
    return Promise.all(loadPromises).then(() => {
        // Create sprite handlers once images are loaded
        Object.keys(LOADED_IMAGES).forEach(key => {
            ALL_LOADED_SPRITES[key] = new SpriteHandler(LOADED_IMAGES[key]);
        });
        gameLoop();
    });
}
const RECIPE_TOKENS = {
    STONE_BLOCKS: { name: "Cut Stone Blocks",
        items_needed: { stone: 1 },
        items_created: { stone_blocks: 3 } },
    BREW_GROG: { name: "Brew Grog from Potatoes",
        items_needed: { potato: 10 },
        items_created: { grog: 4 } },
};
const WORKSHOP_TOKENS = {
    BLOCK_CUTTER: { name: "Block Cutter",
        recipes: ["STONE_BLOCKS"],
    },
    STILL: { name: "Moonshine Still",
        recipes: ["BREW_GROG"],
    }
};
const CROP_TOKENS = {
    POTATO: { name: "Potato",
        growth_time: 1 * 1000,
        crop_yield: { "potato": 10 } }
};
class FrameTime {
    static updateDeltaT() {
        if (FrameTime.last_frame_time === 0) {
            FrameTime.last_frame_time = Date.now();
            return;
        }
        FrameTime.current_time = Date.now();
        if (FrameTime.current_time - FrameTime.last_frame_time > FrameTime.maxDelta) {
            FrameTime.deltaTRaw = FrameTime.maxDelta;
        }
        else {
            FrameTime.deltaTRaw = FrameTime.current_time - FrameTime.last_frame_time;
        }
        FrameTime.deltaT = FrameTime.deltaTRaw * TIME_FACTOR;
        FrameTime.last_frame_time = FrameTime.current_time;
    }
}
// All values are in ms;
FrameTime.last_frame_time = 0;
FrameTime.deltaTRaw = 0;
FrameTime.deltaT = 0;
FrameTime.maxDelta = 100;
FrameTime.current_time = 0;
const MS_IN_DAY = 24 * 3 * 1000; // Try 528 * 1000 for the final amount.;
const MS_IN_HOUR = MS_IN_DAY / 24;
class GameCalendar {
    constructor() {
        this.loose_ms = MS_IN_HOUR * 12;
        this.day = 0;
    }
    update() {
        this.loose_ms += FrameTime.deltaT;
        if (this.loose_ms >= MS_IN_DAY) {
            this.loose_ms -= MS_IN_DAY;
            this.day++;
        }
    }
    print_readable_text() {
        const hour = Math.floor(this.loose_ms / MS_IN_HOUR);
        const mins = Math.floor(((this.loose_ms % MS_IN_HOUR) / MS_IN_HOUR) * 60);
        const s_hour = String(hour).padStart(2, '0');
        const s_mins = String(mins).padStart(2, '0');
        $("#calendar").text(s_hour + ":" + s_mins);
    }
    calculateNightAlpha() {
        const hour = this.loose_ms / MS_IN_HOUR;
        // Night (20:00 - 4:00)
        if (hour >= 20 || hour < 4) {
            return 0.6;
        }
        // Dawn (4:00 - 8:00)
        else if (hour >= 4 && hour < 8) {
            return 0.6 * (1 - ((hour - 4) / 4));
        }
        // Day (8:00 - 16:00)
        else if (hour >= 8 && hour < 16) {
            return 0;
        }
        // Dusk (16:00 - 20:00)
        else if (hour >= 16 && hour < 20) {
            return 0.6 * ((hour - 16) / 4);
        }
        return 0;
    }
    render_overlay() {
        const alpha = this.calculateNightAlpha();
        ctx.fillStyle = `rgba(0, 0, 30, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
const CALENDAR = new GameCalendar();
function ugly_print(obj) {
    console.log(JSON.stringify(obj));
}
function generateCircleCoordinates(radius) {
    const points = [];
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            if (x * x + y * y <= radius * radius) {
                points.push({ x, y, distance: Math.sqrt(x * x + y * y) });
            }
        }
    }
    return points.sort((a, b) => a.distance - b.distance);
}
function isValidGridCoordinate(x, y) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
        return false;
    }
    return true;
}
function getHashSetOfReservedTiles() {
    const set_of_reserved_items = new Set();
    for (const one_char of CHARACTERS) {
        for (const task of one_char.itinerary.task_list) {
            const task_reserves_a_tile = !(task.task_key == "GO_TO" || task.x === null || task.y === null);
            if (task_reserves_a_tile) {
                set_of_reserved_items.add(task.x + " " + task.y);
            }
        }
    }
    return set_of_reserved_items;
}
// path_array is an array of objects with properties x and y
// i.e The result of a PATHFINDING.findPath() method call.
function path_array_to_tasks(path_array) {
    const array_of_go_to = [];
    for (const one_path_node of path_array) {
        array_of_go_to.push(new DwarvenTask("GO_TO", one_path_node.x, one_path_node.y));
    }
    return array_of_go_to;
}
function getGridTilesBetween(tile1, tile2) {
    const tiles = [];
    let { x: x1, y: y1 } = tile1;
    let { x: x2, y: y2 } = tile2;
    // Ensure x1 <= x2 and y1 <= y2
    if (x1 > x2) {
        [x1, x2] = [x2, x1];
    }
    if (y1 > y2) {
        [y1, y2] = [y2, y1];
    }
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            tiles.push(new Tile2D(x, y));
        }
    }
    return tiles;
}
function getOutermostGridTiles(tile1, tile2) {
    const tiles = [];
    let { x: x1, y: y1 } = tile1;
    let { x: x2, y: y2 } = tile2;
    // Ensure x1 <= x2 and y1 <= y2
    if (x1 > x2) {
        [x1, x2] = [x2, x1];
    }
    if (y1 > y2) {
        [y1, y2] = [y2, y1];
    }
    // Handle edge case: single point
    if (x1 === x2 && y1 === y2) {
        tiles.push(new Tile2D(x1, y1));
        return tiles;
    }
    // Handle edge case: single row
    if (y1 === y2) {
        for (let x = x1; x <= x2; x++) {
            tiles.push(new Tile2D(x, y1));
        }
        return tiles;
    }
    // Handle edge case: single column
    if (x1 === x2) {
        for (let y = y1; y <= y2; y++) {
            tiles.push(new Tile2D(x1, y));
        }
        return tiles;
    }
    // General case: rectangle with width > 1 and height > 1
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            // Only include tiles that are on the edge
            if (x === x1 || x === x2 || y === y1 || y === y2) {
                tiles.push(new Tile2D(x, y));
            }
        }
    }
    return tiles;
}
function getRandomNumberBetween(a, b) {
    // Make sure the lower bound is less than or equal to the upper bound
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    // Generate a random integer in the range [min, max]
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function deterministicRandom(input, maxValue) {
    // Convert input to string and create a hash
    let str = input.toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Make hash positive and get a number between 1 and maxValue
    hash = Math.abs(hash);
    return (hash % maxValue) + 1;
}
function getRandomElement(arr) {
    if (arr.length === 0) {
        return undefined; // Return undefined for empty arrays
    }
    // Generate a random index between 0 and the last index of the array
    const randomIndex = Math.floor(Math.random() * arr.length);
    // Return the element at the random index
    return arr[randomIndex];
}
function chooseNRandomElements(array, n) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error("Source array must be a non-empty array");
    }
    if (typeof n !== 'number' || n <= 0 || n > array.length || !Number.isInteger(n)) {
        throw new Error(`'n' must be an integer such that 1 ≤ n ≤ ${array.length}. Got: ${n}`);
    }
    // We DON'T want to modify the original array, so make a COPY first.
    const copy = array.slice(); // Shallow copy is enough here
    // Partial Fisher-Yates shuffle: iterate only `n` times
    for (let i = 0; i < n; i++) {
        // Pick a random index from i to the end of remaining part (copy.length - 1)
        const randomIndex = i + Math.floor(Math.random() * (copy.length - i));
        // Swap elements at `i` and `randomIndex`
        // This puts the randomly chosen element in the "result" zone (first `n` slots)
        [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
    }
    // Now, the first `n` elements of `copy` are our random picks. 
    // Return only those, discarding the rest.
    return copy.slice(0, n);
}
function prettify(inputString) {
    // Step 1: Replace underscores with spaces
    let stringWithSpaces = inputString.replace(/_/g, ' ');
    // Step 2: Split the string into words
    let wordsArray = stringWithSpaces.split(' ');
    // Step 3: Capitalize the first letter of each word and make the rest lowercase
    let capitalizedWordsArray = wordsArray.map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    // Step 4: Join the words back into a single string
    let prettifiedString = capitalizedWordsArray.join(' ');
    return prettifiedString;
}
function manh_dist(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
class Tile2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    isValid() {
        return (this.x >= 0 && this.x < GRID_WIDTH && this.y >= 0 && this.y < GRID_HEIGHT);
    }
    static addTwoTiles(a, b) {
        return new Tile2D(a.x + b.x, a.y + b.y);
    }
    getNeighbors() {
        const neighbors = [];
        for (const d of CARDINAL_DIRECTIONS) {
            const potential_neighbor = Tile2D.addTwoTiles(this, d);
            if (potential_neighbor.isValid()) {
                neighbors.push(potential_neighbor);
            }
        }
        return neighbors;
    }
    get_hash() {
        return this.x + ' ' + this.y;
    }
}
const TILE_SIZE = 32;
const GRID_WIDTH = 250;
const GRID_HEIGHT = 250;
const CANVAS_HEIGHT = window.screen.height - 175;
const CANVAS_WIDTH = window.screen.width - 35;
const CARDINAL_DIRECTIONS = [new Tile2D(0, 1), // Up
    new Tile2D(1, 0), // Right
    new Tile2D(0, -1), // Down
    new Tile2D(-1, 0)]; // Left
const DIRECTIONS = [new Tile2D(0, -1), // Up
    new Tile2D(1, -1), // Up-Right
    new Tile2D(1, 0), // Right
    new Tile2D(1, 1), // Down-Right
    new Tile2D(0, 1), // Down
    new Tile2D(-1, 1), // Down-Left
    new Tile2D(-1, 0), // Left
    new Tile2D(-1, -1)]; // Up-Left
const LIST_OF_EDIBLES = ['potato', 'egg', 'fruit'];
const LIST_OF_GROG_KEYS = ['grog'];
/* Sourced from Claude -- might use a library later */
class PerlinNoise {
    constructor() {
        this.p = new Array(512);
        this.generatePermutation();
    }
    generatePermutation() {
        // Create a shuffled permutation based on the seed
        const permutation = Array.from({ length: 256 }, (_, i) => i);
        // Fisher-Yates shuffle using seeded random
        for (let i = permutation.length - 1; i > 0; i--) {
            const j = Math.floor(getRand() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        // Double the permutation to avoid overflow
        for (let i = 0; i < 512; i++) {
            this.p[i] = permutation[i % 256];
        }
    }
    noise(x, y) {
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        // Relative xy in the grid cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        // Compute fade curves for x and y
        const u = this.fade(x);
        const v = this.fade(y);
        // Hash coordinates of the 4 square potatoers
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        // Blend results from 4 potatoers
        return this.lerp(v, this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)), this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1)));
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    grad(hash, x, y) {
        switch (hash & 3) {
            case 0: return x + y;
            case 1: return -x + y;
            case 2: return x - y;
            case 3: return -x - y;
            default: return 0;
        }
    }
}
/* Sourced from Claude -- might use a library later */
var SEED = 3;
function getRand() {
    const x = Math.sin(SEED++) * 10000;
    return x - Math.floor(x);
}
const PEOPLE_NAMES = [
    // Male Names
    "Aelfric", "Baldric", "Cedric", "Dunstan", "Eadmund",
    "Godric", "Hereward", "Leofric", "Oswald", "Wulfstan",
    "Aldhelm", "Beowulf", "Cerdic", "Drystan", "Egbert",
    "Gawain", "Hrothgar", "Leofwine", "Osric", "Wilfred",
    "Aeneas", "Brutus", "Claudius", "Darius", "Ezra",
    "Gideon", "Horatio", "Lucius", "Orion", "Thaddeus",
    // Female Names
    "Aelfgifu", "Bertha", "Cynethryth", "Dorothea", "Edith",
    "Frideswide", "Gunnhild", "Hilda", "Isolde", "Judith",
    "Kenelswith", "Mildred", "Nesta", "Osburh",
    "Prudence", "Quendreda", "Rowena", "Selah", "Theodora",
    "Aethelthryth", "Beatrice", "Constance", "Damaris", "Elspeth",
    "Fides", "Gwendolyn", "Helena", "Iphigenia", "Jezebel",
];
class GameMap {
    constructor() {
        _GameMap_ground_array.set(this, Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('dirt'))); // Fill the whole grid with "dirt" tiles.
        _GameMap_wall_array.set(this, Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null))); // Start out with no walls.
        _GameMap_entity_array.set(this, Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null))); // Fill the whole grid no entities.
        _GameMap_flooring_array.set(this, Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null))); // Fill the whole grid no entities.
        // Pattern drawing functions
        this.PATTERN_DRAWERS = {
            rock: (ctx, px, py, size, material) => {
                ctx.fillStyle = material.shadow;
                const oldGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = 0.6;
                // Create deterministic "random" pattern using position
                const seed = px + py * 1000;
                for (let i = 0; i < 6; i++) {
                    const pseudoRandom1 = ((seed + i * 13) % 97) / 97;
                    const pseudoRandom2 = ((seed + i * 17) % 89) / 89;
                    const rx = px + pseudoRandom1 * size;
                    const ry = py + pseudoRandom2 * size;
                    ctx.fillRect(Math.floor(rx), Math.floor(ry), 2, 2);
                }
                ctx.globalAlpha = oldGlobalAlpha;
            },
            wood: (ctx, px, py, size, material) => {
                ctx.strokeStyle = material.shadow;
                ctx.lineWidth = 1;
                const oldGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = 0.7;
                // Draw wood grain lines
                for (let i = 0; i < 3; i++) {
                    const y1 = py + (i + 1) * (size / 4);
                    ctx.beginPath();
                    ctx.moveTo(px + 2, y1);
                    ctx.lineTo(px + size - 2, y1);
                    ctx.stroke();
                }
                ctx.globalAlpha = oldGlobalAlpha;
            }
        };
        this.generatePerlinTerrain(GRID_WIDTH, GRID_HEIGHT);
    }
    generatePerlinTerrain(sizeX, sizeY, tiles_before_repeat_for_largest_octave = 128, seed = 1) {
        // Create separate noise generators for each octave with different seeds
        const noises = [new PerlinNoise(),
            new PerlinNoise(),
            new PerlinNoise()];
        const scale = 1.0 / tiles_before_repeat_for_largest_octave;
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                // Multi-octave noise with deliberate octave configuration
                let value = 0;
                const amplitudes = [1, 0.5, 0.25]; // Decreasing influence for higher octaves
                const frequencies = [scale, scale * 2, scale * 4]; // Increasing frequency for each octave
                // Sum the noise from different octaves
                for (let octave = 0; octave < 3; octave++) {
                    const sampleX = x * frequencies[octave];
                    const sampleY = y * frequencies[octave];
                    const noiseValue = noises[octave].noise(sampleX, sampleY);
                    value += noiseValue * amplitudes[octave];
                }
                // Value will wind up being plus or minus the sum of the amplitudes so +-1.75 with a normal distribution with mean of zero.
                // Use value to set terrain type.
                if (value < -.30) {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "deep_water";
                }
                else if (value < -.25) {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "water";
                }
                else if (value < -.05) {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "mud";
                }
                else if (value < .28) {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "dirt";
                }
                else if (value < .35) {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "stone";
                }
                else {
                    __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = "stone";
                    __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x] = "cliff";
                }
            }
            ;
        }
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                const valid_location = this.isValidLocationForTree(x, y);
                const random_value = getRand();
                if (valid_location && random_value > 0.95) {
                    this.setEntity(x, y, new TreeEntity());
                }
            }
        }
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                const valid_location = this.isValidLocationForTree(x, y);
                const random_value = Math.random();
                if (valid_location && random_value > 0.99) {
                    this.setEntity(x, y, new BerryBushEntity());
                }
            }
        }
    }
    update_grass() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.update_grass_for_one_tile(x, y);
            }
        }
    }
    update_grass_for_one_tile(x, y) {
        if (__classPrivateFieldGet(this, _GameMap_flooring_array, "f")[y][x] == null) {
            if (__classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] == "dirt" && Math.random() > .99) {
                __classPrivateFieldGet(this, _GameMap_flooring_array, "f")[y][x] = "grass";
            }
        }
    }
    isValidLocationForTree(x, y) {
        // Check all 8 surrounding cells
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        if (this.getEntity(x, y) !== null) {
            return false;
        }
        if (this.getTile(x, y) != "dirt") {
            return false;
        }
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            // Check if adjacent cell is not withing grid-- if so ignore it.
            if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
                continue;
            }
            const potential_tree = this.getEntity(newX, newY);
            if (potential_tree instanceof TreeEntity || potential_tree instanceof BerryBushEntity) {
                return false;
            }
        }
        return true;
    }
    getTile(x, y) {
        return __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x];
    }
    getWall(x, y) {
        return __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x];
    }
    getEntity(x, y) {
        return __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x];
    }
    setTile(x, y, tile_id) {
        if (x >= 0 && y < GRID_WIDTH &&
            y >= 0 && y < GRID_HEIGHT) {
            __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x] = tile_id;
        }
    }
    setWall(x, y, tile_id) {
        if (x >= 0 && y < GRID_WIDTH &&
            y >= 0 && y < GRID_HEIGHT) {
            __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x] = tile_id;
        }
    }
    setEntity(x, y, entity_object) {
        if (!isValidGridCoordinate(x, y)) {
            return;
        }
        __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x] = entity_object;
    }
    getCostToMoveThroughTile(x, y) {
        if (__classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x] !== null) {
            return Infinity;
        }
        return ALL_TILES[this.getTile(x, y)].cost;
    }
    get_closest_tile_of_type(x, y, desiredTileType) {
        let closestTile = null;
        let closestDistance = Infinity;
        for (let i = 0; i < __classPrivateFieldGet(this, _GameMap_ground_array, "f").length; i++) {
            for (let j = 0; j < __classPrivateFieldGet(this, _GameMap_ground_array, "f")[i].length; j++) {
                if (__classPrivateFieldGet(this, _GameMap_ground_array, "f")[i][j] === desiredTileType) {
                    const distance = PATHFINDING.heuristic(x, y, j, i);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTile = { x: j, y: i };
                    }
                }
            }
        }
        if (!closestTile) {
            return null;
        }
        return PATHFINDING.findPath(x, y, closestTile.x, closestTile.y);
    }
    get_closest_flooring_of_type(x, y, desiredFloorType) {
        let closestTile = null;
        let closestDistance = Infinity;
        for (let i = 0; i < __classPrivateFieldGet(this, _GameMap_flooring_array, "f").length; i++) {
            for (let j = 0; j < __classPrivateFieldGet(this, _GameMap_flooring_array, "f")[i].length; j++) {
                if (__classPrivateFieldGet(this, _GameMap_flooring_array, "f")[i][j] === desiredFloorType) {
                    const distance = PATHFINDING.heuristic(x, y, j, i);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTile = new Tile2D(j, i);
                    }
                }
            }
        }
        if (!closestTile) {
            return null;
        }
        return PATHFINDING.findPath(x, y, closestTile.x, closestTile.y);
    }
    getClosestOuthouse(startX, startY) {
        const entities = this.getAllEntitiesAsWrappedArray();
        const outhouses = entities.filter(e_o => e_o.entity instanceof OuthouseEntity);
        outhouses.sort((a, b) => {
            const distA = Math.abs(a.x - startX) + Math.abs(a.y - startY);
            const distB = Math.abs(b.x - startX) + Math.abs(b.y - startY);
            return distA - distB;
        });
        for (const oh of outhouses) {
            const path = PATHFINDING.findPath(startX, startY, oh.x, oh.y);
            if (path) {
                return path;
            }
        }
        return false;
    }
    getAllEntitiesAsWrappedArray() {
        const results = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (__classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x]) {
                    results.push({ entity: __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x],
                        x: x,
                        y: y });
                }
            }
        }
        return results;
    }
    getEntityWhereFn(filterFn) {
        const results = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const entity = __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x];
                if (entity !== null && filterFn(entity)) {
                    results.push({
                        entity: entity,
                        x: x,
                        y: y
                    });
                }
            }
        }
        return results;
    }
    getItemViaItsKey(item_key) {
        return this.getEntityWhereFn(function (entity) {
            return (entity instanceof ItemOnGround && entity.item_id == item_key);
        });
    }
    getItemsNotInStockpiles() {
        return this.getAllEntitiesAsWrappedArray().filter((w_e) => w_e.entity instanceof ItemOnGround && !ZONE_MANAGER.grid_location_is_stockpile(w_e.x, w_e.y));
    }
    getClosestFoodItem(startX, startY) {
        const food_items = this.getAllEntitiesAsWrappedArray().filter((w_e) => w_e.entity instanceof ItemOnGround && LIST_OF_EDIBLES.includes(w_e.entity.item_id));
        food_items.sort((a, b) => {
            const distA = Math.abs(a.x - startX) + Math.abs(a.y - startY);
            const distB = Math.abs(b.x - startX) + Math.abs(b.y - startY);
            return distA - distB;
        });
        for (const food_item of food_items) {
            const potential_path = PATHFINDING.findPath(startX, startY, food_item.x, food_item.y);
            if (potential_path) {
                return potential_path;
            }
        }
        return null;
    }
    getClosestGrogItem(startX, startY) {
        const food_items = this.getAllEntitiesAsWrappedArray().filter((w_e) => w_e.entity instanceof ItemOnGround && LIST_OF_GROG_KEYS.includes(w_e.entity.item_id));
        food_items.sort((a, b) => {
            const distA = Math.abs(a.x - startX) + Math.abs(a.y - startY);
            const distB = Math.abs(b.x - startX) + Math.abs(b.y - startY);
            return distA - distB;
        });
        for (const food_item of food_items) {
            const potential_path = PATHFINDING.findPath(startX, startY, food_item.x, food_item.y);
            if (potential_path) {
                return potential_path;
            }
        }
        return null;
    }
    dump_inventory(x, y, inventory) {
        const inventory_copy = inventory.give_list_of_items_held();
        for (const one_item_id in inventory_copy) {
            const item_count = inventory_copy[one_item_id];
            this.dump_one_inventory_item(x, y, one_item_id, item_count);
        }
        inventory.makeEmpty();
    }
    dump_one_inventory_item(x, y, item_id, item_count) {
        const circle_coordinates = generateCircleCoordinates(4);
        let circle_iterator = 0;
        while (circle_iterator < circle_coordinates.length) {
            const circle_pos = circle_coordinates[circle_iterator];
            const tile_x = x + circle_pos.x;
            const tile_y = y + circle_pos.y;
            if (!isValidGridCoordinate(tile_x, tile_y)) {
                circle_iterator++;
                continue;
            }
            const current_entity = this.getEntity(tile_x, tile_y);
            if (current_entity === null) {
                this.setEntity(tile_x, tile_y, new ItemOnGround(item_id, item_count));
                return;
            }
            circle_iterator++;
        }
    }
    update_all_entities() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const entity = __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x];
                if (entity !== null) {
                    entity.frame_update(x, y);
                }
            }
        }
    }
    isWalkable(x, y) {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            return false;
        }
        const cost = ALL_TILES[__classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x]].cost;
        return cost !== Infinity && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x] === null;
    }
    // * * * * * * * * * * * * * * * * * * * * *
    // Drawing Functions
    // * * * * * * * * * * * * * * * * * * * * *
    render_single_tile(x, y) {
        const tileType = __classPrivateFieldGet(this, _GameMap_ground_array, "f")[y][x];
        /* Render Ground */
        if (tileType == "dirt") {
            const rand = deterministicRandom(y + " " + x, 3);
            let sprite = ALL_LOADED_SPRITES["dirt"];
            if (rand == 2) {
                sprite = ALL_LOADED_SPRITES["dirt2"];
            }
            else if (rand == 3) {
                sprite = ALL_LOADED_SPRITES["dirt3"];
            }
            sprite.render_sprite(x, y);
        }
        else if (tileType == "mud") {
            const rand = deterministicRandom(y + " " + x, 3);
            let sprite = ALL_LOADED_SPRITES["dirt"];
            if (rand == 2) {
                sprite = ALL_LOADED_SPRITES["dirt2"];
            }
            else if (rand == 3) {
                sprite = ALL_LOADED_SPRITES["dirt3"];
            }
            // Render sprite first, then apply darker overlay
            sprite.render_sprite(x, y);
            // Apply dark overlay for mud effect
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'; // Semi-transparent black overlay
            ctx.fillRect(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
            ctx.restore();
        }
        else if (tileType == "stone") {
            ALL_LOADED_SPRITES["stone"].render_sprite(x, y);
        }
        else {
            ctx.fillStyle = ALL_TILES[tileType].color;
            ctx.fillRect(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
        }
        /* Render Flooring */
        if (__classPrivateFieldGet(this, _GameMap_flooring_array, "f")[y][x] == "grass") {
            ctx.fillStyle = 'rgba(0, 120, 30, 0.7)';
            ctx.fillRect(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
        }
        /* Render Wall */
        this.render_wall(x, y);
    }
    /**
    * Get neighbors for a wall tile to determine rendering style
    */
    getWallNeighbors(x, y) {
        const currentWallType = __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x];
        return {
            U: y > 0 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y - 1][x] === currentWallType,
            D: y < GRID_HEIGHT - 1 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y + 1][x] === currentWallType,
            L: x > 0 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x - 1] === currentWallType,
            R: x < GRID_WIDTH - 1 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x + 1] === currentWallType,
            UL: y > 0 && x > 0 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y - 1][x - 1] === currentWallType,
            UR: y > 0 && x < GRID_WIDTH - 1 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y - 1][x + 1] === currentWallType,
            DL: y < GRID_HEIGHT - 1 && x > 0 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y + 1][x - 1] === currentWallType,
            DR: y < GRID_HEIGHT - 1 && x < GRID_WIDTH - 1 && __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y + 1][x + 1] === currentWallType
        };
    }
    /**
    * Draw corner details for wall connections
    */
    drawWallCorner(px, py, edge, material, isOuter, isInner, type) {
        if (isOuter) {
            ctx.fillStyle = material[type];
            ctx.fillRect(px, py, edge, edge);
        }
        else if (isInner) {
            ctx.fillStyle = material.shadow; // Inner corners are always shadows for depth
            ctx.fillRect(px, py, edge, edge);
        }
    }
    /**
    * Enhanced wall rendering with 3D effects and patterns
    */
    render_wall(x, y) {
        const wallType = __classPrivateFieldGet(this, _GameMap_wall_array, "f")[y][x];
        if (!wallType) {
            return; // No wall to render
        }
        const material = GameMap.WALL_MATERIALS[wallType] || GameMap.WALL_MATERIALS.stone_block_wall;
        const neighbors = this.getWallNeighbors(x, y);
        const px = x * TILE_SIZE - CAMERA_X;
        const py = y * TILE_SIZE - CAMERA_Y;
        const edge = 4; // Size of 3D edge effect
        // 1. Draw base color
        ctx.fillStyle = material.base;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // 2. Draw pattern if specified
        if (material.pattern && this.PATTERN_DRAWERS[material.pattern]) {
            this.PATTERN_DRAWERS[material.pattern](ctx, px, py, TILE_SIZE, material);
        }
        // 3. Draw 3D edges - highlights on top/left, shadows on bottom/right
        ctx.fillStyle = material.highlight;
        if (!neighbors.U)
            ctx.fillRect(px, py, TILE_SIZE, edge); // Top highlight
        if (!neighbors.L)
            ctx.fillRect(px, py, edge, TILE_SIZE); // Left highlight
        ctx.fillStyle = material.shadow;
        if (!neighbors.D)
            ctx.fillRect(px, py + TILE_SIZE - edge, TILE_SIZE, edge); // Bottom shadow
        if (!neighbors.R)
            ctx.fillRect(px + TILE_SIZE - edge, py, edge, TILE_SIZE); // Right shadow
        // 4. Draw corner details for better wall connections
        // Top-left corner
        this.drawWallCorner(px, py, edge, material, !neighbors.U && !neighbors.L, // outer corner
        neighbors.U && neighbors.L && !neighbors.UL, // inner corner
        'highlight');
        // Top-right corner  
        this.drawWallCorner(px + TILE_SIZE - edge, py, edge, material, !neighbors.U && !neighbors.R, // outer corner
        neighbors.U && neighbors.R && !neighbors.UR, // inner corner
        'highlight');
        // Bottom-left corner
        this.drawWallCorner(px, py + TILE_SIZE - edge, edge, material, !neighbors.D && !neighbors.L, // outer corner
        neighbors.D && neighbors.L && !neighbors.DL, // inner corner
        'shadow');
        // Bottom-right corner
        this.drawWallCorner(px + TILE_SIZE - edge, py + TILE_SIZE - edge, edge, material, !neighbors.D && !neighbors.R, // outer corner
        neighbors.D && neighbors.R && !neighbors.DR, // inner corner
        'shadow');
    }
    render_tiles() {
        // Calculate the visible tile range based on camera position
        const startX = Math.floor(CAMERA_X / TILE_SIZE);
        const startY = Math.floor(CAMERA_Y / TILE_SIZE);
        const endX = Math.min(Math.ceil((CAMERA_X + CANVAS_WIDTH) / TILE_SIZE), GRID_WIDTH);
        const endY = Math.min(Math.ceil((CAMERA_Y + CANVAS_HEIGHT) / TILE_SIZE), GRID_HEIGHT);
        // Only render tiles within the visible range
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                this.render_single_tile(x, y);
            }
        }
    }
    render_entities() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const entity = __classPrivateFieldGet(this, _GameMap_entity_array, "f")[y][x];
                if (entity != null) {
                    entity.draw(x, y);
                }
            }
        }
    }
}
_GameMap_ground_array = new WeakMap(), _GameMap_wall_array = new WeakMap(), _GameMap_entity_array = new WeakMap(), _GameMap_flooring_array = new WeakMap();
// Wall material configuration (add this as a class property or global)
GameMap.WALL_MATERIALS = {
    wood_wall: {
        base: '#5C4033',
        highlight: '#8B6F47',
        shadow: '#3D2B1F',
        pattern: 'wood'
    },
    stone_block_wall: {
        base: '#8c98a1',
        highlight: '#B5C2CF',
        shadow: '#5D6B78',
        pattern: false
    },
    cliff: {
        base: '#47484e',
        highlight: '#8A9199',
        shadow: '#2f2f33',
        pattern: 'rock'
    }
};
class Pathfinding {
    constructor() {
        _Pathfinding_instances.add(this);
        _Pathfinding_passability_array.set(this, new Int32Array(GRID_WIDTH * GRID_HEIGHT));
        __classPrivateFieldGet(this, _Pathfinding_passability_array, "f").fill(0);
    }
    populate_passibility_array() {
        let passability_number = 1;
        const total_cells = GRID_WIDTH * GRID_HEIGHT;
        // Initialize array with 0s
        __classPrivateFieldGet(this, _Pathfinding_passability_array, "f").fill(0);
        // First pass: mark walls as -1 (optimized single loop)
        for (let i = 0; i < total_cells; i++) {
            const x = i % GRID_WIDTH;
            const y = Math.floor(i / GRID_WIDTH);
            if (GAME_MAP.getWall(x, y) !== null) {
                __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[i] = -1;
            }
        }
        // Second pass: flood fill regions (optimized single loop)
        for (let i = 0; i < total_cells; i++) {
            if (__classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[i] === 0) {
                const x = i % GRID_WIDTH;
                const y = Math.floor(i / GRID_WIDTH);
                this.optimized_flood_fill(x, y, passability_number);
                passability_number++;
            }
        }
    }
    optimized_flood_fill(startX, startY, fillValue) {
        // Use array as stack for better performance than push/pop on objects
        const stack = [startY * GRID_WIDTH + startX]; // Store indices directly
        const visited = new Uint8Array(GRID_WIDTH * GRID_HEIGHT); // Fast lookup
        while (stack.length > 0) {
            const idx = stack.pop();
            if (visited[idx] || __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[idx] !== 0) {
                continue;
            }
            const y = Math.floor(idx / GRID_WIDTH);
            const x = idx % GRID_WIDTH;
            // Find the leftmost x coordinate
            let leftX = x;
            let leftIdx = idx;
            while (leftX > 0) {
                const testIdx = leftIdx - 1;
                if (visited[testIdx] || __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[testIdx] !== 0)
                    break;
                leftX--;
                leftIdx = testIdx;
            }
            // Find the rightmost x coordinate
            let rightX = x;
            let rightIdx = idx;
            while (rightX < GRID_WIDTH - 1) {
                const testIdx = rightIdx + 1;
                if (visited[testIdx] || __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[testIdx] !== 0)
                    break;
                rightX++;
                rightIdx = testIdx;
            }
            // Fill the scanline and mark as visited
            let currentIdx = leftIdx;
            let spanAbove = false;
            let spanBelow = false;
            for (let i = leftX; i <= rightX; i++) {
                __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[currentIdx] = fillValue;
                visited[currentIdx] = 1;
                // Check above
                if (y > 0) {
                    const upIdx = currentIdx - GRID_WIDTH;
                    const upEmpty = !visited[upIdx] && __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[upIdx] === 0;
                    if (!spanAbove && upEmpty) {
                        stack.push(upIdx);
                        spanAbove = true;
                    }
                    else if (spanAbove && !upEmpty) {
                        spanAbove = false;
                    }
                }
                // Check below
                if (y < GRID_HEIGHT - 1) {
                    const downIdx = currentIdx + GRID_WIDTH;
                    const downEmpty = !visited[downIdx] && __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[downIdx] === 0;
                    if (!spanBelow && downEmpty) {
                        stack.push(downIdx);
                        spanBelow = true;
                    }
                    else if (spanBelow && !downEmpty) {
                        spanBelow = false;
                    }
                }
                currentIdx++;
            }
        }
    }
    are_two_tiles_in_the_same_pathing_region(startX, startY, endX, endY) {
        if (!isValidGridCoordinate(startX, startY) || !isValidGridCoordinate(endX, endY)) {
            return false;
        }
        const startRegion = __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[__classPrivateFieldGet(this, _Pathfinding_instances, "m", _Pathfinding_getIndex).call(this, startX, startY)];
        const endRegion = __classPrivateFieldGet(this, _Pathfinding_passability_array, "f")[__classPrivateFieldGet(this, _Pathfinding_instances, "m", _Pathfinding_getIndex).call(this, endX, endY)];
        return startRegion !== -1 && endRegion !== -1 && startRegion === endRegion;
    }
    findPathExtended(startX, startY, endX, endY, find_adjacent = false) {
        if (!find_adjacent) {
            return this.findPath(startX, startY, endX, endY);
        }
        else {
            let best_path = null;
            let best_path_length = Infinity;
            for (const a_direction of CARDINAL_DIRECTIONS) {
                const candidate_x = endX + a_direction.x;
                const candidate_y = endY + a_direction.y;
                const path_candidate = this.findPath(startX, startY, candidate_x, candidate_y);
                if (path_candidate && path_candidate.length < best_path_length) {
                    best_path = path_candidate;
                    best_path_length = path_candidate.length;
                }
            }
            return best_path;
        }
    }
    findPath(startX, startY, endX, endY) {
        if (!this.are_two_tiles_in_the_same_pathing_region(startX, startY, endX, endY)) {
            return null;
        }
        const openSet = [{
                x: startX,
                y: startY,
                g: 0,
                f: this.heuristic(startX, startY, endX, endY)
            }];
        const closedSet = new Set();
        const cameFrom = new Map();
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            if (current.x === endX && current.y === endY) {
                const path = [];
                let curr = { x: endX, y: endY };
                while (cameFrom.has(`${curr.x},${curr.y}`)) {
                    path.unshift(curr);
                    curr = cameFrom.get(`${curr.x},${curr.y}`);
                }
                return path;
            }
            closedSet.add(`${current.x},${current.y}`);
            for (const neighbor of this.getNeighbors(current.x, current.y)) {
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                    continue;
                }
                const tentativeG = current.g + neighbor.cost;
                const existingOpen = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                if (!existingOpen) {
                    openSet.push({
                        x: neighbor.x,
                        y: neighbor.y,
                        g: tentativeG,
                        f: tentativeG + this.heuristic(neighbor.x, neighbor.y, endX, endY)
                    });
                    cameFrom.set(`${neighbor.x},${neighbor.y}`, { x: current.x, y: current.y });
                }
                else if (tentativeG < existingOpen.g) {
                    existingOpen.g = tentativeG;
                    existingOpen.f = tentativeG + this.heuristic(neighbor.x, neighbor.y, endX, endY);
                    cameFrom.set(`${neighbor.x},${neighbor.y}`, { x: current.x, y: current.y });
                }
            }
        }
        return null;
    }
    heuristic(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }
    getNeighbors(x, y) {
        const neighbors = [];
        // First, add cardinal neighbors
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) // Cardinal directions: right, up, left, down
         {
            const newX = x + dx;
            const newY = y + dy;
            if (!(newX >= 0 && newX < GRID_WIDTH &&
                newY >= 0 && newY < GRID_HEIGHT)) {
                continue;
            }
            const tileCost = GAME_MAP.getCostToMoveThroughTile(newX, newY);
            if (tileCost !== Infinity) {
                neighbors.push({ x: newX, y: newY, cost: tileCost });
            }
        }
        // Then, check diagonal neighbors
        for (const [dx, dy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) // Diagonal directions: up-right, down-right, down-left, up-left
         {
            const newX = x + dx;
            const newY = y + dy;
            // Check if the new position is within bounds
            if (!(newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT)) {
                continue;
            }
            // Check if the diagonal tile is walkable
            const diagonalCost = GAME_MAP.getCostToMoveThroughTile(newX, newY);
            if (diagonalCost !== Infinity) {
                // Check if at least one cardinal neighbor is walkable
                const hasCardinalNeighbor = GAME_MAP.isWalkable(x + dx, y) || GAME_MAP.isWalkable(x, y + dy);
                if (hasCardinalNeighbor) {
                    // Use diagonal cost (√2 ≈ 1.414 times the normal cost)
                    const diagonalMovementCost = diagonalCost * Math.SQRT2;
                    neighbors.push({ x: newX, y: newY, cost: diagonalMovementCost });
                }
            }
        }
        return neighbors;
    }
}
_Pathfinding_passability_array = new WeakMap(), _Pathfinding_instances = new WeakSet(), _Pathfinding_getIndex = function _Pathfinding_getIndex(x, y) {
    return y * GRID_WIDTH + x;
};
class PathNode {
    constructor(x, y, g = 0, h = 0) {
        this.x = x;
        this.y = y;
        this.g = g;
        this.f = g + h;
    }
    getKey() {
        return `${this.x},${this.y}`;
    }
    static fromCoords(x, y) {
        return new PathNode(x, y);
    }
}
class Tile {
    constructor(color, cost = 1) {
        this.color = color;
        this.cost = cost;
    }
}
var ALL_TILES = { dirt: new Tile('#228b22', 1),
    water: new Tile('#4169E1', 1),
    deep_water: new Tile('#1d3270', Infinity),
    mud: new Tile('#654321', 1),
    stone: new Tile('#8d9091', 1)
};
class GameEntity {
    constructor() {
        this.display_name = "---";
        this.is_deconstructable = false;
        this.is_harvestable = false;
        this.is_choppable = false;
    }
    frame_update(x, y) {
    }
    draw(x, y) {
        ctx.fillStyle = "brown";
        ctx.fillRect(x * TILE_SIZE + 4 - CAMERA_X, y * TILE_SIZE + 4 - CAMERA_Y, TILE_SIZE - 8, TILE_SIZE - 8);
        // Set up text styling
        ctx.font = "10px Arial";
        const text = this.display_name;
        // Calculate positions
        const centerX = x * TILE_SIZE + TILE_SIZE / 2 - CAMERA_X;
        const centerY = y * TILE_SIZE + TILE_SIZE / 2 - CAMERA_Y;
        const textX = centerX;
        const textY = centerY - 8;
        // Save current context state
        ctx.save();
        // Configure shadow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        // Draw text with shadow
        ctx.fillStyle = "black";
        ctx.font = "18px Arial";
        ctx.fillText(text, textX, textY);
        // Restore original context state
        ctx.restore();
    }
    render_details_menu() {
        const $holder_div = $("<div>");
        return $holder_div;
    }
    update_details_menu() {
    }
}
class TreeEntity extends GameEntity {
    constructor() {
        super();
        this.is_choppable = true;
        this.display_name = "Tree";
    }
    draw(x, y) {
        ALL_LOADED_SPRITES["tree"].render_sprite(x, y);
    }
}
class CropEntity extends GameEntity {
    constructor(crop_type) {
        super();
        this.crop_type = crop_type;
        this.growth = 0;
        this.display_name = prettify(crop_type);
    }
    frame_update(x, y) {
        this.growth += FrameTime.deltaT;
        if (this.growth > this.get_plant_data()["growth_time"]) {
            this.is_harvestable = true;
        }
    }
    get_plant_data() {
        const plant_obj = CROP_TOKENS[this.crop_type];
        return plant_obj;
    }
    draw(x, y) {
        if (this.is_harvestable) {
            ALL_LOADED_SPRITES["potato_grown"].render_sprite(x, y);
        }
        else {
            ALL_LOADED_SPRITES["potato_seed"].render_sprite(x, y);
        }
    }
}
class ItemOnGround extends GameEntity {
    constructor(item_id, item_count) {
        super();
        this.item_id = item_id;
        this.item_count = item_count;
        this.display_name = prettify(item_id) + " ( " + item_count + " )";
    }
    draw(x, y) {
        let sprite_id = "bag";
        if (this.item_id == 'stone') {
            sprite_id = "rock";
        }
        if (this.item_id == 'log') {
            sprite_id = "log";
        }
        if (this.item_id == 'potato') {
            sprite_id = "potato";
        }
        if (this.item_id == 'fruit') {
            sprite_id = "fruit";
        }
        if (this.item_id == 'egg') {
            sprite_id = "egg";
        }
        if (this.item_id == 'grog') {
            sprite_id = "grog";
        }
        ALL_LOADED_SPRITES[sprite_id].render_sprite(x, y);
    }
}
class BedEntity extends GameEntity {
    constructor(x, y) {
        super();
        this.is_deconstructable = true;
        this.display_name = "Bed";
    }
}
class DoorEntity extends GameEntity {
    constructor() {
        super();
        this.is_deconstructable = true;
        this.display_name = "Door";
    }
}
const TIME_TO_GROW_BERRIES = 10 * 1000;
class BerryBushEntity extends GameEntity {
    constructor() {
        super();
        this.growth = TIME_TO_GROW_BERRIES * .65 * Math.random();
        this.is_choppable = true;
        this.is_harvestable = false;
        this.display_name = "Berry Bush";
    }
    frame_update(x, y) {
        this.growth += FrameTime.deltaT;
        if (this.growth >= TIME_TO_GROW_BERRIES) {
            this.is_harvestable = true;
        }
    }
    draw(x, y) {
        const sprite_id = this.growth >= TIME_TO_GROW_BERRIES ? "berry_bush_full" : "berry_bush_empty";
        ALL_LOADED_SPRITES[sprite_id].render_sprite(x, y);
    }
}
class WorkShopEntity extends GameEntity {
    constructor(workshop_token) {
        super();
        this.workshop_token = workshop_token;
        this.craft_orders = [];
        this.is_deconstructable = true;
        this.display_name = prettify(workshop_token);
    }
    append_craft_order(craft_order) {
        this.craft_orders.push(craft_order);
    }
    has_craft_orders() {
        return this.craft_orders.length;
    }
    render_details_menu() {
        const $holder_div = $("<div id='holder_div'>");
        const $orders_div = $("<div id = 'orders_div'>");
        const $recipes_div = $("<div id = 'recipes_div'>");
        const this_workshop_as_closure = this;
        $holder_div.on("click", ".recipe_order", function () {
            const recipe_token = $(this).attr("recipe_token");
            this_workshop_as_closure.craft_orders.push(new CraftOrder(recipe_token));
        });
        const recipes = WORKSHOP_TOKENS[this.workshop_token].recipes;
        for (const one_recipe of recipes) {
            const recipe_token = RECIPE_TOKENS[one_recipe];
            const recipe_name = recipe_token.name;
            const $button = $("<button>").text(recipe_token.name).attr("recipe_token", one_recipe).addClass("recipe_order");
            $recipes_div.append($button);
        }
        $holder_div.append($recipes_div, $orders_div);
        return $holder_div;
    }
    update_details_menu() {
        const $orders_div = $('#orders_div');
        $orders_div.empty();
        for (const one_order of this.craft_orders) {
            $orders_div.append($("<div>").text(prettify(one_order.recipe_key)));
        }
    }
    frame_update(x, y) {
        if (this.has_craft_orders()) {
            BLUEPRINT_MANAGER.addBluePrint(new Blueprint(x, y, "C_generic"));
        }
    }
    draw(x, y) {
        if (this.workshop_token == "STILL") {
            ALL_LOADED_SPRITES["still"].render_sprite(x, y);
        }
        else {
            super.draw(x, y);
        }
    }
}
class CraftOrder {
    constructor(recipe_key) {
        this.recipe_key = recipe_key;
    }
}
class Wall {
    constructor(color, cost) {
        this.color = color;
        this.cost = cost;
    }
}
var ALL_WALLS = { wood_wall: new Wall('#5C4033', { "log": 1 }),
    stone_block_wall: new Wall('#8c98a1', {}),
    cliff: new Wall('#5f6169', {}) };
const MAX_SIZE_OF_ROOM = 20 * 20;
class IndoorRegions {
    constructor() {
        this.gridSize = GRID_WIDTH * GRID_HEIGHT;
        // 0 means outdoors, 1 means indoors
        this.grid = new Uint8Array(this.gridSize);
    }
    // Convert x,y to 1D index
    toIndex(x, y) {
        return y * GRID_WIDTH + x;
    }
    // Convert 1D index to x,y coordinates
    toCoordinates(index) {
        return [index % GRID_WIDTH, Math.floor(index / GRID_WIDTH)];
    }
    update_state() {
        // Reset grid and create visited array
        this.grid.fill(0);
        const visited = new Uint8Array(this.gridSize);
        const areas = [];
        // Flood fill from each unvisited non-wall tile
        for (let i = 0; i < this.gridSize; i++) {
            const [x, y] = this.toCoordinates(i);
            if (!visited[i] && !this.is_wall(x, y)) {
                const area = this.floodFill(x, y, visited);
                if (area.length > 0) {
                    areas.push(area);
                }
            }
        }
        // Mark indoor areas
        for (const area of areas) {
            if (area.length < MAX_SIZE_OF_ROOM) {
                for (const index of area) {
                    this.grid[index] = 1;
                }
            }
        }
    }
    floodFill(startX, startY, visited) {
        const area = [];
        const queue = new Int32Array(this.gridSize); // Preallocate queue
        let queueStart = 0;
        let queueEnd = 1;
        const startIndex = this.toIndex(startX, startY);
        queue[0] = startIndex;
        visited[startIndex] = 1;
        let reachedBorder = false;
        const directions = [1, GRID_WIDTH, -1, -GRID_WIDTH]; // Precalculated direction offsets
        while (queueStart < queueEnd) {
            const currentIndex = queue[queueStart++];
            area.push(currentIndex);
            const [x, y] = this.toCoordinates(currentIndex);
            // Check neighbors
            for (const offset of directions) {
                const newIndex = currentIndex + offset;
                const newX = x + (offset === 1 ? 1 : offset === -1 ? -1 : 0);
                const newY = y + (offset === GRID_WIDTH ? 1 : offset === -GRID_WIDTH ? -1 : 0);
                // Check if reached border
                if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
                    reachedBorder = true;
                    continue;
                }
                // Add unvisited, non-wall neighbors to queue
                if (!visited[newIndex] && !this.is_wall(newX, newY)) {
                    queue[queueEnd++] = newIndex;
                    visited[newIndex] = 1;
                }
            }
        }
        return reachedBorder ? [] : area;
    }
    is_wall(x, y) {
        const wall_type = GAME_MAP.getWall(x, y);
        const entity = GAME_MAP.getEntity(x, y);
        return (wall_type != null || entity instanceof DoorEntity);
    }
    draw() {
        ctx.fillStyle = "rgba(0,0,0, .25)";
        for (let i = 0; i < this.gridSize; i++) {
            if (this.grid[i]) {
                const [x, y] = this.toCoordinates(i);
                ctx.fillRect(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}
const INDOOR_REGIONS = new IndoorRegions();
class OuthouseEntity extends GameEntity {
    constructor() {
        super();
        this.display_name = "Outhouse";
    }
}
class ItemCache {
    constructor() {
        _ItemCache_all_items.set(this, []);
    }
    buildCache() {
        __classPrivateFieldSet(this, _ItemCache_all_items, GAME_MAP.getEntityWhereFn((e) => e instanceof ItemOnGround), "f");
    }
    getAllByKey(key) {
        return __classPrivateFieldGet(this, _ItemCache_all_items, "f").filter((e) => e.entity.item_id == key);
    }
}
_ItemCache_all_items = new WeakMap();
const TOKEN_TO_DESIRED_INVENTORY = { "T_wooden_wall": { "log": 1 },
    "BE_bed": { "log": 1 },
    "BE_blockcutter": { "log": 3 },
    "BE_door": { "log": 1 },
    "BE_still": { "log": 3 },
    "BE_outhouse": { "log": 1 },
};
const TOKEN_TO_TILE = { "T_wooden_wall": "wood_wall" };
const TASKS_AFTER_ITEM_DELIVERY = { "T_wooden_wall": "BUILD",
    "BE_bed": "BUILD_ENTITY",
    "BE_blockcutter": "BUILD_ENTITY",
    "BE_door": "BUILD_ENTITY",
    "BE_still": "BUILD_ENTITY",
    "BE_outhouse": "BUILD_ENTITY",
    "W_chop": "CHOP_WOOD",
    "W_mine": "CHOP_WOOD",
    "W_harvest": "CHOP_WOOD",
    "W_deconstruct": "CHOP_WOOD",
    "W_plant": "CHOP_WOOD",
    "C_generic": "CRAFT",
};
const PATH_TO_ADJACENT_SET = new Set(["W_chop", "W_mine", "W_deconstruct", "T_wooden_wall"]);
class Blueprint {
    constructor(x, y, bp_str_token, bp_str_sub_token = null, moving_entity = null) {
        this.x = x;
        this.y = y;
        this.bp_str_token = bp_str_token;
        this.bp_str_sub_token = bp_str_sub_token;
        this.inventory = new ItemSet();
    }
    getKey() {
        return this.x + " " + this.y;
    }
    get_bp_desired_inventory() {
        if (this.bp_str_token == 'C_generic') {
            const entity_to_check = GAME_MAP.getEntity(this.x, this.y);
            if (entity_to_check instanceof WorkShopEntity && entity_to_check.has_craft_orders()) {
                const recipe_key = entity_to_check.craft_orders[0].recipe_key;
                return RECIPE_TOKENS[recipe_key].items_needed;
            }
            return {};
        }
        if (this.bp_str_sub_token) {
            return RECIPE_TOKENS[this.bp_str_sub_token]["items_needed"];
        }
        else if (this.bp_str_token in TOKEN_TO_DESIRED_INVENTORY) {
            return TOKEN_TO_DESIRED_INVENTORY[this.bp_str_token];
        }
        else {
            return null;
        }
    }
    /* Validation Logic, if is_invalidated returns true, then the Blueprint manager scraps it */
    is_invalidated() {
        const handlerMethod = Blueprint.INVALIDATION_HANDLERS[this.bp_str_token];
        if (handlerMethod) {
            return this[handlerMethod]();
        }
        // Handle BE_ prefix cases
        if (this.bp_str_token.startsWith('BE_')) {
            return this.validateBuildingEntity();
        }
        console.log("No Validation Method for: " + this.bp_str_token);
        return true; // If no validation method, discard.
    }
    validateChop() {
        const entity = GAME_MAP.getEntity(this.x, this.y);
        return !entity || !entity.is_choppable;
    }
    validateMine() {
        return GAME_MAP.getWall(this.x, this.y) !== "cliff";
    }
    validateHarvest() {
        const potential_plant = GAME_MAP.getEntity(this.x, this.y);
        return !potential_plant || !potential_plant.is_harvestable;
    }
    validateDeconstruct() {
        const wall_key = GAME_MAP.getWall(this.x, this.y);
        const entity = GAME_MAP.getEntity(this.x, this.y);
        const is_wall_to_deconstruct = (wall_key && wall_key !== 'cliff');
        const is_entity_to_deconstruct = (entity && entity.is_deconstructable);
        return !is_wall_to_deconstruct && !is_entity_to_deconstruct;
    }
    validateHaul() {
        const entity = GAME_MAP.getEntity(this.x, this.y);
        return !(entity instanceof ItemOnGround);
    }
    validateWoodenWall() {
        const wall_key = GAME_MAP.getWall(this.x, this.y);
        return wall_key !== null;
    }
    validateStockpile() {
        const entity = GAME_MAP.getEntity(this.x, this.y);
        if (entity) {
            return true;
        }
        return !ZONE_MANAGER.grid_location_is_stockpile(this.x, this.y);
    }
    validateBuildingEntity() {
        const entity = GAME_MAP.getEntity(this.x, this.y);
        return entity !== null;
    }
    validateCraft() {
        const entity_to_check = GAME_MAP.getEntity(this.x, this.y);
        return !(entity_to_check instanceof WorkShopEntity) || !entity_to_check.has_craft_orders();
    }
    validateNull() {
        return false;
    }
    have_dwarf_finish_blueprint() {
        const handlerMethod = Blueprint.COMPLETION_HANDLERS[this.bp_str_token];
        if (handlerMethod) {
            this[handlerMethod]();
        }
        else if (this.bp_str_token.startsWith('T')) {
            this.handleTileCompletion();
        }
        else {
            console.log("No Completion Handler for: " + this.bp_str_token);
        }
        BLUEPRINT_MANAGER.remove_blueprint_by_key(this.getKey());
    }
    handleChopCompletion() {
        const potential_tree = GAME_MAP.getEntity(this.x, this.y);
        if (potential_tree.is_choppable) {
            GAME_MAP.setEntity(this.x, this.y, null);
            const number_of_logs = Math.floor(Math.random() * 6) + 1;
            for (let i = 0; i < number_of_logs; i++) {
                GAME_MAP.dump_one_inventory_item(this.x, this.y, "log", 1);
            }
        }
    }
    handleMineCompletion() {
        if (GAME_MAP.getWall(this.x, this.y) == 'cliff') {
            GAME_MAP.setWall(this.x, this.y, null);
            if (Math.random() > .66) {
                GAME_MAP.dump_one_inventory_item(this.x, this.y, "stone", 1);
            }
        }
    }
    handleHarvestCompletion() {
        const potential_plant = GAME_MAP.getEntity(this.x, this.y);
        if (potential_plant instanceof CropEntity) {
            const plant_data = potential_plant.get_plant_data();
            GAME_MAP.setEntity(this.x, this.y, null);
            for (const item_key in plant_data["crop_yield"]) {
                const item_count = plant_data["crop_yield"][item_key];
                GAME_MAP.dump_one_inventory_item(this.x, this.y, item_key, item_count);
            }
        }
        else if (potential_plant instanceof BerryBushEntity) {
            potential_plant.growth = 0;
            potential_plant.is_harvestable = false;
            GAME_MAP.dump_one_inventory_item(this.x, this.y, "fruit", 6);
        }
    }
    handleDeconstructCompletion() {
        if (GAME_MAP.getWall(this.x, this.y) !== null) {
            const cost = ALL_WALLS[GAME_MAP.getWall(this.x, this.y)].cost;
            for (const item_id in cost) {
                const item_count = cost[item_id];
                GAME_MAP.dump_one_inventory_item(this.x, this.y, item_id, item_count);
            }
            GAME_MAP.setWall(this.x, this.y, null);
        }
        const entity = GAME_MAP.getEntity(this.x, this.y);
        if (entity && entity.is_deconstructable) {
            GAME_MAP.setEntity(this.x, this.y, null);
        }
    }
    handlePlantCompletion() {
        if (GAME_MAP.getEntity(this.x, this.y) == null) {
            GAME_MAP.setEntity(this.x, this.y, new CropEntity("POTATO"));
        }
    }
    handleGenericCraftCompletion() {
        const entity_to_check = GAME_MAP.getEntity(this.x, this.y);
        if (entity_to_check instanceof WorkShopEntity && entity_to_check.has_craft_orders()) {
            const craft_order = entity_to_check.craft_orders[0];
            const recipe_token_obj = RECIPE_TOKENS[craft_order.recipe_key];
            const recipe_items_created = recipe_token_obj["items_created"];
            for (const object_key in recipe_items_created) {
                GAME_MAP.dump_one_inventory_item(this.x, this.y, object_key, recipe_items_created[object_key]);
            }
            entity_to_check.craft_orders.shift();
        }
    }
    handleBlockcutterCompletion() {
        GAME_MAP.setEntity(this.x, this.y, new WorkShopEntity("BLOCK_CUTTER"));
    }
    handleBedCompletion() {
        GAME_MAP.setEntity(this.x, this.y, new BedEntity(this.x, this.y));
    }
    handleDoorCompletion() {
        GAME_MAP.setEntity(this.x, this.y, new DoorEntity());
    }
    handleStillCompletion() {
        GAME_MAP.setEntity(this.x, this.y, new WorkShopEntity("STILL"));
    }
    handleOuthouseCompletion() {
        GAME_MAP.setEntity(this.x, this.y, new OuthouseEntity());
    }
    handleTileCompletion() {
        GAME_MAP.setWall(this.x, this.y, TOKEN_TO_TILE[this.bp_str_token]);
    }
    // BuildItineraryForDwarf
    BuildItineraryForDwarf(dwarf) {
        const simple_blueprints = ["W_chop", "W_mine", "W_harvest", "W_deconstruct", "W_plant"];
        const delivery_blueprints = ["T_wooden_wall", "C_generic", "BE_bed", "BE_blockcutter", "BE_door", "BE_still", "BE_outhouse"];
        if (simple_blueprints.includes(this.bp_str_token)) {
            return this.BuildItineraryForDwarfSimpleBlueprint(dwarf);
        }
        else if (delivery_blueprints.includes(this.bp_str_token)) {
            return this.BuildItineraryForDwarfDeliveryBlueprint(dwarf);
        }
        else if (this.bp_str_token == "W_stockpile") {
            return this.BuildItineraryForStockpile(dwarf);
        }
        else if (this.bp_str_token == "W_haul") {
            return this.BuildItineraryForHaul(dwarf);
        }
        else {
            console.log("INVALID KEY: " + this.bp_str_token);
            return null;
        }
    }
    BuildItineraryForDwarfSimpleBlueprint(dwarf) {
        const path_to_blueprint = PATHFINDING.findPathExtended(dwarf.x, dwarf.y, this.x, this.y, this.can_path_to_adjactent());
        if (!path_to_blueprint) {
            return null;
        }
        const task_arr = path_array_to_tasks(path_to_blueprint);
        task_arr.push(new DwarvenTask(TASKS_AFTER_ITEM_DELIVERY[this.bp_str_token], this.x, this.y));
        return task_arr;
    }
    BuildItineraryForDwarfDeliveryBlueprint(dwarf) {
        const item_to_deliver = this.getFirstItemRequired();
        if (!item_to_deliver) {
            return this.BuildItineraryForDwarfSimpleBlueprint(dwarf);
        }
        const item_to_bp_obj = this.getPathToClosestIntanceOfItem(item_to_deliver);
        if (!item_to_bp_obj) {
            return null;
        }
        const path_to_item = PATHFINDING.findPathExtended(dwarf.x, dwarf.y, item_to_bp_obj.x, item_to_bp_obj.y);
        if (!path_to_item) {
            return null;
        }
        let task_arr_to_rtn = path_array_to_tasks(path_to_item);
        task_arr_to_rtn.push(new DwarvenTask("PICKUP", item_to_bp_obj.x, item_to_bp_obj.y));
        task_arr_to_rtn = task_arr_to_rtn.concat(path_array_to_tasks(item_to_bp_obj.path_to_bp));
        task_arr_to_rtn.push(new DwarvenTask("STOCK_BLUEPRINT", this.x, this.y));
        return task_arr_to_rtn;
    }
    BuildItineraryForStockpile(dwarf) {
        const items_not_in_stockpile = GAME_MAP.getItemsNotInStockpiles(); // Each Element of this is an instance of ItemOnGround
        const reserved_items = getHashSetOfReservedTiles();
        const items_not_in_stockpile_and_not_reserved = []; // Each Element of this is an instance of ItemOnGround
        for (const one_item of items_not_in_stockpile) {
            if (!reserved_items.has(one_item.x + " " + one_item.y)) {
                items_not_in_stockpile_and_not_reserved.push(one_item);
            }
        }
        const relevant_items_sorted = items_not_in_stockpile_and_not_reserved.sort((a, b) => {
            const distance_a = manh_dist(this.x, this.y, a.x, a.y);
            const distance_b = manh_dist(this.x, this.y, a.x, a.y);
            return distance_a - distance_b;
        });
        let path_object = null;
        for (const one_item of relevant_items_sorted) {
            const path_from_dwarf_to_item = PATHFINDING.findPath(dwarf.x, dwarf.y, one_item.x, one_item.y);
            const path_from_item_to_stockpile = PATHFINDING.findPath(one_item.x, one_item.y, this.x, this.y);
            if (path_from_dwarf_to_item && path_from_item_to_stockpile) {
                let tasks = path_array_to_tasks(path_from_dwarf_to_item);
                tasks.push(new DwarvenTask("PICKUP", one_item.x, one_item.y));
                tasks = [...tasks, ...(path_array_to_tasks(path_from_item_to_stockpile))];
                tasks.push(new DwarvenTask("DUMP", this.x, this.y));
                return tasks;
            }
        }
        return null;
    }
    BuildItineraryForHaul(dwarf) {
        const c_e_s = ZONE_MANAGER.getClosestEmptyStockpileLocations(this.x, this.y); // Closest Empty Stockpile
        if (!c_e_s) {
            return null;
        }
        const path_from_dwarf_to_item = PATHFINDING.findPath(dwarf.x, dwarf.y, this.x, this.y);
        const path_from_item_to_stockpile = PATHFINDING.findPath(this.x, this.y, c_e_s.x, c_e_s.y);
        if (!path_from_dwarf_to_item || !path_from_item_to_stockpile) {
            return null;
        }
        let tasks = path_array_to_tasks(path_from_dwarf_to_item);
        tasks.push(new DwarvenTask("PICKUP_AND_FORGET_BLUEPRINT", this.x, this.y));
        tasks = tasks.concat(path_array_to_tasks(path_from_item_to_stockpile));
        tasks.push(new DwarvenTask("DUMP", c_e_s.x, c_e_s.y));
        return tasks;
    }
    getFirstItemRequired() {
        const shopping_list = this.inventory.getShoppingList(this.get_bp_desired_inventory());
        if (!Object.keys(shopping_list).length) {
            return null;
        }
        return Object.keys(shopping_list)[0];
    }
    getPathToClosestIntanceOfItem(item_key) {
        const reserved_items = getHashSetOfReservedTiles();
        const is_of_needed_item = ITEM_CACHE.getAllByKey(item_key);
        if (is_of_needed_item.length == 0) {
            return null;
        }
        const available_items = is_of_needed_item.filter(one_item => !reserved_items.has(`${one_item.x} ${one_item.y}`));
        const available_items_sorted = available_items.sort((a, b) => {
            const distance_a = manh_dist(this.x, this.y, a.x, a.y);
            const distance_b = manh_dist(this.x, this.y, b.x, b.y);
            return distance_a - distance_b;
        });
        for (const one_item of available_items) {
            const new_path = PATHFINDING.findPathExtended(one_item.x, one_item.y, this.x, this.y, this.can_path_to_adjactent());
            if (new_path) {
                return { x: one_item.x, y: one_item.y, path_to_bp: new_path };
            }
        }
        return null;
    }
    can_path_to_adjactent() {
        return PATH_TO_ADJACENT_SET.has(this.bp_str_token);
    }
    // Drawing Function
    draw() {
        ctx.fillStyle = "rgba(165,165,165, .5)";
        ctx.fillRect(this.x * TILE_SIZE + 3 - CAMERA_X, this.y * TILE_SIZE + 3 - CAMERA_Y, TILE_SIZE - 6, TILE_SIZE - 6);
    }
}
Blueprint.INVALIDATION_HANDLERS = { 'W_chop': 'validateChop',
    'W_mine': 'validateMine',
    'W_harvest': 'validateHarvest',
    'W_deconstruct': 'validateDeconstruct',
    'W_haul': 'validateHaul',
    'T_wooden_wall': 'validateWoodenWall',
    'W_stockpile': 'validateStockpile',
    'W_plant': 'validateNull',
    'C_generic': 'validateCraft',
};
/* Logic for completion of a Blueprint -- called by the Dwarf for complicated tasks */
Blueprint.COMPLETION_HANDLERS = { 'W_chop': 'handleChopCompletion',
    'W_mine': 'handleMineCompletion',
    'W_harvest': 'handleHarvestCompletion',
    'W_deconstruct': 'handleDeconstructCompletion',
    'W_plant': 'handlePlantCompletion',
    'C_generic': 'handleGenericCraftCompletion',
    'BE_blockcutter': 'handleBlockcutterCompletion',
    'BE_bed': 'handleBedCompletion',
    'BE_door': 'handleDoorCompletion',
    'BE_still': 'handleStillCompletion',
    'BE_outhouse': 'handleOuthouseCompletion',
};
class BlueprintManager {
    constructor() {
        this.blueprint_hashmap = {};
    }
    addBluePrint(blueprint) {
        const blueprint_key = blueprint.getKey();
        const key_in_use = blueprint.getKey() in this.blueprint_hashmap;
        const blueprint_is_invalid = blueprint.is_invalidated();
        if (key_in_use || blueprint_is_invalid) {
            return false;
        }
        else {
            this.blueprint_hashmap[blueprint_key] = blueprint;
            return true;
        }
    }
    get_blueprints_unnassigned_to_character() {
        const blueprints_unassigned = [];
        const hashset_of_set_blueprints = {};
        for (const dwarf of CHARACTERS) {
            if (dwarf.itinerary.blueprint) {
                const key = dwarf.itinerary.blueprint.getKey();
                hashset_of_set_blueprints[key] = 1;
            }
        }
        for (const blueprint_key in this.blueprint_hashmap) {
            const blueprint = this.blueprint_hashmap[blueprint_key];
            if (!(blueprint.getKey() in hashset_of_set_blueprints)) {
                blueprints_unassigned.push(blueprint);
            }
        }
        const MAX_BLUEPRINTS_TO_CHECK = 25;
        if (blueprints_unassigned.length > MAX_BLUEPRINTS_TO_CHECK) {
            return chooseNRandomElements(blueprints_unassigned, MAX_BLUEPRINTS_TO_CHECK);
        }
        else {
            return blueprints_unassigned;
        }
    }
    removeInvalidBlueprints() {
        for (const blueprint_key in this.blueprint_hashmap) {
            const blueprint = this.blueprint_hashmap[blueprint_key];
            if (blueprint.is_invalidated()) {
                this.remove_blueprint_by_key(blueprint_key);
            }
        }
    }
    remove_blueprint_by_key(blueprint_key) {
        if (!(blueprint_key in this.blueprint_hashmap)) {
            return; // No Blueprint to Delete
        }
        const bp_object = this.blueprint_hashmap[blueprint_key];
        for (const one_character of CHARACTERS) {
            if (one_character.itinerary.blueprint == bp_object) {
                one_character.itinerary.force_idle();
            }
        }
        delete this.blueprint_hashmap[blueprint_key];
    }
    assign_job_to_a_dwarf(dwarf) {
        // Get all unassigned blueprints, then sort them heuristically.
        const unassigned_blueprints = this.get_blueprints_unnassigned_to_character();
        const sorted_blueprints = unassigned_blueprints.sort((a, b) => {
            const distance_a = manh_dist(dwarf.x, dwarf.y, a.x, a.y);
            const distance_b = manh_dist(dwarf.x, dwarf.y, b.x, b.y);
            return distance_a - distance_b;
        });
        // Now iterate through the sorted blueprints
        for (const blueprint of sorted_blueprints) {
            const potential_task_array = blueprint.BuildItineraryForDwarf(dwarf);
            if (potential_task_array) {
                dwarf.itinerary.set_itinerary(potential_task_array, blueprint);
                return;
            }
        }
    }
    /* Draw Functions */
    drawBluePrints() {
        for (const blueprint_key in this.blueprint_hashmap) {
            const blueprint = this.blueprint_hashmap[blueprint_key];
            blueprint.draw();
        }
    }
}
class ItemSet {
    constructor() {
        this.items_held = {};
    }
    addItem(item_id, item_count) {
        if (item_id in this.items_held) {
            this.items_held[item_id] += item_count;
        }
        else {
            this.items_held[item_id] = item_count;
        }
    }
    removeItem(item_id, item_count) {
        if (!(item_id in this.items_held)) {
            return false;
        }
        if (this.items_held[item_id] < item_count) {
            return false;
        }
        this.items_held[item_id] -= item_count;
        return true;
    }
    getShoppingList(desired_items) {
        const shopping_list = {};
        for (const item_id in desired_items) {
            const desired_count = desired_items[item_id];
            const held_count = (item_id in this.items_held) ? this.items_held[item_id] : 0;
            if (held_count < desired_count) {
                shopping_list[item_id] = desired_count - held_count;
            }
        }
        return shopping_list;
    }
    isEmpty() {
        for (const item_id in this.items_held) {
            if (this.items_held[item_id] > 0) {
                return false;
            }
        }
        return true;
    }
    give_list_of_items_held() {
        return structuredClone(this.items_held); // Returns a DEEP COPY, not the actual data.
    }
    makeEmpty() {
        this.items_held = {};
    }
}
var selectedTool = null;
var selectedToolCategory = null;
var selectedToolCache = {};
var is_mouse_over = false;
$("#tool_menu").on("mouseenter", (e) => {
    is_mouse_over = true;
    show_or_hide_tool_menu();
});
$("#tool_menu").on("mouseleave", (e) => {
    is_mouse_over = false;
    show_or_hide_tool_menu();
});
function show_or_hide_tool_menu() {
    if (is_mouse_over || selectedTool) {
        $("#tool_menu").removeClass("collapsed");
    }
    else {
        $("#tool_menu").addClass("collapsed");
    }
}
document.addEventListener("keydown", function (event) {
    // Check if the key pressed is "q" or "Q"
    if (event.key === "q" || event.key === "Q") {
        selectedTool = null;
        $(".button-item").removeClass("active");
        show_or_hide_tool_menu();
    }
});
$(".tool_tab").click(function (event) {
    const clicked_button = $(this).attr("data-category");
    if (selectedToolCategory == clicked_button) {
        return; // Hit the already selected category.
    }
    selectedToolCategory = clicked_button;
    selectedTool = null;
    $(".tool_tab ").removeClass("active");
    $(".button-item").removeClass("active");
    $(this).addClass("active");
    $(".button-list").hide();
    const $tool_button_holder = $(document.getElementById(selectedToolCategory));
    $tool_button_holder.show();
    if (selectedToolCategory in selectedToolCache) {
        $(".button-item[data-name='" + selectedToolCache[selectedToolCategory] + "']").click();
    }
});
$(".button-item").click(function (event) {
    $(".button-item").removeClass("active");
    const tool_name = $(this).attr("data-name");
    if (selectedTool === tool_name) {
        selectedTool = null;
    }
    else {
        selectedTool = tool_name;
        $(this).addClass("active");
    }
    selectedToolCache[selectedToolCategory] = selectedTool;
});
let ALL_SELECTED = [];
let SELECTED_TAB = 0;
function render_menu_for_tiles_at(tile_x, tile_y) {
    gather_all_selectables_on_tile(tile_x, tile_y);
    const html_predef = `<div class = "menu-header" id = "rhs-tab-container">     </div>
                         <div class = "menu-body"   id = "rhs-content-container"> </div>`;
    const $menu = $("#menu_offset").html(html_predef);
    const $tab_header = $("#rhs-tab-container");
    let i = 0;
    for (const selection of ALL_SELECTED) {
        let tab_indicator = "";
        if (selection instanceof Dwarf) {
            tab_indicator = selection.display_name;
        }
        else if (selection instanceof Animal) {
            tab_indicator = selection.display_name;
        }
        else if (selection instanceof GameEntity) {
            tab_indicator = selection.display_name;
        }
        else if (selection instanceof Zone) {
            tab_indicator = prettify(selection.zone_type);
        }
        else {
            continue;
        }
        $tab_header.append($("<div>").addClass("tab").attr("ref", i).text(tab_indicator).click(hook_subtab_click));
        i++;
    }
    $tab_header.append($("<div>").addClass("close-btn").text("x").click(function () { $("#menu_offset").hide(); }));
    if (ALL_SELECTED.length) {
        $tab_header.children().first().click();
        $menu.show();
        SELECTED_TAB = 0;
    }
    else {
        $menu.hide();
    }
}
function gather_all_selectables_on_tile(tile_x, tile_y) {
    ALL_SELECTED = [];
    for (const c of CHARACTERS) {
        if (c.x == tile_x && c.y == tile_y) {
            ALL_SELECTED.push(c);
        }
    }
    for (const c of ANIMAL_MANAGER.animals) {
        if (c.x == tile_x && c.y == tile_y) {
            ALL_SELECTED.push(c);
        }
    }
    if (GAME_MAP.getEntity(tile_x, tile_y)) {
        ALL_SELECTED.push(GAME_MAP.getEntity(tile_x, tile_y));
    }
    if (ZONE_MANAGER.getZoneAtTile(tile_x, tile_y)) {
        ALL_SELECTED.push(ZONE_MANAGER.getZoneAtTile(tile_x, tile_y));
    }
}
function hook_subtab_click() {
    $(".menu-header").children().removeClass("active");
    $(this).addClass("active");
    SELECTED_TAB = parseInt($(this).attr("ref"));
    init_RHS_menu();
}
function init_RHS_menu() {
    const entity_to_show_details = ALL_SELECTED[SELECTED_TAB];
    if (entity_to_show_details) {
        const $div_of_rendered_items = entity_to_show_details.render_details_menu();
        $("#rhs-content-container").empty().append($div_of_rendered_items);
    }
}
function update_RHS_menu() {
    const entity_to_show_details = ALL_SELECTED[SELECTED_TAB];
    if (entity_to_show_details) {
        entity_to_show_details.update_details_menu();
    }
}
let TIME_FACTOR = 1;
let PAUSED = false;
$(".time_button").click(function () {
    TIME_FACTOR = parseInt($(this).attr("time_factor"));
    $(".time_button").removeClass("active");
    $(this).addClass("active");
});
$(".pause_button").click(function () {
    PAUSED = !PAUSED;
    set_pause_button_state();
});
function set_pause_button_state() {
    if (PAUSED) {
        $(".pause_button").addClass("active");
    }
    else {
        $(".pause_button").removeClass("active");
    }
}
document.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
        PAUSED = !PAUSED;
        set_pause_button_state();
    }
});
class MovingEntity {
    constructor(x, y, sprite) {
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.alive = true;
        this.itinerary = new DwarfItinerary();
        this.display_name = "---";
    }
    render() {
        if (this.sprite || !(this.sprite in ALL_LOADED_SPRITES)) {
            ALL_LOADED_SPRITES[this.sprite].render_sprite(this.x, this.y);
        }
        else {
            ctx.fillStyle = ctx.fillStyle = "rgba(230, 30, 30, 1)";
            ctx.fillRect(this.x * TILE_SIZE + 3 - CAMERA_X, this.y * TILE_SIZE + 3 - CAMERA_Y, TILE_SIZE - 6, TILE_SIZE - 6);
        }
    }
    render_details_menu() {
        const $holder_div = $("<div>");
        return $holder_div;
    }
    update_details_menu() {
    }
    attempt_set_position(x, y) {
        if (GAME_MAP.isWalkable(x, y)) {
            this.x = x;
            this.y = y;
            return true;
        }
        else {
            return false;
        }
    }
    undertake_task_if_exists() {
        const dwarven_task = this.itinerary.get_next_task();
        if (!dwarven_task) {
            return;
        }
        if (dwarven_task.moving_entity == null && (Math.abs(this.x - dwarven_task.x) > 1 || Math.abs(this.y - dwarven_task.y) > 1) && !['WANDER', 'IDLE'].includes(dwarven_task.task_key)) {
            console.log(this.x + "," + this.y + "   " + dwarven_task.x + "," + dwarven_task.y);
            console.log(dwarven_task);
            console.log("Attempted to Jump multiple tiles in one task, there must be an error somewhere.");
            this.itinerary.force_idle();
        }
        const handlerMethod = Dwarf.TASK_HANDLERS[dwarven_task.task_key];
        if (handlerMethod && (typeof this[handlerMethod] === 'function')) {
            this[handlerMethod](dwarven_task);
        }
        else {
            console.log(`${dwarven_task.task_key} is not a valid task, or does not have a function assigned.`);
            this.itinerary.force_idle();
        }
    }
    make_unstuck() {
        if (GAME_MAP.getCostToMoveThroughTile(this.x, this.y) !== Infinity) {
            return;
        }
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const tile of CARDINAL_DIRECTIONS) {
            const newX = this.x + tile.x;
            const newY = this.y + tile.y;
            if (!isValidGridCoordinate(newX, newY)) {
                continue;
            }
            if (GAME_MAP.getCostToMoveThroughTile(newX, newY) !== Infinity) {
                [this.x, this.y] = [newX, newY];
                this.itinerary.force_idle();
                return;
            }
        }
    }
    /* Task Handler for All Tasks Shared Between Dwarves and Animals */
    handleGoTo(task) {
        this.banked_time += FrameTime.deltaT;
        const time_to_move_to_tile = 1000 / TILES_PER_SECOND;
        if (this.banked_time >= time_to_move_to_tile) {
            if (this.attempt_set_position(task.x, task.y)) {
                this.itinerary.shift();
                this.banked_time -= time_to_move_to_tile;
            }
            else {
                this.itinerary.force_idle();
            }
        }
    }
    handleIdle(task) {
        const IDLE_TIME = 2000;
        this.banked_time += FrameTime.deltaT;
        if (this.banked_time >= IDLE_TIME) {
            this.itinerary.shift();
            this.banked_time -= IDLE_TIME;
        }
    }
    handleWander(task) {
        const ANIMAL_TILES_PER_SECOND = 5;
        const TIME_FOR_ANIMAL_TO_MOVE = 1000 / ANIMAL_TILES_PER_SECOND;
        this.banked_time += FrameTime.deltaT;
        if (this.banked_time < TIME_FOR_ANIMAL_TO_MOVE) {
            return;
        }
        const direction = getRandomElement(DIRECTIONS);
        let newX = this.x + direction.x;
        let newY = this.y + direction.y;
        if (newX < 0 || newX >= GRID_WIDTH) {
            newX = this.x;
        }
        if (newY < 0 || newY >= GRID_HEIGHT) {
            newY = this.y;
        }
        const current_zone = ZONE_MANAGER.getZoneAtTile(this.x, this.y);
        const new_zone = ZONE_MANAGER.getZoneAtTile(newX, newY);
        if (current_zone != new_zone) {
            return;
        }
        this.attempt_set_position(newX, newY);
        this.banked_time -= TIME_FOR_ANIMAL_TO_MOVE;
        this.itinerary.shift();
    }
}
MovingEntity.TASK_HANDLERS = { 'GO_TO': 'handleGoTo',
    'WANDER': 'handleWander',
    'IDLE': 'handleIdle',
    'DRINK': 'handleDrink',
    'EAT': 'handleEat',
    'SLEEP': 'handleSleep',
    'DRINK_ALCOHOL': 'handleDrinkAlcohol',
    'RELIEVE_BOWELS': 'handleRelieveBowels',
    'GRAZE': "handleGraze",
    'CHOP_WOOD': 'handleChopWood',
    'PICKUP': 'handlePickup',
    'DUMP': 'handleDump',
    // This is a slight hack, because once an object with a haul order is picked up, the Haul Order cancels.
    'PICKUP_AND_FORGET_BLUEPRINT': 'handlePickupAndForgetBlueprint',
    'STOCK_BLUEPRINT': 'handleStockBlueprint',
    'BUILD': 'handleBuildOrCraft',
    'CRAFT': 'handleBuildOrCraft',
    'BUILD_ENTITY': 'handleBuildOrCraft',
    'GO_TO_MOVING_ENTITY': 'handleGoToMovingEntity',
    'SLAUGHTER_ANIMAL': 'handleSlaughter',
    "CARRY_ANIMAL_TO_POINT": 'handleRopeAnimal',
};
let NEED_SPEEDUP_FACTOR = 1; // For Debugging.
var Need_Keys;
(function (Need_Keys) {
    Need_Keys["Hunger"] = "HUNGER";
    Need_Keys["Thirst"] = "THIRST";
    Need_Keys["Tiredness"] = "TIREDNESS";
    Need_Keys["Bowels"] = "BOWELS";
    Need_Keys["Alcohol"] = "ALCOHOL";
    Need_Keys["Fun"] = "FUN";
    Need_Keys["Fodder"] = "Fodder";
})(Need_Keys || (Need_Keys = {}));
const NEED_HANDLERS = new Map([[Need_Keys.Hunger, 'set_itinerary_to_manage_hunger'],
    [Need_Keys.Thirst, 'set_itinerary_to_manage_thirst'],
    [Need_Keys.Tiredness, 'set_itinerary_to_manage_tiredness'],
    [Need_Keys.Bowels, 'set_itinerary_to_manage_bowels'],
    [Need_Keys.Alcohol, 'set_itinerary_to_manage_alcohol'],
    [Need_Keys.Fun, 'set_itinerary_to_manage_fodder']
]);
class Need {
    constructor(key, max, seek_when_idle_threshold, seek_force_threshold = -1) {
        this.key = key;
        this.max = max;
        this.curr_count = max;
        this.seek_when_idle_threshold = seek_when_idle_threshold;
        this.seek_force_threshold = seek_force_threshold;
    }
    on_tick(character) {
        const itinerary = character.itinerary;
        const x = character.x;
        const y = character.y;
        this.curr_count -= FrameTime.deltaT * NEED_SPEEDUP_FACTOR;
        this.curr_count = Math.max(0, this.curr_count);
        const is_emergency = this.curr_count < this.seek_force_threshold && itinerary.is_interruptible();
        const is_idle_and_needs = this.curr_count < this.seek_when_idle_threshold && itinerary.is_idle();
        if (is_emergency || is_idle_and_needs) {
            this.try_to_fulfill(character, x, y);
        }
    }
    try_to_fulfill(character, x, y) {
        const itinerary = character.itinerary;
        const handlerName = NEED_HANDLERS.get(this.key);
        if (handlerName && this[handlerName]) {
            if (this[handlerName](character)) {
                return;
            }
        }
    }
    reset_to_max() {
        this.curr_count = this.max;
    }
    set_itinerary_to_manage_thirst(character) {
        const x = character.x;
        const y = character.y;
        const itinerary = character.itinerary;
        const potential_path = GAME_MAP.get_closest_tile_of_type(x, y, "water");
        if (!potential_path) {
            return false;
        }
        const itinerary_step_list = path_array_to_tasks(potential_path);
        const f_tile = potential_path.length ? potential_path[potential_path.length - 1] : { x, y }; // Final Tile- the one that actually has the water.
        itinerary_step_list.push(new DwarvenTask("DRINK", f_tile.x, f_tile.y));
        itinerary.set_itinerary(itinerary_step_list, null);
        return true;
    }
    set_itinerary_to_manage_bowels(character) {
        const x = character.x;
        const y = character.y;
        const itinerary = character.itinerary;
        const potential_path = GAME_MAP.getClosestOuthouse(x, y);
        if (!potential_path) {
            return false;
        }
        const itinerary_step_list = path_array_to_tasks(potential_path);
        const f_tile = potential_path.length ? potential_path[potential_path.length - 1] : { x, y }; // Final Tile- the one that actually has the water.
        itinerary_step_list.push(new DwarvenTask("RELIEVE_BOWELS", f_tile.x, f_tile.y));
        itinerary.set_itinerary(itinerary_step_list, null);
        return true;
    }
    set_itinerary_to_manage_hunger(character) {
        const x = character.x;
        const y = character.y;
        const itinerary = character.itinerary;
        const potential_path = GAME_MAP.getClosestFoodItem(x, y);
        if (!potential_path) {
            return false;
        }
        const itinerary_step_list = path_array_to_tasks(potential_path);
        const f_tile = potential_path.length ? potential_path[potential_path.length - 1] : { x, y };
        itinerary_step_list.push(new DwarvenTask("PICKUP", f_tile.x, f_tile.y));
        itinerary_step_list.push(new DwarvenTask("EAT", f_tile.x, f_tile.y));
        itinerary.set_itinerary(itinerary_step_list, null);
        return true;
    }
    set_itinerary_to_manage_alcohol(character) {
        const x = character.x;
        const y = character.y;
        const itinerary = character.itinerary;
        const potential_path = GAME_MAP.getClosestGrogItem(x, y);
        if (!potential_path) {
            return false;
        }
        const itinerary_step_list = path_array_to_tasks(potential_path);
        const f_tile = potential_path.length ? potential_path[potential_path.length - 1] : { x, y };
        itinerary_step_list.push(new DwarvenTask("PICKUP", f_tile.x, f_tile.y));
        itinerary_step_list.push(new DwarvenTask("DRINK_ALCOHOL", f_tile.x, f_tile.y));
        itinerary.set_itinerary(itinerary_step_list, null);
        return true;
    }
    set_itinerary_to_manage_tiredness(character) {
        const x = character.x;
        const y = character.y;
        const itinerary = character.itinerary;
        const bed_tiles_in_order = this.getBedsInPriority(character);
        for (const bed_tile of bed_tiles_in_order) {
            const potential_path = PATHFINDING.findPath(x, y, bed_tile.x, bed_tile.y);
            if (potential_path) {
                const itinerary_step_list = path_array_to_tasks(potential_path);
                itinerary_step_list.push(new DwarvenTask("SLEEP", bed_tile.x, bed_tile.y));
                itinerary.set_itinerary(itinerary_step_list, null);
                return true;
            }
        }
        return false;
    }
    // Priority is Claimed Beds by the Dwarf, Unclaimed Beds in Bedrooms and Finally an Open spot in a Dormitory.
    getBedsInPriority(character) {
        const all_zones = ZONE_MANAGER.getAllZones();
        const all_bedroom_zones = all_zones.filter((z) => z.zone_type == "bedroom" && z.is_zone_valid());
        const all_bedrooms_assigned_to_this_dwarf = all_bedroom_zones.filter((z) => z.assigned_dwarf == character);
        const reserved_tiles = getHashSetOfReservedTiles();
        const tiles_containing_beds = [];
        for (const bedroom of all_bedrooms_assigned_to_this_dwarf) {
            const bed_tile = bedroom.getBedTileCoordinates();
            if (bed_tile && !reserved_tiles.has(bed_tile.get_hash())) {
                tiles_containing_beds.push(bed_tile);
            }
        }
        const all_unassigned_bedrooms = all_bedroom_zones.filter((z) => z.assigned_dwarf == null);
        for (const bedroom of all_unassigned_bedrooms) {
            const bed_tile = bedroom.getBedTileCoordinates();
            if (bed_tile && !reserved_tiles.has(bed_tile.get_hash())) {
                tiles_containing_beds.push(bed_tile);
            }
        }
        const all_dormitories = all_zones.filter((z) => z.zone_type == "dorm" && z.is_zone_valid());
        const all_dormitory_beds = all_dormitories.flatMap(dormitory => dormitory.getAllBedTileCoordinates());
        for (const bed_tile of all_dormitory_beds) {
            if (bed_tile && !reserved_tiles.has(bed_tile.get_hash())) {
                tiles_containing_beds.push(bed_tile);
            }
        }
        return tiles_containing_beds;
    }
    set_itinerary_to_manage_fodder(animal) {
        const x = animal.x;
        const y = animal.y;
        const itinerary = animal.itinerary;
        const potential_path = GAME_MAP.get_closest_flooring_of_type(x, y, "grass");
        if (!potential_path) {
            return false;
        }
        const itinerary_step_list = path_array_to_tasks(potential_path);
        const f_tile = potential_path.length ? potential_path[potential_path.length - 1] : { x, y }; // Final Tile- the one that actually has the water.
        itinerary_step_list.push(new DwarvenTask("GRAZE", f_tile.x, f_tile.y));
        itinerary.set_itinerary(itinerary_step_list, null);
        return true;
    }
}
const MAX_THIRST = 60 * 2 * 1000; // Milliseconds
const LOOK_FOR_WATER_IF_IDLE = 60 * 1000;
const LOOK_FOR_WATER_OVERRIDE = 30 * 1000;
const MAX_HUNGER = 60 * 4 * 1000;
const LOOK_FOR_FOOD_IF_IDLE = 60 * 2 * 1000;
const LOOK_FOR_FOOD_OVERRIDE = 30 * 1 * 1000;
const MAX_TIREDNESS = 60 * 2 * 1000;
const LOOK_FOR_REST_IF_IDLE = 30 * 1 * 1000;
const MAX_BOWELS = 60 * 2 * 1000;
const LOOK_FOR_BOWELS_IF_IDLE = 60 * 1000;
const LOOK_FOR_BOWELS_OVERRIDE = 30 * 1000;
class NeedsSet {
    constructor(needSetSet = "DWARF") {
        this.needsMap = new Map();
        if (needSetSet == "DWARF") {
            this.needsMap.set(Need_Keys.Thirst, new Need(Need_Keys.Thirst, MAX_THIRST, LOOK_FOR_WATER_IF_IDLE, LOOK_FOR_WATER_OVERRIDE));
            this.needsMap.set(Need_Keys.Hunger, new Need(Need_Keys.Hunger, MAX_HUNGER, LOOK_FOR_FOOD_IF_IDLE, LOOK_FOR_FOOD_OVERRIDE));
            this.needsMap.set(Need_Keys.Tiredness, new Need(Need_Keys.Tiredness, MAX_TIREDNESS, LOOK_FOR_REST_IF_IDLE));
            this.needsMap.set(Need_Keys.Bowels, new Need(Need_Keys.Bowels, MAX_BOWELS, LOOK_FOR_BOWELS_IF_IDLE, LOOK_FOR_BOWELS_OVERRIDE));
            this.needsMap.set(Need_Keys.Alcohol, new Need(Need_Keys.Alcohol, MAX_HUNGER, LOOK_FOR_FOOD_IF_IDLE, LOOK_FOR_FOOD_OVERRIDE));
        }
        else if (needSetSet == "GRAZER") {
        }
    }
    on_tick(itinerary, x, y, character) {
        for (let [key, need] of this.needsMap.entries()) {
            need.on_tick(character);
        }
    }
    /* Render functions */
    render() {
        const $needsContainer = $('<div>').addClass('needs-container');
        for (let [key, need] of this.needsMap.entries()) {
            const $bar = this._createNeedBar(key, need.curr_count, need.max);
            $needsContainer.append($bar);
        }
        return $needsContainer;
    }
    _createNeedBar(name, currentValue, maxValue) {
        // Create bar container
        const $barContainer = $('<div>')
            .addClass('need-bar-container')
            .attr('data-need-name', name);
        // Create bar label
        const $label = $('<div>')
            .addClass('need-bar-label')
            .text(name);
        $barContainer.append($label);
        // Create the actual bar
        const $bar = $('<div>')
            .addClass('need-bar')
            .attr('data-need-name', name);
        // Calculate percentage
        const currentPercent = (currentValue / maxValue) * 100;
        // Get color based on percentage
        const getColorForPercentage = (pct) => {
            if (pct >= 50) {
                // Interpolate between yellow and darker green
                const factor = (pct - 50) / 50;
                return `rgb(${Math.round(230 - (185 * factor))}, ${Math.round(230 - (130 * factor))}, 0)`;
            }
            else {
                // Interpolate between red and yellow
                const factor = pct / 50;
                return `rgb(${Math.round(204 + (26 * factor))}, ${Math.round(0 + (230 * factor))}, 0)`;
            }
        };
        // Set bar width and color
        $bar.css({
            width: `${currentPercent}%`,
            backgroundColor: getColorForPercentage(currentPercent)
        });
        $barContainer.append($bar);
        return $barContainer;
    }
}
class DwarvenTask {
    constructor(task_key, x = null, y = null, moving_entity = null) {
        this.task_key = task_key;
        this.x = x;
        this.y = y;
        this.moving_entity = moving_entity;
    }
}
class DwarfItinerary {
    constructor() {
        this.task_list = [];
        this.blueprint = null;
    }
    set_itinerary(task_list, blueprint) {
        this.task_list_has_been_emptied();
        this.task_list = task_list;
        this.blueprint = blueprint;
    }
    get_next_task() {
        if (!this.task_list.length) {
            return null;
        }
        return this.task_list[0];
    }
    get_last_task_key() {
        if (!this.task_list.length) {
            return null;
        }
        return this.task_list[this.task_list.length - 1].task_key;
    }
    shift() {
        this.task_list.shift();
        if (!this.task_list.length) {
            this.task_list_has_been_emptied();
        }
    }
    task_list_has_been_emptied() {
        this.blueprint = null;
    }
    is_idle() {
        return this.task_list.length == 0;
    }
    force_idle() {
        this.task_list = [];
        this.task_list_has_been_emptied();
    }
    is_interruptible() {
        const uninterruptible_tasks = ["DRINK", "EAT"];
        if (this.task_list.some(task => uninterruptible_tasks.includes(task.task_key))) {
            return false;
        }
        return true;
    }
}
const TILES_PER_SECOND = 7;
class Dwarf extends MovingEntity {
    constructor(x, y) {
        super(x, y, "dorf");
        this.name = getRandomElement(PEOPLE_NAMES);
        this.inventory = new ItemSet();
        this.itinerary = new DwarfItinerary();
        this.banked_time = 0;
        this.needs = new NeedsSet();
        this.display_name = this.name;
    }
    update_dwarf() {
        this.make_unstuck();
        this.needs.on_tick(this.itinerary, this.x, this.y, this);
        this.undertake_task_if_exists();
        if (this.itinerary.is_idle()) {
            if (!this.inventory.isEmpty()) {
                GAME_MAP.dump_inventory(this.x, this.y, this.inventory);
            }
            this.banked_time = 0;
        }
    }
    /* Handlers for all of the different tasks */
    handleGoToMovingEntity(task) {
        this.banked_time += FrameTime.deltaT;
        const time_to_move_to_tile = 1000 / TILES_PER_SECOND;
        if (this.banked_time >= time_to_move_to_tile) {
            const path = PATHFINDING.findPathExtended(this.x, this.y, task.moving_entity.x, task.moving_entity.y, true);
            if (!path) {
                this.itinerary.force_idle();
                return;
            }
            this.banked_time -= time_to_move_to_tile;
            if (path.length == 0) {
                this.itinerary.shift();
            }
            else {
                this.x = path[0].x; // No need to confirm the X and Y because we just calculated the path.
                this.y = path[0].y;
            }
        }
    }
    handleRopeAnimal(task) {
        this.banked_time += FrameTime.deltaT;
        const time_to_move_to_tile = 1000 / TILES_PER_SECOND;
        if (this.banked_time >= time_to_move_to_tile) {
            const path = PATHFINDING.findPath(this.x, this.y, task.x, task.y);
            if (!path) {
                this.itinerary.force_idle();
                return;
            }
            this.banked_time -= time_to_move_to_tile;
            task.moving_entity.x = this.x;
            task.moving_entity.y = this.y;
            if (path.length == 0) {
                this.itinerary.shift();
                task.moving_entity.carry_to_zone = null;
                task.moving_entity.x = this.x;
                task.moving_entity.y = this.y;
            }
            else {
                task.moving_entity.x = this.x;
                task.moving_entity.y = this.y;
                this.x = path[0].x; // No need to confirm the X and Y because we just calculated the path.
                this.y = path[0].y;
            }
        }
    }
    handleDrink(task) {
        if (GAME_MAP.getTile(this.x, this.y) == "water") {
            this.needs.needsMap.get(Need_Keys.Thirst).reset_to_max();
        }
        this.itinerary.shift();
    }
    handleEat(task) {
        this.needs.needsMap.get(Need_Keys.Hunger).reset_to_max();
        this.inventory.makeEmpty();
        this.itinerary.shift();
    }
    handleRelieveBowels(task) {
        this.needs.needsMap.get(Need_Keys.Bowels).reset_to_max();
        this.itinerary.shift();
    }
    handleDrinkAlcohol(task) {
        this.needs.needsMap.get(Need_Keys.Alcohol).reset_to_max();
        this.inventory.makeEmpty();
        this.itinerary.shift();
    }
    handleChopWood(task) {
        if (this.itinerary.blueprint) {
            this.itinerary.blueprint.have_dwarf_finish_blueprint();
        }
        this.itinerary.shift();
    }
    handlePickup(task) {
        const entity = GAME_MAP.getEntity(task.x, task.y);
        if (entity instanceof ItemOnGround) {
            this.inventory.addItem(entity.item_id, entity.item_count);
            GAME_MAP.setEntity(this.x, this.y, null);
        }
        this.itinerary.shift();
    }
    handleStockBlueprint(task) {
        const blueprint = this.itinerary.blueprint;
        if (blueprint !== null) {
            const shopping_list = blueprint.inventory.getShoppingList(blueprint.get_bp_desired_inventory());
            const characters_items = this.inventory.give_list_of_items_held();
            for (const desired_item_key in shopping_list) {
                const desired_item_count = shopping_list[desired_item_key];
                if (characters_items.hasOwnProperty(desired_item_key)) {
                    const amount_in_inventory = characters_items[desired_item_key];
                    const amount_to_give = Math.min(amount_in_inventory, desired_item_count);
                    this.inventory.removeItem(desired_item_key, amount_to_give);
                    blueprint.inventory.addItem(desired_item_key, amount_to_give);
                }
            }
        }
        this.itinerary.shift();
    }
    handleBuildOrCraft(task) {
        const build_blueprint = this.itinerary.blueprint;
        if (build_blueprint && build_blueprint instanceof Blueprint) {
            const shopping_list = build_blueprint.inventory.getShoppingList(build_blueprint.get_bp_desired_inventory());
            if (Object.keys(shopping_list).length === 0) {
                build_blueprint.have_dwarf_finish_blueprint();
            }
        }
        this.itinerary.shift();
    }
    handleDump(task) {
        GAME_MAP.dump_inventory(this.x, this.y, this.inventory);
        this.itinerary.shift();
    }
    handleSleep(task) {
        this.needs.needsMap.get(Need_Keys.Tiredness).reset_to_max();
        const zone = ZONE_MANAGER.getZoneAtTile(this.x, this.y);
        if (zone && zone.zone_type == "bedroom") {
            zone.assigned_dwarf = this;
        }
        this.itinerary.shift();
    }
    handlePickupAndForgetBlueprint(task) {
        const entity = GAME_MAP.getEntity(task.x, task.y);
        if (entity instanceof ItemOnGround) {
            this.inventory.addItem(entity.item_id, entity.item_count);
            GAME_MAP.setEntity(this.x, this.y, null);
        }
        this.itinerary.blueprint = null;
        this.itinerary.shift();
    }
    handleSlaughter(task) {
        task.moving_entity.handle_slaughter();
        this.itinerary.shift();
    }
    // Drawing Tasks
    render_details_menu() {
        const $holder_div = $("<div>");
        $holder_div.append("<h1>").text(this.name);
        $holder_div.append(this.needs.render());
        return $holder_div;
    }
    update_details_menu() {
        $("#rhs-content-container").empty();
        $("#rhs-content-container").append(this.render_details_menu());
    }
    render() {
        super.render();
        this.render_itinerary();
    }
    render_itinerary() {
        if (this.itinerary.task_list.length == 0 || this.itinerary.task_list[0].moving_entity) {
            return;
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        let [x, y] = [this.x, this.y];
        for (const t of this.itinerary.task_list) {
            if (t.task_key == "GO_TO") {
                ctx.beginPath();
                ctx.moveTo((x + .5) * TILE_SIZE - CAMERA_X, (y + .5) * TILE_SIZE - CAMERA_Y);
                ctx.lineTo((t.x + .5) * TILE_SIZE - CAMERA_X, (t.y + .5) * TILE_SIZE - CAMERA_Y);
                ctx.stroke();
            }
            else {
                ctx.fillRect(t.x * TILE_SIZE + 8 - CAMERA_X, t.y * TILE_SIZE + 8 - CAMERA_Y, TILE_SIZE - 16, TILE_SIZE - 16);
            }
            [x, y] = [t.x, t.y];
        }
    }
}
const ANIMAL_TILES_PER_SECOND = 5;
const TIME_FOR_EGG_MAXIMUM = 1000 * 30;
const IDLE_TIME_COUNT = 1000 * 5;
const MOVES_UNTIL_IDLE = 7;
class Animal extends MovingEntity {
    constructor(x, y) {
        super(x, y, "chicken");
        this.banked_time = 0;
        this.egg_time_elapsed = 0;
        this.slaughter = false;
        this.carry_to_zone = null;
        this.in_idle_state = false;
        this.moves_since_last_idle = 0;
        this.display_name = "Chicken";
    }
    tick() {
        this.undertake_task_if_exists();
        if (this.itinerary.is_idle()) {
            this.itinerary.set_itinerary([new DwarvenTask("WANDER"), new DwarvenTask("WANDER"), new DwarvenTask("WANDER"), new DwarvenTask("WANDER"), new DwarvenTask("WANDER"), new DwarvenTask("IDLE", this.x, this.y)], null);
        }
        this.handle_eggs();
        this.handle_dwarf_interactions();
    }
    handle_eggs() {
        this.egg_time_elapsed += FrameTime.deltaT;
        if (this.egg_time_elapsed >= TIME_FOR_EGG_MAXIMUM) {
            this.egg_time_elapsed -= TIME_FOR_EGG_MAXIMUM;
            GAME_MAP.dump_one_inventory_item(this.x, this.y, "egg", 1);
        }
    }
    handle_dwarf_interactions() {
        const assigned = this.getDwarvesAssignedToThis();
        if (assigned.length > 0) {
            return;
        }
        if (this.slaughter) {
            this.assignDwarfToSlaughter();
        }
        else if (this.carry_to_zone) {
            this.assignDwarfToMoveAnimal();
        }
    }
    getDwarvesAssignedToThis() {
        return CHARACTERS.filter(one_char => one_char.itinerary.task_list.length && one_char.itinerary.task_list[0].moving_entity == this);
    }
    assignDwarfToSlaughter() {
        for (const one_char of CHARACTERS) {
            if (one_char.itinerary.is_idle()) {
                const task_list = [new DwarvenTask("GO_TO_MOVING_ENTITY", null, null, this), new DwarvenTask("SLAUGHTER_ANIMAL", null, null, this)];
                one_char.itinerary.set_itinerary(task_list, null);
                return;
            }
        }
    }
    assignDwarfToMoveAnimal() {
        for (const one_char of CHARACTERS) {
            if (one_char.itinerary.is_idle()) {
                const pasture_tile = this.carry_to_zone.tiles[Math.floor(Math.random() * this.carry_to_zone.tiles.length)];
                const task_list = [new DwarvenTask("GO_TO_MOVING_ENTITY", null, null, this), new DwarvenTask("CARRY_ANIMAL_TO_POINT", pasture_tile.x, pasture_tile.y, this)];
                one_char.itinerary.set_itinerary(task_list, null);
                return;
            }
        }
    }
    handle_slaughter() {
        ANIMAL_MANAGER.animals = ANIMAL_MANAGER.animals.filter(obj => obj !== this);
        this.alive = false;
    }
    render_details_menu() {
        const $holder_div = $("<div>");
        const txt = this.slaughter ? "Cancel Slaughter" : "Slaughter";
        const $button = $("<button>").text(txt);
        const this_as_closure = this;
        $button.click(function () { this_as_closure.slaughter = !this_as_closure.slaughter; }); // "this" is saved as an immutable closure.
        $holder_div.append($("<br>"), $("<br>"), $button);
        return $holder_div;
    }
}
class AnimalManager {
    constructor() {
        this.animals = [];
    }
    addAnimal(x, y) {
        this.animals.push(new Animal(x, y));
    }
    tick() {
        this.animals.forEach(element => element.tick());
    }
    render() {
        this.animals.forEach(element => element.render());
    }
}
const ANIMAL_MANAGER = new AnimalManager();
ANIMAL_MANAGER.addAnimal(15, 12);
ANIMAL_MANAGER.addAnimal(15, 16);
ANIMAL_MANAGER.addAnimal(15, 10);
class ZoneManager {
    constructor() {
        this.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0)); // No zones at start.
        this.next_zone_id = 1;
        this.zones = {};
    }
    // list_of_tiles is an array of objects with parameters "x" and "y" ;
    hook_add_zone(list_of_tiles, zone_type) {
        const list_of_tiles_not_already_assigned = [];
        const set_of_neighboring_zones_of_same_type = new Set();
        for (const tile of list_of_tiles) {
            if (this.grid[tile.y][tile.x] == 0) {
                list_of_tiles_not_already_assigned.push(tile);
                const neighbors = tile.getNeighbors();
                for (const n of neighbors) {
                    const zone_at_tile = this.getZoneAtTile(n.x, n.y);
                    if (zone_at_tile && zone_at_tile.zone_type == zone_type) {
                        set_of_neighboring_zones_of_same_type.add(zone_at_tile);
                    }
                }
            }
        }
        if (list_of_tiles_not_already_assigned.length == 0) {
            return;
        }
        const sorted_zones_array = Array.from(set_of_neighboring_zones_of_same_type).sort((zoneA, zoneB) => zoneB.tiles.length - zoneA.tiles.length);
        if (sorted_zones_array.length == 0) // No Neighbors to merge with create new zone.
         {
            const zone_id = this.next_zone_id;
            this.next_zone_id++;
            this.zones[zone_id] = new Zone(zone_id, zone_type);
            for (const tile of list_of_tiles_not_already_assigned) {
                if (GAME_MAP.getCostToMoveThroughTile(tile.x, tile.y) < Infinity) {
                    this.grid[tile.y][tile.x] = zone_id;
                    this.zones[zone_id].tiles.push(tile);
                }
            }
        }
        else if (sorted_zones_array.length == 1) // Add to neighboring Zone.
         {
            const zone_to_append = sorted_zones_array[0];
            for (const tile of list_of_tiles_not_already_assigned) {
                if (GAME_MAP.getCostToMoveThroughTile(tile.x, tile.y) < Infinity) {
                    this.grid[tile.y][tile.x] = zone_to_append.id;
                    zone_to_append.tiles.push(tile);
                }
            }
        }
        else if (sorted_zones_array.length > 1) // 
         {
            const zone_to_append = sorted_zones_array[0];
            const tiles_to_change = sorted_zones_array.slice(1).flatMap(zone => zone.tiles);
            for (let i = 1; i < sorted_zones_array.length; i++) {
                delete this.zones[sorted_zones_array[i].id];
            }
            for (const tile of [...list_of_tiles_not_already_assigned, ...tiles_to_change]) {
                if (GAME_MAP.getCostToMoveThroughTile(tile.x, tile.y) < Infinity) {
                    this.grid[tile.y][tile.x] = zone_to_append.id;
                    zone_to_append.tiles.push(tile);
                }
            }
        }
    }
    delete_tiles_from_zone_hook(list_of_tiles) {
        this.crude_delete_from_zone(list_of_tiles);
        this.delete_non_contiguous_tiles_from_zones();
        this.delete_zones_with_no_members();
    }
    crude_delete_from_zone(list_of_tiles) {
        for (const tile of list_of_tiles) {
            const zone_key = this.grid[tile.y][tile.x];
            if (zone_key) // 0 is falsey;
             {
                this.grid[tile.y][tile.x] = 0;
                this.zones[zone_key].tiles = this.zones[zone_key].tiles.filter((tile_in_zone) => !(tile.x == tile_in_zone.x && tile.y == tile_in_zone.y));
            }
        }
    }
    delete_zones_with_no_members() {
        for (const zone_id in this.zones) {
            const zone = this.zones[zone_id];
            if (zone.tiles.length == 0) {
                delete this.zones[zone_id];
            }
        }
    }
    delete_non_contiguous_tiles_from_zones() {
        for (const zone_key in this.zones) {
            const zone = this.zones[zone_key];
            const all_non_contiguous_regions = zone.splitIntoContiguousGroups();
            if (all_non_contiguous_regions.length > 1) {
                const not_the_largest_non_contiguous_regions = all_non_contiguous_regions.slice(1);
                const tiles_to_delete = not_the_largest_non_contiguous_regions.flat();
                this.crude_delete_from_zone(tiles_to_delete);
            }
        }
    }
    iterate_over_zones_tick() {
        for (const zone_key in this.zones) {
            const zone = this.zones[zone_key];
            zone.tick();
        }
    }
    grid_location_is_stockpile(x, y) {
        if (this.grid[y][x] == 0) {
            return false;
        }
        const zone_obj = this.getZoneAtTile(x, y);
        return zone_obj.zone_type === "stockpile";
    }
    getZoneAtTile(x, y) {
        const zone_key_at_tile = this.grid[y][x];
        if (zone_key_at_tile == 0) {
            return null;
        }
        return (zone_key_at_tile in this.zones) ? this.zones[zone_key_at_tile] : null; // This should never return NULL, but I should harden this more later.
    }
    getClosestEmptyStockpileLocations(x, y) {
        const zones = Object.values(this.zones).filter(z => z.zone_type == "stockpile");
        const tiles = zones.flatMap(z => z.tiles);
        const allTilesCurentlyEmpty = tiles.filter(t => GAME_MAP.getEntity(t.x, t.y) == null);
        if (allTilesCurentlyEmpty.length === 0) {
            return null;
        }
        let closestTile = null;
        let closestDistance = Infinity; // Start with infinite distance
        for (const tile of allTilesCurentlyEmpty) {
            const dx = tile.x - x;
            const dy = tile.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTile = tile;
            }
        }
        return closestTile;
    }
    getAllZones() {
        return Object.values(this.zones);
    }
    /* Draw Functions */
    draw_zones() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.render_single_tile(x, y);
            }
        }
    }
    render_single_tile(x, y) {
        if (this.grid[y][x] == 0) {
            return;
        }
        const zone_type = this.getZoneAtTile(x, y).zone_type;
        const zone = this.getZoneAtTile(x, y);
        if (zone_type == "stockpile") {
            ctx.fillStyle = 'rgba(125, 125, 255, 0.1)';
            ctx.strokeStyle = 'rgba(125, 125, 255, 0.8)';
        }
        else if (zone_type == "grow") {
            ctx.fillStyle = 'rgba(125, 255, 125, 0.1)';
            ctx.strokeStyle = 'rgba(125, 255, 125, 0.8)';
        }
        else if (!zone.is_zone_valid()) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        }
        else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        }
        const current_zone = this.grid[y][x];
        ctx.fillRect(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
        // Check adjacent tiles and draw borders for different zones
        ctx.lineWidth = 1;
        // Check top edge
        if (y > 0 && this.grid[y - 1][x] !== current_zone) {
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y);
            ctx.lineTo((x + 1) * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y);
            ctx.stroke();
        }
        // Check bottom edge
        if (y < GRID_HEIGHT - 1 && this.grid[y + 1][x] !== current_zone) {
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE - CAMERA_X, (y + 1) * TILE_SIZE - CAMERA_Y);
            ctx.lineTo((x + 1) * TILE_SIZE - CAMERA_X, (y + 1) * TILE_SIZE - CAMERA_Y);
            ctx.stroke();
        }
        // Check left edge
        if (x > 0 && this.grid[y][x - 1] !== current_zone) {
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y);
            ctx.lineTo(x * TILE_SIZE - CAMERA_X, (y + 1) * TILE_SIZE - CAMERA_Y);
            ctx.stroke();
        }
        // Check right edge
        if (x < GRID_WIDTH - 1 && this.grid[y][x + 1] !== current_zone) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * TILE_SIZE - CAMERA_X, y * TILE_SIZE - CAMERA_Y);
            ctx.lineTo((x + 1) * TILE_SIZE - CAMERA_X, (y + 1) * TILE_SIZE - CAMERA_Y);
            ctx.stroke();
        }
    }
}
const ZONE_MANAGER = new ZoneManager();
var Zone_Type;
(function (Zone_Type) {
    Zone_Type["Dorm"] = "dorm";
    Zone_Type["Bedroom"] = "bedroom";
    Zone_Type["Stockpile"] = "stockpile";
    Zone_Type["Pasture"] = "pasture";
    Zone_Type["Grow"] = "grow";
})(Zone_Type || (Zone_Type = {}));
class Zone {
    constructor(id, zone_type) {
        this.id = id;
        this.tiles = [];
        this.zone_type = zone_type;
        this.name = prettify(zone_type);
        this.zone_complaints = [];
        this.assigned_dwarf = null;
    }
    static zone_factory_method(id, zone_type) {
    }
    tick() {
        if (this.zone_type == Zone_Type.Stockpile) {
            for (const tile of this.tiles) {
                if (GAME_MAP.getEntity(tile.x, tile.y) == null) {
                    BLUEPRINT_MANAGER.addBluePrint(new Blueprint(tile.x, tile.y, "W_stockpile"));
                }
            }
        }
        else if (this.zone_type == Zone_Type.Grow) {
            for (const tile of this.tiles) {
                const e = GAME_MAP.getEntity(tile.x, tile.y);
                if (e == null) {
                    BLUEPRINT_MANAGER.addBluePrint(new Blueprint(tile.x, tile.y, "W_plant"));
                }
                else if (e instanceof CropEntity && e.is_harvestable) {
                    BLUEPRINT_MANAGER.addBluePrint(new Blueprint(tile.x, tile.y, "W_harvest"));
                }
            }
        }
        this.getTilesNeighboring();
    }
    is_zone_valid() {
        this.zone_complaints = [];
        if (this.zone_type == Zone_Type.Bedroom) {
            if (!this.isSurroundedByWalls()) {
                this.zone_complaints.push("Not Surrounded By Walls");
            }
            if (!this.hasBed()) {
                this.zone_complaints.push("No Bed");
            }
        }
        else if (this.zone_type == Zone_Type.Dorm) {
            if (!this.isSurroundedByWalls()) {
                this.zone_complaints.push("Not Surrounded By Walls");
            }
            if (!this.hasBed()) {
                this.zone_complaints.push("No Bed");
            }
        }
        return (this.zone_complaints.length == 0);
    }
    is_tile_in_zone(x, y) {
        for (const one_tile of this.tiles) {
            if (one_tile.x == x && one_tile.y == y) {
                return true;
            }
        }
        return false;
    }
    // Split tiles into separate non-contiguous groups
    splitIntoContiguousGroups() {
        // If no tiles, return empty array
        if (this.tiles.length === 0)
            return [];
        const groups = [];
        const visitedTiles = new Set();
        // Loop through all tiles
        for (const tile of this.tiles) {
            // Skip if already processed
            if (visitedTiles.has(tile))
                continue;
            // Start a new group with this tile
            const group = [tile];
            visitedTiles.add(tile);
            // Use BFS to find all connected tiles
            let index = 0;
            while (index < group.length) {
                const currentTile = group[index];
                // Get neighboring tiles that belong to this zone
                const neighbors = this.getTileNextTo(currentTile);
                // Add unvisited neighbors to the current group
                for (const neighbor of neighbors) {
                    if (!visitedTiles.has(neighbor)) {
                        group.push(neighbor);
                        visitedTiles.add(neighbor);
                    }
                }
                index++;
            }
            // Add the completed group to our results
            groups.push(group);
        }
        return groups;
    }
    getTilesNeighboring() {
        const neighbors_of_this_zone = [];
        const setOfAllTiles = new Set();
        for (const t of this.tiles) {
            setOfAllTiles.add(t.get_hash());
        }
        for (const t of this.tiles) {
            for (const n of t.getNeighbors()) {
                if (!setOfAllTiles.has(n.get_hash())) {
                    neighbors_of_this_zone.push(n);
                }
            }
        }
        return neighbors_of_this_zone;
    }
    isSurroundedByWalls() {
        const neighbors_of_this_zone = this.getTilesNeighboring();
        for (const n of neighbors_of_this_zone) {
            if (!(GAME_MAP.getWall(n.x, n.y) !== null || GAME_MAP.getEntity(n.x, n.y) instanceof DoorEntity)) {
                return false;
            }
        }
        return true;
    }
    getBedTileCoordinates() {
        for (const t of this.tiles) {
            const entity = GAME_MAP.getEntity(t.x, t.y);
            if (entity instanceof BedEntity) {
                return t;
            }
        }
        return null;
    }
    getAllBedTileCoordinates() {
        const allBeds = [];
        for (const t of this.tiles) {
            const entity = GAME_MAP.getEntity(t.x, t.y);
            if (entity instanceof BedEntity) {
                allBeds.push(t);
            }
        }
        return allBeds;
    }
    getGameEntitiesInZone() {
        const all_entities = [];
        for (const t of this.tiles) {
            const entity = GAME_MAP.getEntity(t.x, t.y);
            if (entity) {
                all_entities.push(entity);
            }
        }
        return all_entities;
    }
    hasBed() {
        const all_entities = this.getGameEntitiesInZone();
        return all_entities.some((e) => e instanceof BedEntity);
    }
    // Helper method to get neighboring tiles that belong to this zone
    getTileNextTo(tile) {
        const neighbors = [];
        // Check all tiles in this zone to find neighbors
        for (const potentialNeighbor of this.tiles) {
            // Skip the tile itself
            if (potentialNeighbor === tile)
                continue;
            // Check if adjacent (assumes tiles have x,y properties)
            if ((Math.abs(potentialNeighbor.x - tile.x) === 1 && potentialNeighbor.y === tile.y) ||
                (Math.abs(potentialNeighbor.y - tile.y) === 1 && potentialNeighbor.x === tile.x)) {
                neighbors.push(potentialNeighbor);
            }
        }
        return neighbors;
    }
    render_details_menu() {
        const $holder_div = $("<div>");
        const $text_display = $("<span>").text(this.name).attr("id", "rhs_zone_name");
        const $input = $("<input>").attr("id", "rhs_zone_name_input").val(this.name).hide();
        const $button1 = $("<button>").text("Rename").attr("id", "rhs_zone_edit");
        const $button2 = $("<button>").text("Save Changes").attr("id", "rhs_zone_save").hide();
        const this_as_closure = this;
        $button1.click(function () {
            $text_display.hide();
            $button1.hide();
            $input.show();
            $button2.show();
        });
        $button2.click(function () {
            $text_display.show();
            $button1.show();
            $input.hide();
            $button2.hide();
            this_as_closure.name = $input.val(); // Slight Hack
            $text_display.text($input.val()); // Slight Hack
        });
        $holder_div.append($text_display, $input, $button1, $button2);
        if (this.zone_type == Zone_Type.Pasture) {
            const $pasture_div = $("<div>").addClass("pasture_div");
            const animals_inside_pasture = [];
            const animals_outside_pasture = [];
            for (const one_animal of ANIMAL_MANAGER.animals) {
                if (this.is_tile_in_zone(one_animal.x, one_animal.y)) {
                    animals_inside_pasture.push(one_animal);
                }
                else {
                    animals_outside_pasture.push(one_animal);
                }
            }
            const $animals_in_pasture_div = $("<div>").text("In Pasture");
            const $animals_outside_pasture_div = $("<div>").text("Outside Pasture");
            for (const one_animal of animals_inside_pasture) {
                const url = "url(" + IMAGE_PATHS[one_animal.sprite] + ")";
                const $image = $("<div>").css("background-image", url).addClass("animal_icon");
                $animals_in_pasture_div.append($("<br>"), $image);
            }
            for (const one_animal of animals_outside_pasture) {
                console.log(one_animal);
                const url = "url(" + IMAGE_PATHS[one_animal.sprite] + ")";
                const $image = $("<div>").css("background-image", url).addClass("animal_icon");
                const $button = $("<button>").text("Bring to Pasture");
                const this_as_closure = this;
                const one_animal_as_closure = one_animal;
                $button.click(function () { one_animal_as_closure.carry_to_zone = this_as_closure; });
                $animals_outside_pasture_div.append($("<br>"), $image, $button);
            }
            $pasture_div.append($animals_in_pasture_div, $animals_outside_pasture_div);
            $holder_div.append($pasture_div);
        }
        if (this.zone_type == Zone_Type.Bedroom) {
            const $selected_dwarf_dropdown = $("<select>");
            const $null_row = $("<option>").text("---").data("dwarf", null);
            if (this.assigned_dwarf == null) {
                $null_row.attr('selected', 'selected');
            }
            $selected_dwarf_dropdown.append($null_row);
            for (const one_char of CHARACTERS) {
                const $selection_row = $("<option>").text(one_char.name).data("dwarf", one_char);
                if (this.assigned_dwarf == one_char) {
                    $selection_row.attr('selected', 'selected');
                }
                $selected_dwarf_dropdown.append($selection_row);
            }
            const this_zone_as_closure = this;
            $selected_dwarf_dropdown.change(function (e) {
                const the_select = e.currentTarget;
                const the_option = the_select.children[the_select.selectedIndex];
                const dwarf_data = $(the_option).data("dwarf");
                this_zone_as_closure.assigned_dwarf = dwarf_data;
            });
            $holder_div.append($("<br>"), $selected_dwarf_dropdown, $("<br>"));
        }
        if (this.zone_complaints) {
            // Create a UL element to hold our list
            const $list = $('<ul>').addClass('complaints-list');
            // Iterate through each complaint
            $.each(this.zone_complaints, function (index, complaint) {
                // Create list item with complaint text
                const $item = $('<li>').text(complaint + ' ');
                // Append item to the list
                $list.append($item);
            });
            // Append the list to some container (you'll need to specify where)
            $holder_div.append($list);
        }
        return $holder_div;
    }
    update_details_menu() {
    }
} // Not technically singletons yet-- but presently just isolating these out for the codebase.
const GAME_MAP = new GameMap();
const PATHFINDING = new Pathfinding();
const BLUEPRINT_MANAGER = new BlueprintManager();
const ITEM_CACHE = new ItemCache();
// Character definitions
const CHARACTERS = [new Dwarf(3, 3),
    new Dwarf(6, 6),
    new Dwarf(9, 9),
    new Dwarf(12, 12),];
// Get Canvas and Canvas Context
const canvas = document.getElementById('gameCanvas');
$(canvas).attr("height", CANVAS_HEIGHT).attr("width", CANVAS_WIDTH);
$("#canvas_wrapper").attr("height", CANVAS_HEIGHT).attr("width", CANVAS_WIDTH);
const ctx = canvas.getContext("2d", { alpha: false });
// Handle WASD Keys to set the Camera Position
// Camera Position offsets every individual drawn pixel.
// CAMERA_Y goes up as you move down
// CAMERA_X goes up as you move to the right
// So, 0,0 is that upper left-hand pixel.
// Exactly as you would expect give the JS Canvas logic, but I want to make things explicit
var CAMERA_X = 0;
var CAMERA_Y = 0;
const MAXIMUM_CAMERA_X = GRID_WIDTH * TILE_SIZE - CANVAS_WIDTH;
const MAXIMUM_CAMERA_Y = GRID_HEIGHT * TILE_SIZE - CANVAS_HEIGHT;
let cameraVelocities = {
    x: 0,
    y: 0
};
const MAX_CAMERA_SPEED = 3; // Maximum camera speed
const ACCELERATION = .25; // Rate of acceleration
const DECELERATION = .5; // Rate of deceleration when key is released
const keyState = {
    w: false,
    s: false,
    a: false,
    d: false
};
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w':
            keyState.w = true;
            break;
        case 's':
            keyState.s = true;
            break;
        case 'a':
            keyState.a = true;
            break;
        case 'd':
            keyState.d = true;
            break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w':
            keyState.w = false;
            break;
        case 's':
            keyState.s = false;
            break;
        case 'a':
            keyState.a = false;
            break;
        case 'd':
            keyState.d = false;
            break;
    }
});
function updateCameraMovement() {
    // Vertical movement (Y-axis)
    if (keyState.w) {
        cameraVelocities.y = Math.max(cameraVelocities.y - ACCELERATION * FrameTime.deltaTRaw, -MAX_CAMERA_SPEED);
    }
    else if (keyState.s) {
        cameraVelocities.y = Math.min(cameraVelocities.y + ACCELERATION * FrameTime.deltaTRaw, MAX_CAMERA_SPEED);
    }
    else {
        // Decelerate when no vertical key is pressed
        cameraVelocities.y = cameraVelocities.y > 0
            ? Math.max(cameraVelocities.y - DECELERATION * FrameTime.deltaTRaw, 0)
            : Math.min(cameraVelocities.y + DECELERATION * FrameTime.deltaTRaw, 0);
    }
    // Horizontal movement (X-axis)
    if (keyState.a) {
        cameraVelocities.x = Math.max(cameraVelocities.x - ACCELERATION * FrameTime.deltaTRaw, -MAX_CAMERA_SPEED);
    }
    else if (keyState.d) {
        cameraVelocities.x = Math.min(cameraVelocities.x + ACCELERATION * FrameTime.deltaTRaw, MAX_CAMERA_SPEED);
    }
    else {
        // Decelerate when no horizontal key is pressed
        cameraVelocities.x = cameraVelocities.x > 0
            ? Math.max(cameraVelocities.x - DECELERATION * FrameTime.deltaTRaw, 0)
            : Math.min(cameraVelocities.x + DECELERATION * FrameTime.deltaTRaw, 0);
    }
    // Update camera position
    CAMERA_X += cameraVelocities.x * FrameTime.deltaTRaw;
    CAMERA_Y += cameraVelocities.y * FrameTime.deltaTRaw;
    // Clamp camera position
    CAMERA_X = Math.max(0, Math.min(CAMERA_X, MAXIMUM_CAMERA_X));
    CAMERA_Y = Math.max(0, Math.min(CAMERA_Y, MAXIMUM_CAMERA_Y));
    CAMERA_X = Math.floor(CAMERA_X);
    CAMERA_Y = Math.floor(CAMERA_Y);
}
canvas.addEventListener('mousedown', handleLeftButtonDown);
canvas.addEventListener('mouseup', handleLeftButtonUp);
canvas.addEventListener('contextmenu', handleRightClick);
canvas.addEventListener('mouseenter', function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left + CAMERA_X;
    const y = event.clientY - rect.top + CAMERA_Y;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    mouse_currently_over = { x: gridX, y: gridY };
    ;
});
canvas.addEventListener('mouseleave', function (event) {
    dragging = false;
    tile_start_selection = null;
    mouse_currently_over = null;
});
var dragging = false;
var tile_start_selection = null;
var mouse_currently_over = null;
function handleLeftButtonDown(event) {
    if (event.button != 0) {
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left + CAMERA_X;
    const y = event.clientY - rect.top + CAMERA_Y;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    dragging = true;
    tile_start_selection = { x: gridX, y: gridY };
    mouse_currently_over = { x: gridX, y: gridY };
}
canvas.addEventListener('mousemove', function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left + CAMERA_X;
    const y = event.clientY - rect.top + CAMERA_Y;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    mouse_currently_over = { x: gridX, y: gridY };
});
function handleLeftButtonUp(event) {
    if (event.button != 0) {
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left + CAMERA_X;
    const y = event.clientY - rect.top + CAMERA_Y;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    if (!dragging || !tile_start_selection) // Checking for both more for posterity than anything else.
     {
        return;
    }
    const tiles = getTilesBasedOnTool(tile_start_selection.x, tile_start_selection.y, gridX, gridY);
    if (!selectedTool) {
        render_menu_for_tiles_at(gridX, gridY);
    }
    else if (selectedTool == "cancel-bp") {
        for (const one_tile of tiles) {
            BLUEPRINT_MANAGER.remove_blueprint_by_key(one_tile.x + " " + one_tile.y);
        }
    }
    else if (selectedToolCategory == "zones") {
        if (selectedTool == 'delete_zone') {
            ZONE_MANAGER.delete_tiles_from_zone_hook(tiles);
        }
        else {
            ZONE_MANAGER.hook_add_zone(tiles, selectedTool);
        }
    }
    else if (selectedToolCategory == "entities") {
        handleLeftClickPlaceEntityBlueprint(gridX, gridY, selectedTool);
    }
    else if (selectedToolCategory == "orders") {
        for (const one_tile of tiles) {
            handleLeftClickMakeLabourBlueprint(one_tile.x, one_tile.y, selectedTool);
        }
    }
    else {
        for (const one_tile of tiles) {
            leftClickOnTile(one_tile.x, one_tile.y, event.shiftKey);
        }
    }
    dragging = false;
    tile_start_selection = null;
}
function handleLeftClickPlaceEntityBlueprint(gridX, gridY, entity_tool_key) {
    const ENTITIES = { bed: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "BE_bed")),
        blockcutter: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "BE_blockcutter")),
        door: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "BE_door")),
        still: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "BE_still")),
        outhouse: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "BE_outhouse")),
    };
    const handler = ENTITIES[entity_tool_key];
    if (!handler) {
        return;
    }
    handler(gridX, gridY);
}
function handleLeftClickMakeLabourBlueprint(gridX, gridY, entity_tool_key) {
    const LABOURS = { chop: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "W_chop")),
        mine: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "W_mine")),
        harvest: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "W_harvest")),
        deconstruct: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "W_deconstruct")),
        haul: (gridX, gridY) => BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, "W_haul")),
    };
    const handler = LABOURS[entity_tool_key];
    if (!handler) {
        return;
    }
    handler(gridX, gridY);
}
/* Draw Functions */
function highlight_selected_tiles() {
    if (dragging && tile_start_selection && mouse_currently_over) {
        const tiles = getTilesBasedOnTool(tile_start_selection.x, tile_start_selection.y, mouse_currently_over.x, mouse_currently_over.y);
        for (const one_tile of tiles) {
            ctx.fillStyle = "rgba(220, 220, 255, 0.4)";
            ctx.fillRect(one_tile.x * TILE_SIZE - CAMERA_X, one_tile.y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
        }
    }
}
function handleRightClick(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
}
function leftClickOnTile(gridX, gridY, shift_key) {
    if (selectedToolCategory == "floors" && selectedTool !== null) {
        GAME_MAP.setTile(gridX, gridY, selectedTool);
    }
    else if (selectedToolCategory == "build" && selectedTool !== null) {
        BLUEPRINT_MANAGER.addBluePrint(new Blueprint(gridX, gridY, selectedTool));
    }
}
function getTilesBasedOnTool(x1, y1, x2, y2) {
    if (selectedToolCategory == "zones" || selectedToolCategory == "orders" || selectedTool == 'cancel-bp') {
        return getGridTilesBetween(new Tile2D(x1, y1), new Tile2D(x2, y2));
    }
    else if (selectedToolCategory == "build") {
        return getOutermostGridTiles(new Tile2D(x1, y1), new Tile2D(x2, y2));
    }
    else {
        return [new Tile2D(x2, y2)];
    }
    return;
}
checkDeviceAndThrowError();
function gameLoop() {
    if (!PAUSED) {
        FrameTime.updateDeltaT();
        PATHFINDING.populate_passibility_array();
        assignBlueprintsToIdleDwarfs();
        updateCharacters();
        GAME_MAP.update_all_entities();
        BLUEPRINT_MANAGER.removeInvalidBlueprints();
        ZONE_MANAGER.iterate_over_zones_tick();
        INDOOR_REGIONS.update_state();
        CALENDAR.update();
        ANIMAL_MANAGER.tick();
        updateGrassState();
    }
    updateCameraMovement();
    setTimeout(gameLoop, 1);
}
function renderLoop() {
    call_all_draw_functions();
    update_RHS_menu();
    window.requestAnimationFrame(renderLoop);
}
function checkDeviceAndThrowError() {
    const isMobile = (/Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isMobile) {
        $("#loading_screen").text("Dorflike is meant to be played on a Desktop");
        throw new Error("Mobile devices are not supported.");
    }
}
let last_grass_update = null;
const grass_tick_time = 2000; // 2 seconds;
function updateGrassState() {
    if (last_grass_update === null || last_grass_update + grass_tick_time < FrameTime.current_time) {
        last_grass_update = FrameTime.current_time;
        GAME_MAP.update_grass();
    }
}
function call_all_draw_functions() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    GAME_MAP.render_tiles();
    ZONE_MANAGER.draw_zones();
    GAME_MAP.render_entities();
    BLUEPRINT_MANAGER.drawBluePrints();
    ANIMAL_MANAGER.render();
    drawCharacters();
    INDOOR_REGIONS.draw();
    highlight_selected_tiles();
    CALENDAR.print_readable_text();
    CALENDAR.render_overlay();
    if (mouse_currently_over) {
        ctx.strokeStyle = 'rgba(15, 15, 125, 0.8)';
        ctx.strokeRect(mouse_currently_over.x * TILE_SIZE - CAMERA_X, mouse_currently_over.y * TILE_SIZE - CAMERA_Y, TILE_SIZE, TILE_SIZE);
    }
}
function drawCharacters() {
    for (const one_char of Object.values(CHARACTERS)) {
        one_char.render();
    }
}
function assignBlueprintsToIdleDwarfs() {
    ITEM_CACHE.buildCache();
    for (const one_char of CHARACTERS) {
        if (one_char.itinerary.is_idle()) {
            BLUEPRINT_MANAGER.assign_job_to_a_dwarf(one_char);
        }
    }
}
function updateCharacters() {
    for (const one_char of CHARACTERS) {
        one_char.update_dwarf();
    }
}
loadAllImagesAndLaunch().then(function () {
    document.getElementById("loading_screen").style.opacity = '0';
    document.getElementById("loading_screen").style.pointerEvents = 'none';
    gameLoop();
    window.requestAnimationFrame(renderLoop);
}).catch(error => { console.error("Error loading images:", error); });
