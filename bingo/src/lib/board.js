const Dogen = ["Dogen 005 - Isolated Platform down the hill",
"Dogen 034 - Right of street",
"Dogen 061 - Past Statue",
"Dogen 092 - Grind x 10",
"Dogen 117 - Air x 3",
"Dogen 006 - Tricks x 20",
"Dogen 035 - Points x 50k",
"Dogen 062 - Special (Grind Avenue)"];

const Shibuya = ["Shibuya 007 - On top of bus",
"Shibuya 093 - Cubby",
"Shibuya 119 - Platform",
"Shibuya 036 - Grind x 10",
"Shibuya 063 - Air x 3",
"Shibuya 094 - Tricks x 25",
"Shibuya 121 - Points x 100k",
"Shibuya 008 - Special (13 platforms)"];

const Chuo = ["Chuo 037 - Right Canal",
"Chuo 064 - Cubby",
"Chuo 095 - South of Hayashi",
"Chuo 122 - Grind x 10",
"Chuo 009 - Air x 4",
"Chuo 038 - Tricks x 30",
"Chuo 065 - Points x 60k",
"Chuo 096 - Special (G/W to end)"];

const RDH = ["RDH 010 - Top of station",
"RDH 039 - Platform above Cops 2",
"RDH 123 - Sauna",
"RDH 067 - Grind x 10",
"RDH 097 - Air x 4",
"RDH 124 - Tricks x 35",
"RDH 011 - Points x 40k",
"RDH 040 - Special (Grind Lower Chimney)"];

const _99th = ["99th 068 - Center of Dark",
"99th 098 - Light Wallride",
"99th 126 - Wallride TO Dark",
"99th 012 - Grind x 15",
"99th 041 - Air x 4",
"99th 069 - Tricks x 40",
"99th 099 - Points x 100k",
"99th 127 - Special (Perimeter of Tower)"];

const Sewers = ["Sewers 013 - Entrance",
"Sewers 042 - Center Structure",
"Sewers 070 - Rail, Floor 1 to 2",
"Sewers 100 - Grind x 10",
"Sewers 128 - Air x 4",
"Sewers 015 - Tricks x 45",
"Sewers 043 - Points x 100k",
"Sewers 071 - Special (Points x 150k)"];

const BP = ["Btm pt. 016 - Catwalk, PJ Room 3",
"Btm pt. 101 - Catwalk, near Cube",
"Btm pt. 129 - Right halfpipe after winding rails",
"Btm pt. 044 - Grind x 10",
"Btm pt. 072 - Air x 4",
"Btm pt. 102 - Tricks x 50",
"Btm pt. 130 - Points x 50k",
"Btm pt. 017 - Special (Points x 70k)"];

const Hikage = ["Hikage 045 - Cubby",
"Hikage 073 - Crane",
"Hikage 103 - Center, floating",
"Hikage 131 - Grind x 20",
"Hikage 018 - Air x 4",
"Hikage 046 - Tricks x 55",
"Hikage 074 - Points x 300k",
"Hikage 104 - Special (Crane, Top, Bottom)"];

const Kibo = ["Kibo 019 - Under tower",
"Kibo 047 - Lower platform, under wires",
"Kibo 132 - Upper platform at end",
"Kibo 076 - Grind x 20",
"Kibo 105 - Air x 4",
"Kibo 133 - Tricks x 60",
"Kibo 021 - Points x 250k",
"Kibo 049 - Special (Walk under gate at top)"];

const SDPP = ["SDPP 077 - Top of Observatory",
"SDPP 106 - Floating, Pink Halfpipes",
"SDPP 134 - Entrance Pillar",
"SDPP 022 - Grind x 20",
"SDPP 050 - Air x 4",
"SDPP 079 - Tricks x 65",
"SDPP 107 - Points x 110k",
"SDPP 135 - Special (Circle the Pharaoh)"];

const HWY0 = ["HWY0 023 - Directly under entrance",
"HWY0 051 - Left alley near tall neon sign",
"HWY0 080 - Trash Pit",
"HWY0 108 - Grind x 15",
"HWY0 136 - Air x 5",
"HWY0 024 - Tricks x 70",
"HWY0 052 - Points x 90k",
"HWY0 081 - Special (Wallride alley)"];

