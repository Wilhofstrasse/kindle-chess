var UserMove = {};
UserMove.from = SQUARES.NO_SQ;
UserMove.to = SQUARES.NO_SQ;

var MirrorFiles = [
  FILES.FILE_H,
  FILES.FILE_G,
  FILES.FILE_F,
  FILES.FILE_E,
  FILES.FILE_D,
  FILES.FILE_C,
  FILES.FILE_B,
  FILES.FILE_A,
];
var MirrorRanks = [
  RANKS.RANK_8,
  RANKS.RANK_7,
  RANKS.RANK_6,
  RANKS.RANK_5,
  RANKS.RANK_4,
  RANKS.RANK_3,
  RANKS.RANK_2,
  RANKS.RANK_1,
];

// Calculate square size to fit viewport (optimized for Kindle Paperwhite 6.8")
var SQ_SIZE = Math.floor((window.innerWidth - 16) / 8);

// Apply dynamic sizing to board and squares
function applyDynamicSizing() {
    var boardSize = SQ_SIZE * 8;
    var pieceSize = Math.floor(SQ_SIZE * 0.85);  // pieces smaller than squares

    // Update board size (centering handled by CSS)
    var boardEl = document.getElementById('Board');
    if (boardEl) {
        boardEl.style.width = boardSize + 'px';
        boardEl.style.height = boardSize + 'px';
    }

    // Match controls width to board
    var controlsEl = document.getElementById('Controls');
    if (controlsEl) {
        controlsEl.style.width = boardSize + 'px';
    }
    var infoEl = document.getElementById('Info');
    if (infoEl) {
        infoEl.style.width = boardSize + 'px';
    }
    var addPlayerEl = document.getElementById('AddPlayer');
    if (addPlayerEl) {
        addPlayerEl.style.width = boardSize + 'px';
    }

    // Generate dynamic CSS for ranks and files
    var style = document.createElement('style');
    var css = '';

    // Square size
    css += '.Square { width: ' + SQ_SIZE + 'px; height: ' + SQ_SIZE + 'px; }\n';

    // Piece size - scale images to fit within squares
    css += '.Piece { width: ' + pieceSize + 'px; height: ' + pieceSize + 'px; }\n';

    // Rank positions (rank1 = bottom = 7*SQ_SIZE from top)
    for (var r = 1; r <= 8; r++) {
        css += '.rank' + r + ' { top: ' + ((8 - r) * SQ_SIZE) + 'px; }\n';
    }

    // File positions
    for (var f = 1; f <= 8; f++) {
        css += '.file' + f + ' { left: ' + ((f - 1) * SQ_SIZE) + 'px; }\n';
    }

    // Flipped positions
    for (var r = 1; r <= 8; r++) {
        css += '.rank' + r + 'flip { top: ' + ((r - 1) * SQ_SIZE) + 'px; }\n';
    }
    for (var f = 1; f <= 8; f++) {
        css += '.file' + f + 'flip { left: ' + ((8 - f) * SQ_SIZE) + 'px; }\n';
    }

    style.textContent = css;
    document.head.appendChild(style);
}

// Apply sizing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDynamicSizing);
} else {
    applyDynamicSizing();
}

function MIRROR120(sq) {
  var file = MirrorFiles[FilesBrd[sq]];
  var rank = MirrorRanks[RanksBrd[sq]];
  return FR2SQ(file, rank);
}

$("#SetFen").click(function () {
  var fenStr = $("#fenIn").val();
  ParseFen(fenStr);
  PrintBoard();
  SetInitialBoardPieces();
  GameController.PlayerSide = brd_side;
  CheckAndSet();
  EvalPosition();
  //PerftTest(5);
  newGameAjax();
});

