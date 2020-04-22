import Raphael from 'raphael'
import createJRemixer from '@/assets/js/jremix.js'
import $ from 'jquery'
import { shuffer, each } from 'underscore'

var remixer
var player
var driver
var track
var cmin
var cmax
var W = '100%',
  H = 400
var paper

var highlightColor = '#0000ff'
var jumpHighlightColor = '#00ff22'
var selectColor = '#ff0000'
var debugMode = true
var fastMode = false
var shifted = false
var controlled = false
var minTileWidth = 20
var maxTileWidth = 90
var growthPerPlay = 10
var curGrowFactor = 1
var jukeboxData = {
  infiniteMode: true, // if true, allow branching
  maxBranches: 4, // max branches allowed per beat
  maxBranchThreshold: 80, // max allowed distance threshold
  computedThreshold: 0, // computed best threshold
  currentThreshold: 0, // current in-use max threshold
  addLastEdge: true, // if true, optimize by adding a good last edge
  justBackwards: false, // if true, only add backward branches
  justLongBranches: false, // if true, only add long branches
  removeSequentialBranches: false, // if true, remove consecutive branches of the same distance
  deletedEdgeCount: 0, // number of edges that have been deleted
  lastBranchPoint: 0, // last beat with a good branch
  longestReach: 0, // longest looping secstion
  beatsPlayed: 0, // total number of beats played
  totalBeats: 0, // total number of beats in the song
  branchCount: 0, // total number of active branches
  selectedTile: null, // current selected tile
  selectedCurve: null, // current selected branch
  tiles: [], // all of the tiles
  allEdges: [], // all of the edges
  deletedEdges: [], // edges that should be deleted
  audioURL: null, // The URL to play audio from; null means default
  trackID: null,
  ogAudioURL: null,
  minRandomBranchChance: 0.18,
  maxRandomBranchChance: 0.5,
  randomBranchChanceDelta: 0.018,
  curRandomBranchChance: 0,
  lastThreshold: 0,
  tuningOpen: false,
  disableKeys: false
}

var timbreWeight = 1,
  pitchWeight = 10,
  loudStartWeight = 1,
  loudMaxWeight = 1,
  durationWeight = 100,
  confidenceWeight = 1

const now = () => {
  return new Date().getTime()
}