const Dino = ["Sky Dino 026 - On top of T-rex",
"Sky Dino 054 - Under Brontosaurus",
"Sky Dino 109 - Platform near starting spiral",
"Sky Dino 137 - Platform under first swing",
"Sky Dino 082 - Grind x 50",
"Sky Dino 110 - Air x 6",
"Sky Dino 138 - Tricks x 100",
"Sky Dino 027 - Points x 10k",
"Sky Dino 055 - Special (Rail, Swing, Rail)"];

const FRZ = ["FRZ 083 - 'Clip' soul, lower area",
"FRZ 111 - Middle of upper area, down tube",
"FRZ 139 - Very top, End of first Maze",
"FRZ 028 - Grind x 10",
"FRZ 056 - Air x 8",
"FRZ 084 - Tricks x 100",
"FRZ 112 - Points x 50k",
"FRZ 140 - Special (Grind up the metal)"];

const Chars = ["RDH Unlock Rhyth",
"Kibo Unlock Boogie",
"HWY0 Unlock Soda",
"Stadium Unlock Jazz",
"Btm pt. Unlock Cube"]

const Graffiti = ["Dogen Spray 100% GRAFFITI",
"Shibuya Spray 100% GRAFFITI",
"Chuo Spray 100% GRAFFITI",
"RDH Spray 100% GRAFFITI",
"99th Spray 100% GRAFFITI",
"Sewers Spray 100% GRAFFITI",
"Btm pt. Spray 100% GRAFFITI",
"Hikage Spray 100% GRAFFITI",
"Kibo Spray 100% GRAFFITI",
"SDPP Spray 100% GRAFFITI",
"HWY0 Spray 100% GRAFFITI",
"Sky Dino Spray 100% GRAFFITI", "FRZ Spray 100% GRAFFITI"];