function CheckResult() {
  if (brd_fiftyMove > 100) {
    $("#GameStatus").text("GAME DRAWN {fifty move rule}");
    return BOOL.TRUE;
  }

  if (ThreeFoldRep() >= 2) {
    $("#GameStatus").text("GAME DRAWN {3-fold repetition}");
    return BOOL.TRUE;
  }

  if (DrawMaterial() == BOOL.TRUE) {
    $("#GameStatus").text("GAME DRAWN {insufficient material to mate}");
    return BOOL.TRUE;
  }

  console.log("Checking end of game");
  GenerateMoves();

  var MoveNum = 0;
  var found = 0;
  for (
    MoveNum = brd_moveListStart[brd_ply];
    MoveNum < brd_moveListStart[brd_ply + 1];
    ++MoveNum
  ) {
    if (MakeMove(brd_moveList[MoveNum]) == BOOL.FALSE) {
      continue;
    }
    found++;
    TakeMove();
    break;
  }

  $("#currentFenSpan").text(BoardToFen());

  if (found != 0) return BOOL.FALSE;
  var InCheck = SqAttacked(
    brd_pList[PCEINDEX(Kings[brd_side], 0)],
    brd_side ^ 1
  );
  console.log("No Move Found, incheck:" + InCheck);

  if (InCheck == BOOL.TRUE) {
    if (brd_side == COLOURS.WHITE) {
      $("#GameStatus").text("GAME OVER {black mates}");
      return BOOL.TRUE;
    } else {
      $("#GameStatus").text("GAME OVER {white mates}");
      return BOOL.TRUE;
    }
  } else {
    $("#GameStatus").text("GAME DRAWN {stalemate}");
    return BOOL.TRUE;
  }
  console.log("Returning False");
  return BOOL.FALSE;
}

function ClickedSquare(pageX, pageY) {
  var position = $("#Board").position();
  console.log(
    "Piece clicked at " +
      pageX +
      "," +
      pageY +
      " board top:" +
      position.top +
      " board left:" +
      position.left
  );

  var workedX = Math.floor(position.left);
  var workedY = Math.floor(position.top);
  var pageX = Math.floor(pageX);
  var pageY = Math.floor(pageY);

  var file = Math.floor((pageX - workedX) / SQ_SIZE);
  var rank = 7 - Math.floor((pageY - workedY) / SQ_SIZE);

  var sq = FR2SQ(file, rank);

  if (GameController.BoardFlipped == BOOL.TRUE) {
    sq = MIRROR120(sq);
  }

  console.log(
    "WorkedX: " +
      workedX +
      " WorkedY:" +
      workedY +
      " File:" +
      file +
      " Rank:" +
      rank
  );
  console.log("clicked:" + PrSq(sq));

  SetSqSelected(sq); // must go here before mirror

  return sq;
}

function CheckAndSet() {
  if (CheckResult() != BOOL.TRUE) {
    GameController.GameOver = BOOL.FALSE;
    $("#GameStatus").text("");
  } else {
    GameController.GameOver = BOOL.TRUE;
    GameController.GameSaved = BOOL.TRUE;
    recordGameResult();  // Record result and update ELO
  }
  $("#currentFenSpan").text(BoardToFen());
  updatePlayerInfo();
  GameSaver.saveGame();  // Auto-save after every move
}

function recordGameResult() {
  var status = $("#GameStatus").text();
  var result = null;

  if (status.includes("white mates")) result = "1-0";
  else if (status.includes("black mates")) result = "0-1";
  else if (status.includes("DRAWN")) result = "1/2-1/2";

  if (result && GameController.WhitePlayer && GameController.BlackPlayer) {
    PlayerManager.recordGame(
      GameController.WhitePlayer,
      GameController.BlackPlayer,
      result
    );
    updatePlayerSelectors();  // Refresh to show new ELOs
  }
}

function updatePlayerInfo() {
  var white = GameController.WhitePlayer;
  var black = GameController.BlackPlayer;
  var info = "";

  if (white) {
    info += white.name + " (" + white.elo + ")";
  }
  if (black) {
    info += " vs " + black.name + " (" + black.elo + ")";
  }

  $("#PlayerInfo").text(info);
}