function Driver(player) {
  var curTile = null
  var curOp = null
  var incr = 1
  var nextTile = null
  var bounceSeed = null
  var bounceCount = 0
  var nextTime = 0
  var lateCounter = 0
  var lateLimit = 4

  var beatDiv = $('#beats')
  // var playcountDiv = $("#playcount");
  var timeDiv = $('#time')

  function next() {
    if (curTile == null || curTile == undefined) {
      return jukeboxData.tiles[0]
    } else {
      var nextIndex
      if (shifted) {
        if (bounceSeed === null) {
          bounceSeed = curTile
          bounceCount = 0
        }
        if (bounceCount++ % 2 === 1) {
          return selectNextNeighbor(bounceSeed)
        } else {
          return bounceSeed
        }
      }
      if (controlled) {
        return curTile
      } else {
        if (bounceSeed != null) {
          var nextTile = bounceSeed
          bounceSeed = null
          return nextTile
        } else {
          nextIndex = curTile.which + incr
        }
      }

      if (nextIndex < 0) {
        return jukeboxData.tiles[0]
      } else if (nextIndex >= jukeboxData.tiles.length) {
        curOp = null
        player.stop()
      } else {
        return selectRandomNextTile(jukeboxData.tiles[nextIndex])
      }
    }
  }

  function selectCurve(curve) {
    curve.attr('stroke-width', 6)
    curve.attr('stroke', selectColor)
    curve.attr('stroke-opacity', 1.0)
    curve.toFront()
  }

  function selectRandomNextTile(seed) {
    if (seed.q.neighbors.length == 0) {
      return seed
    } else if (shouldRandomBranch(seed.q)) {
      var next = seed.q.neighbors.shift()
      jukeboxData.lastThreshold = next.distance
      seed.q.neighbors.push(next)
      var tile = next.dest.tile
      return tile
    } else {
      return seed
    }
  }

  function selectRandomNextTileNew(seed) {
    if (seed.q.neighbors.length == 0) {
      return seed
    } else if (shouldRandomBranch(seed.q)) {
      var start = window.performance.now()
      var tc = findLeastPlayedNeighbor(seed, 5)
      var tile = tc[0]
      var score = tc[1]
      var delta = window.performance.now() - start
      //console.log('lhd ', seed.which, tile.which, score, delta);
      return tile
    } else {
      return seed
    }
  }

  /**
   * we look for the path to the tile that will bring
   * us to the least played tile in the future (we look
   * at lookAhead beats into the future
   */
  function findLeastPlayedNeighbor(seed, lookAhead) {
    var nextTiles = []

    if (seed.q.which != jukeboxData.lastBranchPoint) {
      nextTiles.push(seed)
    }
    seed.q.neighbors.forEach(function(edge, which) {
      var tile = edge.dest.tile
      nextTiles.push(tile)
    })

    nextTiles = shuffle(nextTiles)

    if (lookAhead == 0) {
      var minTile = null
      nextTiles.forEach(function(tile) {
        if (minTile == null || tile.playCount < minTile.playCount) {
          minTile = tile
        }
      })
      return [minTile, minTile.playCount]
    } else {
      var minTile = null
      nextTiles.forEach(function(tile) {
        var futureTile = findLeastPlayedNeighbor(tile, lookAhead - 1)
        if (minTile == null || futureTile[1] < minTile[1]) {
          minTile = futureTile
        }
      })
      return minTile
    }
  }

  function selectNextNeighbor(seed) {
    if (seed.q.neighbors.length == 0) {
      return seed
    } else {
      var next = seed.q.neighbors.shift()
      seed.q.neighbors.push(next)
      var tile = next.dest.tile
      return tile
    }
  }

  function shouldRandomBranch(q) {
    if (jukeboxData.infiniteMode) {
      if (q.which == jukeboxData.lastBranchPoint) {
        return true
      }

      // return true; // TEST, remove

      jukeboxData.curRandomBranchChance += jukeboxData.randomBranchChanceDelta
      if (
        jukeboxData.curRandomBranchChance > jukeboxData.maxRandomBranchChance
      ) {
        jukeboxData.curRandomBranchChance = jukeboxData.maxRandomBranchChance
      }
      var shouldBranch = Math.random() < jukeboxData.curRandomBranchChance
      if (shouldBranch) {
        jukeboxData.curRandomBranchChance = jukeboxData.minRandomBranchChance
      }
      return shouldBranch
    } else {
      return false
    }
  }

  function windowHidden() {
    return document.webkitHidden
  }
  function updateStats() {
    beatDiv.text(jukeboxData.beatsPlayed)
    timeDiv.text(secondsToTime((now() - startTime) / 1000))
    /*
         if (curTile) {
         playcountDiv.text(curTile.playCount);
         }
         */
  }

  function process() {
    if (curTile !== null && curTile !== undefined) curTile.normal()

    if (curOp) {
      var lastTile = curTile
      if (nextTile != null) {
        curTile = nextTile
        nextTile = null
      } else curTile = curOp()

      if (curTile) {
        var ctime = player.curTime()
        // if we are consistently late we should shutdown
        if (ctime > nextTime) {
          lateCounter++
          if (lateCounter++ > lateLimit && windowHidden()) {
            console.log("Sorry, can't play music properly in the background")
            driver.stop()
            return
          }
        } else lateCounter = 0

        nextTime = player.play(nextTime, curTile.q)

        if (fastMode) nextTime = 0 // set to zero for speedup sim mode

        curTile.playCount += 1

        var delta = nextTime - ctime
        setTimeout(function() {
          process()
        }, 1000 * delta - 10)

        var didJump = false
        if (lastTile && lastTile.which != curTile.which - 1) {
          didJump = true
        }

        curTile.playStyle(didJump)
        jukeboxData.beatsPlayed += 1
        updateStats()
      }
    } else if (curTile != null) curTile.normal()
  }

  function resetPlayCounts() {
    for (var i = 0; i < jukeboxData.tiles.length; i++) {
      jukeboxData.tiles[i].playCount = 0
    }
    curGrowFactor = 1
    redrawTiles()
  }

  var startTime = 0
  return {
    start: function() {
      jukeboxData.beatsPlayed = 0
      nextTime = 0
      bounceSeed = null
      jukeboxData.infiniteMode = true
      jukeboxData.curRandomBranchChance = jukeboxData.minRandomBranchChance
      lateCounter = 0
      curOp = next
      startTime = now()
      //$("#go").text('Stop');
      //error("");
      //info("");
      resetPlayCounts()
      process()
    },

    stop: function() {
      var delta = now() - startTime
      //$("#go").text('Play');
      if (curTile) {
        curTile.normal()
        curTile = null
      }
      curOp = null
      bounceSeed = null
      incr = 1
      player.stop()
    },

    isRunning: function() {
      return curOp !== null
    },

    getIncr: function() {
      return incr
    },

    getCurTile: function() {
      return curTile
    },

    setIncr: function(inc) {
      incr = inc
    },

    setNextTile: function(tile) {
      nextTile = tile
    }
  }
}