const all_levels = [Dogen, Shibuya, Chuo, RDH, _99th, Sewers, BP, Hikage, Kibo, SDPP, HWY0, Dino, FRZ];
const Souls = ["Dogen 005 - Isolated Platform down the hill", "Dogen 034 - Right of street", "Dogen 061 - Past Statue", "Dogen 092 - Grind x 10", "Dogen 117 - Air x 3", "Dogen 006 - Tricks x 20", "Dogen 035 - Points x 50k", "Dogen 062 - Special (Grind Avenue)", "Shibuya 007 - On top of bus", "Shibuya 093 - Cubby", "Shibuya 119 - Platform", "Shibuya 036 - Grind x 10", "Shibuya 063 - Air x 3", "Shibuya 094 - Tricks x 25", "Shibuya 121 - Points x 100k", "Shibuya 008 - Special (13 platforms)", "Chuo 037 - Right Canal", "Chuo 064 - Cubby", "Chuo 095 - South of Hayashi", "Chuo 122 - Grind x 10", "Chuo 009 - Air x 4", "Chuo 038 - Tricks x 30", "Chuo 065 - Points x 60k", "Chuo 096 - Special (G/W to end)", "RDH 010 - Top of station", "RDH 039 - Platform above Cops 2", "RDH 123 - Sauna", "RDH 067 - Grind x 10", "RDH 097 - Air x 4", "RDH 124 - Tricks x 35", "RDH 011 - Points x 40k", "RDH 040 - Special (Grind Lower Chimney)", "99th 068 - Center of Dark", "99th 098 - Light Wallride", "99th 126 - Wallride TO Dark", "99th 012 - Grind x 15", "99th 041 - Air x 4", "99th 069 - Tricks x 40", "99th 099 - Points x 100k", "99th 127 - Special (Perimeter of Tower)", "Sewers 013 - Entrance", "Sewers 042 - Center Structure", "Sewers 070 - Rail, Floor 1 to 2", "Sewers 100 - Grind x 10", "Sewers 128 - Air x 4", "Sewers 015 - Tricks x 45", "Sewers 043 - Points x 100k", "Sewers 071 - Special (Points x 150k)", "Btm pt. 016 - Catwalk, PJ Room 3", "Btm pt. 101 - Catwalk, near Cube", "Btm pt. 129 - Right halfpipe after winding rails", "Btm pt. 044 - Grind x 10", "Btm pt. 072 - Air x 4", "Btm pt. 102 - Tricks x 50", "Btm pt. 130 - Points x 50k", "Btm pt. 017 - Special (Points x 70k)", "Hikage 045 - Cubby", "Hikage 073 - Crane", "Hikage 103 - Center, floating", "Hikage 131 - Grind x 20", "Hikage 018 - Air x 4", "Hikage 046 - Tricks x 55", "Hikage 074 - Points x 300k", "Hikage 104 - Special (Crane, Top, Bottom)", "Kibo 019 - Under tower", "Kibo 047 - Lower platform, under wires", "Kibo 132 - Upper platform at end", "Kibo 076 - Grind x 20", "Kibo 105 - Air x 4", "Kibo 133 - Tricks x 60", "Kibo 021 - Points x 250k", "Kibo 049 - Special (Walk under gate at top)", "SDPP 077 - Top of Observatory", "SDPP 106 - Floating, Pink Halfpipes", "SDPP 134 - Entrance Pillar", "SDPP 022 - Grind x 20", "SDPP 050 - Air x 4", "SDPP 079 - Tricks x 65", "SDPP 107 - Points x 110k", "SDPP 135 - Special (Circle the Pharaoh)", "HWY0 023 - Directly under entrance", "HWY0 051 - Left alley near tall neon sign", "HWY0 080 - Trash Pit", "HWY0 108 - Grind x 15", "HWY0 136 - Air x 5", "HWY0 024 - Tricks x 70", "HWY0 052 - Points x 90k", "HWY0 081 - Special (Wallride alley)", "Sky Dino 026 - On top of T-rex", "Sky Dino 054 - Under Brontosaurus", "Sky Dino 109 - Platform near starting spiral", "Sky Dino 137 - Platform under first swing", "Sky Dino 082 - Grind x 50", "Sky Dino 110 - Air x 6", "Sky Dino 138 - Tricks x 100", "Sky Dino 027 - Points x 10k", "Sky Dino 055 - Special (Rail, Swing, Rail)", "FRZ 083 - 'Clip' soul, lower area", "FRZ 111 - Middle of upper area, down tube", "FRZ 139 - Very top, End of first Maze", "FRZ 028 - Grind x 10", "FRZ 056 - Air x 8", "FRZ 084 - Tricks x 100", "FRZ 112 - Points x 50k", "FRZ 140 - Special (Grind up the metal)"];
const beginner_friendly_items = ['Dogen 005 - Isolated Platform down the hill', 'Dogen 034 - Right of street', 'Dogen 061 - Past Statue', 'Dogen 092 - Grind x 10', 'Dogen 117 - Air x 3', 'Dogen 006 - Tricks x 20', 'Dogen 035 - Points x 50k', 'Shibuya 007 - On top of bus', 'Shibuya 093 - Cubby', 'Shibuya 119 - Platform', 'Shibuya 036 - Grind x 10', 'Shibuya 063 - Air x 3', 'Shibuya 094 - Tricks x 25', 'Shibuya 121 - Points x 100k', 'Chuo 037 - Right Canal', 'Chuo 064 - Cubby', 'Chuo 095 - South of Hayashi', 'Chuo 122 - Grind x 10', 'Chuo 009 - Air x 4', 'Chuo 038 - Tricks x 30', 'Chuo 065 - Points x 60k', 'RDH 010 - Top of station', 'RDH 039 - Platform above Cops 2', 'RDH 123 - Sauna', 'RDH 067 - Grind x 10', 'RDH 097 - Air x 4', 'RDH 124 - Tricks x 35', 'RDH 011 - Points x 40k', '99th 068 - Center of Dark', '99th 098 - Light Wallride', '99th 126 - Wallride TO Dark', '99th 012 - Grind x 15', '99th 041 - Air x 4', '99th 069 - Tricks x 40', '99th 099 - Points x 100k', 'Sewers 013 - Entrance', 'Sewers 042 - Center Structure', 'Sewers 070 - Rail, Floor 1 to 2', 'Sewers 100 - Grind x 10', 'Sewers 128 - Air x 4', 'Sewers 015 - Tricks x 45', 'Sewers 043 - Points x 100k', 'Btm pt. 016 - Catwalk, PJ Room 3', 'Btm pt. 101 - Catwalk, near Cube', 'Btm pt. 129 - Right halfpipe after winding rails', 'Btm pt. 044 - Grind x 10', 'Btm pt. 072 - Air x 4', 'Btm pt. 102 - Tricks x 50', 'Btm pt. 130 - Points x 50k', 'Hikage 045 - Cubby', 'Hikage 073 - Crane', 'Hikage 103 - Center, floating', 'Hikage 131 - Grind x 20', 'Hikage 018 - Air x 4', 'Hikage 046 - Tricks x 55', 'Hikage 074 - Points x 300k', 'Kibo 019 - Under tower', 'Kibo 047 - Lower platform, under wires', 'Kibo 132 - Upper platform at end', 'Kibo 076 - Grind x 20', 'Kibo 105 - Air x 4', 'Kibo 133 - Tricks x 60', 'Kibo 021 - Points x 250k', 'SDPP 077 - Top of Observatory', 'SDPP 106 - Floating, Pink Halfpipes', 'SDPP 134 - Entrance Pillar', 'SDPP 022 - Grind x 20', 'SDPP 050 - Air x 4', 'SDPP 079 - Tricks x 65', 'SDPP 107 - Points x 110k', 'HWY0 023 - Directly under entrance', 'HWY0 051 - Left alley near tall neon sign', 'HWY0 080 - Trash Pit', 'HWY0 108 - Grind x 15']
const Souls_defaults = ['Dogen 005 - Isolated Platform down the hill', 'Dogen 034 - Right of street', 'Dogen 061 - Past Statue', 'Dogen 092 - Grind x 10', 'Dogen 117 - Air x 3', 'Dogen 006 - Tricks x 20', 'Dogen 035 - Points x 50k', 'Dogen 062 - Special (Grind Avenue)', 'Shibuya 007 - On top of bus', 'Shibuya 093 - Cubby', 'Shibuya 119 - Platform', 'Shibuya 036 - Grind x 10', 'Shibuya 063 - Air x 3', 'Shibuya 094 - Tricks x 25', 'Shibuya 121 - Points x 100k', 'Shibuya 008 - Special (13 platforms)', 'Chuo 037 - Right Canal', 'Chuo 064 - Cubby', 'Chuo 095 - South of Hayashi', 'Chuo 122 - Grind x 10', 'Chuo 009 - Air x 4', 'Chuo 038 - Tricks x 30', 'Chuo 065 - Points x 60k', 'Chuo 096 - Special (G/W to end)', 'RDH 010 - Top of station', 'RDH 039 - Platform above Cops 2', 'RDH 123 - Sauna', 'RDH 067 - Grind x 10', 'RDH 097 - Air x 4', 'RDH 124 - Tricks x 35', 'RDH 011 - Points x 40k', 'RDH 040 - Special (Grind Lower Chimney)', '99th 068 - Center of Dark', '99th 098 - Light Wallride', '99th 126 - Wallride TO Dark', '99th 012 - Grind x 15', '99th 041 - Air x 4', '99th 069 - Tricks x 40', '99th 099 - Points x 100k', '99th 127 - Special (Perimeter of Tower)', 'Sewers 013 - Entrance', 'Sewers 042 - Center Structure', 'Sewers 070 - Rail, Floor 1 to 2', 'Sewers 100 - Grind x 10', 'Sewers 128 - Air x 4', 'Sewers 015 - Tricks x 45', 'Sewers 043 - Points x 100k', 'Sewers 071 - Special (Points x 150k)', 'Btm pt. 016 - Catwalk, PJ Room 3', 'Btm pt. 101 - Catwalk, near Cube', 'Btm pt. 129 - Right halfpipe after winding rails', 'Btm pt. 044 - Grind x 10', 'Btm pt. 072 - Air x 4', 'Btm pt. 102 - Tricks x 50', 'Btm pt. 130 - Points x 50k', 'Btm pt. 017 - Special (Points x 70k)', 'Hikage 045 - Cubby', 'Hikage 073 - Crane', 'Hikage 103 - Center, floating', 'Hikage 131 - Grind x 20', 'Hikage 018 - Air x 4', 'Hikage 046 - Tricks x 55', 'Hikage 074 - Points x 300k', 'Hikage 104 - Special (Crane, Top, Bottom)', 'Kibo 019 - Under tower', 'Kibo 047 - Lower platform, under wires', 'Kibo 132 - Upper platform at end', 'Kibo 076 - Grind x 20', 'Kibo 105 - Air x 4', 'Kibo 133 - Tricks x 60', 'Kibo 021 - Points x 250k', 'Kibo 049 - Special (Walk under gate at top)', 'SDPP 077 - Top of Observatory', 'SDPP 106 - Floating, Pink Halfpipes', 'SDPP 134 - Entrance Pillar', 'SDPP 022 - Grind x 20', 'SDPP 050 - Air x 4', 'SDPP 079 - Tricks x 65', 'SDPP 107 - Points x 110k', 'SDPP 135 - Special (Circle the Pharaoh)']