function PreSearch() {
  if (GameController.GameOver != BOOL.TRUE) {
    // Two-player mode: skip computer, just switch sides
    if (GameController.TwoPlayerMode == BOOL.TRUE) {
      GameController.PlayerSide ^= 1;
      showHint();
      return;
    }

    srch_thinking = BOOL.TRUE;
    $("#ThinkingImageDiv").append(
      '<image src="images/think3.png" id="ThinkingPng"/>'
    );
    setTimeout(function () {
      StartSearch();
    }, 200);
  }
}

function MakeUserMove() {
  if (UserMove.from != SQUARES.NO_SQ && UserMove.to != SQUARES.NO_SQ) {
    console.log("User Move:" + PrSq(UserMove.from) + PrSq(UserMove.to));
    clearHintHighlight();

    var parsed = ParseMove(UserMove.from, UserMove.to);

    DeselectSq(UserMove.from);
    DeselectSq(UserMove.to);

    console.log("Parsed:" + parsed);

    if (parsed != NOMOVE) {
      MakeMove(parsed);
      MoveGUIPiece(parsed);
      CheckAndSet();
      PreSearch();
    }

    UserMove.from = SQUARES.NO_SQ;
    UserMove.to = SQUARES.NO_SQ;
  }
}

function canPlayerMove() {
  // Allow move if not thinking AND (two-player mode OR it's player's turn)
  return srch_thinking == BOOL.FALSE &&
    (GameController.TwoPlayerMode == BOOL.TRUE || GameController.PlayerSide == brd_side);
}

$(document).on("click", ".Piece", function (e) {
  console.log("Piece Click");
  if (canPlayerMove()) {
    if (UserMove.from == SQUARES.NO_SQ)
      UserMove.from = ClickedSquare(e.pageX, e.pageY);
    else UserMove.to = ClickedSquare(e.pageX, e.pageY);

    MakeUserMove();
  }
});

$(document).on("click", ".Square", function (e) {
  console.log("Square Click");
  if (canPlayerMove() && UserMove.from != SQUARES.NO_SQ) {
    UserMove.to = ClickedSquare(e.pageX, e.pageY);
    MakeUserMove();
  }
});

function RemoveGUIPiece(sq) {
  //console.log("remove on:" + PrSq(sq));
  $(".Piece").each(function (index) {
    //console.log( "Picture:" + index + ": " + $(this).position().top + "," + $(this).position().left );
    if (
      RanksBrd[sq] == 7 - Math.round($(this).position().top / SQ_SIZE) &&
      FilesBrd[sq] == Math.round($(this).position().left / SQ_SIZE)
    ) {
      //console.log( "Picture:" + index + ": " + $(this).position().top + "," + $(this).position().left );
      $(this).remove();
    }
  });
}

function AddGUIPiece(sq, pce) {
  var rank = RanksBrd[sq];
  var file = FilesBrd[sq];
  var rankName = "rank" + (rank + 1);
  var fileName = "file" + (file + 1);
  pieceFileName =
    "images/" + SideChar[PieceCol[pce]] + PceChar[pce].toUpperCase() + ".png";
  imageString =
    '<image src="' +
    pieceFileName +
    '" class="Piece clickElement ' +
    rankName +
    " " +
    fileName +
    '"/>';
  //console.log("add on " + imageString);
  $("#Board").append(imageString);
}

