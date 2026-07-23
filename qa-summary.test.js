const assert = require("assert");
const {
    formatDateLabel,
    getHistoricalPerformances,
    getPerformanceSummary,
    normalizeBackendPerformances,
    summarizeConsecutiveSets
} = require("./script.js");

const todayKey = "2026-07-12";

const set = (weight, reps, date, order) => ({
    weight: String(weight),
    reps: String(reps),
    loggedAt: date,
    order,
    summary: `${weight}x${reps}`
});

assert.strictEqual(formatDateLabel("2026-06-08"), "June 8th 2026");
assert.strictEqual(formatDateLabel("2026-06-01"), "June 1st 2026");
assert.strictEqual(formatDateLabel("2026-06-02"), "June 2nd 2026");
assert.strictEqual(formatDateLabel("2026-06-03"), "June 3rd 2026");
assert.strictEqual(formatDateLabel("2026-06-11"), "June 11th 2026");

assert.strictEqual(
    summarizeConsecutiveSets([
        set(405, 6, "2026-06-08T18:00:00-05:00", 0),
        set(225, 5, "2026-06-08T18:01:00-05:00", 1),
        set(225, 4, "2026-06-08T18:02:00-05:00", 2),
        set(225, 5, "2026-06-08T18:03:00-05:00", 3),
        set(135, 7, "2026-06-08T18:04:00-05:00", 4),
        set(405, 6, "2026-06-08T18:05:00-05:00", 5)
    ]),
    "405x6, 225x(5, 4, 5), 135x7, 405x6"
);

const backendData = {
    history: [
        { date: "2026-07-12T10:00:00-05:00", sets: [set(999, 1, "2026-07-12T10:00:00-05:00", 0)] },
        { date: "2026-06-08T10:00:00-05:00", sets: [set(405, 6, "2026-06-08T10:00:00-05:00", 0)] },
        { date: "2026-06-04T10:00:00-05:00", sets: [set(455, 6, "2026-06-04T10:00:00-05:00", 0)] },
        { date: "2026-05-08T10:00:00-05:00", sets: [set(405, 6, "2026-05-08T10:00:00-05:00", 0)] },
        { date: "2026-04-08T10:00:00-05:00", sets: [set(315, 8, "2026-04-08T10:00:00-05:00", 0)] }
    ]
};

const localPerformances = [
    {
        dateKey: todayKey,
        sets: [
            set(405, 4, "2026-07-12T19:45:00-05:00", 0),
            set(405, 3, "2026-07-12T19:47:00-05:00", 1)
        ]
    }
];

const summary = getPerformanceSummary(backendData, localPerformances, todayKey);
assert.deepStrictEqual(summary.todaySets.map(item => item.summary), ["405x3", "405x4"]);
assert.deepStrictEqual(summary.history.map(item => item.dateKey), ["2026-06-08", "2026-06-04", "2026-05-08"]);
assert.ok(!summary.history.some(item => item.dateKey === todayKey));

const livePayload = {
    exercise: "bb row",
    date: "Jul 11, 2026",
    sets: "165x(5,5,5,5,5)"
};
const liveHistory = getHistoricalPerformances(normalizeBackendPerformances(livePayload), [], todayKey);
assert.strictEqual(liveHistory[0].dateKey, "2026-07-11");
assert.strictEqual(liveHistory[0].summary, "165x(5, 5, 5, 5, 5)");

const supersetSquatSets = Array.from({ length: 5 }, (_, index) =>
    set(315, 8 - index, `2026-07-10T18:${String(index * 2).padStart(2, "0")}:00-05:00`, index * 2)
);
const duplicatedSupersetHistory = getHistoricalPerformances(
    [{ dateKey: "2026-07-10", sets: supersetSquatSets }],
    [{ dateKey: "2026-07-10", sets: supersetSquatSets.map(item => ({ ...item })) }],
    todayKey
);
assert.strictEqual(duplicatedSupersetHistory[0].sets.length, 5);
assert.strictEqual(duplicatedSupersetHistory[0].summary, "315x(8, 7, 6, 5, 4)");

console.log("QA summary tests passed");
