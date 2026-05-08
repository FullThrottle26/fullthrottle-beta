const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve the directory where server.js lives
const ROOT_DIR = path.dirname(require.resolve('./package.json'));
console.log('Server root directory:', ROOT_DIR);
console.log('Files in root:', fs.readdirSync(ROOT_DIR).join(', '));

// ── GAME STATE STORE ──────────────────────────────────────────────────────────
const games = {};

// ── SPEED SYSTEM ──────────────────────────────────────────────────────────────
const BANDS = {
  CA:55,TX:55,FL:55,NY:55,PA:55,
  IL:60,OH:60,GA:60,NC:60,MI:60,
  NJ:65,VA:65,WA:65,AZ:65,TN:65,
  MA:70,IN:70,MO:70,MD:70,WI:70,
  CO:75,MN:75,SC:75,AL:75,LA:75,
  KY:80,OR:80,OK:80,CT:80,UT:80,
  IA:85,NV:85,AR:85,KS:85,MS:85,
  NM:90,NE:90,ID:90,WV:90,HI:90,
  NH:95,ME:95,MT:95,RI:95,DE:95,
  SD:100,ND:100,AK:100,VT:100,WY:100
};

const STATE_NAMES = {
  CA:"California",TX:"Texas",FL:"Florida",NY:"New York",PA:"Pennsylvania",
  IL:"Illinois",OH:"Ohio",GA:"Georgia",NC:"North Carolina",MI:"Michigan",
  NJ:"New Jersey",VA:"Virginia",WA:"Washington",AZ:"Arizona",TN:"Tennessee",
  MA:"Massachusetts",IN:"Indiana",MO:"Missouri",MD:"Maryland",WI:"Wisconsin",
  CO:"Colorado",MN:"Minnesota",SC:"South Carolina",AL:"Alabama",LA:"Louisiana",
  KY:"Kentucky",OR:"Oregon",OK:"Oklahoma",CT:"Connecticut",UT:"Utah",
  IA:"Iowa",NV:"Nevada",AR:"Arkansas",KS:"Kansas",MS:"Mississippi",
  NM:"New Mexico",NE:"Nebraska",ID:"Idaho",WV:"West Virginia",HI:"Hawaii",
  NH:"New Hampshire",ME:"Maine",MT:"Montana",RI:"Rhode Island",DE:"Delaware",
  SD:"South Dakota",ND:"North Dakota",AK:"Alaska",VT:"Vermont",WY:"Wyoming"
};

const TCB = {Park:0,Idle:5,Drive:10,Zoom:15,Max:20,Flash:25};
const TIERS = ["Park","Idle","Drive","Zoom","Max","Flash"];
const WPT = {
  Park:["Cruise","Accelerate","Overdrive"],
  Idle:["Cruise","Accelerate","Overdrive","Turbo"],
  Drive:["Cruise","Accelerate","Overdrive","Turbo","Nitro"],
  Zoom:["Cruise","Accelerate","Overdrive","Turbo","Nitro"],
  Max:["Cruise","Accelerate","Overdrive","Turbo","Nitro","Ghost"],
  Flash:["Cruise","Accelerate","Overdrive","Turbo","Nitro","Ghost"]
};

function wb(w,t){
  if(w==="Ghost") return 95;
  if(w==="Nitro") return(t==="Max"||t==="Flash")?40:30;
  return{Cruise:0,Accelerate:5,Overdrive:10,Turbo:15}[w]??0;
}
function cardSpeed(band,tier,weapon){return band+TCB[tier]+wb(weapon,tier);}

// ── ROUTES ────────────────────────────────────────────────────────────────────
const ROUTES = {
  "I-90": {
    name:"Northern Transcontinental",
    dir:"Boston MA → Seattle WA",
    states:["MA","NY","PA","OH","IN","IL","WI","MN","SD","WY","MT","ID","WA"],
    thresholds:[55,60,65,70,75,80,85,90,95,100,105,110,115]
  },
  "I-95": {
    name:"East Coast",
    dir:"Houlton ME → Miami FL",
    states:["ME","NH","MA","RI","CT","NY","NJ","PA","DE","MD","VA","NC","SC","GA","FL"],
    thresholds:[55,58,61,64,67,70,73,76,79,83,87,91,95,100,105]
  },
  "I-80": {
    name:"Central Transcontinental",
    dir:"San Francisco CA → Fort Lee NJ",
    states:["CA","NV","UT","WY","NE","IA","IL","IN","OH","PA","NJ"],
    thresholds:[55,62,69,76,83,90,96,102,107,111,115]
  },
  "I-10": {
    name:"Southern Transcontinental",
    dir:"Santa Monica CA → Jacksonville FL",
    states:["CA","AZ","NM","TX","LA","MS","AL","FL"],
    thresholds:[55,65,75,85,93,100,108,115]
  },
  "I-40": {
    name:"Mid-South",
    dir:"Barstow CA → Wilmington NC",
    states:["CA","AZ","NM","TX","OK","AR","TN","NC"],
    thresholds:[55,65,75,85,93,100,108,115]
  },
  "I-70": {
    name:"Mid-Country",
    dir:"Cove Fort UT → Baltimore MD",
    states:["UT","CO","KS","MO","IL","IN","OH","WV","PA","MD"],
    thresholds:[55,63,70,78,85,92,98,104,110,115]
  }
};