function MoveGUIPiece(move) {
  var from = FROMSQ(move);
  var to = TOSQ(move);

  var flippedFrom = from;
  var flippedTo = to;
  var epWhite = -10;
  var epBlack = 10;

  if (GameController.BoardFlipped == BOOL.TRUE) {
    flippedFrom = MIRROR120(from);
    flippedTo = MIRROR120(to);
    epWhite = 10;
    epBlack = -10;
  }

  if (move & MFLAGEP) {
    var epRemove;
    if (brd_side == COLOURS.BLACK) {
      epRemove = flippedTo + epWhite;
    } else {
      epRemove = flippedTo + epBlack;
    }
    console.log("en pas removing from " + PrSq(epRemove));
    RemoveGUIPiece(epRemove);
  } else if (CAPTURED(move)) {
    RemoveGUIPiece(flippedTo);
  }

  var rank = RanksBrd[flippedTo];
  var file = FilesBrd[flippedTo];
  var rankName = "rank" + (rank + 1);
  var fileName = "file" + (file + 1);

  /*if(GameController.BoardFlipped == BOOL.TRUE) {
		rankName += "flip";
		fileName += "flip";
	}*/

  $(".Piece").each(function (index) {
    //console.log( "Picture:" + index + ": " + $(this).position().top + "," + $(this).position().left );
    if (
      RanksBrd[flippedFrom] ==
        7 - Math.round($(this).position().top / SQ_SIZE) &&
      FilesBrd[flippedFrom] == Math.round($(this).position().left / SQ_SIZE)
    ) {
      //console.log("Setting pic ff:" + FilesBrd[from] + " rf:" + RanksBrd[from] + " tf:" + FilesBrd[to] + " rt:" + RanksBrd[to]);
      $(this).removeClass();
      $(this).addClass("Piece clickElement " + rankName + " " + fileName);
    }
  });

  if (move & MFLAGCA) {
    if (GameController.BoardFlipped == BOOL.TRUE) {
      switch (to) {
        case SQUARES.G1:
          RemoveGUIPiece(MIRROR120(SQUARES.H1));
          AddGUIPiece(MIRROR120(SQUARES.F1), PIECES.wR);
          break;
        case SQUARES.C1:
          RemoveGUIPiece(MIRROR120(SQUARES.A1));
          AddGUIPiece(MIRROR120(SQUARES.D1), PIECES.wR);
          break;
        case SQUARES.G8:
          RemoveGUIPiece(MIRROR120(SQUARES.H8));
          AddGUIPiece(MIRROR120(SQUARES.F8), PIECES.bR);
          break;
        case SQUARES.C8:
          RemoveGUIPiece(MIRROR120(SQUARES.A8));
          AddGUIPiece(MIRROR120(SQUARES.D8), PIECES.bR);
          break;
      }
    } else {
      switch (to) {
        case SQUARES.G1:
          RemoveGUIPiece(SQUARES.H1);
          AddGUIPiece(SQUARES.F1, PIECES.wR);
          break;
        case SQUARES.C1:
          RemoveGUIPiece(SQUARES.A1);
          AddGUIPiece(SQUARES.D1, PIECES.wR);
          break;
        case SQUARES.G8:
          RemoveGUIPiece(SQUARES.H8);
          AddGUIPiece(SQUARES.F8, PIECES.bR);
          break;
        case SQUARES.C8:
          RemoveGUIPiece(SQUARES.A8);
          AddGUIPiece(SQUARES.D8, PIECES.bR);
          break;
      }
    }
  }
  var prom = PROMOTED(move);
  console.log("PromPce:" + prom);
  if (prom != PIECES.EMPTY) {
    console.log("prom removing from " + PrSq(flippedTo));
    RemoveGUIPiece(flippedTo);
    AddGUIPiece(flippedTo, prom);
  }

  printGameLine();
}

function DeselectSq(sq) {
  if (GameController.BoardFlipped == BOOL.TRUE) {
    sq = MIRROR120(sq);
  }

  $(".Square").each(function (index) {
    if (
      RanksBrd[sq] == 7 - Math.round($(this).position().top / SQ_SIZE) &&
      FilesBrd[sq] == Math.round($(this).position().left / SQ_SIZE)
    ) {
      $(this).removeClass("SqSelected");
    }
  });
}