function map_value_to_percent(value, min, max) {
  value = clamp(value, min, max)
  return (100 * (value - min)) / (max - min)
}
function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val
}
const getAudioContext = () => {
  if (typeof AudioContext !== 'undefined') return new AudioContext()
  else if (typeof webkitAudioContext !== 'undefined')
    return new webkitAudioContext()

  return null
}

function normalizeColor() {
  cmin = [100, 100, 100]
  cmax = [-100, -100, -100]

  var qlist = track.analysis.segments
  for (var i = 0; i < qlist.length; i++) {
    for (var j = 0; j < 3; j++) {
      var t = qlist[i].timbre[j + 1]

      if (t < cmin[j]) {
        cmin[j] = t
      }
      if (t > cmax[j]) {
        cmax[j] = t
      }
    }
  }
}
function getTitle(title, artist, url) {
  if (
    title == undefined ||
    title.length == 0 ||
    title === '(unknown title)' ||
    title == 'undefined'
  ) {
    if (url) title = extractTitle(url)
    else title = null
  } else {
    if (artist !== '(unknown artist)') title = title + ' by ' + artist
  }
  return title
}

function trackReady(t) {
  t.fixedTitle = getTitle(t.info.title, t.info.artist, t.info.url)
  document.title = 'Musum ' + t.fixedTitle
  console.log(t.fixedTitle) //titulo
  //$("#song-url").attr("href", "https://open.spotify.com/track/" + t.info.id);
  jukeboxData.minLongBranch = track.analysis.beats.length / 5
}

function createTilePanel(which) {
  removeAllTiles()
  jukeboxData.tiles = createTiles(which)
}

function getSegmentColor(seg) {
  var results = []
  for (var i = 0; i < 3; i++) {
    var t = seg.timbre[i + 1]
    var norm = (t - cmin[i]) / (cmax[i] - cmin[i])
    results[i] = norm * 255
    results[i] = norm
  }
  return to_rgb(results[1], results[2], results[0])
  //return to_rgb(results[0], results[1], results[2]);
}

function createTiles(qtype) {
  return createTileCircle(qtype, 100)
}

function getQuantumSegment(q) {
  return q.oseg
}

function isSegment(q) {
  return 'timbre' in q
}

function getBranchColor(q) {
  if (q.neighbors.length === 0) {
    return to_rgb(0, 0, 0)
  } else {
    var red = q.neighbors.length / jukeboxData.maxBranches
    return to_rgb(red, 0, 1 - red)
  }
}

function getQuantumColor(q) {
  if (isSegment(q)) {
    return getSegmentColor(q)
  } else {
    q = getQuantumSegment(q)
    if (q != null) {
      return getSegmentColor(q)
    } else {
      return '#000'
    }
  }
}
function createNewTile(which, q, height, width) {
  var padding = 0
  var tile = Object.create(tilePrototype)
  tile.which = which
  tile.width = width
  tile.height = height
  tile.branchColor = getBranchColor(q)
  tile.quantumColor = getQuantumColor(q)
  tile.normalColor = tile.quantumColor
  tile.isPlaying = false
  tile.isScaled = false
  tile.playCount = 0

  tile.rect = paper.rect(0, 0, tile.width, tile.height)
  tile.rect.attr('stroke', tile.normalColor)
  tile.rect.attr('stroke-width', 0)
  tile.q = q
  tile.init()
  q.tile = tile
  tile.normal()
  return tile
}