const shibuya_graffiti = ["Dogen Spray 100% GRAFFITI", "Shibuya Spray 100% GRAFFITI", "Chuo Spray 100% GRAFFITI", "Hikage Spray 100% GRAFFITI"];
const kogane_graffiti = ["RDH Spray 100% GRAFFITI", "Sewers Spray 100% GRAFFITI", "Btm pt. Spray 100% GRAFFITI", "Kibo Spray 100% GRAFFITI", "FRZ Spray 100% GRAFFITI"];
const benten_graffiti = ["99th Spray 100% GRAFFITI", "SDPP Spray 100% GRAFFITI", "HWY0 Spray 100% GRAFFITI", "Sky Dino Spray 100% GRAFFITI"];

function shuffle(array) {
    var currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
}

function Board_from_list_of_squares(list_of_squares) {
    var Board = "";
    // console.log("squares length : ".concat(list_of_squares.length))
    for (const squarex of list_of_squares) {
        Board += '{"name":"' + squarex + '", "color":"#101010"},';
    }
    Board = "[" + Board.slice(0, -1) + "]";
    return Board;
}

function n_graffiti(n, unbalanced, Graffiti) {
    var number_of_graffiti;

    if (n === true) return [];
    else if (n === false) {
        var r = Math.random();
        number_of_graffiti = r < 0.1915 ? 1 : (r < 0.5085 ? 2 : (r < 0.8123 ? 3 : 4));
    } else {
        number_of_graffiti = n > 13 ? 13 : n;
    }

    var graffiti_list = [];
    var graffiti_sources = unbalanced ? [shibuya_graffiti, kogane_graffiti, benten_graffiti] : [Graffiti];

    // Recursive function to build the graffiti list
    function addGraffiti(count) {
        if (count === 0) return;

        var pushed = false;
        while (!pushed) {
            var area = Math.floor(Math.random() * graffiti_sources.length);
            var level = Math.floor(Math.random() * graffiti_sources[area].length);

            if (!graffiti_list.includes(graffiti_sources[area][level])) {
                graffiti_list.push(graffiti_sources[area][level]);
                pushed = true;
            }
        }

        addGraffiti(count - 1); // Recursive call
    }

    addGraffiti(number_of_graffiti); // Start recursion

    return graffiti_list;
}


