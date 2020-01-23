Function.prototype.arg = function () {
    if (typeof this !== "function")
        throw new TypeError("Function.prototype.arg needs to be called on a function");
    var slice = Array.prototype.slice,
        args = slice.call(arguments),
        fn = this,
        partial = function () {
            return fn.apply(this, args.concat(slice.call(arguments)));
        };
    partial.prototype = Object.create(this.prototype);
    return partial;
};

var vm;

function install(startData) {


    var pirateNames = {
        5: "Edmund",
        1: "Dan",
        8: "Puffo",
        3: "Orvinn",

        17: "Federismo",
        18: "Blackbeard",
        13: "Ned",
        11: "Crossblades",

        6: "Peg Leg",
        20: "Tailhook",
        4: "Lucky",
        15: "Gooblah",

        7: "Bonnie",
        19: "Buck",
        2: "Sproggie",
        10: "Squire",

        12: "Stripey",
        9: "Stuff",
        16: "Franchisco",
        14: "Fairfax"
    };

    var numBets = 10;

    var data = {
        //    numBets: numBets,
        arenas: ["Shipwreck", "Lagoon", "Treasure", "Hidden", "Harpoon"],
        possiblePirateNames: pirateNames,
        bets: {},
        betAmounts: {},
        dropdownMode: false,
        showOddsTimeline: false,
        moveFrom: 0,
        moveTo: 0,
        moveMode: "none"

        /*
                probabilities: {
                    min: [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
                    avg: [[1,0.5,0.5,0.5,0.5],[1,0.5,0.5,0.5,0.5],[1,0.5,0.5,0.5,0.5],[1,0.5,0.5,0.5,0.5],[1,0.5,0.5,0.5,0.5]],
                    max: [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]]
                },
        */

    };

    for (var key in startData) {
        data[key] = startData[key];
    }

    var queryData = (function () {
        var result = {},
            queryString = window.location.hash.slice(1),
            re = /([^&=]+)=([^&]*)/g,
            m;

        while (m = re.exec(queryString)) {
            try {
                result[decodeURIComponent(m[1])] = JSON.parse(decodeURIComponent(m[2]));
            }
            catch (e) {
                result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
            }
        }

        history.pushState("", document.title, window.location.pathname);

        return result;
    })();
    for (var key in queryData) { // file:///C:/Git/NeoFoodClub/website/index.html#round=6694&b=kaaaaacaekaaaaaaaaaaaaaaa
        if (key == "b") {
            var betStr = queryData["b"];
            var bets = betStrToBets(betStr);
            data["bets"] = bets;
            continue;
        }
        data[key] = queryData[key];
    }

    function getMaxBet(baseMaxBet, round) {
        return baseMaxBet + 2 * round;
    }
    function getBaseMaxBet(maxBet, round) {
        return maxBet - 2 * round;
    }

    var baseMaxBet = window.Cookies.getJSON("baseMaxBet");
    if (baseMaxBet === undefined) {
        data.maxBet = -1000;
    }
    else {
        data.maxBet = getMaxBet(baseMaxBet, data.round);
    }

    function unFlattenData(keyword) {
        var returnValue = {};
        for (var key in this) {
            var s = key.split(",");
            if (s.length !== 2 || s[0] !== keyword) {
                continue;
            }
            returnValue[s[1]] = this[key];
        }
        return returnValue;
    }

    var computedProperties = {
        betEnabled: unFlattenData.arg("betEnabled"),
        betOdds: unFlattenData.arg("betOdds"),
        betPayoffs: unFlattenData.arg("betPayoff"),
        betProbabilities: unFlattenData.arg("betProbability"),
        betExpectedRatios: unFlattenData.arg("betExpectedRatio"),
        betNetExpected: unFlattenData.arg("betNetExpected"),
        betMaxBets: unFlattenData.arg("betMaxBet"),
        pirateFAs: computePirateFAs,
        pirateOddsTimelines: computePirateOddsTimelines,
        piratePayouts: computePiratePayouts,
        arenaRatios: computeArenaRatios,
        totalAmount: computeTotalAmount,
        TER: computeTER,
        totalNetExpected: computeTotalNetExpected,
        probabilities: computeProbabilities,
        payoutTables: computePayoutTables,
        directURL: computeDirectURL,
        redditString: computeRedditString,
        redditStatsString: computeRedditStatsString
    };

    function moveBets() {
        var moveFrom = this.moveFrom;
        var moveTo = this.moveTo;
        if (this.moveMode !== "none" && moveFrom != moveTo && this.betEnabled[moveFrom] && this.betEnabled[moveTo]) {
            if (this.moveMode === "swap") {
                var movedBet = this.bets[moveFrom];
                var movedAmount = this.betAmounts[moveFrom];
                this.bets[moveFrom] = this.bets[moveTo];
                this.betAmounts[moveFrom] = this.betAmounts[moveTo];
                this.bets[moveTo] = movedBet;
                this.betAmounts[moveTo] = movedAmount;
            }
            else if (this.moveMode === "insert") {
                var movedBet = this.bets[moveFrom];
                var movedAmount = this.betAmounts[moveFrom];
                var order = moveFrom < moveTo ? 1 : -1;
                for (var i = moveFrom; i != moveTo; i += order) {
                    this.bets[i] = this.bets[i + order];
                    this.betAmounts[i] = this.betAmounts[i + order];
                }
                this.bets[moveTo] = movedBet;
                this.betAmounts[moveTo] = movedAmount;
            }

            this.moveFrom = 0;
            this.moveTo = 0;
        }
    }

    for (var i = 1; i <= numBets; i++) {
        data.bets[i] = data.bets[i] || [0, 0, 0, 0, 0];
        data.betAmounts[i] = -1000;
        computedProperties["betEnabled," + i] = isEnabled.arg(i);
        computedProperties["betOdds," + i] = odds.arg(i);
        computedProperties["betPayoff," + i] = payoff.arg(i);
        computedProperties["betProbability," + i] = betProbability.arg(i);
        computedProperties["betExpectedRatio," + i] = betExpectedRatio.arg(i);
        computedProperties["betNetExpected," + i] = betNetExpected.arg(i);
        computedProperties["betMaxBet," + i] = betMaxBet.arg(i);
    }

    vm = new Vue({
        el: "#el",
        data: data,
        methods: {
            getPirateName: function (pirateId) {
                return pirateNames[pirateId];
            },
            displayAsPercentage: function (value, precision) {
                return (value * 100).toFixed(precision) + "%";
            },
            displayAsPlusMinus: function (value) {
                return (value > 0 ? "+" : "") + value;
            },
            displayAsDate: function (value) {
                return (new Date(value)).toLocaleString();
            },
            setAllBets: function () {
                for (var i = 1; i <= numBets; i++) {
                    this.betAmounts[i] = parseInt(this.maxBet);
                }
            },
            piratePayoutStyle: function (payout) {
                if (payout > 0) {
                    return "good";
                }
                else if (payout <= -0.1) {
                    return "bad";
                }
                else return "";
            },
            below0Bad: function (value) {
                if (value < 0) {
                    return "bad";
                }
                else {
                    return "";
                }
            },
            hasBetWonClass: function (betNum) {
                if (this.isBetWon(betNum, this.winners)) {
                    return "won";
                }
                else if (this.winners.some(parseFloat)) { // check if this.winners has a non-null value somewhere
                    return "lost";
                }
                else {
                    return "";
                }
            },
            hasPirateWonClass: function (arena, pirateIndex) {
                if (this.winners[arena] != 0 && this.winners[arena] == pirateIndex + 1) {
                    return "won";
                }
                else if (this.winners[arena] != 0 && pirateIndex >= 0) {
                    return "lost";
                }
                else {
                    return "";
                }
            },
            maxBetClass: function (betNum) {
                if (this.betAmounts[betNum] > Math.ceil(1000000 / this.betOdds[betNum])) {
                    return "dangerous";
                }
                else if (this.betAmounts[betNum] > Math.floor(1000000 / this.betOdds[betNum])) {
                    return "warning";
                }
                else {
                    return "";
                }
            },
            haveOddsChanged: function (arenaId, pirateIndex) {
                return this.openingOdds[arenaId][pirateIndex + 1] !== this.currentOdds[arenaId][pirateIndex + 1];
            },
            isBetWon: isBetWon
        },
        computed: computedProperties
    });

    function refreshData() {
        fetch("/rounds/" + vm.round + ".json", { cache: "no-cache" })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                for (var key in data) {
                    vm[key] = data[key];
                }
            });
    }
    vm.$watch("round", refreshData, { immediate: true });
    vm.$watch("maxBet", function (newVal) {
        baseMaxBet = getBaseMaxBet(newVal, vm.round);
        window.Cookies.set("baseMaxBet", baseMaxBet, { expires: 28 });
    });
    vm.$watch("round", function (newVal) {
        if (baseMaxBet !== undefined) {
            this.maxBet = getMaxBet(baseMaxBet, newVal);
        }
    }, { immediate: true });
    vm.$watch("moveFrom", moveBets);
    vm.$watch("moveTo", moveBets);
    setInterval(refreshData, 1 * 60 * 1000);
}