function createTileCircle(qtype, radius) {
  var y_padding = 70
  var x_padding = 50
  var maxWidth = 90
  var tiles = []
  var qlist = track.analysis[qtype]
  var n = qlist.length
  var R = radius
  var alpha = (Math.PI * 2) / n
  var perimeter = 2 * n * R * Math.sin(alpha / 2)
  var a = perimeter / n
  var width = a * 20
  var angleOffset = -Math.PI / 2
  // var angleOffset = 0;
  console.log(width)
  if (width > maxWidth) width = maxWidth

  width = minTileWidth

  paper.clear()

  var angle = angleOffset
  for (var i = 0; i < qlist.length; i++) {
    var tile = createNewTile(i, qlist[i], a, width)
    var y = y_padding + R + R * Math.sin(angle)
    var x = x_padding + R + R * Math.cos(angle)
    tile.move(x, y)
    tile.rotate(angle)
    tiles.push(tile)
    angle += alpha
  }

  // now connect every tile to its neighbors

  // a horrible hack until I figure out
  // geometry
  var roffset = width / 2
  var yoffset = width * 0.52
  var xoffset = width * 1
  var center = ' S 180 180 '
  var branchCount = 0
  R -= roffset
  for (var i = 0; i < tiles.length; i++) {
    var startAngle = alpha * i + angleOffset
    var tile = tiles[i]
    var y1 = y_padding + R + R * Math.sin(startAngle) + yoffset
    var x1 = x_padding + R + R * Math.cos(startAngle) + xoffset

    for (var j = 0; j < tile.q.neighbors.length; j++) {
      var destAngle = alpha * tile.q.neighbors[j].dest.which + angleOffset
      var y2 = y_padding + R + R * Math.sin(destAngle) + yoffset
      var x2 = x_padding + R + R * Math.cos(destAngle) + xoffset

      var path = 'M' + x1 + ' ' + y1 + center + x2 + ' ' + y2
      var curve = paper.path(path)
      curve.edge = tile.q.neighbors[j]
      addCurveClickHandler(curve)
      highlightCurve(curve, false, false)
      tile.q.neighbors[j].curve = curve
      branchCount++
    }
  }
  jukeboxData.branchCount = branchCount
  return tiles
}

function selectCurve(curve) {
  curve.attr('stroke-width', 6)
  curve.attr('stroke', selectColor)
  curve.attr('stroke-opacity', 1.0)
  curve.toFront()
}

function addCurveClickHandler(curve) {
  curve.click(function() {
    if (jukeboxData.selectedCurve) {
      highlightCurve(jukeboxData.selectedCurve, false, false)
    }
    selectCurve(curve, true)
    jukeboxData.selectedCurve = curve
  })

  curve.mouseover(function() {
    highlightCurve(curve, true, false)
  })

  curve.mouseout(function() {
    if (curve != jukeboxData.selectedCurve) {
      highlightCurve(curve, false, false)
    }
  })
}

function highlightCurves(tile, enable, didJump) {
  for (var i = 0; i < tile.q.neighbors.length; i++) {
    var curve = tile.q.neighbors[i].curve
    highlightCurve(curve, enable, didJump)
    if (driver.isRunning()) {
      break // just highlight the first one
    }
  }
}

function highlightCurve(curve, enable, jump) {
  if (curve) {
    if (enable) {
      var color = jump ? jumpHighlightColor : highlightColor
      curve.attr('stroke-width', 4)
      curve.attr('stroke', color)
      curve.attr('stroke-opacity', 1.0)
      curve.toFront()
    } else {
      if (curve.edge) {
        curve.attr('stroke-width', 3)
        curve.attr('stroke', curve.edge.src.tile.quantumColor)
        curve.attr('stroke-opacity', 0.7)
      }
    }
  }
}

function removeAllTiles() {
  for (var i = 0; i < jukeboxData.tiles.length; i++) {
    jukeboxData.tiles[i].rect.remove()
  }
  jukeboxData.tiles = []
}

function drawVisualization() {
  if (track) {
    dynamicCalculateNearestNeighbors('beats')

    createTilePanel('beats')
  }
}
function seg_distance(seg1, seg2, field, weighted) {
  if (weighted) {
    return weighted_euclidean_distance(seg1[field], seg2[field])
  } else {
    return euclidean_distance(seg1[field], seg2[field])
  }
}
function euclidean_distance(v1, v2) {
  var sum = 0

  for (var i = 0; i < v1.length; i++) {
    var delta = v2[i] - v1[i]
    sum += delta * delta
  }
  return Math.sqrt(sum)
}

function weighted_euclidean_distance(v1, v2) {
  var sum = 0

  //for (var i = 0; i < 4; i++) {
  for (var i = 0; i < v1.length; i++) {
    var delta = v2[i] - v1[i]
    //var weight = 1.0 / ( i + 1.0);
    var weight = 1.0
    sum += delta * delta * weight
  }
  return Math.sqrt(sum)
}