function n_nongraffiti(n, unbalanced, stacked, Souls, Chars) {
    var Shibuya_cho = [];
    var Kogane = [];
    var Benten = [];
    var nongraffiti = shuffle(Souls.concat(Chars));
    
    // Categorize each square into the correct area
    for (const square of nongraffiti) {
        var shib_opts = ["Dog", "Shi", "Chu", "Hik"];
        var kog_opts = ["RDH", "Sew", "Btm", "Kib", "FRZ"];
        var ben_opts = ["99t", "Sta", "SDP", "Sky", "HWY"];
        
        if (shib_opts.includes(square.slice(0, 3))) Shibuya_cho.push(square);
        else if (kog_opts.includes(square.slice(0, 3))) Kogane.push(square);
        else if (ben_opts.includes(square.slice(0, 3))) Benten.push(square);
    }

    var squares = [];

    // Recursive function to handle the area selection
    function addSquares(count, areaType) {
        if (count === 0) return; // Base case: when no more squares need to be added

        let area;
        if (areaType === 1) {
            area = Shibuya_cho;
        } else if (areaType === 2) {
            area = Kogane;
        } else if (areaType === 3) {
            area = Benten;
        } else {
            area = [Shibuya_cho, Kogane, Benten][Math.floor(Math.random() * 3)];
        }

        if (area.length > 0) {
            squares.push(area.splice(Math.floor(Math.random() * area.length), 1)[0]);
            addSquares(count - 1, areaType); // Recursively call with decremented count
        } else {
            addSquares(count, areaType); // If the selected area is empty, try again
        }
    }

    // Main logic for recursion
    if (stacked == 1) {
        addSquares(n, null); // Randomly pick areas for each square
    } else {
        let numforarea = Math.floor(Math.random() * (4)) + 10;
        
        if (stacked == 2) {
            addSquares(numforarea, 1); // Add squares to Shibuya_cho area
        } else if (stacked == 3) {
            addSquares(numforarea, 2); // Add squares to Kogane area
        } else {
            addSquares(numforarea, 3); // Add squares to Benten area
        }
        
        addSquares(n - numforarea, null); // Add remaining squares from any area
    }

    return squares;
}