const WILDCARDS = ["AK","HI","ND"];

// ── DECK BUILDER ──────────────────────────────────────────────────────────────
function buildDeck(routeId, weapon) {
  const route = ROUTES[routeId];
  const deck = [];
  
  // All available tiers for weapon
  const availableTiers = TIERS.filter(t => WPT[t].includes(weapon));
  
  route.states.forEach(abbr => {
    const band = BANDS[abbr];
    // Pick 2 different tier variants
    const shuffledTiers = [...availableTiers].sort(() => Math.random() - 0.5);
    const tier1 = shuffledTiers[0];
    const tier2 = shuffledTiers[1] || shuffledTiers[0];
    deck.push({
      abbr, name: STATE_NAMES[abbr], band,
      tier: tier1, weapon,
      speed: cardSpeed(band, tier1, weapon),
      isWildcard: false
    });
    deck.push({
      abbr, name: STATE_NAMES[abbr], band,
      tier: tier2 !== tier1 ? tier2 : (shuffledTiers[2] || tier2),
      weapon,
      speed: cardSpeed(band, tier2 !== tier1 ? tier2 : (shuffledTiers[2] || tier2), weapon),
      isWildcard: false
    });
  });
  
  // Add 2 wildcard cards
  WILDCARDS.slice(0,2).forEach(abbr => {
    const band = BANDS[abbr];
    const tier = availableTiers[Math.floor(Math.random() * availableTiers.length)];
    deck.push({
      abbr, name: STATE_NAMES[abbr], band,
      tier, weapon,
      speed: cardSpeed(band, tier, weapon),
      isWildcard: true
    });
  });
  
  // Shuffle
  for(let i = deck.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ── GAME LOGIC ────────────────────────────────────────────────────────────────
function createGame(routeId, weapon1) {
  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  const route = ROUTES[routeId];
  games[id] = {
    id, routeId,
    route: { ...route, id: routeId },
    players: {
      p1: { name:"Player 1", weapon: weapon1, deck: buildDeck(routeId, weapon1), position: 0, discard: [], ready: false },
      p2: null
    },
    state: "waiting", // waiting, setup, playing, finished
    turn: { flipped: {p1: null, p2: null}, resolved: false },
    winner: null,
    log: [],
    createdAt: Date.now()
  };
  return games[id];
}

function joinGame(gameId) {
  const game = games[gameId];
  if(!game || game.players.p2) return null;
  const weapon = game.players.p1.weapon;
  game.players.p2 = {
    name:"Player 2", weapon: weapon,
    deck: buildDeck(game.routeId, weapon),
    position: 0, discard: [], ready: false
  };
  game.state = "playing";
  game.log.push("Both players joined. Race begins!");
  return game;
}

function flipCard(gameId, playerId) {
  const game = games[gameId];
  if(!game || game.state !== "playing") return null;
  
  const player = game.players[playerId];
  if(!player || game.turn.flipped[playerId]) return null;
  
  // Recycle if needed
  if(player.deck.length === 0) {
    player.deck = [...player.discard].sort(() => Math.random() - 0.5);
    player.discard = [];
    game.log.push(`${player.name} recycled their deck.`);
  }
  
  const card = player.deck.shift();
  player.discard.push(card);
  game.turn.flipped[playerId] = card;
  
  // Check if both flipped
  if(game.turn.flipped.p1 && game.turn.flipped.p2) {
    resolveBattle(game);
  }
  
  return game;
}

function resolveBattle(game) {
  const {p1, p2} = game.turn.flipped;
  const route = game.route;
  const sameStop = game.players.p1.position === game.players.p2.position;
  
  if(sameStop) {
    // Head-to-head
    if(p1.speed > p2.speed) {
      game.players.p1.position++;
      game.log.push(`Head-to-head: ${p1.name} (${p1.speed} mph) beats ${p2.name} (${p2.speed} mph). Player 1 advances to stop ${game.players.p1.position+1}.`);
    } else if(p2.speed > p1.speed) {
      game.players.p2.position++;
      game.log.push(`Head-to-head: ${p2.name} (${p2.speed} mph) beats ${p1.name} (${p1.speed} mph). Player 2 advances to stop ${game.players.p2.position+1}.`);
    } else {
      // Sudden death - will need another flip
      game.turn.suddenDeath = true;
      game.log.push(`Tied at ${p1.speed} mph — sudden death!`);
      game.turn.flipped = {p1: null, p2: null};
      return;
    }
  } else {
    // Independent threshold checks
    const p1Thresh = route.thresholds[game.players.p1.position];
    const p2Thresh = route.thresholds[game.players.p2.position];
    
    let p1Msg = "", p2Msg = "";
    
    if(p1.speed >= p1Thresh) {
      game.players.p1.position++;
      p1Msg = `P1 ${p1.name} (${p1.speed} mph) clears ${route.states[game.players.p1.position-1]} (${p1Thresh} mph) ✓`;
    } else {
      p1Msg = `P1 ${p1.name} (${p1.speed} mph) misses ${route.states[game.players.p1.position]} threshold (${p1Thresh} mph) ✗`;
    }
    
    if(game.players.p2.position < route.states.length) {
      if(p2.speed >= p2Thresh) {
        game.players.p2.position++;
        p2Msg = `P2 ${p2.name} (${p2.speed} mph) clears ${route.states[game.players.p2.position-1]} (${p2Thresh} mph) ✓`;
      } else {
        p2Msg = `P2 ${p2.name} (${p2.speed} mph) misses ${route.states[game.players.p2.position]} threshold (${p2Thresh} mph) ✗`;
      }
    }
    
    game.log.push(p1Msg);
    if(p2Msg) game.log.push(p2Msg);
  }
  
  // Check win
  const stops = route.states.length;
  if(game.players.p1.position >= stops) {
    game.state = "finished";
    game.winner = "p1";
    game.log.push("🏁 Player 1 wins the race!");
  } else if(game.players.p2.position >= stops) {
    game.state = "finished";
    game.winner = "p2";
    game.log.push("🏁 Player 2 wins the race!");
  }
  
  game.turn.flipped = {p1: null, p2: null};
  game.turn.suddenDeath = false;
}

// ── HTTP SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if(req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  // Serve static files
  if(pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(ROOT_DIR, 'index.html'), 'text/html');
    return;
  }
  if(pathname === '/game.html') {
    serveFile(res, path.join(ROOT_DIR, 'game.html'), 'text/html');
    return;
  }
  
  // API routes
  if(pathname === '/api/routes') {
    json(res, Object.entries(ROUTES).map(([id,r]) => ({
      id, name:r.name, dir:r.dir, stops:r.states.length, deck:(r.states.length*2)+2
    })));
    return;
  }
  
  if(pathname === '/api/weapons') {
    json(res, ["Cruise","Accelerate","Overdrive","Turbo","Nitro","Ghost"]);
    return;
  }
  
  if(pathname === '/api/create' && req.method === 'POST') {
    body(req, data => {
      const {routeId, weapon} = data;
      if(!ROUTES[routeId] || !["Cruise","Accelerate","Overdrive","Turbo","Nitro","Ghost"].includes(weapon)) {
        json(res, {error:"Invalid route or weapon"}, 400); return;
      }
      const game = createGame(routeId, weapon);
      json(res, {gameId: game.id, playerId: "p1"});
    });
    return;
  }
  
  if(pathname === '/api/join' && req.method === 'POST') {
    body(req, data => {
      const {gameId} = data;
      const game = joinGame(gameId);
      if(!game) { json(res, {error:"Game not found or full"}, 400); return; }
      json(res, {gameId: game.id, playerId: "p2"});
    });
    return;
  }
  
  if(pathname === '/api/state') {
    const gameId = url.searchParams.get('gameId');
    const playerId = url.searchParams.get('playerId');
    const game = games[gameId];
    if(!game) { json(res, {error:"Game not found"}, 404); return; }
    json(res, sanitizeGame(game, playerId));
    return;
  }
  
  if(pathname === '/api/flip' && req.method === 'POST') {
    body(req, data => {
      const {gameId, playerId} = data;
      const game = flipCard(gameId, playerId);
      if(!game) { json(res, {error:"Cannot flip"}, 400); return; }
      json(res, sanitizeGame(game, playerId));
    });
    return;
  }
  
  res.writeHead(404); res.end('Not found');
});