function get_seg_distances(seg1, seg2) {
  var timbre = seg_distance(seg1, seg2, 'timbre', true)
  var pitch = seg_distance(seg1, seg2, 'pitches')
  var sloudStart = Math.abs(seg1.loudness_start - seg2.loudness_start)
  var sloudMax = Math.abs(seg1.loudness_max - seg2.loudness_max)
  var duration = Math.abs(seg1.duration - seg2.duration)
  var confidence = Math.abs(seg1.confidence - seg2.confidence)
  var distance =
    timbre * timbreWeight +
    pitch * pitchWeight +
    sloudStart * loudStartWeight +
    sloudMax * loudMaxWeight +
    duration * durationWeight +
    confidence * confidenceWeight
  return distance
}

function calculateNearestNeighborsForQuantum(
  type,
  maxNeighbors,
  maxThreshold,
  q1
) {
  var edges = []
  var id = 0
  for (var i = 0; i < track.analysis[type].length; i++) {
    if (i === q1.which) {
      continue
    }

    var q2 = track.analysis[type][i]
    var sum = 0
    for (var j = 0; j < q1.overlappingSegments.length; j++) {
      var seg1 = q1.overlappingSegments[j]
      var distance = 100
      if (j < q2.overlappingSegments.length) {
        var seg2 = q2.overlappingSegments[j]
        // some segments can overlap many quantums,
        // we don't want this self segue, so give them a
        // high distance
        if (seg1.which === seg2.which) {
          distance = 100
        } else {
          distance = get_seg_distances(seg1, seg2)
        }
      }
      sum += distance
    }
    var pdistance = q1.indexInParent == q2.indexInParent ? 0 : 100
    var totalDistance = sum / q1.overlappingSegments.length + pdistance
    if (totalDistance < maxThreshold) {
      var edge = {
        id: id,
        src: q1,
        dest: q2,
        distance: totalDistance,
        curve: null,
        deleted: false
      }
      edges.push(edge)
      id++
    }
  }

  edges.sort(function(a, b) {
    if (a.distance > b.distance) {
      return 1
    } else if (b.distance > a.distance) {
      return -1
    } else {
      return 0
    }
  })

  q1.all_neighbors = []
  for (i = 0; i < maxNeighbors && i < edges.length; i++) {
    var edge = edges[i]
    q1.all_neighbors.push(edge)

    edge.id = jukeboxData.allEdges.length
    jukeboxData.allEdges.push(edge)
  }
}

function precalculateNearestNeighbors(type, maxNeighbors, maxThreshold) {
  // skip if this is already done
  if ('all_neighbors' in track.analysis[type][0]) {
    return
  }
  jukeboxData.allEdges = []
  for (var qi = 0; qi < track.analysis[type].length; qi++) {
    var q1 = track.analysis[type][qi]
    calculateNearestNeighborsForQuantum(type, maxNeighbors, maxThreshold, q1)
  }
}

function collectNearestNeighbors(type, maxThreshold) {
  var branchingCount = 0
  for (var qi = 0; qi < track.analysis[type].length; qi++) {
    var q1 = track.analysis[type][qi]
    q1.neighbors = extractNearestNeighbors(q1, maxThreshold)
    if (q1.neighbors.length > 0) {
      branchingCount += 1
    }
  }
  return branchingCount
}

function extractNearestNeighbors(q, maxThreshold) {
  var neighbors = []

  for (var i = 0; i < q.all_neighbors.length; i++) {
    var neighbor = q.all_neighbors[i]

    if (neighbor.deleted) {
      continue
    }

    if (jukeboxData.justBackwards && neighbor.dest.which > q.which) {
      continue
    }

    if (
      jukeboxData.justLongBranches &&
      Math.abs(neighbor.dest.which - q.which) < jukeboxData.minLongBranch
    ) {
      continue
    }

    var distance = neighbor.distance
    if (distance <= maxThreshold) {
      neighbors.push(neighbor)
    }
  }
  return neighbors
}

function dynamicCalculateNearestNeighbors(type) {
  var count = 0
  var targetBranchCount = track.analysis[type].length / 6

  precalculateNearestNeighbors(
    type,
    jukeboxData.maxBranches,
    jukeboxData.maxBranchThreshold
  )

  for (
    var threshold = 10;
    threshold < jukeboxData.maxBranchThreshold;
    threshold += 5
  ) {
    count = collectNearestNeighbors(type, threshold)
    if (count >= targetBranchCount) {
      break
    }
  }
  jukeboxData.currentThreshold = jukeboxData.computedThreshold = threshold
  postProcessNearestNeighbors(type)
  return count
}

