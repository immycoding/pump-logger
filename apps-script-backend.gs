const SPREADSHEET_ID = "1pMGhMnKNLRwx3MkUOPkpuNOYpe2dEs5S7IAejXwHfj8";
const API_KEY = "noscammerspls";
const DEFAULT_HISTORY_LIMIT = 3;

function jsonResponse(payload) {
    return ContentService.createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
    return SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
}

function normalizeExercise(value) {
    return String(value || "").trim().toLowerCase();
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parsePositiveNumber(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${fieldName}`);
    }
    return parsed;
}

function parseLimit(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_HISTORY_LIMIT;
    return Math.min(parsed, 10);
}

function doPost(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            throw new Error("No postData received");
        }

        const params = JSON.parse(e.postData.contents);

        if (params.apiKey !== API_KEY) {
            throw new Error("Unauthorized");
        }

        const exercise = String(params.exercise || "").trim();
        const weight = parsePositiveNumber(params.weight, "weight");
        const reps = parsePositiveNumber(params.reps, "reps");

        if (!exercise) {
            throw new Error("Missing required field: exercise");
        }

        const loggedAt = params.date ? new Date(params.date) : new Date();
        if (Number.isNaN(loggedAt.getTime())) {
            throw new Error("Invalid date");
        }

        getSheet().appendRow([exercise, reps, weight, loggedAt]);

        return jsonResponse({
            success: true,
            message: "Set logged successfully!",
            loggedAt: loggedAt.toISOString()
        });
    } catch (error) {
        Logger.log("POST error: " + error.message);
        return jsonResponse({ error: error.message });
    }
}

function doGet(e) {
    try {
        if (!e || !e.parameter) {
            throw new Error("No parameters provided in the request");
        }

        const exercise = String(e.parameter.exercise || "").trim();
        if (!exercise) {
            throw new Error("No exercise provided");
        }

        const limit = parseLimit(e.parameter.limit);
        const targetExercise = normalizeExercise(exercise);
        const todayKey = getDateKey(new Date());
        const rows = getSheet().getDataRange().getValues();

        const matchingSets = rows
            .map((row, index) => {
                const date = new Date(row[3]);

                return {
                    exercise: String(row[0] || "").trim(),
                    reps: Number(row[1]),
                    weight: Number(row[2]),
                    date,
                    order: index
                };
            })
            .filter(entry =>
                normalizeExercise(entry.exercise) === targetExercise &&
                Number.isFinite(entry.reps) &&
                Number.isFinite(entry.weight) &&
                !Number.isNaN(entry.date.getTime())
            );

        if (matchingSets.length === 0) {
            return jsonResponse({
                exercise,
                history: []
            });
        }

        const days = new Map();

        matchingSets.forEach(entry => {
            const dateKey = getDateKey(entry.date);
            if (dateKey === todayKey) return;

            if (!days.has(dateKey)) {
                days.set(dateKey, {
                    date: entry.date,
                    dateKey,
                    sets: []
                });
            }

            days.get(dateKey).sets.push({
                weight: entry.weight,
                reps: entry.reps,
                date: entry.date.toISOString(),
                order: entry.order
            });
        });

        const history = Array.from(days.values())
            .sort((a, b) => b.date - a.date)
            .slice(0, limit)
            .map(day => ({
                date: day.date.toISOString(),
                dateKey: day.dateKey,
                sets: day.sets.sort((a, b) => a.order - b.order)
            }));

        const latest = history.length ? history[0] : null;

        return jsonResponse({
            exercise,
            history,
            // Backwards-compatible fields for old clients.
            date: latest ? latest.date : "",
            sets: latest ? latest.sets : []
        });
    } catch (error) {
        Logger.log("GET error: " + error.message);
        return jsonResponse({ error: error.message });
    }
}