function is_bingo_simple(squares) {
    var result = true;
    var rows_w_graf = [];
    var cols_w_graf = [];
    var tlbr = 0;
    var bltr = 0;
    squares.forEach((square, index) => {
        if (square.includes("GRAFFITI")) {
            var row = Math.floor(index / 5);
            var col = index % 5;
            if (row === col) tlbr++;
            if (row + col === 4) bltr++;
            if (rows_w_graf.includes(row) || cols_w_graf.includes(col) || tlbr > 1 || bltr > 1) result = false;
            rows_w_graf.push(row);
            cols_w_graf.push(col);
        }
    });
    return result;
}

function shouldshuffle(squares, n, simple_bingos) {
    if (n <= 5 && simple_bingos && !is_bingo_simple(squares)) {
        return shouldshuffle(shuffle(squares), n, simple_bingos);
    }
    return squares;
}


function generate_normal_board(n, simple_bingos, unbalanced, stacked, Graffiti, Souls, Chars) {
    var graffiti = n_graffiti(n, unbalanced, Graffiti);
    var nongraffiti = n_nongraffiti(25 - graffiti.length, unbalanced, stacked, Souls, Chars);
    var squares = shouldshuffle(shuffle(graffiti.concat(nongraffiti)), n, simple_bingos);
    var board = Board_from_list_of_squares(squares);
    return board;
}