function postProcessNearestNeighbors(type) {
  removeDeletedEdges()

  if (jukeboxData.addLastEdge) {
    if (longestBackwardBranch(type) < 50) {
      insertBestBackwardBranch(type, jukeboxData.currentThreshold, 65)
    } else {
      insertBestBackwardBranch(type, jukeboxData.currentThreshold, 55)
    }
  }
  calculateReachability(type)
  jukeboxData.lastBranchPoint = findBestLastBeat(type)
  filterOutBadBranches(type, jukeboxData.lastBranchPoint)
  if (jukeboxData.removeSequentialBranches) {
    filterOutSequentialBranches(type)
  }
}

function findBestLastBeat(type) {
  var reachThreshold = 50
  var quanta = track.analysis[type]
  var longest = 0
  var longestReach = 0
  for (var i = quanta.length - 1; i >= 0; i--) {
    var q = quanta[i]
    //var reach = q.reach * 100 / quanta.length;
    var distanceToEnd = quanta.length - i

    // if q is the last quanta, then we can never go past it
    // which limits our reach

    var reach = ((q.reach - distanceToEnd) * 100) / quanta.length

    if (reach > longestReach && q.neighbors.length > 0) {
      longestReach = reach
      longest = i
      if (reach >= reachThreshold) {
        break
      }
    }
  }
  // console.log('NBest last beat is', longest, 'reach', longestReach, reach);

  jukeboxData.totalBeats = quanta.length
  jukeboxData.longestReach = longestReach
  return longest
}

function filterOutBadBranches(type, lastIndex) {
  var quanta = track.analysis[type]
  for (var i = 0; i < lastIndex; i++) {
    var q = quanta[i]
    var newList = []
    for (var j = 0; j < q.neighbors.length; j++) {
      var neighbor = q.neighbors[j]
      if (neighbor.dest.which < lastIndex) {
        newList.push(neighbor)
      } else {
        // console.log('filtered out arc from', q.which, 'to', neighbor.dest.which);
      }
    }
    q.neighbors = newList
  }
}
function hasSequentialBranch(q, neighbor) {
  if (q.which === jukeboxData.lastBranchPoint) {
    return false
  }

  var qp = q.prev
  if (qp) {
    var distance = q.which - neighbor.dest.which
    for (var i = 0; i < qp.neighbors.length; i++) {
      var odistance = qp.which - qp.neighbors[i].dest.which
      if (distance == odistance) {
        return true
      }
    }
  }
  return false
}

function filterOutSequentialBranches(type) {
  var quanta = track.analysis[type]
  for (var i = quanta.length - 1; i >= 1; i--) {
    var q = quanta[i]
    var newList = []

    for (var j = 0; j < q.neighbors.length; j++) {
      var neighbor = q.neighbors[j]
      if (hasSequentialBranch(q, neighbor)) {
        // skip it
      } else {
        newList.push(neighbor)
      }
    }
    q.neighbors = newList
  }
}

function removeDeletedEdges() {
  for (var i = 0; i < jukeboxData.deletedEdges.length; i++) {
    var edgeID = jukeboxData.deletedEdges[i]
    if (edgeID in jukeboxData.allEdges) {
      var edge = jukeboxData.allEdges[edgeID]
      deleteEdge(edge)
    }
  }
  jukeboxData.deletedEdges = []
}

function deleteEdge(edge) {
  if (!edge.deleted) {
    jukeboxData.deletedEdgeCount++
    edge.deleted = true
    if (edge.curve) {
      edge.curve.remove()
      edge.curve = null
    }
    for (var j = 0; j < edge.src.neighbors.length; j++) {
      var otherEdge = edge.src.neighbors[j]
      if (edge === otherEdge) {
        edge.src.neighbors.splice(j, 1)
        break
      }
    }
  }
}

// we want to find the best, long backwards branch
// and ensure that it is included in the graph to
// avoid short branching songs like:
// http://labs.echonest.com/Uploader/index.html?trid=TRVHPII13AFF43D495

function longestBackwardBranch(type) {
  var longest = 0
  var quanta = track.analysis[type]
  for (var i = 0; i < quanta.length; i++) {
    var q = quanta[i]
    for (var j = 0; j < q.neighbors.length; j++) {
      var neighbor = q.neighbors[j]
      var which = neighbor.dest.which
      var delta = i - which
      if (delta > longest) {
        longest = delta
      }
    }
  }
  var lbb = (longest * 100) / quanta.length
  return lbb
}

