const API_URL = "https://script.google.com/macros/s/AKfycbx-Wj-Tr6aYBAYyDdKpTcL9po84fqTBlmdY3plEelfGOJPZgL148N7kYeEOUHeyiYZrUA/exec";
const API_KEY = "noscammerspls";
const SELECTED_GROUP_KEY = "selectedGroup";
const RECENT_EXERCISES_KEY = "recentExercisesByGroup";
const LAST_SET_KEY = "lastSetByExercise";
const SET_HISTORY_KEY = "setHistoryByExercise";
const HISTORY_LIMIT = 3;

const muscleGroups = {
    chestBack: ["flat bench", "incline smith", "flat smith", "close pulldown", "chindown", "normal pulldown", "incline flyes", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension", "deadlift", "bulgarian"],
    shoulders: ["OHP", "smif OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "cable curl", "bb curl", "overhead extension", "JM press", "skullcrusher", "concentration curl", "hammer curl"]
};

const groupLabels = {
    chestBack: "Chest / Back",
    legs: "Legs",
    shoulders: "Shoulders",
    arms: "Arms"
};

function selectWorkout(group) {
    if (!muscleGroups[group]) return;
    localStorage.setItem(SELECTED_GROUP_KEY, group);
    window.location.href = "workout.html";
}

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getRecentExercises(group) {
    const recentByGroup = readJSON(RECENT_EXERCISES_KEY, {});
    return Array.isArray(recentByGroup[group]) ? recentByGroup[group] : [];
}

function rememberExercise(group, exercise) {
    const recentByGroup = readJSON(RECENT_EXERCISES_KEY, {});
    const current = Array.isArray(recentByGroup[group]) ? recentByGroup[group] : [];
    recentByGroup[group] = [exercise, ...current.filter(item => item !== exercise)].slice(0, 6);
    writeJSON(RECENT_EXERCISES_KEY, recentByGroup);
}

function rememberSet(exercise, set) {
    const lastSetByExercise = readJSON(LAST_SET_KEY, {});
    lastSetByExercise[exercise] = set;
    writeJSON(LAST_SET_KEY, lastSetByExercise);
}

function getLastLocalSet(exercise) {
    return readJSON(LAST_SET_KEY, {})[exercise];
}

function rememberLoggedSet(exercise, set) {
    const historyByExercise = readJSON(SET_HISTORY_KEY, {});
    const current = Array.isArray(historyByExercise[exercise]) ? historyByExercise[exercise] : [];
    historyByExercise[exercise] = [...current, set].slice(-200);
    writeJSON(SET_HISTORY_KEY, historyByExercise);
    rememberSet(exercise, set);
}

function getLocalSets(exercise) {
    return readJSON(SET_HISTORY_KEY, {})[exercise] ?? [];
}

function buildExerciseList(group) {
    const exercises = muscleGroups[group] ?? [];
    const recent = getRecentExercises(group).filter(exercise => exercises.includes(exercise));
    return [...recent, ...exercises.filter(exercise => !recent.includes(exercise))];
}

function setStatus(message, tone = "neutral") {
    const status = document.getElementById("form-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
}

function setLastWorkout(message, state = "idle") {
    const lastWorkout = document.getElementById("last-workout");
    if (!lastWorkout) return;
    lastWorkout.textContent = message;
    lastWorkout.dataset.state = state;
}

function setLastWorkoutNode(node, state = "ready") {
    const lastWorkout = document.getElementById("last-workout");
    if (!lastWorkout) return;
    lastWorkout.replaceChildren(node);
    lastWorkout.dataset.state = state;
}

function getDateKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return String(dateValue);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getOrdinal(day) {
    const lastTwo = day % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;

    switch (day % 10) {
        case 1:
            return `${day}st`;
        case 2:
            return `${day}nd`;
        case 3:
            return `${day}rd`;
        default:
            return `${day}th`;
    }
}

function formatDateLabel(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;

    const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(date);
    return `${month} ${getOrdinal(date.getDate())} ${date.getFullYear()}`;
}

function formatTimeLabel(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function parseSetSummary(summary) {
    const match = String(summary).trim().match(/^(.+?)\s*x\s*(.+)$/i);
    if (!match) return null;

    return {
        weight: match[1].trim(),
        reps: match[2].trim().replace(/^\((.*)\)$/, "$1")
    };
}

function formatSet(weight, reps) {
    return `${weight}x${reps}`;
}

function formatGroupedSetSummary(summary) {
    const parsed = parseSetSummary(summary);
    if (!parsed || !parsed.reps.includes(",")) return String(summary);

    const reps = parsed.reps.split(",").map(rep => rep.trim()).join(", ");
    return `${parsed.weight}x(${reps})`;
}

function normalizeSet(set, index = 0) {
    if (typeof set === "string") {
        const parsed = parseSetSummary(set);
        return parsed && !parsed.reps.includes(",")
            ? { ...parsed, summary: formatSet(parsed.weight, parsed.reps), order: index }
            : { summary: formatGroupedSetSummary(set), order: index };
    }

    if (!set || typeof set !== "object") {
        return { summary: String(set), order: index };
    }

    const weight = set.weight ?? set.Weight;
    const reps = set.reps ?? set.Reps;
    const loggedAt = set.date ?? set.loggedAt ?? set.timestamp ?? set.Timestamp;
    const order = Number(set.order ?? set.setNumber ?? set.Set ?? index);

    return {
        weight,
        reps,
        loggedAt,
        order: Number.isFinite(order) ? order : index,
        summary: weight !== undefined && reps !== undefined
            ? formatSet(weight, reps)
            : set.summary ?? set.sets ?? String(set)
    };
}

function normalizePerformance(performance, index = 0) {
    const date = performance?.date ?? performance?.Date ?? performance?.loggedAt ?? performance?.timestamp;
    const sets = performance?.sets ?? performance?.Sets ?? performance?.entries ?? performance?.setList;

    if (!date && !sets) return null;

    return {
        dateKey: getDateKey(date),
        date,
        order: index,
        sets: Array.isArray(sets) ? sets.map(normalizeSet) : [normalizeSet(sets ?? performance, index)]
    };
}

function normalizeBackendPerformances(data) {
    const candidates = Array.isArray(data)
        ? data
        : data?.performances ?? data?.history ?? data?.workouts ?? data?.entries ?? data?.rows;

    if (Array.isArray(candidates)) {
        const grouped = new Map();

        candidates.forEach((item, index) => {
            const performance = normalizePerformance(item, index);
            if (
                performance &&
                (item?.sets !== undefined || item?.Sets !== undefined || item?.entries !== undefined || item?.setList !== undefined)
            ) {
                grouped.set(performance.dateKey, performance);
                return;
            }

            const date = item?.date ?? item?.Date ?? item?.loggedAt ?? item?.timestamp;
            const dateKey = getDateKey(date);
            const set = normalizeSet(item, index);
            const current = grouped.get(dateKey) ?? { dateKey, date, order: index, sets: [] };
            current.sets.push(set);
            grouped.set(dateKey, current);
        });

        return Array.from(grouped.values());
    }

    const single = normalizePerformance(data, 0);
    return single ? [single] : [];
}

function getLocalPerformances(exercise) {
    const grouped = new Map();

    getLocalSets(exercise).forEach((set, index) => {
        const dateKey = getDateKey(set.date ?? set.loggedAt);
        const current = grouped.get(dateKey) ?? { dateKey, date: set.date, order: index, sets: [] };
        current.sets.push(normalizeSet(set, index));
        grouped.set(dateKey, current);
    });

    return Array.from(grouped.values());
}

function sortSetsChronologically(sets) {
    return [...sets].sort((a, b) => {
        const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : NaN;
        const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : NaN;

        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
            return aTime - bTime;
        }

        return a.order - b.order;
    });
}

function summarizeConsecutiveSets(sets) {
    const groups = [];

    sortSetsChronologically(sets).forEach(set => {
        const weight = set.weight;
        const reps = set.reps;

        if (weight === undefined || reps === undefined) {
            groups.push({ summary: set.summary });
            return;
        }

        const previous = groups[groups.length - 1];
        if (previous && previous.weight === String(weight) && !previous.summary) {
            previous.reps.push(String(reps));
            return;
        }

        groups.push({ weight: String(weight), reps: [String(reps)] });
    });

    return groups.map(group => {
        if (group.summary) return group.summary;
        if (group.reps.length === 1) return formatSet(group.weight, group.reps[0]);
        return `${group.weight}x(${group.reps.join(", ")})`;
    }).join(", ");
}

function getHistoricalPerformances(backendPerformances, localPerformances, todayKey = getDateKey(new Date())) {
    const grouped = new Map();

    [...backendPerformances, ...localPerformances].forEach(performance => {
        if (!performance || performance.dateKey === todayKey) return;

        const existing = grouped.get(performance.dateKey);
        if (!existing) {
            grouped.set(performance.dateKey, { ...performance, sets: [...performance.sets] });
            return;
        }

        existing.sets.push(...performance.sets);
    });

    return Array.from(grouped.values())
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, HISTORY_LIMIT)
        .map(performance => ({
            ...performance,
            sets: sortSetsChronologically(performance.sets),
            summary: summarizeConsecutiveSets(performance.sets)
        }));
}

function getTodaySets(localPerformances, todayKey = getDateKey(new Date())) {
    const today = localPerformances.find(performance => performance.dateKey === todayKey);
    if (!today) return [];

    return sortSetsChronologically(today.sets).reverse();
}

function getPerformanceSummary(backendData, localPerformances, todayKey = getDateKey(new Date())) {
    const backendPerformances = normalizeBackendPerformances(backendData);

    return {
        todaySets: getTodaySets(localPerformances, todayKey),
        history: getHistoricalPerformances(backendPerformances, localPerformances, todayKey)
    };
}

function buildSummaryNode(exercise, summary) {
    const wrapper = document.createElement("div");
    wrapper.className = "performance-summary";

    if (summary.todaySets.length) {
        const todaySection = document.createElement("section");
        todaySection.className = "performance-block";

        const title = document.createElement("h2");
        title.textContent = "Today";
        todaySection.append(title);

        const todayList = document.createElement("div");
        todayList.className = "today-set-list";

        summary.todaySets.forEach(set => {
            const row = document.createElement("div");
            row.className = "today-set";

            const lift = document.createElement("strong");
            lift.textContent = set.summary;

            const time = document.createElement("span");
            const timeLabel = formatTimeLabel(set.loggedAt);
            time.textContent = timeLabel ? `at ${timeLabel}` : "";

            row.append(lift, time);
            todayList.append(row);
        });

        todaySection.append(todayList);
        wrapper.append(todaySection);
    }

    if (summary.history.length) {
        const historySection = document.createElement("section");
        historySection.className = "performance-block";

        const title = document.createElement("h2");
        title.textContent = `Last ${summary.history.length} performances`;
        historySection.append(title);

        summary.history.forEach(performance => {
            const line = document.createElement("p");
            line.className = "performance-line";

            const date = document.createElement("strong");
            date.textContent = formatDateLabel(performance.dateKey);

            const sets = document.createElement("span");
            sets.textContent = performance.summary;

            line.append(date, sets);
            historySection.append(line);
        });

        wrapper.append(historySection);
    }

    if (!summary.todaySets.length && !summary.history.length) {
        const empty = document.createElement("p");
        empty.className = "performance-empty";
        empty.textContent = `No recent performance for ${exercise}.`;
        wrapper.append(empty);
    }

    return wrapper;
}

function populateExercises(group, selectedExercise = "") {
    const dropdown = document.getElementById("exercise-dropdown");
    if (!dropdown) return;

    dropdown.replaceChildren();

    const placeholder = new Option("Choose exercise", "", true, !selectedExercise);
    placeholder.disabled = true;
    dropdown.add(placeholder);

    buildExerciseList(group).forEach(exercise => {
        dropdown.add(new Option(exercise, exercise, false, exercise === selectedExercise));
    });
}

async function fetchLastWorkout(exercise) {
    if (!exercise) {
        setLastWorkout("Pick an exercise to see recent performances.");
        return;
    }

    const localPerformances = getLocalPerformances(exercise);
    const fallbackSummary = getPerformanceSummary(null, localPerformances);
    const showFallback = state => {
        setLastWorkoutNode(buildSummaryNode(exercise, fallbackSummary), state);
    };

    setLastWorkout("Fetching recent performances...", "loading");

    try {
        const response = await fetch(`${API_URL}?exercise=${encodeURIComponent(exercise)}&limit=${HISTORY_LIMIT}&history=1`);
        const data = await response.json();
        const summary = getPerformanceSummary(data, localPerformances);

        if (summary.todaySets.length || summary.history.length) {
            setLastWorkoutNode(buildSummaryNode(exercise, summary), "ready");
            return;
        }

        showFallback("empty");
    } catch (error) {
        console.error("Error fetching workout data:", error);
        showFallback(fallbackSummary.todaySets.length || fallbackSummary.history.length ? "ready" : "error");
    }
}

function wireSplitPage() {
    document.querySelectorAll("[data-group]").forEach(button => {
        button.addEventListener("click", () => selectWorkout(button.dataset.group));
    });
}

function wireWorkoutPage() {
    const selectedGroup = localStorage.getItem(SELECTED_GROUP_KEY);
    const form = document.getElementById("workoutForm");
    const dropdown = document.getElementById("exercise-dropdown");
    const workoutHeader = document.getElementById("workout-header");

    if (!form || !dropdown) return;

    if (!selectedGroup || !muscleGroups[selectedGroup]) {
        window.location.href = "index.html";
        return;
    }

    if (workoutHeader) {
        workoutHeader.textContent = groupLabels[selectedGroup] ?? "Workout";
    }

    populateExercises(selectedGroup);

    dropdown.addEventListener("change", () => {
        setStatus("");
        fetchLastWorkout(dropdown.value);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const submitButton = form.querySelector("button[type='submit']");
        const exercise = form.exercise.value;
        const reps = form.reps.value.trim();
        const weight = form.weight.value.trim();

        if (!exercise || !reps || !weight) {
            setStatus("Fill in exercise, weight, and reps.", "error");
            return;
        }

        const loggedAt = new Date().toISOString();
        const payload = {
            apiKey: API_KEY,
            date: loggedAt,
            group: selectedGroup,
            exercise,
            weight,
            reps
        };

        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
        setStatus("");

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            rememberExercise(selectedGroup, exercise);
            rememberLoggedSet(exercise, { reps, weight, date: loggedAt, group: selectedGroup });
            populateExercises(selectedGroup, exercise);
            setStatus(`Logged ${formatSet(weight, reps)}.`, "success");
            fetchLastWorkout(exercise);
        } catch (error) {
            console.error("Error logging workout:", error);
            setStatus("Failed to log set. Try again.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Log set";
            form.reps.focus();
            form.reps.select();
        }
    });
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        wireSplitPage();
        wireWorkoutPage();
    });
}

if (typeof window !== "undefined") {
    window.selectWorkout = selectWorkout;
    window.__pumpLoggerTest = {
        formatDateLabel,
        formatTimeLabel,
        getHistoricalPerformances,
        getPerformanceSummary,
        getTodaySets,
        normalizeBackendPerformances,
        normalizeSet,
        summarizeConsecutiveSets
    };
}

if (typeof module !== "undefined") {
    module.exports = {
        formatDateLabel,
        formatTimeLabel,
        getHistoricalPerformances,
        getPerformanceSummary,
        getTodaySets,
        normalizeBackendPerformances,
        normalizeSet,
        summarizeConsecutiveSets
    };
}