function sanitizeGame(game, playerId) {
  const p = game.players[playerId];
  const opp = playerId === "p1" ? game.players.p2 : game.players.p1;
  return {
    gameId: game.id,
    routeId: game.routeId,
    route: game.route,
    state: game.state,
    winner: game.winner,
    myPosition: p?.position ?? 0,
    oppPosition: opp?.position ?? 0,
    myWeapon: p?.weapon,
    oppWeapon: opp?.weapon,
    myDeckCount: p?.deck.length ?? 0,
    myFlipped: game.turn.flipped[playerId],
    oppFlipped: game.turn.flipped[playerId === "p1" ? "p2" : "p1"],
    bothFlipped: !!(game.turn.flipped.p1 && game.turn.flipped.p2),
    suddenDeath: game.turn.suddenDeath || false,
    log: game.log.slice(-8),
    waiting: game.state === "waiting"
  };
}

function serveFile(res, filePath, mime) {
  try {
    console.log('Serving file:', filePath);
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': mime});
    res.end(data);
  } catch(e) {
    console.error('File not found:', filePath, e.message);
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end('<html><body><h1>Full Throttle Beta</h1><p>File not found: ' + filePath + '</p><p><a href="/">Go Home</a></p></body></html>');
  }
}

function json(res, data, status=200) {
  res.writeHead(status, {'Content-Type':'application/json'});
  res.end(JSON.stringify(data));
}

function body(req, cb) {
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => { try { cb(JSON.parse(data)); } catch(e) { cb({}); } });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Full Throttle Beta server running on port ${PORT}`));

module.exports = { ROUTES, BANDS, STATE_NAMES, buildDeck, cardSpeed };