function SetSqSelected(sq) {
  if (GameController.BoardFlipped == BOOL.TRUE) {
    sq = MIRROR120(sq);
  }

  $(".Square").each(function (index) {
    //console.log("Looking Sq Selected RanksBrd[sq] " + RanksBrd[sq] + " FilesBrd[sq] " + FilesBrd[sq] + " position " + Math.round($(this).position().left/SQ_SIZE) + "," + Math.round($(this).position().top/SQ_SIZE));
    if (
      RanksBrd[sq] == 7 - Math.round($(this).position().top / SQ_SIZE) &&
      FilesBrd[sq] == Math.round($(this).position().left / SQ_SIZE)
    ) {
      //console.log("Setting Selected Sq");
      $(this).addClass("SqSelected");
    }
  });
}

function StartSearch() {
  srch_depth = MAXDEPTH;
  var t = $.now();
  var tt = $("#ThinkTimeChoice").val();
  console.log("time:" + t + " TimeChoice:" + tt);
  srch_time = parseFloat(tt) * 1000;  // Use parseFloat for fractional seconds
  SearchPosition();

  MakeMove(srch_best);
  MoveGUIPiece(srch_best);
  $("#ThinkingPng").remove();
  CheckAndSet();
  showHint();  // Show hint for player's next move
}

$("#TakeButton").click(function () {
  console.log("TakeBack request... brd_hisPly:" + brd_hisPly);
  if (brd_hisPly > 0) {
    TakeMove();
    brd_ply = 0;
    SetInitialBoardPieces();
    $("#currentFenSpan").text(BoardToFen());
    showHint();
  }
});

$("#SearchButton").click(function () {
  GameController.PlayerSide = brd_side ^ 1;
  PreSearch();
});

$("#FlipButton").click(function () {
  GameController.BoardFlipped ^= 1;
  console.log("Flipped:" + GameController.BoardFlipped);
  SetInitialBoardPieces();
});

function NewGame() {
  GameSaver.clearSave();  // Clear saved game
  ParseFen(START_FEN);
  PrintBoard();
  SetInitialBoardPieces();
  GameController.PlayerSide = brd_side;
  GameController.GameOver = BOOL.FALSE;
  GameController.GameSaved = BOOL.FALSE;
  $("#GameStatus").text("");
  $("#HintDisplay").text("");
  clearHintHighlight();

  // Set players based on selections
  var whitePlayerName = $("#WhitePlayerSelect").val();
  var blackPlayerName = $("#BlackPlayerSelect").val();

  GameController.WhitePlayer = PlayerManager.getPlayer(whitePlayerName);

  if (GameController.TwoPlayerMode == BOOL.TRUE) {
    GameController.BlackPlayer = PlayerManager.getPlayer(blackPlayerName);
  } else {
    var thinkTime = $("#ThinkTimeChoice").val();
    GameController.BlackPlayer = PlayerManager.getComputerPlayer(thinkTime);
  }

  updatePlayerInfo();
  CheckAndSet();
  showHint();
}

$("#NewGameButton").click(function () {
  NewGame();
  newGameAjax();
});

function newGameAjax() {
  console.log("new Game Ajax");
  /*$.ajax({
		url : "insertNewGame.php",
		cache: false
		}).done(function( html ) {
		  console.log('result:' + html);
		});*/
}

function initBoardSquares() {
  var light = 0;
  var rankName;
  var fileName;
  var divString;
  var lightString;
  var lastLight = 0;
  var fileLetters = ['a','b','c','d','e','f','g','h'];

  for (rankIter = RANKS.RANK_8; rankIter >= RANKS.RANK_1; rankIter--) {
    light = lastLight ^ 1;
    lastLight ^= 1;
    rankName = "rank" + (rankIter + 1);
    for (fileIter = FILES.FILE_A; fileIter <= FILES.FILE_H; fileIter++) {
      fileName = "file" + (fileIter + 1);
      if (light == 0) lightString = "Light";
      else lightString = "Dark";

      var label = '';
      // Rank numbers on left edge (file A)
      if (fileIter == FILES.FILE_A) {
        label += '<span class="coord coord-rank">' + (rankIter + 1) + '</span>';
      }
      // File letters on bottom edge (rank 1)
      if (rankIter == RANKS.RANK_1) {
        label += '<span class="coord coord-file">' + fileLetters[fileIter] + '</span>';
      }

      divString =
        '<div class="Square clickElement ' +
        rankName +
        " " +
        fileName +
        " " +
        lightString +
        '">' + label + '</div>';
      light ^= 1;
      $("#Board").append(divString);
    }
  }
}