function generate_beginner_board(beginner_friendly_items, Graffiti, simple_bingos) {
    const nongraffiti = beginner_friendly_items;
    const easy_graffiti = shuffle([Graffiti[0], Graffiti[1], Graffiti[2], Graffiti[3], Graffiti[6], Graffiti[10]]);
    let squares = [];
    const number_of_graffiti = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * easy_graffiti.length);
            if (squares.includes(easy_graffiti[squareIndex])) {
                squareIndex = Math.floor(Math.random() * easy_graffiti.length);
            } else {
                squares.push(easy_graffiti[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    for (let i = 0; i < 25 - number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * nongraffiti.length);
            if (squares.includes(nongraffiti[squareIndex])) {
                squareIndex = Math.floor(Math.random() * nongraffiti.length);
            } else {
                squares.push(nongraffiti[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    const graffitis = squares.filter(graffiti => graffiti.includes("GRAFFITI"));
    squares = shouldshuffle(squares, number_of_graffiti, simple_bingos)
    const board = Board_from_list_of_squares(squares);
    return board;
}


function generate_fast_board(all_levels, Chars, simple_bingos) {
    let defaults = [].concat(...all_levels).flat();
    defaults.splice(12, 1);
    let squares = [];
    for (let i = 0; i < 10; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * defaults.length);
            if (!squares.includes(defaults[squareIndex])) {
                squares.push(defaults[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    let fast_graffiti = [Graffiti[0], Graffiti[1], Graffiti[2], Graffiti[3], Graffiti[6], Graffiti[10], Graffiti[11]];
    let number_of_graffiti = Math.floor(Math.random() * 2) + 1 - Math.floor(Math.random() * 2);
    for (let i = 0; i < number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * fast_graffiti.length);
            if (!squares.includes(fast_graffiti[squareIndex])) {
                squares.push(fast_graffiti[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    let souls = [].concat(...all_levels, defaults, Chars);
    for (let i = 0; i < 15 - number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * souls.length);
            if (!squares.includes(souls[squareIndex])) {
                squares.push(souls[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    const graffitis = squares.filter(graffiti => graffiti.includes("GRAFFITI"));
    squares = shouldshuffle(squares, number_of_graffiti, simple_bingos);
    const board = Board_from_list_of_squares(squares);
    return board;
}


function generate_ch1to4(Souls_defaults, simple_bingos) {
    const chars = ["Dogen Unlock Beat", "Shibuya Unlock Combo", "RDH Unlock Rhyth", "Sewers Unlock Garam", "Kibo Unlock Boogie"];
    const souls = Souls_defaults;
    const nongraffiti = chars.concat(souls);
    const graffiti = ["Dogen Spray 100% GRAFFITI", "Shibuya Spray 100% GRAFFITI", "Chuo Spray 100% GRAFFITI", "RDH Spray 100% GRAFFITI", "99th Spray 100% GRAFFITI", "Hikage Spray 100% GRAFFITI", "Kibo Spray 100% GRAFFITI", "SDPP Spray 100% GRAFFITI"];
    let squares = [];
    let number_of_graffiti = Math.floor(Math.random() * 2) + 1 - Math.floor(Math.random() * 2);
    for (let i = 0; i < number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * graffiti.length);
            if (!squares.includes(graffiti[squareIndex])) {
                squares.push(graffiti[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    for (let i = 0; i < 25 - number_of_graffiti; i++) {
        let notDoneYet = true;
        while (notDoneYet) {
            let squareIndex = Math.floor(Math.random() * nongraffiti.length);
            if (!squares.includes(nongraffiti[squareIndex])) {
                squares.push(nongraffiti[squareIndex]);
                notDoneYet = false;
            }
        }
    }
    squares = shouldshuffle(squares, number_of_graffiti, simple_bingos);
    const graffitis = squares.filter(graffiti => graffiti.includes("GRAFFITI"));
    const board = Board_from_list_of_squares(squares);
    return board;
}


function generate_axb(a, b, t, Souls, Chars, Graffiti, everything_in_one_list, all_levels, defaults) {
    var possible_squares;
    if (t == 1) {
        possible_squares = Souls.concat(Chars, Graffiti);
    } else {
        var Shibuya_cho = [];
        var Kogane_Cho = [];
        var Benten_Cho = [];
        for (const square of everything_in_one_list) {
        var shib_opts = ["Dog", "Shi", "Chu", "Hik"];
        var kog_opts = ["RDH", "Sew", "Btm", "Kib", "FRZ"];
        var ben_opts = ["99t", "Sta", "SDP", "Sky", "HWY"];
        if (shib_opts.includes(square.slice(0, 3))) {
            Shibuya_cho.push(square);
        } else if (kog_opts.includes(square.slice(0, 3))) {
            Kogane_Cho.push(square);
        } else if (ben_opts.includes(square.slice(0, 3))) {
            Benten_Cho.push(square);
        }
        }
        if (t == 2) {
        possible_squares = Shibuya_cho;
        } else if (t == 3) {
        possible_squares = Kogane_Cho;
        } else if (t == 4) {
        possible_squares = Benten_Cho;
        } else if (t == 5) {
        possible_squares = defaults; 
        }
    }

    var empty_rows = [];
    var empty_cols = [];
    for (var i = 0; i < 5; i++) {
        if (i >= a) {
        empty_rows.push(i);
        }
        if (i >= b) {
        empty_cols.push(i);
        }
    }

    var squares = [];
    for (var i = 0; i < 25; i++) {
        if (empty_rows.includes(Math.floor(i / 5)) || empty_cols.includes(i % 5)) {
        squares.push("⠀");
        } else {
        var notDoneYet = true;
        while (notDoneYet) {
            var squareIndex = Math.floor(Math.random() * possible_squares.length);
            if (!squares.includes(possible_squares[squareIndex])) {
            squares.push(possible_squares[squareIndex]);
            notDoneYet = false;
            }
        }
        }
    }

    var graffitis = squares.filter(graffiti => graffiti.includes("GRAFFITI"));
    var board = Board_from_list_of_squares(squares);
    return board;
}

export function generate(mode, stacked, simple_bingos_check, unbalanced_check, custom_graffiti_squares) {
    // call functions to generate board based on mode
    console.log(mode, custom_graffiti_squares);
    if (mode == 3) {
        return generate_beginner_board(beginner_friendly_items, Graffiti, simple_bingos_check)
    } else if (mode == 4) {
        return generate_fast_board(all_levels, Chars, simple_bingos_check)
    } else if (mode == 5) {
        return generate_ch1to4(Souls_defaults, simple_bingos_check)
    } else if (mode == 1) {
        return generate_normal_board(false, simple_bingos_check, unbalanced_check, stacked, Graffiti, Souls, Chars)
    } else if (mode == 2){
        return generate_normal_board(true, simple_bingos_check, stacked, unbalanced_check, Graffiti, Souls, Chars);
    } else if (mode == 6){
        return generate_normal_board(custom_graffiti_squares, simple_bingos_check, unbalanced_check, stacked, Graffiti, Souls, Chars);
    }
}