function insertBestBackwardBranch(type, threshold, maxThreshold) {
  var found = false
  var branches = []
  var quanta = track.analysis[type]
  for (var i = 0; i < quanta.length; i++) {
    var q = quanta[i]
    for (var j = 0; j < q.all_neighbors.length; j++) {
      var neighbor = q.all_neighbors[j]

      if (neighbor.deleted) {
        continue
      }

      var which = neighbor.dest.which
      var thresh = neighbor.distance
      var delta = i - which
      if (delta > 0 && thresh < maxThreshold) {
        var percent = (delta * 100) / quanta.length
        var edge = [percent, i, which, q, neighbor]
        branches.push(edge)
      }
    }
  }

  if (branches.length === 0) {
    return
  }

  branches.sort(function(a, b) {
    return a[0] - b[0]
  })
  branches.reverse()
  var best = branches[0]
  var bestQ = best[3]
  var bestNeighbor = best[4]
  var bestThreshold = bestNeighbor.distance
  if (bestThreshold > threshold) {
    bestQ.neighbors.push(bestNeighbor)
    // console.log('added bbb from', bestQ.which, 'to', bestNeighbor.dest.which, 'thresh', bestThreshold);
  } else {
    // console.log('bbb is already in from', bestQ.which, 'to', bestNeighbor.dest.which, 'thresh', bestThreshold);
  }
}

function secondsToTime(secs) {
  secs = Math.floor(secs)
  var hours = Math.floor(secs / 3600)
  secs -= hours * 3600
  var mins = Math.floor(secs / 60)
  secs -= mins * 60

  if (hours < 10) {
    hours = '0' + hours
  }
  if (mins < 10) {
    mins = '0' + mins
  }
  if (secs < 10) {
    secs = '0' + secs
  }
  return hours + ':' + mins + ':' + secs
}
function redrawTiles() {
  each(jukeboxData.tiles, function(tile) {
    var newWidth = Math.round(
      (minTileWidth + tile.playCount * growthPerPlay) * curGrowFactor
    )
    if (newWidth < 1) newWidth = 1

    tile.rect.attr('width', newWidth)
  })
}

function calculateReachability(type) {
  var maxIter = 1000
  var iter = 0
  var quanta = track.analysis[type]

  for (var qi = 0; qi < quanta.length; qi++) {
    var q = quanta[qi]
    q.reach = quanta.length - q.which
  }

  for (iter = 0; iter < maxIter; iter++) {
    var changeCount = 0
    for (qi = 0; qi < quanta.length; qi++) {
      var q = quanta[qi]
      var changed = false

      for (var i = 0; i < q.neighbors.length; i++) {
        var q2 = q.neighbors[i].dest
        if (q2.reach > q.reach) {
          q.reach = q2.reach
          changed = true
        }
      }

      if (qi < quanta.length - 1) {
        var q2 = quanta[qi + 1]
        if (q2.reach > q.reach) {
          q.reach = q2.reach
          changed = true
        }
      }

      if (changed) {
        changeCount++
        for (var j = 0; j < q.which; j++) {
          var q2 = quanta[j]
          if (q2.reach < q.reach) q2.reach = q.reach
        }
      }
    }
    if (changeCount == 0) break
  }

  // console.log('reachability map converged after ' + iter + ' iterations. total ' + quanta.length);
}

function readyToPlay(t) {
  //setDisplayMode(true);
  driver = Driver(player)
  console.log('Ready!')
  normalizeColor()
  trackReady(t)
  drawVisualization()
}

const gotTheAnalysis = (profile, remixer, jukeboxData) => {
  return new Promise((resolve, reject) => {
    console.log('Cargando Canción ...')
    $('#loader-text').text('Cargando Canción ...')
    remixer.remixTrack(profile, jukeboxData, function(state, t, percent) {
      track = t
      if (isNaN(percent)) percent = 0

      if (state === 1) {
        console.log('Calculando saltos de la cación...')
        $('#loader-text').text('Calculando saltos de la cación ...')
        setTimeout(function() {
          readyToPlay(t)
          resolve(true)
        }, 10)
      } else if (state === 0) {
        if (percent >= 99) {
          console.log('Calculando saltos de la cación ...')
          $('#loader-text').text('Calculando saltos de la cación ...')
        } else {
          if (percent > 0) {
            console.log(percent + '% of track loaded ')
            $('#loader-text').text(percent + '% de la canción cargado ')
          } else console.log('Cargando la cación')
        }
      } else {
        console.log('Trouble  ' + t.status)
        reject(t.status)
        //setDisplayMode(false);
      }
    })
  })
}