function ClearAllPieces() {
  console.log("Removing pieces");
  $(".Piece").remove();
}

function SetInitialBoardPieces() {
  var sq;
  var sq120;
  var file, rank;
  var rankName;
  var fileName;
  var imageString;
  var pieceFileName;
  var pce;
  ClearAllPieces();
  for (sq = 0; sq < 64; ++sq) {
    sq120 = SQ120(sq);

    pce = brd_pieces[sq120]; // crucial here

    if (GameController.BoardFlipped == BOOL.TRUE) {
      sq120 = MIRROR120(sq120);
    }

    file = FilesBrd[sq120];
    rank = RanksBrd[sq120];

    if (pce >= PIECES.wP && pce <= PIECES.bK) {
      rankName = "rank" + (rank + 1);
      fileName = "file" + (file + 1);

      pieceFileName =
        "images/" +
        SideChar[PieceCol[pce]] +
        PceChar[pce].toUpperCase() +
        ".png";
      imageString =
        '<image src="' +
        pieceFileName +
        '" class="Piece ' +
        rankName +
        " " +
        fileName +
        '"/>';
      $("#Board").append(imageString);
    }
  }
}

// === HINT FEATURE ===
function clearHintHighlight() {
  $(".hint-dot").remove();
}

function addHintDot(sq) {
  var flipped = sq;
  if (GameController.BoardFlipped == BOOL.TRUE) {
    flipped = MIRROR120(sq);
  }

  var rank = RanksBrd[flipped];
  var file = FilesBrd[flipped];
  var rankName = "rank" + (rank + 1);
  var fileName = "file" + (file + 1);
  var dotSize = Math.floor(SQ_SIZE * 0.35);
  var offset = Math.floor((SQ_SIZE - dotSize) / 2);

  var dot = $('<div class="hint-dot ' + rankName + ' ' + fileName + '"></div>');
  dot.css({
    width: dotSize + 'px',
    height: dotSize + 'px',
    marginLeft: offset + 'px',
    marginTop: offset + 'px'
  });
  $("#Board").append(dot);
}

function showHint() {
  clearHintHighlight();
  $("#HintDisplay").text("");

  if (!$("#HintsToggle").is(":checked") || GameController.GameOver == BOOL.TRUE) {
    return;
  }

  // Don't run hint while AI is thinking
  if (srch_thinking == BOOL.TRUE) {
    return;
  }

  // Delay to let board render first
  setTimeout(function() {
    if (srch_thinking == BOOL.TRUE) return;  // Double-check

    // Lightweight search: reset search state, short time limit
    var savedThinking = srch_thinking;
    srch_nodes = 0;
    srch_fh = 0;
    srch_fhf = 0;
    srch_start = $.now();
    srch_time = 200;
    srch_stop = BOOL.FALSE;
    brd_ply = 0;

    // Clear search tables
    for (var i = 0; i < 14 * BRD_SQ_NUM; i++) brd_searchHistory[i] = 0;
    for (var i = 0; i < 3 * MAXDEPTH; i++) brd_searchKillers[i] = 0;
    ClearPvTable();

    // Shallow search (max depth 4)
    var bestMove = NOMOVE;
    for (var depth = 1; depth <= 4; depth++) {
      AlphaBeta(-INFINITE, INFINITE, depth, BOOL.TRUE);
      if (srch_stop == BOOL.TRUE) break;
      bestMove = brd_PvArray[0] || bestMove;
    }

    srch_thinking = savedThinking;
    brd_ply = 0;

    if (bestMove && bestMove != NOMOVE) {
      var from = FROMSQ(bestMove);
      var to = TOSQ(bestMove);
      addHintDot(from);
      addHintDot(to);
      $("#HintDisplay").text(PrMove(bestMove));
    }
  }, 150);
}

