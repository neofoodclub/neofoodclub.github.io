//  Note: Algorithm largely based on https://pastebin.com/322YjaZV, credits to the original author
// Version 1.3
//  - Now works with /oldpage.html
//  -
// Version 1.2
//  - If using "custom" mode...
//    - Use "Custom Odds" instead of "Current Odds" in calculations
//    - Use "Custom Probabilities" instead of "Std Prob" in calculations
// Version 1.1
//  - Fixed ALWAYS_USE_MAX_BET bug; now properly ignores bets that have a max bet lower than your current max

//===[ C O N F I G U R E ]====================================================
// Disregards any bets that use less than your max bet (either true or false)
const ALWAYS_USE_MAX_BET = false;
//============================================================================

this.$ = this.jQuery = jQuery.noConflict(true);

var old_page = window.location.pathname == '/oldpage.html'

// Initialize
var maxbet, winnings, winchance, betcap, expectedratio, vm;

var pirate_combo = {};
var betcaps = {};
var top_ratios = [];

// Takes in 5 pirates and calculates the win rate, winnings, and net expected for each pirate
function calculateCombination(a, b, c, d, e) {
    var odds, probability, prob_denominator = 1;
    if (vm.displayMode === "custom") {
        odds = vm.customOdds;
        probability = vm.customProbabilities;
        var p = [a, b, c, d, e];
        for (var i = 0; i < p.length; i++)
            if (p[i] !== 0) prob_denominator *= 100;
    } else {
        odds = vm.currentOdds;
        probability = vm.probabilities.std;
    }
    var netexpected;

    var total_odds = odds[0][a] * odds[1][b] * odds[2][c] * odds[3][d] * odds[4][e];
    winnings = maxbet * total_odds;
    if (winnings > 1000000)
        winnings = 1000000;
    winchance = probability[0][a] * probability[1][b] * probability[2][c] * probability[3][d] * probability[4][e] / prob_denominator;
    betcap = Math.floor(1000000 / total_odds);
    if (ALWAYS_USE_MAX_BET) {
        if (betcap < maxbet) {
            betcap = 0;
            expectedratio = 0;
            netexpected = 0;
        } else {
            betcap = maxbet;
            expectedratio = winchance * winnings / betcap;
            netexpected = (expectedratio - 1) * betcap;
        }
    } else {
        if (betcap > maxbet) betcap = maxbet;
        expectedratio = winchance * winnings / betcap;
        netexpected = (expectedratio - 1) * betcap;
    }
    betcaps["" + a + b + c + d + e] = betcap;
    pirate_combo["" + a + b + c + d + e] = netexpected;
}

// The main method
function calc_maxter() {
    //vm = window.vm;
    maxbet = vm.maxBet;
    pirate_combo = {};
    betcaps = {};
    top_ratios = [];

    var index = 1;
    var i;

    // Calculate all the winnings, odds, etc. for every pirate combination
    var a_, b_, c_, d_, e_;
    for (a_ = 0; a_ < 5; a_++) {
        for (b_ = 0; b_ < 5; b_++) {
            for (c_ = 0; c_ < 5; c_++) {
                for (d_ = 0; d_ < 5; d_++) {
                    for (e_ = 0; e_ < 5; e_++) {
                        calculateCombination(a_, b_, c_, d_, e_);
                    }
                }
            }
        }
    }
    // Sort by highest expected ratio (i.e. MAX TER)
    for (var key in pirate_combo) top_ratios.push([key, pirate_combo[key]]);
    top_ratios.sort(function(a, b) {
        a = a[1];
        b = b[1];
        return b - a;
    });

    var bet, arena, pirate;
    var result = "";
    for (bet = 0; bet < 10; bet++) {
        // Set the bet amounts for each bet
        vm.betAmounts[bet + 1] = betcaps[top_ratios[bet][0]];
        // Parse the pirate combinations to generate a link containing the MAX TER bets
        for (arena = 0; arena < 5; arena++) {
            pirate = top_ratios[bet][0][arena];
            if (old_page)
                check_radio(arena, pirate, bet);
            else
                result += pirate;
        }
    }
    if (old_page) return;

    var linkCode = "";
    for (i = 0; i < result.length; i += 2) {
        linkCode += String.fromCharCode(97 + parseInt(result.substring(i, i + 2), 5));
    }
    // Reload the page with the new bets
    window.location = window.location.href + "#round=" + vm.round + "&b=" + linkCode;
}

function check_radio(arena_id, pirate_row, bet_number) {
    $("tbody:eq("+arena_id+") tr:eq("+pirate_row+") input:radio:eq("+(bet_number)+")").prop("checked", true).trigger("click");
}

// Adds MAX TER button to the top of the page and sets an on-click action to call the main method
$("input#maxter").on("click", calc_maxter);

// Allows clicking anywhere in the bet table cell to select the radio button
$("td").on('click', function () {
  $(this).find('input:radio').prop("checked", true).trigger("click");
});
$("td *").on('click', function (event) {
  event.stopPropagation();
});

function reload_page() {
    var url = $("input#nfc_url").val();
    var query = url.replace(/.*neofoodclub.fr\//, "")
    window.location = window.location.href + query;
    $("input#nfc_url").val("")
}

// Add code bar
$("input#maxter").after('<br><input id="nfc_url" type="textbox" placeholder="Place NFC link here"><input id="reload_page" type="button" value="Convert!">');
$("input#reload_page").on("click", reload_page);