const fetchAnalysis = id => {
  return new Promise((resolve, reject) => {
    var url =
      'https://cors-anywhere.herokuapp.com/https://eternalbox.dev/api/analysis/analyse/' +
      id

    $.ajax({
      url: url,
      dataType: 'json',
      type: 'GET',
      crossDomain: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      success: function(data) {
        console.log(data)
        resolve(data)
      },
      error: function(xhr, textStatus, error) {
        console.log(error)
        reject(error)
      }
    })
  })
}

function convert(value) {
  var integer = Math.round(value)
  var str = Number(integer).toString(16)
  return str.length === 1 ? '0' + str : str
}
function to_rgb(r, g, b) {
  return '#' + convert(r * 255) + convert(g * 255) + convert(b * 255)
}

var tilePrototype = {
  normalColor: '#5f9',

  move: function(x, y) {
    this.rect.attr({ x: x, y: y })
    if (this.label) {
      this.label.attr({ x: x + 2, y: y + 8 })
    }
  },

  rotate: function(angle) {
    var dangle = 360 * (angle / (Math.PI * 2))
    this.rect.transform('r' + dangle)
  },

  play: function(force) {
    if (force || shifted) {
      this.playStyle(true)
      player.play(0, this.q)
    } else if (controlled) {
      this.queueStyle()
      player.queue(this.q)
    } else {
      this.selectStyle()
    }
    if (force) {
      info('Selected tile ' + this.q.which)
      jukeboxData.selectedTile = this
    }
  },

  selectStyle: function() {
    this.rect.attr('fill', '#C9a')
  },

  queueStyle: function() {
    this.rect.attr('fill', '#aFF')
  },

  pauseStyle: function() {
    this.rect.attr('fill', '#F8F')
  },

  playStyle: function(didJump) {
    if (!this.isPlaying) {
      this.isPlaying = true
      if (!this.isScaled) {
        this.isScaled = true
        this.rect.attr('width', maxTileWidth)
      }
      this.rect.toFront()
      this.rect.attr('fill', highlightColor)
      highlightCurves(this, true, didJump)
    }
  },

  normal: function() {
    this.rect.attr('fill', this.normalColor)
    if (this.isScaled) {
      this.isScaled = false
      //this.rect.scale(1/1.5, 1/1.5);
      var newWidth = Math.round(
        (minTileWidth + this.playCount * growthPerPlay) * curGrowFactor
      )
      if (newWidth < 1) {
        newWidth = 1
      }
      if (newWidth > 90) {
        curGrowFactor /= 2
        redrawTiles()
      } else {
        this.rect.attr('width', newWidth)
      }
    }
    highlightCurves(this, false, false)
    this.isPlaying = false
  },

  init: function() {
    var that = this

    this.rect.mouseover(function(event) {
      that.playStyle(false)
      if (debugMode) {
        if (that.q.which > jukeboxData.lastBranchPoint) {
          $('#beats').text(that.q.which + ' ' + that.q.reach + '*')
        } else {
          var qlength = track.analysis.beats.length
          var distanceToEnd = qlength - that.q.which
          $('#beats').text(
            that.q.which +
              ' ' +
              that.q.reach +
              ' ' +
              Math.floor(((that.q.reach - distanceToEnd) * 100) / qlength)
          )
        }
      }
      event.preventDefault()
    })

    this.rect.mouseout(function(event) {
      that.normal()
      event.preventDefault()
    })

    this.rect.mousedown(function(event) {
      event.preventDefault()
      driver.setNextTile(that)
      if (!driver.isRunning()) {
        driver.start()
      }
      if (controlled) {
        driver.setIncr(0)
      }
    })
  }
}
const init = async id => {
  var context = getAudioContext()
  if (context === null) {
    navigator.notification.alert(
      'Lo sentimos, esta aplicación no es compatible con tu dispositivo'
    )

    hideAll()
  } else {
    paper = Raphael('tiles', W, H)
    remixer = createJRemixer(context)
    player = remixer.getPlayer()
    const data = await fetchAnalysis(id)

    await gotTheAnalysis(data, remixer, jukeboxData)

    return driver
  }
}

export default init