// === PLAYER MANAGEMENT UI ===
function updatePlayerSelectors() {
  var players = PlayerManager.loadPlayers();
  var whiteSelect = $("#WhitePlayerSelect");
  var blackSelect = $("#BlackPlayerSelect");

  var whiteVal = whiteSelect.val();
  var blackVal = blackSelect.val();

  whiteSelect.empty();
  blackSelect.empty();

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var optionText = p.name + " (" + p.elo + ")";
    whiteSelect.append('<option value="' + p.name + '">' + optionText + '</option>');
    blackSelect.append('<option value="' + p.name + '">' + optionText + '</option>');
  }

  // Restore selections
  if (whiteVal) whiteSelect.val(whiteVal);
  if (blackVal) blackSelect.val(blackVal);
}

function updateGameModeUI() {
  var mode = $("#GameMode").val();
  GameController.TwoPlayerMode = (mode === "twoplayer") ? BOOL.TRUE : BOOL.FALSE;

  if (GameController.TwoPlayerMode == BOOL.TRUE) {
    $("#BlackPlayerSelect").show();
    $("#ThinkTimeChoice").hide();
  } else {
    $("#BlackPlayerSelect").hide();
    $("#ThinkTimeChoice").show();
  }
}

// === EVENT HANDLERS ===
$("#GameMode").change(function() {
  updateGameModeUI();
});

$("#AddPlayerBtn").click(function() {
  var name = $("#NewPlayerName").val().trim();
  if (name) {
    var player = PlayerManager.addPlayer(name);
    if (player) {
      updatePlayerSelectors();
      $("#NewPlayerName").val("");
    } else {
      alert("Player already exists or invalid name");
    }
  }
});

$("#HintsToggle").change(function() {
  if ($(this).is(":checked")) {
    showHint();
  } else {
    $("#HintDisplay").text("");
  }
});

// Initialize on page load
$(document).ready(function() {
  updatePlayerSelectors();
  updateGameModeUI();

  // Add default players if none exist
  var players = PlayerManager.loadPlayers();
  if (players.length === 0) {
    PlayerManager.addPlayer("Player 1");
    updatePlayerSelectors();
  }

  // Restore saved game if exists
  var saved = GameSaver.loadGame();
  if (saved && !saved.gameOver) {
    // Restore board position
    ParseFen(saved.fen);
    PrintBoard();
    SetInitialBoardPieces();

    // Restore controller state
    GameController.PlayerSide = saved.playerSide;
    GameController.BoardFlipped = saved.boardFlipped;
    GameController.TwoPlayerMode = saved.twoPlayerMode;
    GameController.GameOver = saved.gameOver;
    GameController.WhitePlayer = saved.whitePlayer;
    GameController.BlackPlayer = saved.blackPlayer;

    // Restore UI state
    if (saved.thinkTime) $("#ThinkTimeChoice").val(saved.thinkTime);
    if (saved.gameMode) {
      $("#GameMode").val(saved.gameMode);
      updateGameModeUI();
    }
    if (saved.hintsOn) $("#HintsToggle").prop("checked", true);

    // Restore player selections
    if (saved.whitePlayer) $("#WhitePlayerSelect").val(saved.whitePlayer.name);
    if (saved.blackPlayer && saved.blackPlayer.name !== 'Computer') {
      $("#BlackPlayerSelect").val(saved.blackPlayer.name);
    }

    // Refresh board if flipped
    if (saved.boardFlipped) SetInitialBoardPieces();

    updatePlayerInfo();
    showHint();
    console.log("Game restored from auto-save");
  }
});
